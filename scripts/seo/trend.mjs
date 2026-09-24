#!/usr/bin/env node
// Trend detection across 7 / 28 / 90-day windows.
//
// Why this exists: every other report in this layer reads ONE window, and
// seo-report defaults to 90 days. A 90-day average hides exactly the thing
// worth acting on — a page that started moving last week. On 2026-09-24,
// "football connections" showed 469 impressions at position 11.4 over 90 days
// while the last 7 days alone were 300 impressions at position 6.4 with clicks
// up 600%. The surge was invisible in every report we had.
//
//   npm run seo-trends            queries + pages, recent 7d vs prior 7d
//   npm run seo-trends -- --days 28   compare 28d windows instead
//
// Search Console lags ~2 days, so every window ends there.
import { config, capabilities } from './lib/config.mjs'
import { gscQueryRange } from './lib/google.mjs'
import { heading, table, num, pct, round, writeReport } from './lib/format.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback
}
const WINDOW = arg('days', 7)
const LAG = 2

const ymd = (d) => d.toISOString().slice(0, 10)
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d }
const rangeEnding = (endOffset, length) => ({
  startDate: ymd(daysAgo(endOffset + length - 1)),
  endDate: ymd(daysAgo(endOffset)),
})

const RECENT = rangeEnding(LAG, WINDOW)
const PRIOR = rangeEnding(LAG + WINDOW, WINDOW)
const LONG = rangeEnding(LAG, 90)

// A query/page only counts as a mover if it cleared this many impressions in
// the recent window — otherwise single-digit noise dominates the table.
const MIN_IMPRESSIONS = 25

async function windowed(dimension) {
  const [recent, prior, long] = await Promise.all([
    gscQueryRange({ dimensions: [dimension], ...RECENT, rowLimit: 500 }),
    gscQueryRange({ dimensions: [dimension], ...PRIOR, rowLimit: 500 }),
    gscQueryRange({ dimensions: [dimension], ...LONG, rowLimit: 500 }),
  ])
  const byKey = (rows) => new Map(rows.map(r => [r[dimension], r]))
  const p = byKey(prior)
  const l = byKey(long)

  return recent
    .filter(r => r.impressions >= MIN_IMPRESSIONS)
    .map((r) => {
      const was = p.get(r[dimension])
      const all = l.get(r[dimension])
      return {
        key: r[dimension],
        clicks: r.clicks,
        clicksWas: was?.clicks ?? 0,
        clicksDelta: r.clicks - (was?.clicks ?? 0),
        impressions: r.impressions,
        impressionsWas: was?.impressions ?? 0,
        impressionsDelta: r.impressions - (was?.impressions ?? 0),
        position: r.position,
        positionWas: was?.position ?? null,
        // Negative = improved (position 11 -> 6 is -5).
        positionDelta: was ? r.position - was.position : null,
        position90: all?.position ?? null,
        isNew: !was,
      }
    })
}

const sign = (n, d = 0) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(d)}`)

function report(label, rows) {
  console.log(heading(label))

  // RISING: gaining impressions AND improving position — the Connections shape.
  const rising = rows
    .filter(r => r.impressionsDelta > 0 && (r.positionDelta == null || r.positionDelta < -0.5))
    .sort((a, b) => b.impressionsDelta - a.impressionsDelta)
  console.log(`\n  ▲ Rising — more impressions AND a better position than the previous ${WINDOW} days:`)
  console.log(rising.length
    ? table(rising.map(r => ({
        k: r.key, clicks: `${num(r.clicks)} (${sign(r.clicksDelta)})`,
        impr: `${num(r.impressions)} (${sign(r.impressionsDelta)})`,
        pos: `${round(r.position)} (${sign(r.positionDelta, 1)})`, p90: round(r.position90),
      })), [
        { key: 'k', label: 'Query / page' }, { key: 'clicks', label: 'Clicks', align: 'right' },
        { key: 'impr', label: 'Impressions', align: 'right' }, { key: 'pos', label: 'Position', align: 'right' },
        { key: 'p90', label: '90d pos', align: 'right' },
      ])
    : '    (none)')

  // FALLING: losing position materially.
  const falling = rows.filter(r => r.positionDelta != null && r.positionDelta > 1).sort((a, b) => b.positionDelta - a.positionDelta)
  console.log(`\n  ▼ Falling — position worse by more than 1 place:`)
  console.log(falling.length
    ? table(falling.map(r => ({
        k: r.key, impr: `${num(r.impressions)} (${sign(r.impressionsDelta)})`,
        pos: `${round(r.position)} (${sign(r.positionDelta, 1)})`,
      })), [
        { key: 'k', label: 'Query / page' }, { key: 'impr', label: 'Impressions', align: 'right' },
        { key: 'pos', label: 'Position', align: 'right' },
      ])
    : '    (none)')

  // NEW: no impressions at all in the previous window.
  const fresh = rows.filter(r => r.isNew).sort((a, b) => b.impressions - a.impressions)
  console.log(`\n  ✦ New — no impressions in the previous ${WINDOW} days:`)
  console.log(fresh.length
    ? table(fresh.map(r => ({ k: r.key, impr: num(r.impressions), pos: round(r.position) })),
        [{ key: 'k', label: 'Query / page' }, { key: 'impr', label: 'Impressions', align: 'right' }, { key: 'pos', label: 'Position', align: 'right' }])
    : '    (none)')

  return { rising, falling, fresh }
}

if (!capabilities().searchConsole) {
  console.error('\n  Search Console is not configured — see scripts/seo/SETUP.md.\n')
  process.exit(1)
}

console.log(`\n  Site: ${config.google.gscSiteUrl}`)
console.log(`  Recent  ${RECENT.startDate} → ${RECENT.endDate}`)
console.log(`  Prior   ${PRIOR.startDate} → ${PRIOR.endDate}`)
console.log(`  Minimum ${MIN_IMPRESSIONS} impressions in the recent window.`)

const queries = await windowed('query')
const pages = await windowed('page')
const q = report('QUERIES', queries)
const p = report('PAGES', pages)

console.log(heading('DONE'))
writeReport('trend', {
  generatedAt: new Date().toISOString(),
  windowDays: WINDOW,
  ranges: { recent: RECENT, prior: PRIOR },
  minImpressions: MIN_IMPRESSIONS,
  queries: { rising: q.rising, falling: q.falling, new: q.fresh },
  pages: { rising: p.rising, falling: p.falling, new: p.fresh },
})
