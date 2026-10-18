#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// INDEXNOW — notify Bing, Yandex & Seznam that our pages changed, so they
// (re)crawl within hours instead of waiting to discover them.
//
// IndexNow is a shared protocol: one ping reaches all participating engines.
// Google does NOT use IndexNow, but this still gets real, fast indexing on
// Bing/Yandex (and proves the pages are crawlable). It complements — does not
// replace — the sitemap + internal links that Google relies on.
//
// Ownership is proven by hosting KEY at /<KEY>.txt (see public/<KEY>.txt).
// Run automatically on deploy via .github/workflows/indexnow.yml, or manually:
//   npm run indexnow
// ─────────────────────────────────────────────────────────────────────────

import { SITE_URL, absolute, indexableRoutes } from '../src/seo/seoConfig.js'
import { GEO_ROUTES } from '../src/geography/seo.js'

const KEY = 'b96efb81bd679e402103103fa79f9dc4'
const host = new URL(SITE_URL).host
const keyLocation = `${SITE_URL}/${KEY}.txt`
// Football routes plus Triviverse Geography's (its own SEO config; until 2026-10-18
// the geography pages were never pinged).
const urlList = [...indexableRoutes().map(r => absolute(r.path)), ...GEO_ROUTES.map(r => SITE_URL + r.path)]

async function main() {
  // Sanity check: the key file must be reachable and contain the key.
  try {
    const res = await fetch(keyLocation)
    const txt = (await res.text()).trim()
    if (!res.ok || txt !== KEY) {
      console.error(`✗ Key file check failed at ${keyLocation} (status ${res.status}). Is the latest build deployed?`)
      process.exit(1)
    }
    console.error(`✓ Key file verified at ${keyLocation}`)
  } catch (e) {
    console.error(`✗ Could not fetch key file ${keyLocation}: ${e.message}`)
    process.exit(1)
  }

  const body = { host, key: KEY, keyLocation, urlList }
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  })
  // 200 = accepted, 202 = accepted/validation pending. Both are success.
  if (res.ok || res.status === 202) {
    console.error(`✓ Submitted ${urlList.length} URLs to IndexNow (HTTP ${res.status})`)
    for (const u of urlList) console.error(`    ${u}`)
  } else {
    console.error(`✗ IndexNow returned HTTP ${res.status}: ${await res.text()}`)
    process.exit(1)
  }
}

main()
