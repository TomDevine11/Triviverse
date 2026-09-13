#!/usr/bin/env node
// FREE on-page + internal-link SEO audit, aimed squarely at lifting average position. Crawls our live
// pages, joins them to their REAL Search Console striking-distance queries (rank 5–20 = winnable), and
// prints per-URL, prioritised fixes: title/H1/meta relevance, thin content, and — the big free lever —
// internal links. Also flags duplicate titles/descriptions (mass-page bloat) and orphan pages.
//   npm run seo-audit
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config, capabilities } from './lib/config.mjs'
import { gsc } from './lib/google.mjs'
import { crawlSite } from './lib/crawl.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DAYS = Math.min(Number(process.env.SEO_LOOKBACK_DAYS || 90), 90)
const pad = (s, n) => String(s).padEnd(n)
const shortU = (u) => u.replace(/^https?:\/\/[^/]+/, '') || '/'
const tokens = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
const covers = (haystack, query) => { const t = tokens(query); const h = new Set(tokens(haystack)); return t.length ? t.filter((w) => h.has(w)).length / t.length : 0 }

const { ROUTES } = await import('../../src/seo/seoConfig.js')
const paths = ROUTES.map((r) => r.path)
console.log(`\n━━ SEO AUDIT — ${paths.length} pages, on-page + internal links + ${DAYS}d Search Console ━━`)
if (!capabilities().searchConsole) console.log('  (Search Console not connected — running on-page checks only.)')

console.log(`  Crawling ${config.siteUrl} …`)
const pages = await crawlSite(paths, { base: config.siteUrl })
const ok = pages.filter((p) => !p.error)
const byPath = Object.fromEntries(ok.map((p) => [p.path, p]))
console.log(`  Crawled ${ok.length}/${pages.length} (${pages.length - ok.length} errors).`)

// Real demand/position per page (only triviverse.com pages join to the crawl).
let striking = []
if (capabilities().searchConsole) {
  const rows = await gsc.strikingByPage(DAYS)
  striking = rows.filter((r) => r.page.startsWith(config.siteUrl))
    .map((r) => ({ ...r, path: shortU(r.page) }))
}
const bestQueryByPath = {}
for (const r of striking) { const cur = bestQueryByPath[r.path]; if (!cur || r.impressions > cur.impressions) bestQueryByPath[r.path] = r }

// ── PER-URL OPPORTUNITIES (winnable pages, ranked by impressions) ──
const opportunities = Object.values(bestQueryByPath)
  .filter((r) => byPath[r.path])
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 20)
  .map((r) => {
    const p = byPath[r.path], issues = []
    if (covers(p.title, r.query) < 0.5) issues.push(`title doesn't target "${r.query}" — put those words in the <title>`)
    if (p.titleLen > 60) issues.push(`title ${p.titleLen} chars (truncates ~60)`)
    if (!p.desc) issues.push('no meta description — add one with the query + a hook')
    else if (p.descLen > 160) issues.push(`meta description ${p.descLen} chars (>160)`)
    if (!p.h1.length) issues.push('missing H1')
    else if (covers(p.h1.join(' '), r.query) < 0.5) issues.push(`H1 doesn't mention "${r.query}"`)
    if (p.words < 200) issues.push(`thin content (${p.words} words) — add supporting copy / FAQ for "${r.query}"`)
    if (p.internalIn < 3) issues.push(`only ${p.internalIn} internal links point here — add more (internal links lift position)`)
    if (p.noindex) issues.push('⚠ NOINDEX but getting impressions')
    return { path: r.path, query: r.query, position: r.position, impressions: r.impressions, clicks: r.clicks, words: p.words, internalIn: p.internalIn, issues }
  })

console.log(`\n── TOP OPPORTUNITIES (rank 5–20 · what to fix to gain position) ──`)
for (const o of opportunities) {
  console.log(`\n  ${shortU(o.path)}   "${o.query}"  · pos ${o.position.toFixed(1)} · ${o.impressions} impr · ${o.internalIn} inbound links`)
  if (o.issues.length) for (const i of o.issues) console.log(`     → ${i}`)
  else console.log('     ✓ on-page looks solid — needs authority/links or better CTR')
}

// ── SITE-WIDE HYGIENE ──
const dup = (key) => { const m = {}; for (const p of ok) { const v = (p[key] || '').trim(); if (v) (m[v] ||= []).push(p.path) } return Object.entries(m).filter(([, ps]) => ps.length > 1) }
const dupTitles = dup('title'), dupDesc = dup('desc')
const orphans = ok.filter((p) => p.internalIn === 0 && p.path !== '/')
const thin = ok.filter((p) => p.words < 120 && !p.noindex).sort((a, b) => a.words - b.words)
const noindexed = ok.filter((p) => p.noindex)

console.log(`\n── SITE-WIDE ──`)
console.log(`  Duplicate <title> groups:        ${dupTitles.length}${dupTitles.length ? '  e.g. "' + dupTitles[0][0].slice(0, 50) + '" ×' + dupTitles[0][1].length : ''}`)
console.log(`  Duplicate meta-description groups: ${dupDesc.length}`)
console.log(`  Orphan pages (0 internal links in): ${orphans.length}${orphans.length ? '  e.g. ' + orphans.slice(0, 4).map((p) => p.path).join(', ') : ''}`)
console.log(`  Thin pages (<120 words):           ${thin.length}${thin.length ? '  e.g. ' + thin.slice(0, 4).map((p) => `${p.path}(${p.words})`).join(', ') : ''}`)
console.log(`  Noindex pages:                     ${noindexed.length}`)

// ── INTERNAL-LINKING OPPORTUNITIES (the biggest free lever) ──
// Which strong pages should link to each winnable page but don't.
const strong = ['/', ...Object.values(bestQueryByPath).sort((a, b) => b.clicks - a.clicks).slice(0, 4).map((r) => r.path)]
console.log(`\n── INTERNAL-LINK MOVES (add these links to pass authority to winnable pages) ──`)
for (const o of opportunities.slice(0, 8)) {
  const missing = strong.filter((s) => s !== o.path && byPath[s] && !byPath[s].internalOut.includes(o.path))
  if (missing.length) console.log(`  link → ${o.path}  from: ${missing.join(', ')}`)
}

const snapshot = { generatedAt: new Date().toISOString(), windowDays: DAYS, crawled: ok.length, opportunities, dupTitles: dupTitles.length, dupDesc: dupDesc.length, orphans: orphans.map((p) => p.path), thin: thin.map((p) => ({ path: p.path, words: p.words })) }
const out = path.join(HERE, 'reports', `audit-${new Date().toISOString().slice(0, 10)}.json`)
writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n')
writeFileSync(path.join(HERE, 'reports', 'audit-latest.json'), JSON.stringify(snapshot, null, 2) + '\n')
console.log(`\n  Snapshot → ${path.relative(process.cwd(), out)}\n`)
