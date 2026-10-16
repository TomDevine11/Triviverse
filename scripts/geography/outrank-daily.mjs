#!/usr/bin/env node
// Print Outrank's daily comparisons for a date, with answers and difficulty, and
// validate them against the dataset. Read-only: for checking what players will get.
//
//   npm run outrank:daily                 # today
//   npm run outrank:daily -- 2026-12-25   # a given date (UK puzzle day)
//   npm run outrank:daily -- 2026-12-25 30  # that date and the next 29, summary only
import { geoDay } from '../../src/geography/data/day.js'
import {
  dailyQuestions, puzzleNumber, validateDaily, outcomeOf, gapOf, tierOf, nameOf, valueOf, formatValue, factFor, STATS,
} from '../../src/geography/data/outrank.js'

const [dateArg, countArg] = process.argv.slice(2)
const start = dateArg ? geoDay(Date.parse(`${dateArg}T12:00:00Z`)) : geoDay()
if (!Number.isFinite(start)) { console.error(`Not a date: ${dateArg}`); process.exit(1) }
const count = Math.max(1, Number(countArg) || 1)
const iso = (day) => new Date(day * 86400000).toISOString().slice(0, 10)

let bad = 0
for (let day = start; day < start + count; day++) {
  const qs = dailyQuestions(day)
  const problems = validateDaily(qs)
  if (problems.length) bad++
  const highs = qs.filter(q => outcomeOf(q) === 'higher').length
  console.log(`\nOutrank #${puzzleNumber(day)} · ${iso(day)} · ${highs} higher / ${10 - highs} lower${problems.length ? ` · ✗ ${problems.join('; ')}` : ' · ✓ valid'}`)
  if (count > 1) continue
  qs.forEach((q, i) => {
    const s = STATS[q.stat]
    console.log(`${String(i + 1).padStart(2)}. ${s.label.padEnd(18)} ${nameOf(q.a)} (${formatValue(q.stat, valueOf(q.a, q.stat))}) → ${nameOf(q.b)} (${formatValue(q.stat, valueOf(q.b, q.stat))})  ${outcomeOf(q).toUpperCase()}  gap ${gapOf(q.a, q.b, q.stat).toFixed(2)} · tiers ${tierOf(q.a)}/${tierOf(q.b)}`)
    console.log(`    ${factFor(q)}`)
  })
}
if (bad) { console.error(`\n✗ ${bad} invalid day(s)`); process.exit(1) }
