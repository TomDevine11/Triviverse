#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD — the whole Football 501 pipeline in one command.
//
//   node scripts/pie/build.mjs [--days 180] [--seed 1] [--start 2026-08-01] [--no-pool]
//
// Produces (under scripts/pie/out/):
//   pool.json      — compiled + scored candidate catalogue
//   schedule.json  — the daily schedule: which question runs each day, with the
//                    answer board, difficulty, hook, metadata and the reasons it
//                    was chosen (+ the runners-up it beat).
//
// No question is authored by hand. Deterministic: same inputs → same schedule.
// ─────────────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { schedule } from './scheduler.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'out')
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d }
const has = (f) => process.argv.includes(f)

const days = +arg('--days', 180)
const seed = +arg('--seed', 1)
const startDate = arg('--start', '2026-08-01')

if (!has('--no-pool')) {
  console.error('· compiling catalogue (pool.mjs)…')
  execFileSync('node', [path.join(__dirname, 'pool.mjs')], { stdio: 'inherit' })
}
const candidates = JSON.parse(readFileSync(path.join(OUT, 'pool.json'), 'utf8')).candidates
const registry = existsSync(path.join(__dirname, 'registry.json')) ? JSON.parse(readFileSync(path.join(__dirname, 'registry.json'), 'utf8')) : {}

console.error(`· scheduling ${days} days from ${startDate} (seed ${seed})…`)
const result = schedule({ candidates, days, startDate, seed, registry })
writeFileSync(path.join(OUT, 'schedule.json'), JSON.stringify(result) + '\n')

// report
const s = result.schedule
console.error(`✓ scheduled ${s.length} days (${result.meta.eligible} eligible questions). First week:`)
for (const d of s.slice(0, 7)) console.error(`  ${d.date}  ${d.title}`)
console.error(`  … → schedule.json`)
