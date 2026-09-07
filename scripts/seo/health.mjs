#!/usr/bin/env node
// SEO/growth health report — deterministic, concise, LOCAL by default.
//   npm run seo-health            reads the built dist/ + route config (no network)
//   npm run seo-health -- --search   also pulls per-target-route Search Console data
//                                     (only if GA4/GSC creds are configured; skipped otherwise)
//
// Reports: sitemap health, canonical health, indexability/noindex anomalies, the
// player-pair route inventory (hub + 10 canonical pairs), title/H1 presence, whether
// the crawlable answer content is prerendered, retired/redirect manifest health, and
// whether an analytics tag is present in THIS build. It never rewrites SEO — it only
// tells you what is (and isn't) healthy. Exits non-zero if any hard check fails.
import { readFileSync, existsSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { RELATION_BASE, RELATION_PAGES } from '../../src/seo/relations.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(HERE, '..', '..', 'dist')
const SITE = 'https://triviverse.com'
const GAMES = ['/tenable', '/football-pointless', '/connections', '/wordle', '/career-path', '/tictactoe', '/higher-or-lower', '/501']

const grab = (h, re) => (h.match(re) || [])[1]
const fileFor = (p) => path.join(DIST, p.replace(/^\//, '') || '.', 'index.html')
const errors = [], warns = []
const ok = (b, msg) => { if (!b) errors.push(msg); return b }

if (!existsSync(DIST)) { console.error('✗ no dist/ — run `npm run build` first.'); process.exit(1) }
console.log('\n━━ SEO HEALTH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// ── 1) Sitemap health ──
const sitemap = existsSync(path.join(DIST, 'sitemap.xml')) ? readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8') : ''
const smUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
const smPaths = new Set(smUrls.map(u => u.replace(SITE, '') || '/'))
const dupSm = smUrls.length - new Set(smUrls).size
ok(smUrls.length > 0, 'sitemap.xml empty or missing')
ok(dupSm === 0, `sitemap has ${dupSm} duplicate URL(s)`)
console.log(`\nSitemap: ${smUrls.length} URLs${dupSm ? ` · ⚠ ${dupSm} duplicates` : ''}`)

// ── 2) Player-pair route inventory (hub + exactly 10 canonical pairs) ──
const expectedPairPaths = [RELATION_BASE, ...RELATION_PAGES.map(p => `${RELATION_BASE}/${p.slug}`)]
const missing = expectedPairPaths.filter(p => !smPaths.has(p))
const relInSitemap = [...smPaths].filter(p => p.startsWith(RELATION_BASE))
const unexpected = relInSitemap.filter(p => !expectedPairPaths.includes(p))
ok(RELATION_PAGES.length === 10, `expected 10 pair pages, config has ${RELATION_PAGES.length}`)
ok(missing.length === 0, `pair pages missing from sitemap: ${missing.join(', ')}`)
ok(unexpected.length === 0, `unexpected/retired relation URLs in sitemap: ${unexpected.join(', ')}`)
console.log(`Player-pair inventory: ${RELATION_PAGES.length}/10 pairs + hub · in sitemap: ${relInSitemap.length}/11` +
  `${missing.length ? ` · ✗ missing ${missing.length}` : ''}${unexpected.length ? ` · ✗ ${unexpected.length} unexpected` : ''}`)

// ── 3) Per-page: canonical, noindex, title, H1, answer content ──
const titles = new Map()
let noindexAnoms = 0, canonBad = 0, missingH1 = 0, thinAnswers = 0
const checkPage = (routePath, { needAnswers = false } = {}) => {
  const f = fileFor(routePath)
  if (!existsSync(f)) { errors.push(`MISSING prerendered page: ${routePath}`); return }
  const h = readFileSync(f, 'utf8')
  const url = SITE + (routePath === '/' ? '' : routePath)
  const canon = grab(h, /rel="canonical" href="([^"]+)"/)
  if (canon !== url) { canonBad++; errors.push(`CANONICAL MISMATCH ${routePath}: ${canon}`) }
  if ((h.match(/rel="canonical"/g) || []).length !== 1) { canonBad++; errors.push(`DUPLICATE/NO canonical ${routePath}`) }
  const robots = grab(h, /name="robots" content="([^"]+)"/)
  if (robots && /noindex/.test(robots)) { noindexAnoms++; errors.push(`ACCIDENTAL NOINDEX ${routePath}`) }
  const title = grab(h, /<title>([\s\S]*?)<\/title>/)
  if (!title) errors.push(`NO TITLE ${routePath}`)
  else if (titles.has(title)) errors.push(`DUPLICATE TITLE "${title}" (${routePath} & ${titles.get(title)})`); else titles.set(title, routePath)
  if (!/<h1[^>]*>[^<]+<\/h1>/.test(h)) { missingH1++; errors.push(`MISSING H1 ${routePath}`) }
  if (needAnswers) {
    const rows = (h.match(/<li>[^<]*apps[^<]*<\/li>/g) || []).length
    if (rows < 1) { thinAnswers++; errors.push(`NO prerendered answer rows ${routePath}`) }
  }
}
for (const p of expectedPairPaths) checkPage(p, { needAnswers: p !== RELATION_BASE })
for (const g of GAMES) checkPage(g)
console.log(`Per-page: canonical ✓${canonBad ? ` (✗${canonBad})` : ''} · noindex anomalies ${noindexAnoms} · missing H1 ${missingH1} · thin answer lists ${thinAnswers}`)

// ── 4) Retired/redirect manifest health ──
const manF = path.join(DIST, 'relations-manifest.json')
if (existsSync(manF)) {
  const m = JSON.parse(readFileSync(manF, 'utf8'))
  const curOk = m.current?.length === RELATION_PAGES.length
  ok(curOk, `manifest current count ${m.current?.length} != ${RELATION_PAGES.length}`)
  for (const [oldSlug, newSlug] of Object.entries(m.redirects || {})) ok(m.current.includes(newSlug), `redirect target not current: ${oldSlug}→${newSlug}`)
  console.log(`Redirect manifest: ${m.current?.length} current · ${Object.keys(m.redirects || {}).length} 301 redirect(s) → verified targets`)
} else warns.push('no dist/relations-manifest.json (server 301/410 disabled)')

// ── 5) Analytics tag presence in THIS build ──
const assetsDir = path.join(DIST, 'assets')
let gaTag = false
if (existsSync(assetsDir)) for (const f of readdirSync(assetsDir)) {
  if (f.endsWith('.js') && /googletagmanager\.com|G-[A-Z0-9]{6,}/.test(readFileSync(path.join(assetsDir, f), 'utf8'))) { gaTag = true; break }
}
console.log(`Analytics tag in build: ${gaTag ? '✓ present (VITE_ANALYTICS_ID set)' : '✗ ABSENT — VITE_ANALYTICS_ID not set at build; GA events (incl. player-pair funnel) will NOT fire'}`)
if (!gaTag) warns.push('analytics inert in this build — set VITE_ANALYTICS_ID before deploy to capture events')

// ── 6) Optional: Search Console per-target-route (only if creds configured) ──
if (process.argv.includes('--search')) {
  try {
    const { capabilities } = await import('./lib/config.mjs')
    if (!capabilities().searchConsole) { console.log('\nSearch data: skipped (no GSC creds configured — see docs/seo-monitoring.md)') }
    else {
      const { gsc } = await import('./lib/google.mjs')
      const rows = await gsc.queriesByPage(28)
      const agg = {}
      const bucket = (p) => p.startsWith(SITE + RELATION_BASE) ? 'player-pairs' : (GAMES.find(g => p === SITE + g) || null)
      for (const r of rows) { const b = bucket(r.page); if (!b) continue; (agg[b] ||= { impr: 0, clicks: 0, pos: 0, n: 0 }); agg[b].impr += r.impressions; agg[b].clicks += r.clicks; agg[b].pos += r.position * r.impressions; agg[b].n += r.impressions }
      console.log('\nSearch Console (28d) — target routes:')
      for (const [k, v] of Object.entries(agg)) console.log(`  ${k.padEnd(16)} impr ${v.impr}  clicks ${v.clicks}  ctr ${(v.clicks / (v.impr || 1) * 100).toFixed(1)}%  pos ${(v.pos / (v.impr || 1)).toFixed(1)}`)
    }
  } catch (e) { console.log('\nSearch data: unavailable —', e.message?.slice(0, 100)) }
}

// ── Summary ──
console.log(`\n${'─'.repeat(60)}`)
if (warns.length) { console.log(`⚠ ${warns.length} warning(s):`); warns.forEach(w => console.log('  ' + w)) }
if (errors.length) { console.error(`\n✗ ${errors.length} HEALTH ERROR(S):`); errors.slice(0, 25).forEach(e => console.error('  ' + e)); process.exit(1) }
console.log('✓ SEO health OK — sitemap, canonicals, pair inventory, prerendered answers all sound.\n')
