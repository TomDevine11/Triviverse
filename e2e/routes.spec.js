import { test, expect } from '@playwright/test'
import { gameRoutes } from '../src/seo/seoConfig.js'

// Every game route, derived from seoConfig — a new game is covered the moment
// it's declared, with no edit here.
const GAMES = gameRoutes()

// Attach listeners BEFORE navigating: an exception thrown during mount fires
// before any awaited assertion would see it.
function collectFailures(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
  page.on('requestfailed', (r) => {
    // Ignore third-party/analytics noise — we only care about our own assets.
    const url = r.url()
    if (url.startsWith('http://localhost')) errors.push(`request failed: ${url}`)
  })
  return errors
}

test.describe('game routes render', () => {
  for (const route of GAMES) {
    test(`${route.path} serves its own page and mounts cleanly`, async ({ page }) => {
      const errors = collectFailures(page)

      const res = await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      expect(res?.status(), `${route.path} should return 200`).toBe(200)

      // The 13 Sept failure mode: a 200 that is actually the home shell. The H1
      // is the cheapest proof the router resolved to the right page.
      await expect(page.locator('h1').first()).toHaveText(route.h1, { timeout: 15_000 })

      // …and the prerendered title must match too, so a soft 404 can't pass by
      // hydrating into the right thing after serving the wrong document.
      await expect(page).toHaveTitle(route.title)

      expect(errors, `${route.path} produced runtime errors`).toEqual([])
    })
  }
})

test('home page links every game', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  for (const route of GAMES) {
    await expect(
      page.locator(`a[href="${route.path}"]`).first(),
      `home should link ${route.path}`,
    ).toBeAttached()
  }
})

test('a route that does not exist is not presented as a real game', async ({ page }) => {
  // Documents current behaviour rather than asserting the ideal: the SPA
  // fallback (server/index.js) answers 200 for unknown paths, so this does not
  // assert a 404. What must never happen is an unknown path rendering as
  // though it were one of the real games.
  await page.goto('/definitely-not-a-real-route', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  const headings = (await page.locator('h1').allTextContents()).map(s => s.trim())
  for (const h of headings) {
    expect(GAMES.map(r => r.h1), 'an unknown route must not render a game H1').not.toContain(h)
  }
})

test('every game page has exactly one H1', async ({ page }) => {
  // /tictactoe shipped with two (the menu wordmark plus the SEO block) until
  // this suite caught it. One H1 per page, and it must be the declared one.
  for (const route of GAMES) {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1'), `${route.path} should have exactly one H1`).toHaveCount(1)
  }
})

