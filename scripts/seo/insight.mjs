#!/usr/bin/env node
// Deep SEO insight — maximum extraction from Google + (optional) DataForSEO, focused on the one thing
// that matters for growth: lifting average position per URL. Prints: fresh-trend check, channel/source
// split (incl. TikTok), a per-URL opportunity table (which URL to push, on which query, and why), live
// indexation for the top URLs, and — if DataForSEO is wired — the real SERP + volume + who's above you.
//   npm run seo-insight            (default 28-day window; SEO_LOOKBACK_DAYS overrides)
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config, capabilities, capabilitySummary } from './lib/config.mjs'
import { gsc, ga4, urlInspect } from './lib/google.mjs'
import { relatedQueries } from './lib/trends.mjs'
import { bing, bingAvailable } from './lib/bing.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DAYS = Math.min(Number(process.env.SEO_LOOKBACK_DAYS || 28), 90)
const caps = capabilities()
const pad = (s, n) => String(s).padEnd(n)
const pct = (n) => `${(n * 100).toFixed(1)}%`
const short = (u) => u.replace(/^https?:\/\/[^/]+/, '') || '/'
const arrow = (cur, prev) => { if (!prev) return ''; const d = (cur - prev) / prev * 100; return `${d >= 0 ? '▲' : '▼'}${Math.abs(d).toFixed(0)}%` }

console.log(`\n━━ DEEP SEO INSIGHT — last ${DAYS} days ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  Site: ${config.google.gscSiteUrl || config.siteUrl}`)
console.log(`  Sources: ${capabilitySummary().join('  ')}`)
if (!caps.searchConsole && !caps.ga4) { console.log('\n  No Google data connected — see scripts/seo/SETUP.md.\n'); process.exit(0) }

const snapshot = { generatedAt: new Date().toISOString(), windowDays: DAYS }

// ── 1) FRESH TREND (catch a recent cliff a 90-day total hides) ──
if (caps.searchConsole) {
  const cmp = await gsc.compare(DAYS)
  console.log(`\n── TREND — this ${DAYS}d vs previous ${DAYS}d ──`)
  console.log(`  Search clicks:      ${cmp.current.clicks}  ${arrow(cmp.current.clicks, cmp.previous.clicks)}   (was ${cmp.previous.clicks})`)
  console.log(`  Search impressions: ${cmp.current.impressions}  ${arrow(cmp.current.impressions, cmp.previous.impressions)}   (was ${cmp.previous.impressions})`)
  snapshot.trend = cmp
}
if (caps.ga4) {
  const daily = await ga4.daily(DAYS)
  const last = daily.slice(-14)
  const sum = (a) => a.reduce((s, r) => s + (r.sessions || 0), 0)
  const wow = sum(last.slice(-7)), prev = sum(last.slice(-14, -7))
  const max = Math.max(1, ...last.map(r => r.sessions || 0))
  const spark = last.map(r => '▁▂▃▄▅▆▇█'[Math.min(7, Math.floor((r.sessions || 0) / max * 7))]).join('')
  console.log(`\n  GA4 sessions (14d): ${spark}   last 7d ${wow} ${arrow(wow, prev)} vs prior 7d ${prev}`)
  snapshot.ga4Daily = daily.slice(-28)
}

// ── 2) CHANNELS / SOURCES (where traffic comes from — spot TikTok/social) ──
if (caps.ga4) {
  const [chan, src] = await Promise.all([ga4.channels(DAYS), ga4.sources(DAYS)])
  console.log(`\n── TRAFFIC SOURCES ──`)
  console.log(`  ${pad('Channel', 22)}Sessions`)
  for (const c of chan.slice(0, 8)) console.log(`  ${pad(c.sessionDefaultChannelGroup, 22)}${c.sessions}`)
  const social = src.filter(s => /tiktok|instagram|youtube|t\.co|facebook|social/i.test(s.sessionSourceMedium))
  if (social.length) console.log(`  social/referral: ${social.map(s => `${s.sessionSourceMedium} (${s.sessions})`).join(', ')}`)
  snapshot.channels = chan; snapshot.sources = src
}

