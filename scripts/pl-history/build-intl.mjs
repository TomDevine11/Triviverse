#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD CANONICAL INTERNATIONAL  (RFC-001 backlog C7, part 2)
//
// Canonicalises the national-team scrape cache (data/pl-history/cache/intl/) into
// canonical international-career facts + the national-team roster of the Team
// dimension. Grain is Player × NationalTeam (career caps + goals) — the static
// TM data-header gives senior career totals, not a per-edition breakdown (that
// table is a JS-hydrated component), so this is coarser than club Performance by
// necessity and is stored as its own fact rather than performance.<comp>.
//
// Emits src/data/football501/intl.generated.json:
//   { meta, teams:{teamId:name}, intl:[[playerId,teamId,caps,goals], …] }
//
//   node scripts/pl-history/build-intl.mjs   (offline; reads the intl cache)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const CACHE = path.join(ROOT, 'data', 'pl-history', 'cache', 'intl')
const OUT = path.join(ROOT, 'src', 'data', 'football501', 'intl.generated.json')
const SCHEMA_VERSION = 1

if (!existsSync(CACHE)) { console.error(`No intl cache at ${path.relative(ROOT, CACHE)} — run \`npm run scrape:intl\` first.`); process.exit(1) }

const files = readdirSync(CACHE).filter(f => f.endsWith('.json'))
const teams = {}       // teamId → national team name
const intl = []        // [playerId, teamId, caps, goals]
let skippedNoTeam = 0
for (const f of files) {
  const j = JSON.parse(readFileSync(path.join(CACHE, f), 'utf8'))
  if (!(j.caps > 0 || j.goals > 0)) continue // no senior international career
  if (!j.teamId) { skippedNoTeam++; continue }
  const tid = String(j.teamId)
  if (j.team && !teams[tid]) teams[tid] = j.team
  intl.push([String(j.id), tid, j.caps || 0, j.goals || 0])
}
intl.sort((a, b) => b[3] - a[3] || b[2] - a[2] || a[0].localeCompare(b[0], undefined, { numeric: true }))

const meta = {
  schemaVersion: SCHEMA_VERSION, source: 'transfermarkt:nationalmannschaft (scraped)',
  grain: 'player×nationalTeam (career)', columns: ['playerId', 'teamId', 'caps', 'goals'],
  players: intl.length, nationalTeams: Object.keys(teams).length, generatedAt: new Date().toISOString().slice(0, 10),
}
writeFileSync(OUT, JSON.stringify({ meta, teams, intl }) + '\n')
console.error(`✓ intl: ${intl.length} players with a senior international career across ${Object.keys(teams).length} national teams` +
  `${skippedNoTeam ? ` (${skippedNoTeam} skipped: caps but no team id)` : ''}`)
console.error(`  top scorers: ${intl.slice(0, 5).map(r => `${r[0]}=${r[3]}`).join(', ')}`)
