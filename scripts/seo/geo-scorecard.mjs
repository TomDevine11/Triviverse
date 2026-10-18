#!/usr/bin/env node
// `npm run seo-borderline` — the Borderline SEO scorecard (any geography game works:
// `node scripts/seo/geo-scorecard.mjs outrank`). One run answers four separate questions:
//   1. Are people searching for this kind of game?   → Bing keyword impressions
//   2. Do search engines show the page?               → Search Console + Bing page stats, index status
//   3. Do searchers click?                            → clicks / CTR by query
//   4. Do those visitors play, finish, share, return? → GA4 events on the page
// Every number comes from an API at run time; a source that isn't configured is
// reported as missing, never estimated. Search Console and GA4 count different things
// (search clicks vs sessions with consent and JS), so their totals will not match.
// Definitions and the manual workflow: docs/seo/borderline.md.
import { config, capabilities } from './lib/config.mjs'
import { writeReport, num, pct, round } from './lib/format.mjs'
import { GEO_ROUTES, SITE_URL } from '../../src/geography/seo.js'

const game = process.argv[2] || 'borderline'
const route = GEO_ROUTES.find(r => r.path === `/geography/${game}`)
if (!route) { console.error(`No geography route for "${game}"`); process.exit(1) }
const PATH = route.path
const URL_ = SITE_URL + PATH
const DAYS = 28
const caps = capabilities()

// Query families this page is meant to win (docs/seo/borderline.md → keyword map).
const INTENT = {
  borderline: /^(?!.*football).*\b(shape|silhouette|outline|country guess|guess (the|a) country|country guesser|worldle|borderline)\b/i,
}[game] || new RegExp(route.name, 'i')

const out = { game, url: URL_, days: DAYS, sources: {} }
const line = (s = '') => console.log(s)
const ymd = (d) => d.toISOString().slice(0, 10)
const ago = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return ymd(d) }
const safe = async (label, fn) => { try { return await fn() } catch (e) { out.sources[label] = `error: ${e.message.slice(0, 160)}`; return null } }

line(`\nSEO SCORECARD — ${route.name} (${URL_}) — last ${DAYS} days vs the ${DAYS} before\n`)

// ── Technical health (live) ────────────────────────────────────────────────
const live = await safe('live', async () => {
  const res = await fetch(URL_, { redirect: 'manual' })
  const html = await res.text()
  const pick = (re) => (html.match(re) || [])[1] || null
  const sitemap = await (await fetch(`${SITE_URL}/sitemap.xml`)).text()
  const ogImage = pick(/<meta property="og:image" content="([^"]+)"/)
  const ogStatus = ogImage ? (await fetch(ogImage, { method: 'HEAD' })).status : null
  return {
    status: res.status,
    title: pick(/<title>([^<]*)<\/title>/),
    canonical: pick(/<link rel="canonical" href="([^"]+)"/),
    robots: pick(/<meta name="robots" content="([^"]+)"/),
    h1: pick(/<h1[^>]*>([^<]*)<\/h1>/),
    inSitemap: sitemap.includes(`<loc>${URL_}</loc>`),
    ogImage, ogStatus,
  }
})
if (live) {
  out.technical = live
  line('Technical health')
  line(`  HTTP ${live.status} · canonical ${live.canonical === URL_ ? 'self ✓' : `✗ ${live.canonical}`} · robots ${live.robots} · sitemap ${live.inSitemap ? '✓' : '✗'} · og:image ${live.ogStatus ?? 'none'}`)
  line(`  title: ${live.title}`)
  line(`  h1:    ${live.h1}`)
}

