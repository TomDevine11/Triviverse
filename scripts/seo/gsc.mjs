// `npm run search-console-report` — Google Search Console deep dive.
// Needs the Google service account + GSC_SITE_URL (scripts/seo/SETUP.md).

import { config, capabilities } from './lib/config.mjs'
import { heading, table, num, pct, round, writeReport } from './lib/format.mjs'

if (!capabilities().searchConsole) {
  console.log('Search Console is not configured. See scripts/seo/SETUP.md.')
  process.exit(0)
}

const days = config.defaults.days
const { gsc } = await import('./lib/google.mjs')

console.log(heading(`SEARCH CONSOLE — last ${days} days`))
const [topQ, topP, striking, lowCtr, byPage, countries] = await Promise.all([
  gsc.topQueries(days), gsc.topPages(days), gsc.striking(days), gsc.lowCtr(days), gsc.queriesByPage(days), gsc.countries(days),
])

const qCols = [{ key: 'query', label: 'Query' }, { key: 'clicks', label: 'Clicks', align: 'right' }, { key: 'impressions', label: 'Impr', align: 'right' }, { key: 'ctr', label: 'CTR', align: 'right' }, { key: 'pos', label: 'Pos', align: 'right' }]
const fmtQ = (r) => ({ ...r, clicks: num(r.clicks), impressions: num(r.impressions), ctr: pct(r.ctr), pos: round(r.position) })

console.log('\n  Top queries by clicks:')
console.log(table(topQ.map(fmtQ), qCols, { max: 20 }))
console.log('\n  Top pages by clicks:')
console.log(table(topP.map(r => ({ page: r.page, clicks: num(r.clicks), impressions: num(r.impressions), ctr: pct(r.ctr), pos: round(r.position) })),
  [{ key: 'page', label: 'Page' }, { key: 'clicks', label: 'Clicks', align: 'right' }, { key: 'impressions', label: 'Impr', align: 'right' }, { key: 'ctr', label: 'CTR', align: 'right' }, { key: 'pos', label: 'Pos', align: 'right' }], { max: 20 }))
console.log('\n  ⭐ Striking distance (rank 5–20 — push these to page 1):')
console.log(table(striking.map(fmtQ), qCols, { max: 25 }))
console.log('\n  Low CTR (ranking well, under-clicked — rewrite title/description):')
console.log(table(lowCtr.map(fmtQ), qCols, { max: 20 }))

// Cannibalisation from real data: one query where multiple pages appear.
const qToPages = new Map()
for (const r of byPage) {
  if (!qToPages.has(r.query)) qToPages.set(r.query, [])
  qToPages.get(r.query).push({ page: r.page, clicks: r.clicks, impressions: r.impressions, position: r.position })
}
const realCannib = [...qToPages.entries()].filter(([, ps]) => ps.length > 1).map(([query, ps]) => ({ query, pages: ps.length }))
if (realCannib.length) {
  console.log('\n  ⚠ Real cannibalisation (multiple pages ranking for one query):')
  console.log(table(realCannib.sort((a, b) => b.pages - a.pages), [{ key: 'query', label: 'Query' }, { key: 'pages', label: '#pages', align: 'right' }], { max: 15 }))
}

const path = writeReport('search-console', { lookbackDays: days, topQueries: topQ, topPages: topP, striking, lowCtr, queriesByPage: byPage, countries, cannibalisation: realCannib })
console.log(`\n  Snapshot written: ${path.replace(process.cwd() + '/', '')}`)
