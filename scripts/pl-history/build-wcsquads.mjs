#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD — WORLD CUP WINNING SQUADS   RFC-001 C9
//
// Canonicalises the scraped tournament-squad cache (cache/wcsquads/*.json, from
// scrape-wcsquads.mjs) into src/data/wcsquads.generated.json — the dataset the
// "Name the Winning Squad" game consumes. Replaces the Wikipedia importer.
//
// Player names are taken from the canonical registry (players.registry.json) via
// the Transfermarkt id, falling back to the name on the squad page — so squads
// read with the same spellings as the rest of the site. Output keeps `players`
// (names, for the existing game) and adds `playerIds` (tm:<id>) for id-based use.
//
// Offline build (reads the local cache only — no network). Run AFTER the scrape:
//   npm run scrape:wcsquads && npm run build:wcsquads
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const CACHE = path.join(ROOT, 'data', 'pl-history', 'cache', 'wcsquads')
const OUT = path.join(ROOT, 'src', 'data', 'wcsquads.generated.json')

if (!existsSync(CACHE)) {
  console.error(`No scrape cache at ${path.relative(process.cwd(), CACHE)}.\nRun the scrape first:  npm run scrape:wcsquads`)
  process.exit(1)
}

// id → canonical display name (Transfermarkt-keyed).
const registry = JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', 'canonical', 'players.registry.json'), 'utf8'))
const nameByTm = new Map()
for (const p of registry) if (p.refs?.tm != null) nameByTm.set(String(p.refs.tm), p.displayName)

const files = readdirSync(CACHE).filter(f => f.endsWith('.json'))
if (!files.length) { console.error('Scrape cache is empty — run npm run scrape:wcsquads.'); process.exit(1) }

const squads = []
let named = 0, total = 0
for (const f of files) {
  const raw = JSON.parse(readFileSync(path.join(CACHE, f), 'utf8'))
  if (!raw.players?.length) { console.error(`  ⚠ ${raw.year} ${raw.nation}: no players in cache — skipped`); continue }
  const players = [], playerIds = []
  for (const pl of raw.players) {
    const canon = nameByTm.get(String(pl.id))
    players.push(canon || pl.name)
    playerIds.push(`tm:${pl.id}`)
    total++; if (canon) named++
  }
  squads.push({ year: raw.year, nation: raw.nation, players, playerIds })
}
squads.sort((a, b) => b.year - a.year)

const out = {
  meta: {
    schemaVersion: 1,
    source: 'transfermarkt',
    generatedAt: new Date().toISOString().slice(0, 10),
    squads: squads.length,
    players: total,
  },
  squads,
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.error(`Wrote ${squads.length} winning squads (${total} players, ${named} named from registry) → ${path.relative(process.cwd(), OUT)}`)
