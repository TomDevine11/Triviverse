#!/usr/bin/env node
// The experiment ledger, joined to Search Console.
//
// Why: the repo ships and forgets. 70+ merged PRs and no way to attribute a
// single traffic movement to any of them — "did #58 work?" had no answer, so
// the same ideas can be retried forever and a real win looks like luck.
//
// Each entry in docs/seo/experiments.json names a hypothesis, the URLs and
// queries it should move, the metric that settles it, and the date it shipped.
// This reads the same window before and after that date and prints the delta.
//
//   npm run experiments              all entries
//   npm run experiments -- EXP-001   one entry
//   npm run experiments -- --days 14 use 14-day windows instead of 7
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { capabilities } from './lib/config.mjs'
import { gscQueryRange } from './lib/google.mjs'
import { heading, table, num, pct, round } from './lib/format.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const LEDGER = path.join(HERE, '..', '..', 'docs', 'seo', 'experiments.json')
const LAG = 2 // Search Console lags ~2 days

const argAfter = (name) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : null }
const WINDOW = Number(argAfter('days') || 7)
const ONLY = process.argv.slice(2).find(a => /^EXP-/i.test(a))?.toUpperCase()

const ymd = (d) => d.toISOString().slice(0, 10)
const shift = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d }
const daysBetween = (a, b) => Math.floor((b - a) / 86_400_000)

const totals = (rows) => rows.reduce((acc, r) => {
  acc.clicks += r.clicks; acc.impressions += r.impressions
  acc._posWeight += (r.position || 0) * (r.impressions || 0)
  return acc
}, { clicks: 0, impressions: 0, _posWeight: 0 })

const finish = (t) => ({
  clicks: t.clicks,
  impressions: t.impressions,
  ctr: t.impressions ? t.clicks / t.impressions : 0,
  // Impression-weighted, so one long-tail query at position 80 cannot drag the
  // headline number for a page that ranks 5th on everything that matters.
  position: t.impressions ? t._posWeight / t.impressions : null,
})

async function measure(targets, startDate, endDate) {
  const out = []
  if (targets.pages?.length) {
    for (const page of targets.pages) {
      out.push(...await gscQueryRange({
        dimensions: ['page'], startDate, endDate, rowLimit: 100,
        filters: [{ dimension: 'page', operator: 'contains', expression: page }],
      }))
    }
  }
  if (targets.queries?.length) {
    for (const q of targets.queries) {
      out.push(...await gscQueryRange({
        dimensions: ['query'], startDate, endDate, rowLimit: 100,
        filters: [{ dimension: 'query', operator: 'equals', expression: q }],
      }))
    }
  }
  return finish(totals(out))
}

const arrow = (delta, expected) => {
  if (delta === 0 || delta == null) return '→'
  const good = expected === 'up' ? delta > 0 : delta < 0
  return good ? '▲' : '▼'
}

if (!capabilities().searchConsole) {
  console.error('\n  Search Console is not configured — see scripts/seo/SETUP.md.\n')
  process.exit(1)
}

const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'))
const entries = ledger.experiments.filter(e => !ONLY || e.id === ONLY)
if (!entries.length) { console.error(`\n  No experiment matching ${ONLY}.\n`); process.exit(1) }

console.log(heading('EXPERIMENT LEDGER'))
console.log(`  ${entries.length} experiment(s) · ${WINDOW}-day windows either side of the ship date\n`)

const today = new Date()
for (const e of entries) {
  const shipped = new Date(e.shippedAt)
  const elapsed = daysBetween(shipped, today) - LAG

  console.log(`\n  ${e.id} — ${e.hypothesis}`)
  console.log(`  shipped ${e.shippedAt} · PR ${e.prs.map(n => `#${n}`).join(', ')} · metric: ${e.metric} (expect ${e.expected})`)
  if (e.baseline) console.log(`  baseline: ${e.baseline}`)

  if (elapsed < WINDOW) {
    console.log(`  ⏳ too early — ${Math.max(elapsed, 0)} of ${WINDOW} days of post-ship data available.`)
    continue
  }

  const before = await measure(e.targets, ymd(shift(shipped, -WINDOW)), ymd(shift(shipped, -1)))
  const after = await measure(e.targets, ymd(shift(shipped, 1)), ymd(shift(shipped, WINDOW)))

  const rows = [
    { m: 'Clicks', before: num(before.clicks), after: num(after.clicks), d: `${arrow(after.clicks - before.clicks, e.expected)} ${after.clicks - before.clicks >= 0 ? '+' : ''}${after.clicks - before.clicks}` },
    { m: 'Impressions', before: num(before.impressions), after: num(after.impressions), d: `${arrow(after.impressions - before.impressions, e.expected)} ${after.impressions - before.impressions >= 0 ? '+' : ''}${after.impressions - before.impressions}` },
    { m: 'CTR', before: pct(before.ctr), after: pct(after.ctr), d: `${arrow(after.ctr - before.ctr, e.expected)} ${((after.ctr - before.ctr) * 100).toFixed(2)}pp` },
    // Position improves DOWNWARD, so a negative delta is the good direction.
    { m: 'Position', before: round(before.position), after: round(after.position), d: before.position && after.position ? `${arrow(before.position - after.position, 'up')} ${(after.position - before.position).toFixed(1)}` : '—' },
  ]
  console.log(table(rows, [
    { key: 'm', label: 'Metric' }, { key: 'before', label: `${WINDOW}d before`, align: 'right' },
    { key: 'after', label: `${WINDOW}d after`, align: 'right' }, { key: 'd', label: 'Change', align: 'right' },
  ]))

  if (e.status === 'concluded') console.log(`  ✓ concluded: ${e.conclusion}`)
  else console.log(`  … open — no conclusion recorded yet.`)
}

console.log(heading('DONE'))
console.log('  Record a conclusion by setting status/conclusion in docs/seo/experiments.json.\n')