// ── Google Search Console ──────────────────────────────────────────────────
if (caps.searchConsole) {
  const { gscQueryRange, urlInspect } = await import('./lib/google.mjs')
  const page = [{ dimension: 'page', operator: 'equals', expression: URL_ }]
  const cur = { startDate: ago(DAYS + 2), endDate: ago(3) }
  const prev = { startDate: ago(DAYS * 2 + 2), endDate: ago(DAYS + 3) }
  const tot = (rows) => {
    const t = rows.reduce((s, r) => ({ clicks: s.clicks + r.clicks, impressions: s.impressions + r.impressions, pw: s.pw + r.position * r.impressions }), { clicks: 0, impressions: 0, pw: 0 })
    return { clicks: t.clicks, impressions: t.impressions, ctr: t.impressions ? t.clicks / t.impressions : null, position: t.impressions ? t.pw / t.impressions : null }
  }
  const g = await safe('gsc', async () => {
    const [qNow, qPrev, devices, countries, allPages, inspect] = await Promise.all([
      gscQueryRange({ dimensions: ['query'], ...cur, filters: page, rowLimit: 500 }),
      gscQueryRange({ dimensions: ['query'], ...prev, filters: page, rowLimit: 500 }),
      gscQueryRange({ dimensions: ['device'], ...cur, filters: page }),
      gscQueryRange({ dimensions: ['country'], ...cur, filters: page, rowLimit: 10 }),
      gscQueryRange({ dimensions: ['query', 'page'], ...cur, rowLimit: 5000 }),
      urlInspect(URL_),
    ])
    // Page totals from the date dimension (query rows omit anonymised queries).
    const [dNow, dPrev] = await Promise.all([
      gscQueryRange({ dimensions: ['date'], ...cur, filters: page, rowLimit: 100 }),
      gscQueryRange({ dimensions: ['date'], ...prev, filters: page, rowLimit: 100 }),
    ])
    return { qNow, qPrev, devices, countries, allPages, inspect, now: tot(dNow), before: tot(dPrev), daily: dNow }
  })
  if (g) {
    const idx = g.inspect?.indexStatusResult || {}
    out.gsc = {
      period: cur, previous: prev, now: g.now, before: g.before,
      index: { coverage: idx.coverageState || g.inspect?.error, lastCrawl: idx.lastCrawlTime || null, googleCanonical: idx.googleCanonical || null },
      topQueries: g.qNow.sort((a, b) => b.impressions - a.impressions).slice(0, 25),
      lowCtr: g.qNow.filter(r => r.impressions >= 50 && r.ctr < 0.02),
      striking: g.qNow.filter(r => r.position >= 5 && r.position <= 20 && r.impressions >= 10),
      devices: g.devices, countries: g.countries,
      // Queries in this page's intent family that Google answers with a different Triviverse page.
      wrongPage: g.allPages.filter(r => INTENT.test(r.query) && r.page !== URL_).slice(0, 20),
    }
    const d = (a, b, f) => (b == null || b === 0 ? '' : ` (${a >= b ? '+' : ''}${f(a - b)})`)
    line('\nGoogle Search Console')
    line(`  index: ${out.gsc.index.coverage}${out.gsc.index.lastCrawl ? ` · last crawl ${out.gsc.index.lastCrawl.slice(0, 10)}` : ''}`)
    line(`  clicks ${num(g.now.clicks)}${d(g.now.clicks, g.before.clicks, num)} · impressions ${num(g.now.impressions)}${d(g.now.impressions, g.before.impressions, num)} · CTR ${pct(g.now.ctr)} · avg position ${round(g.now.position)} (previous ${round(g.before.position)})`)
    for (const r of out.gsc.topQueries.slice(0, 12)) line(`    ${r.query.padEnd(42)} ${String(r.impressions).padStart(6)} impr  ${String(r.clicks).padStart(4)} clk  ${pct(r.ctr).padStart(6)}  pos ${round(r.position)}`)
    if (out.gsc.lowCtr.length) line(`  low CTR (≥50 impr, <2%): ${out.gsc.lowCtr.map(r => r.query).join(' · ')}`)
    if (out.gsc.striking.length) line(`  striking distance (pos 5–20): ${out.gsc.striking.map(r => `${r.query} (${round(r.position)})`).join(' · ')}`)
    if (out.gsc.wrongPage.length) line(`  intent queries landing on another page: ${out.gsc.wrongPage.map(r => `${r.query} → ${r.page.replace(SITE_URL, '')}`).join(' · ')}`)
  }
} else out.sources.gsc = 'not configured (scripts/seo/SETUP.md)'

// ── Bing Webmaster ─────────────────────────────────────────────────────────
if (caps.bing) {
  const BASE = 'https://ssl.bing.com/webmaster/api.svc/json'
  const call = async (method, params = {}) => {
    const qs = new URLSearchParams({ apikey: config.bing.apiKey, siteUrl: config.bing.siteUrl, ...params })
    return (await (await fetch(`${BASE}/${method}?${qs}`)).json())?.d
  }
  const b = await safe('bing', async () => {
    const pages = (await call('GetPageStats')) || []
    const mine = pages.filter(p => (p.Query || p.Url || '').replace(/\/$/, '') === URL_)
    const pq = (await call('GetPageQueryStats', { page: URL_ })) || []
    // Demand: Bing's own impression counts for the target families (GB, ~6 months weekly).
    const demand = []
    for (const q of ['guess the country game', 'country guesser', 'country guessing game', 'guess the country by shape', 'worldle unlimited', 'geography wordle']) {
      const rows = (await call('GetKeywordStats', { q, country: 'gb', language: 'en-GB' })) || []
      demand.push({ query: q, weeks: rows.length, impressions: rows.reduce((s, r) => s + (r.Impressions || 0), 0) })
    }
    return { page: mine, queries: pq, demand }
  })
  if (b) {
    const clicks = b.page.reduce((s, r) => s + (r.Clicks || 0), 0), impr = b.page.reduce((s, r) => s + (r.Impressions || 0), 0)
    out.bing = { clicks, impressions: impr, queries: b.queries.slice(0, 25).map(q => ({ query: q.Query, impressions: q.Impressions, clicks: q.Clicks, position: q.AvgImpressionPosition })), demand: b.demand }
    line('\nBing (≈ half of Triviverse search traffic; ranks the site differently from Google)')
    line(`  page: ${num(clicks)} clicks · ${num(impr)} impressions (Bing's reporting window)`)
    for (const q of out.bing.queries.slice(0, 8)) line(`    ${String(q.query).padEnd(42)} ${String(q.impressions).padStart(6)} impr  ${String(q.clicks).padStart(4)} clk  pos ${round(q.position)}`)
    line('  demand — Bing GB impressions, last ~6 months (Bing only; Google volumes are not available here):')
    for (const k of b.demand) line(`    ${k.query.padEnd(30)} ${num(k.impressions)}`)
  }
} else out.sources.bing = 'not configured'

