import { test, expect } from '@playwright/test'
import { ROUTES, gameRoutes } from '../src/seo/seoConfig.js'
import { ES } from '../src/seo/es.js'
import { RELATION_BASE, RELATION_REDIRECTS } from '../src/seo/relations.js'

// Locale routing at the SERVER level. Asserted with the request fixture, not a
// page, because what matters here is the HTTP status a crawler receives — the
// rendered DOM is irrelevant when the status itself is the defect.
//
// The failure this locks out: a route marked `enOnly` has no Spanish page, but
// the SPA fallback answered /es/<that route> with 200 and the ENGLISH HOME
// SHELL. Twenty routes behaved that way — an indexable success response serving
// the wrong page, indistinguishable from /es/definitely-not-real.

// Derived from the route config, never a second hand-maintained list: a game
// added as enOnly is covered here the moment it is declared.
const EN_ONLY = ROUTES.filter(r => r.enOnly).map(r => r.path)
const ES_TRANSLATED = Object.keys(ES).map(p => (p === '/' ? '/es' : `/es${p}`))

const HOME_SHELL = /Free Daily Football Trivia Games/

test('the config actually declares enOnly routes to test', () => {
  // Guards against this whole suite silently passing if `enOnly` is renamed or
  // the filter stops matching.
  expect(EN_ONLY.length).toBeGreaterThan(0)
  expect(ES_TRANSLATED.length).toBeGreaterThan(0)
})

test.describe('untranslated Spanish routes are real 404s', () => {
  for (const path of EN_ONLY) {
    test(`/es${path} returns 404`, async ({ request }) => {
      const res = await request.get(`/es${path}`, { failOnStatusCode: false })
      expect(res.status(), `/es${path} must not be a soft 404`).toBe(404)
      expect(await res.text(), `/es${path} must not serve the English home shell`).not.toMatch(HOME_SHELL)
    })
  }
})

test.describe('translated Spanish routes still work', () => {
  for (const path of ES_TRANSLATED) {
    test(`${path} returns 200 in Spanish`, async ({ request }) => {
      const res = await request.get(path)
      expect(res.status()).toBe(200)
      expect(await res.text(), `${path} should serve its Spanish page`).not.toMatch(HOME_SHELL)
    })
  }
})

test.describe('English routes are unaffected', () => {
  for (const route of gameRoutes()) {
    test(`${route.path} returns 200`, async ({ request }) => {
      expect((await request.get(route.path)).status()).toBe(200)
    })
  }
})

test('the English SPA fallback is deliberately left alone', async ({ request }) => {
  // Unchanged behaviour, asserted so the fix cannot quietly widen: an unknown
  // ENGLISH path still resolves to the shell with a 200. Only the /es prefix
  // was narrowed, because there "prerendered" is an exact definition of exists.
  const res = await request.get('/definitely-not-a-real-route', { failOnStatusCode: false })
  expect(res.status()).toBe(200)
})

test('an unknown Spanish path is a 404', async ({ request }) => {
  const res = await request.get('/es/definitely-not-a-real-route', { failOnStatusCode: false })
  expect(res.status()).toBe(404)
})

test('a missing hashed asset still 404s rather than serving HTML', async ({ request }) => {
  const res = await request.get('/assets/not-a-real-chunk.js', { failOnStatusCode: false })
  expect(res.status()).toBe(404)
  expect(res.headers()['content-type'] || '').not.toContain('text/html')
})

test.describe('retired player-pair URLs keep their 301/410 handling', () => {
  const [retiredSlug, target] = Object.entries(RELATION_REDIRECTS)[0]

  test('a renamed pair still 301s in both locales', async ({ request }) => {
    for (const prefix of ['', '/es']) {
      const res = await request.get(`${prefix}${RELATION_BASE}/${retiredSlug}`, { maxRedirects: 0, failOnStatusCode: false })
      expect(res.status(), `${prefix}${RELATION_BASE}/${retiredSlug}`).toBe(301)
      expect(res.headers()['location']).toBe(`${prefix}${RELATION_BASE}/${target}`)
    }
  })

  test('a retired pair still 410s rather than 404ing or 200ing', async ({ request }) => {
    const res = await request.get(`${RELATION_BASE}/barcelona-and-chelsea`, { failOnStatusCode: false })
    expect(res.status()).toBe(410)
  })
})
