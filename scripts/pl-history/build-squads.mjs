#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD CANONICAL SQUADS  (RFC-001 backlog C8, part 1)
//
// Canonicalises the raw club-season cache into SquadMembership — a player's
// affiliation to one team for one season — at grain Player × Team × Season.
// UNLIKE Performance (apps > 0 only), squad membership includes every rostered
// player (including 0-appearance squad members), because the roster IS the
// membership fact.
//
// Reads the git-ignored raw cache (data/pl-history/cache/<comp>/<season>-<club>.json),
// so it runs only where the scrape cache is present (offline — no network).
// Output squads.<comp>.generated.json is committed, like history/performance.
//
//   node scripts/pl-history/build-squads.mjs
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const CACHE = path.join(ROOT, 'data', 'pl-history', 'cache')
const OUT = (c) => path.join(ROOT, 'src', 'data', 'football501', `squads.${c}.generated.json`)
const COMPS = ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']
const SCHEMA_VERSION = 1

// referential-integrity references (built by C4)
const teamIds = new Set(JSON.parse(readFileSync(path.join(ROOT, 'src/data/canonical/teams.generated.json'), 'utf8')).teams.map(t => t.id))
const seasonIds = new Set(JSON.parse(readFileSync(path.join(ROOT, 'src/data/canonical/seasons.generated.json'), 'utf8')).seasons.map(s => s.id))

function buildComp(c) {
  const dir = path.join(CACHE, c)
  if (!existsSync(dir)) { console.error(`  ! ${c}: no cache dir — skipped`); return 0 }
  const files = readdirSync(dir).filter(f => f.endsWith('.json'))
  const seen = new Set()
  const rows = []
  const missing = new Set()
  for (const f of files) {
    const { season, clubId, players } = JSON.parse(readFileSync(path.join(dir, f), 'utf8'))
    const sid = String(season)
    if (!teamIds.has(String(clubId))) missing.add(`team ${clubId}`)
    if (!seasonIds.has(sid)) missing.add(`season ${sid}`)
    for (const p of players || []) {
      if (!p?.id) continue
      const key = `${p.id}|${clubId}|${sid}`
      if (seen.has(key)) continue // a player listed twice in one roster → one membership
      seen.add(key)
      rows.push([p.id, String(clubId), sid])
    }
  }
  if (missing.size) { console.error(`✗ ${c} referential integrity: ${[...missing].slice(0, 10).join(', ')}`); process.exit(1) }
  rows.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }) || Number(a[2]) - Number(b[2]) || a[1].localeCompare(b[1], undefined, { numeric: true }))
  const meta = {
    schemaVersion: SCHEMA_VERSION, source: 'transfermarkt:club-season rosters (scraped)',
    competition: c, grain: 'player×team×season', columns: ['playerId', 'teamId', 'seasonId'],
    rows: rows.length, clubSeasons: files.length, generatedAt: new Date().toISOString().slice(0, 10),
  }
  writeFileSync(OUT(c), JSON.stringify({ meta, squads: rows }) + '\n')
  console.error(`✓ ${c}: ${rows.length} squad memberships across ${files.length} club-seasons`)
  return rows.length
}

let total = 0
for (const c of COMPS) total += buildComp(c)
console.error(`\nDone. ${total} canonical SquadMembership rows across ${COMPS.length} competitions.`)
