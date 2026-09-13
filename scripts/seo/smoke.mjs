#!/usr/bin/env node
// Production SEO smoke test — run AFTER a deploy against the live site. Network-based
// and intentionally SEPARATE from unit tests (so `npm test` never needs the internet).
// Fails loudly (non-zero exit) on real regressions: non-200 canonical pages, unexpected
// noindex, canonical mismatch, missing title/H1, sitemap omissions, retired URLs coming
// back to life, broken 301/410, or missing prerendered answer content.
//   npm run seo-smoke                 checks https://triviverse.com
//   SEO_SMOKE_BASE=https://… npm run seo-smoke   checks another origin (e.g. a preview)
import { RELATION_BASE, RELATION_PAGES, RELATION_REDIRECTS } from '../../src/seo/relations.js'

const BASE = (process.env.SEO_SMOKE_BASE || 'https://triviverse.com').replace(/\/$/, '')
const GAMES = ['/tenable', '/football-pointless', '/connections', '/wordle', '/career-path', '/tictactoe', '/higher-or-lower', '/501']
// A few URLs that were retired when the pair family was pruned — must stay gone (410), never 200.
const RETIRED = ['ajax-and-manchester-united', 'barcelona-and-chelsea', 'chelsea-and-manchester-united'].map(s => `${RELATION_BASE}/${s}`)

const grab = (h, re) => (h.match(re) || [])[1]
const fail = [], warn = []
const get = async (p, redirect = 'follow') => {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000)
  try { return await fetch(BASE + p, { redirect, signal: ctrl.signal }) } finally { clearTimeout(t) }
}

console.log(`\n━━ PRODUCTION SEO SMOKE — ${BASE} ━━━━━━━━━━━━━━━━━━━━━━━━`)

// ── Indexable routes: 200 + canonical + no-noindex + title + H1 (+ answers for pairs) ──
const pairPaths = [RELATION_BASE, ...RELATION_PAGES.map(p => `${RELATION_BASE}/${p.slug}`)]
const routes = [...pairPaths.map(p => ({ p, answers: p !== RELATION_BASE })), ...GAMES.map(p => ({ p, answers: false }))]
for (const { p, answers } of routes) {
  try {
    const res = await get(p)
    const url = BASE + (p === '/' ? '' : p)
    if (res.status !== 200) { fail.push(`${p} → HTTP ${res.status} (expected 200)`); continue }
    const h = await res.text()
    const canon = grab(h, /rel="canonical" href="([^"]+)"/)
    if (canon && canon !== url) fail.push(`${p} → canonical mismatch: ${canon}`)
    if ((h.match(/rel="canonical"/g) || []).length !== 1) fail.push(`${p} → not exactly one canonical`)
    const robots = grab(h, /name="robots" content="([^"]+)"/)
    if (robots && /noindex/.test(robots)) fail.push(`${p} → unexpected noindex`)
    if (!grab(h, /<title>([\s\S]*?)<\/title>/)) fail.push(`${p} → missing title`)
    if (!/<h1[^>]*>[^<]+<\/h1>/.test(h)) fail.push(`${p} → missing H1`)
    if (answers && (h.match(/<li>[^<]*apps[^<]*<\/li>/g) || []).length < 1) fail.push(`${p} → no prerendered answer rows`)
  } catch (e) { fail.push(`${p} → fetch error: ${e.message}`) }
}
console.log(`  indexable routes checked: ${routes.length}`)

// ── Sitemap: expected pair URLs present, no retired relation slugs ──
try {
  const sm = await (await get('/sitemap.xml')).text()
  for (const p of pairPaths) if (!sm.includes(`<loc>${BASE}${p}</loc>`)) fail.push(`sitemap missing ${p}`)
  for (const r of RETIRED) if (sm.includes(r)) fail.push(`sitemap contains retired URL ${r}`)
  console.log(`  sitemap: ${(sm.match(/<loc>/g) || []).length} URLs`)
} catch (e) { fail.push(`sitemap fetch error: ${e.message}`) }

// ── 301 renamed pairs → canonical ──
for (const [oldSlug, newSlug] of Object.entries(RELATION_REDIRECTS)) {
  try {
    const res = await get(`${RELATION_BASE}/${oldSlug}`, 'manual')
    const loc = res.headers.get('location') || ''
    if (res.status !== 301) fail.push(`301 broken: ${oldSlug} → HTTP ${res.status}`)
    else if (!loc.endsWith(`${RELATION_BASE}/${newSlug}`)) fail.push(`301 wrong target: ${oldSlug} → ${loc}`)
  } catch (e) { fail.push(`301 ${oldSlug} error: ${e.message}`) }
}

// ── 410 retired pairs stay gone ──
for (const r of RETIRED) {
  try { const res = await get(r, 'manual'); if (res.status !== 410) fail.push(`retired URL live again: ${r} → HTTP ${res.status} (expected 410)`) }
  catch (e) { fail.push(`410 ${r} error: ${e.message}`) }
}
console.log(`  redirects: ${Object.keys(RELATION_REDIRECTS).length} × 301 · ${RETIRED.length} × 410`)

// ── Report ──
console.log(`\n${'─'.repeat(56)}`)
if (warn.length) { console.log(`⚠ ${warn.length} warning(s):`); warn.forEach(w => console.log('  ' + w)) }
if (fail.length) { console.error(`\n✗ ${fail.length} SMOKE FAILURE(S):`); fail.forEach(f => console.error('  ' + f)); process.exit(1) }
console.log(`✓ Production SEO smoke passed — ${routes.length} routes 200/canonical/H1/answers, sitemap + 301 + 410 all correct.\n`)
