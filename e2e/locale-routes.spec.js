import { test, expect } from '@playwright/test'
import { gameRoutes } from '../src/seo/seoConfig.js'
import { RETIRED, retiredTarget } from '../src/seo/retired.js'

// Retired URLs at the SERVER level, asserted with the request fixture: what a
// crawler or an old link receives is the status, not the rendered DOM.
//
// Since 2026-10-09 the site is English-only and the thin archive, pair, themed
// and build-your-own pages are gone (src/seo/retired.js). Every one must 301 to
// a live page — never 200 the home shell (a soft 404) and never dead-end.

const SAMPLES = [
  ['/es', '/'],
  ['/es/tenable', '/tenable'],
  ['/es/football-contexto', '/football-contexto'],
  ['/es/me', '/me'],
  ['/tenable/answers', '/tenable'],
  ['/football-pointless/answers', '/football-pointless'],
  ['/players-who-played-for', '/tictactoe'],
  ['/players-who-played-for/arsenal-and-chelsea', '/tictactoe'],
  ['/es/players-who-played-for/arsenal-and-chelsea', '/tictactoe'],
  ['/england-football-quiz', '/career-path'],
  ['/build-your-own-football-darts', '/501'],
]

test('the shared list resolves the samples the way Cloudflare will', () => {
  for (const [from, to] of SAMPLES) expect(retiredTarget(from), from).toBe(to)
  expect(retiredTarget('/tenable')).toBeNull()
  expect(RETIRED.length).toBeGreaterThan(0)
})

test.describe('retired URLs 301 to a live page', () => {
  for (const [from, to] of SAMPLES) {
    test(`${from} → ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0, failOnStatusCode: false })
      expect(res.status(), from).toBe(301)
      expect(new URL(res.headers()['location'], 'http://x').pathname).toBe(to)
    })
  }
})

test.describe('every game route is live', () => {
  for (const route of gameRoutes()) {
    test(`${route.path} returns 200`, async ({ request }) => {
      expect((await request.get(route.path)).status()).toBe(200)
    })
  }
})

test('a missing hashed asset still 404s rather than serving HTML', async ({ request }) => {
  const res = await request.get('/assets/not-a-real-chunk.js', { failOnStatusCode: false })
  expect(res.status()).toBe(404)
  expect(res.headers()['content-type'] || '').not.toContain('text/html')
})
