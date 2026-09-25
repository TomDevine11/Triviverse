import { test, expect } from '@playwright/test'

// Visual regression. A deliberately SMALL set: functional tests already assert
// status, headings and titles, so these exist only to catch what those cannot —
// CSS and layout regressions across the shared shell and the visually
// distinctive game surfaces.
//
// Not every page, and not every state. Eight snapshots is enough to notice a
// broken grid, a collapsed header or a token change that repaints the site;
// eighty would be a maintenance liability that gets deleted the first time it
// goes red for a boring reason.
//
// Local-only by default — see playwright.config.js for why (baselines are
// platform-specific and CI runs a different OS).

// Triviverse rotates its games daily off `new Date()` (dailyStats.todayIndex),
// so without a fixed clock every baseline would be stale within 24 hours. A
// fixed time, not a frozen timer: React's own timers keep working.
const FIXED_TIME = new Date('2026-06-15T12:00:00Z')

// A 1x1 transparent PNG, used to stand in for club crests.
const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)

  // Club crests come from Transfermarkt's CDN. A screenshot must not depend on
  // a third party being up, fast, or unchanged, so serve a blank of the same
  // dimensions instead: layout stays identical, the bytes stop varying.
  await page.route('**tmssl.akamaized.net/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_PNG }))
})

/** Load a route and wait until it has settled enough to photograph. */
async function ready(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  // The H1 is rendered by the SEO block on every route, so it is a reliable
  // signal that hydration has replaced the prerendered shell.
  await page.locator('h1').first().waitFor({ state: 'visible' })
  await page.waitForLoadState('networkidle')
  // Web fonts change metrics; wait for them rather than photograph a reflow.
  await page.evaluate(() => document.fonts.ready)
}

const SHOT = {
  fullPage: true,
  animations: 'disabled',
  // A small tolerance for sub-pixel antialiasing between runs. Not large enough
  // to hide a real layout change — a shifted element moves far more than 1%.
  maxDiffPixelRatio: 0.01,
}

test.describe('visual', () => {
  test('home — the shared site shell', async ({ page }) => {
    await ready(page, '/')
    await expect(page).toHaveScreenshot('home.png', SHOT)
  })

  test('tenable — a standard trivia game', async ({ page }) => {
    await ready(page, '/tenable')
    await expect(page).toHaveScreenshot('tenable.png', SHOT)
  })

  test('tictactoe — the grid layout', async ({ page }) => {
    await ready(page, '/tictactoe')
    await expect(page).toHaveScreenshot('tictactoe.png', SHOT)
  })

  test('connections — the tile layout', async ({ page }) => {
    await ready(page, '/connections')
    await expect(page).toHaveScreenshot('connections.png', SHOT)
  })

  test('pointless archive — a generated content page', async ({ page }) => {
    await ready(page, '/football-pointless/answers')
    // Viewport only, not fullPage: the archive grows by a row every day, so a
    // full-page baseline would be enormous and would churn constantly. The top
    // of the page is where its structure lives and where a regression shows.
    await expect(page).toHaveScreenshot('pointless-answers.png', { ...SHOT, fullPage: false })
  })
})
