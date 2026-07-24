// `npm run seo-report` — the orchestrator.
//
// Runs every data source that's configured, cross-references them, and writes a
// machine-readable snapshot to scripts/seo/reports/ so future sessions can read
// fresh data instead of re-querying. Degrades gracefully: with zero credentials
// it still gives you the site model + live search demand.

import { config, capabilities, capabilitySummary } from './lib/config.mjs'
import { routeModel, cannibalisation, hygiene, games } from './lib/site.mjs'
import { autosuggest } from './lib/demand.mjs'
import { searchVolume, keywordsAvailable } from './lib/keywords.mjs'
import { heading, table, num, pct, round, writeReport } from './lib/format.mjs'

const days = config.defaults.days
const caps = capabilities()
const snapshot = { lookbackDays: days, capabilities: caps, site: {}, demand: {}, searchConsole: {}, analytics: {} }

console.log(heading('SEO INTELLIGENCE REPORT'))
console.log(`  Site: ${config.siteUrl}   Lookback: ${days} days`)
console.log('\n  Data sources:')
for (const line of capabilitySummary()) console.log(`    ${line}`)

// ── Site model (always) ──────────────────────────────────────────────────────
const routes = routeModel()
const cannib = cannibalisation()
const flags = hygiene()
snapshot.site = { routes, cannibalisation: cannib, hygiene: flags }

console.log(heading('YOUR SITE'))
console.log(`  ${routes.length} routes (${games().length} games + home).`)
if (cannib.length) {
  console.log('\n  ⚠ Keyword cannibalisation (same target on multiple pages — splits ranking):')
  console.log(table(cannib.map(c => ({ keyword: c.keyword, pages: c.paths.join(', ') })), [
    { key: 'keyword', label: 'Target keyword' }, { key: 'pages', label: 'Declared on' },
  ]))
}
if (flags.length) {
  console.log('\n  On-page hygiene flags:')
  console.log(table(flags, [{ key: 'path', label: 'Page' }, { key: 'issue', label: 'Issue' }, { key: 'value', label: 'Detail' }], { max: 20 }))
}

// ── Search demand (always — free autosuggest) ────────────────────────────────
// A name "autocompleting" isn't enough — it must autocomplete into FOOTBALL
// intent. "Teammates"/"Career Path" autocomplete, but to "teammates academy" /
// "career pathways" (off-topic), which is exactly the naming trap to catch.
const FOOTY = ['football', 'soccer', 'footballer', 'player', 'fifa', 'league', 'club', 'world cup', 'premier', 'messi', 'ronaldo']
console.log(heading('SEARCH DEMAND — does your naming own FOOTBALL intent?'))
const demandRows = []
for (const g of games()) {
  const s = await autosuggest(g.name.toLowerCase())
  const onTopic = s.some(x => FOOTY.some(f => x.toLowerCase().includes(f)))
  demandRows.push({ game: g.name, footballIntent: onTopic ? 'yes' : 'NO ⚠', top: (s.slice(0, 3).join(' · ') || '—') })
}
snapshot.demand.nameCheck = demandRows
console.log(table(demandRows, [
  { key: 'game', label: 'Game (your name)' },
  { key: 'footballIntent', label: 'Football intent?' },
  { key: 'top', label: 'What the name actually autocompletes to' },
], { max: 12 }))
console.log('  "NO ⚠" = the bare name autocompletes to non-football meaning → ambiguous. Prefix "Football", rename, or lean on the descriptive title. `npm run seo-suggest` for depth.')

// ── Keyword volume (if configured) ───────────────────────────────────────────
if (keywordsAvailable()) {
  try {
    const vol = await searchVolume(games().map(g => g.name.toLowerCase()))
    snapshot.demand.volume = vol
    console.log('\n  Monthly search volume for your game names:')
    console.log(table(vol.map(v => ({ keyword: v.keyword, volume: num(v.volume), cpc: v.cpc ?? '—' })), [
      { key: 'keyword', label: 'Keyword' }, { key: 'volume', label: 'Volume', align: 'right' }, { key: 'cpc', label: 'CPC', align: 'right' },
    ]))
  } catch (e) { console.log(`  (keyword volume failed: ${e.message})`) }
}