// ── 3) PER-URL OPPORTUNITIES — the core: which URL to push, on which query ──
if (caps.searchConsole) {
  const [pages, strikP] = await Promise.all([gsc.topPages(DAYS), gsc.strikingByPage(DAYS)])
  const byPage = {}
  for (const r of strikP) (byPage[r.page] ||= []).push(r)
  const ranked = pages.filter(p => p.impressions >= 30).sort((a, b) => b.impressions - a.impressions).slice(0, 18)
  console.log(`\n── PER-URL OPPORTUNITIES (rank 5–20 = quick wins) ──`)
  console.log(`  ${pad('URL', 34)}${pad('clicks', 8)}${pad('impr', 8)}${pad('pos', 6)}best striking query (pos · impr)`)
  console.log('  ' + '─'.repeat(96))
  for (const p of ranked) {
    const best = (byPage[p.page] || []).sort((a, b) => b.impressions - a.impressions)[0]
    const bestTxt = best ? `${best.query}  (${best.position.toFixed(0)} · ${best.impressions})` : '—'
    console.log(`  ${pad(short(p.page).slice(0, 33), 34)}${pad(p.clicks, 8)}${pad(p.impressions, 8)}${pad(p.position.toFixed(1), 6)}${bestTxt}`)
  }
  snapshot.perUrl = ranked.map(p => ({ ...p, striking: (byPage[p.page] || []).slice(0, 5) }))

  // Indexation for the top URLs (URL Inspection API; needs owner access).
  console.log(`\n── INDEXATION (top URLs) ──`)
  let inspErr = null
  for (const p of ranked.slice(0, 6)) {
    const r = await urlInspect(p.page)
    if (r.error) { inspErr = r.error; break }
    const idx = r.indexStatusResult || {}
    console.log(`  ${pad(short(p.page), 34)}${idx.verdict || '?'}  ·  ${idx.coverageState || ''}`)
  }
  if (inspErr) console.log(`  (URL Inspection unavailable: ${inspErr} — add the service account as an OWNER in Search Console to enable.)`)
}

// ── 4) FREE DEMAND & EXPANSION — Google Trends rising/related (+ Bing volume if wired) ──
if (caps.searchConsole) {
  const strik = (await gsc.striking(DAYS)).slice(0, 5)
  console.log(`\n── DEMAND & EXPANSION (free — Google Trends related/rising) ──`)
  snapshot.demand = []
  for (const s of strik) {
    const rel = await relatedQueries(s.query)
    const top = rel?.top?.slice(0, 3).map(r => r.query).join(', ')
    const rising = rel?.rising?.slice(0, 3).map(r => `${r.query} (${r.value})`).join(', ')
    console.log(`  "${s.query}"  you #${s.position.toFixed(0)} · ${s.impressions} impr`)
    if (top) console.log(`     related: ${top}`)
    if (rising) console.log(`     rising:  ${rising}`)
    snapshot.demand.push({ query: s.query, position: s.position, impressions: s.impressions, related: rel?.top || [], rising: rel?.rising || [] })
  }
  if (bingAvailable()) {
    try { const k = await bing.keyword(strik[0]?.query); if (k != null) console.log(`\n  Bing volume "${strik[0].query}": ${JSON.stringify(k).slice(0, 120)}`) } catch { /* inert */ }
  } else {
    console.log(`\n  + Bing Webmaster (FREE keyword volume + backlinks) not connected — add BING_API_KEY to .env.seo.local to unlock a second free volume source.`)
  }
  console.log(`\n  → For the exact per-URL on-page + internal-link fixes to gain position, run:  npm run seo-audit`)
}

const out = path.join(HERE, 'reports', `insight-${new Date().toISOString().slice(0, 10)}.json`)
writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n')
writeFileSync(path.join(HERE, 'reports', 'insight-latest.json'), JSON.stringify(snapshot, null, 2) + '\n')
console.log(`\n  Snapshot → ${path.relative(process.cwd(), out)}\n`)
