// Post-build SEO validation — runs against dist/ after `npm run build`. Catches the
// classic programmatic-SEO failure modes: broken internal links, duplicate titles/
// descriptions, sitemap↔canonical mismatch, missing pages, invalid JSON-LD,
// accidental noindex. Exits non-zero on any hard failure so CI can gate on it.
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { RELATION_BASE, RELATION_PAGES } from '../../src/seo/relations.js'
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist')
const SITE = 'https://triviverse.com'

const read = (p) => readFileSync(p, 'utf8')
const fileFor = (url) => { const rel = url.replace(SITE, '').replace(/^\//, ''); return path.join(DIST, rel || '.', 'index.html') }
const between = (h, re) => (h.match(re) || [])[1]

const errors = [], warns = []
const sitemap = read(path.join(DIST, 'sitemap.xml'))
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
console.log(`Validating ${urls.length} sitemap URLs…`)

const titles = new Map(), descs = new Map()
let relationPages = 0, jsonLdBlocks = 0

for (const url of urls) {
  const f = fileFor(url)
  if (!existsSync(f)) { errors.push(`MISSING PAGE: ${url} → ${f}`); continue }
  const h = read(f)
  const routePath = url.replace(SITE, '') || '/'
  if (routePath.startsWith('/players-who-played-for/')) relationPages++

  // canonical matches the URL
  const canon = between(h, /rel="canonical" href="([^"]+)"/)
  if (canon !== url) errors.push(`CANONICAL MISMATCH: ${url} → canonical=${canon}`)

  // not accidentally noindex
  const robots = between(h, /name="robots" content="([^"]+)"/)
  if (robots && /noindex/.test(robots)) errors.push(`ACCIDENTAL NOINDEX: ${url}`)

  // unique title + description
  const title = between(h, /<title>([\s\S]*?)<\/title>/)
  const desc = between(h, /name="description" content="([^"]*)"/)
  if (!title) errors.push(`NO TITLE: ${url}`)
  else { if (titles.has(title)) errors.push(`DUPLICATE TITLE: "${title}" on ${url} and ${titles.get(title)}`); else titles.set(title, url) }
  if (!desc) warns.push(`NO DESCRIPTION: ${url}`)
  else { if (descs.has(desc)) errors.push(`DUPLICATE DESCRIPTION on ${url} and ${descs.get(desc)}`); else descs.set(desc, url) }

  // JSON-LD parses
  for (const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    jsonLdBlocks++
    try { JSON.parse(m[1]) } catch { errors.push(`INVALID JSON-LD on ${url}`) }
  }

  // internal links resolve to a real prerendered page (relation pages only — cheap + high-value)
  if (routePath.startsWith('/players-who-played-for')) {
    for (const m of h.matchAll(/href="(\/[^"#]*)"/g)) {
      const href = m[1]
      if (href.startsWith('/players-who-played-for')) {
        const target = fileFor(SITE + href)
        if (!existsSync(target)) errors.push(`BROKEN INTERNAL LINK: ${url} → ${href}`)
      }
    }
    // pair pages (not the hub) must prerender an H1 and the crawlable answer list with apps/goals
    if (routePath !== RELATION_BASE) {
      if (!/<h1[^>]*>[^<]+<\/h1>/.test(h)) errors.push(`MISSING H1: ${url}`)
      if ((h.match(/<li>[^<]*apps[^<]*<\/li>/g) || []).length < 1) errors.push(`NO prerendered answer rows: ${url}`)
    }
  }
}

// Player-pair family inventory: exactly the hub + 10 canonical pairs, no more, no fewer.
const smPaths = new Set(urls.map(u => u.replace(SITE, '') || '/'))
const expectedPairs = [RELATION_BASE, ...RELATION_PAGES.map(p => `${RELATION_BASE}/${p.slug}`)]
const missingPairs = expectedPairs.filter(p => !smPaths.has(p))
const relInSitemap = [...smPaths].filter(p => p.startsWith(RELATION_BASE))
const unexpectedPairs = relInSitemap.filter(p => !expectedPairs.includes(p))
if (RELATION_PAGES.length !== 10) errors.push(`PAIR INVENTORY: expected 10 pairs, config has ${RELATION_PAGES.length}`)
if (missingPairs.length) errors.push(`PAIR INVENTORY: missing from sitemap: ${missingPairs.join(', ')}`)
if (unexpectedPairs.length) errors.push(`PAIR INVENTORY: unexpected/retired relation URLs in sitemap: ${unexpectedPairs.join(', ')}`)
console.log(`  player-pair inventory: ${relInSitemap.length}/11 in sitemap (hub + ${RELATION_PAGES.length} pairs)`)

console.log(`  relation pages: ${relationPages} | JSON-LD blocks: ${jsonLdBlocks} | unique titles: ${titles.size}`)
if (warns.length) { console.log(`\n⚠ ${warns.length} warnings`); warns.slice(0, 5).forEach(w => console.log('  ' + w)) }
if (errors.length) {
  console.error(`\n✗ ${errors.length} ERRORS:`); errors.slice(0, 20).forEach(e => console.error('  ' + e))
  process.exit(1)
}
console.log('\n✓ SEO validation passed — no broken links, duplicates, mismatches, or invalid schema.')