// ── GA4: acquisition + gameplay ────────────────────────────────────────────
if (caps.ga4) {
  const { ga4Run } = await import('./lib/google.mjs')
  const onPage = { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'EXACT', value: PATH } } }
  const landing = { filter: { fieldName: 'landingPage', stringFilter: { matchType: 'EXACT', value: PATH } } }
  const a = await safe('ga4', async () => {
    const [channels, events, eventsByChannel, returning, byMode] = await Promise.all([
      ga4Run({ dimensions: ['sessionDefaultChannelGroup', 'sessionSource'], metrics: ['sessions', 'engagedSessions'], days: DAYS, limit: 50, dimensionFilter: landing }),
      ga4Run({ dimensions: ['eventName'], metrics: ['eventCount', 'totalUsers'], days: DAYS, limit: 50, dimensionFilter: onPage }),
      ga4Run({ dimensions: ['sessionDefaultChannelGroup', 'eventName'], metrics: ['eventCount'], days: DAYS, limit: 200, dimensionFilter: onPage }),
      ga4Run({ dimensions: ['newVsReturning'], metrics: ['sessions', 'activeUsers'], days: DAYS, dimensionFilter: onPage }),
      // Needs the `game_mode` event-scoped custom dimension (docs/seo/borderline.md); absent until registered.
      ga4Run({ dimensions: ['eventName', 'customEvent:game_mode'], metrics: ['eventCount'], days: DAYS, limit: 50, dimensionFilter: onPage }).catch(() => null),
    ])
    return { channels, events, eventsByChannel, returning, byMode }
  })
  if (a) {
    const ev = (name, rows = a.events) => rows.filter(r => r.eventName === name).reduce((s, r) => s + r.eventCount, 0)
    const organicRows = a.eventsByChannel.filter(r => r.sessionDefaultChannelGroup === 'Organic Search')
    const organicSessions = a.channels.filter(r => r.sessionDefaultChannelGroup === 'Organic Search').reduce((s, r) => s + r.sessions, 0)
    const landingSessions = a.channels.reduce((s, r) => s + r.sessions, 0)
    const starts = ev('game_start'), completes = ev('game_complete'), shares = ev('share'), related = ev('related_game_click')
    const ratio = (n, d) => (d ? n / d : null)
    out.ga4 = {
      landingSessions, organicSessions,
      organicBySource: a.channels.filter(r => r.sessionDefaultChannelGroup === 'Organic Search'),
      events: Object.fromEntries(a.events.map(r => [r.eventName, r.eventCount])),
      organicEvents: Object.fromEntries(organicRows.map(r => [r.eventName, r.eventCount])),
      rates: {
        // Approximations from event counts; see the denominators note in the doc.
        organicStartRate: ratio(ev('game_start', organicRows), organicSessions),
        completionRate: ratio(completes, starts),
        shareRate: ratio(shares, completes),
        relatedClickRate: ratio(related, ev('page_view')),
      },
      newVsReturning: a.returning,
      byMode: a.byMode,
    }
    const r = out.ga4.rates
    line('\nGA4 (consented, JS-enabled visits only)')
    line(`  landing sessions ${num(landingSessions)} · organic ${num(organicSessions)} (${out.ga4.organicBySource.map(s => `${s.sessionSource} ${s.sessions}`).join(', ') || 'none'})`)
    line(`  page_view ${num(ev('page_view'))} · game_start ${num(starts)} · guess_submitted ${num(ev('guess_submitted'))} · game_complete ${num(completes)} · share ${num(shares)} · related_game_click ${num(related)}`)
    line(`  organic start rate ${pct(r.organicStartRate)} · completion ${pct(r.completionRate)} · share ${pct(r.shareRate)} · related-game clicks per view ${pct(r.relatedClickRate)}`)
    line(`  new vs returning: ${a.returning.map(x => `${x.newVsReturning || '(not set)'} ${x.sessions}`).join(' · ')}`)
    if (!a.byMode) line('  daily/unlimited split: register the game_mode custom dimension to see it')
    else line(`  by mode: ${a.byMode.map(x => `${x.eventName}/${x['customEvent:game_mode']} ${x.eventCount}`).join(' · ')}`)
  }
} else out.sources.ga4 = 'not configured'

const path = writeReport(`${game}-scorecard`, out)
line(`\nSnapshot → ${path.replace(process.cwd() + '/', '')}`)