// ── Search Console (if configured) ───────────────────────────────────────────
if (caps.searchConsole) {
  console.log(heading('SEARCH CONSOLE'))
  try {
    const { gsc } = await import('./lib/google.mjs')
    const [topQ, topP, striking, lowCtr] = await Promise.all([
      gsc.topQueries(days), gsc.topPages(days), gsc.striking(days), gsc.lowCtr(days),
    ])
    snapshot.searchConsole = { topQueries: topQ, topPages: topP, striking, lowCtr }
    console.log('\n  Top queries:')
    console.log(table(topQ.map(r => ({ q: r.query, clicks: num(r.clicks), impr: num(r.impressions), ctr: pct(r.ctr), pos: round(r.position) })),
      [{ key: 'q', label: 'Query' }, { key: 'clicks', label: 'Clicks', align: 'right' }, { key: 'impr', label: 'Impr', align: 'right' }, { key: 'ctr', label: 'CTR', align: 'right' }, { key: 'pos', label: 'Pos', align: 'right' }]))
    console.log('\n  ⭐ Striking distance (rank 5–20, real impressions — quickest wins):')
    console.log(table(striking.map(r => ({ q: r.query, impr: num(r.impressions), pos: round(r.position) })),
      [{ key: 'q', label: 'Query' }, { key: 'impr', label: 'Impr', align: 'right' }, { key: 'pos', label: 'Pos', align: 'right' }]))
    console.log('\n  Low-CTR (top-10 but under-clicked — title/description rewrite):')
    console.log(table(lowCtr.map(r => ({ q: r.query, impr: num(r.impressions), ctr: pct(r.ctr), pos: round(r.position) })),
      [{ key: 'q', label: 'Query' }, { key: 'impr', label: 'Impr', align: 'right' }, { key: 'ctr', label: 'CTR', align: 'right' }, { key: 'pos', label: 'Pos', align: 'right' }]))
  } catch (e) { console.log(`  Search Console error: ${e.message}`) }
}

// ── GA4 (if configured) ──────────────────────────────────────────────────────
if (caps.ga4) {
  console.log(heading('GOOGLE ANALYTICS 4'))
  try {
    const { ga4 } = await import('./lib/google.mjs')
    const [landing, channels, devices, nvr] = await Promise.all([
      ga4.topLandingPages(days), ga4.channels(days), ga4.devices(days), ga4.newVsReturning(days),
    ])
    snapshot.analytics = { landing, channels, devices, newVsReturning: nvr }
    console.log('\n  Top landing pages:')
    console.log(table(landing.map(r => ({ page: r.landingPagePlusQueryString, sessions: num(r.sessions), engaged: num(r.engagedSessions), dur: `${round(r.averageSessionDuration)}s` })),
      [{ key: 'page', label: 'Landing page' }, { key: 'sessions', label: 'Sessions', align: 'right' }, { key: 'engaged', label: 'Engaged', align: 'right' }, { key: 'dur', label: 'Avg dur', align: 'right' }]))
    console.log('\n  Channels:')
    console.log(table(channels.map(r => ({ ch: r.sessionDefaultChannelGroup, sessions: num(r.sessions) })), [{ key: 'ch', label: 'Channel' }, { key: 'sessions', label: 'Sessions', align: 'right' }]))
  } catch (e) { console.log(`  GA4 error: ${e.message}`) }
}

const path = writeReport('seo-report', snapshot)
console.log(heading('DONE'))
console.log(`  Snapshot written: ${path.replace(process.cwd() + '/', '')}`)
console.log('  (and seo-report-latest.json — future sessions read this for fresh data)')
if (!caps.searchConsole || !caps.ga4) {
  console.log('\n  To unlock traffic + query data, connect Google → see scripts/seo/SETUP.md')
}
