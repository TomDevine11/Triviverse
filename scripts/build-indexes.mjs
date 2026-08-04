#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// Build the two slim indexes the Build-Your-Own facet composer needs:
//   players.index.generated.json  [id, name, position, natKey] for every player
//                                 — the search list AND the nationality/position
//                                 filters.
//   clubs.index.generated.json    { teamId: { name, comps } } — the club layer
//                                 (teamId = Transfermarkt club id = performance
//                                 teamId, so it joins straight onto performance).
//
// Both are derived by unioning the six per-competition history files. Values come
// from the performance tables at runtime; these carry only meta, so they stay tiny.
//   node scripts/build-indexes.mjs
// ─────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'football501')
const COMPS = ['GB1', 'ES1', 'IT1', 'L1', 'FR1', 'CL']
const load = (c) => JSON.parse(readFileSync(path.join(DATA, `history.${c}.generated.json`), 'utf8'))

const players = new Map() // id → { name, pos, natKey }
const clubs = {}          // Transfermarkt club id → { name, comps }

for (const C of COMPS) {
  const h = load(C)
  for (const [cid, cm] of Object.entries(h.clubs)) {
    const e = (clubs[cid] ||= { name: cm.name, comps: [] })
    if ((cm.name || '').length > e.name.length) e.name = cm.name
    if (!e.comps.includes(C)) e.comps.push(C)
  }
  for (const p of h.players) {
    const m = players.get(p.id)
    if (!m) players.set(p.id, { name: p.name, pos: p.pos, natKey: p.natKey })
    else { if ((p.name || '').length > m.name.length) m.name = p.name; if (!m.natKey && p.natKey) m.natKey = p.natKey }
  }
}

const generatedAt = new Date().toISOString().slice(0, 10)
const write = (file, data) => { const dest = path.join(DATA, file); writeFileSync(dest, JSON.stringify(data)); return (readFileSync(dest).length / 1e6).toFixed(2) }

const pmb = write('players.index.generated.json', { meta: { players: players.size, generatedAt }, players: [...players.entries()].map(([id, m]) => [id, m.name, m.pos || '', m.natKey || '']) })
console.error(`✓ players.index: ${players.size} players, ${pmb} MB`)
const cmb = write('clubs.index.generated.json', { meta: { clubs: Object.keys(clubs).length, generatedAt }, clubs })
console.error(`✓ clubs.index: ${Object.keys(clubs).length} clubs, ${cmb} MB`)
