#!/usr/bin/env node
// Build the association index behind Football Contexto.
//
// The game ranks every player in the pool by how closely they are associated
// with a hidden target, so it needs one thing the other games do not: a
// similarity relation over players, not membership of a category.
//
// The basis is the Transfermarkt club-season rosters already in the repo
// (src/data/football501/squads.*.generated.json — player × team × season,
// ~230k rows over six competitions). Those give the three signals that actually
// make two footballers feel related:
//   • they played in the same team in the same season — literal teammates
//   • they played for the same club in different eras
//   • they were simply around at the same time, in the same leagues
// plus nationality and position from the canonical registry.
//
// Raw, the rosters are 5.4 MB. This script reduces them to the pool the game
// can rank — recognisable players only — with team-seasons packed one per int,
// so the runtime ships a fraction of that and does the ranking itself.
//
//   node scripts/build-contexto.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SQUAD_DIR = path.join(ROOT, 'src', 'data', 'football501')
const OUT = path.join(ROOT, 'src', 'data', 'contexto.generated.json')

// Recognisability floor for the rankable pool. Lower than Connections' star
// threshold on purpose: a Contexto wants a deep tail to rank against, and a
// guess landing at 4,000 is information. Too low and the pool fills with names
// nobody could guess; too high and the ranks stop feeling Contexto-sized.
const MIN_FAME = 18

// facts.js can't be imported from plain node (its JSON imports need attributes),
// so the recognisable universe is read directly — the same approach the other
// build scripts take. `tm:<id>` is how a Transfermarkt id appears in the registry.
const universe = JSON.parse(readFileSync(path.join(ROOT, 'src/data/canonical/players.recognisable.generated.json'), 'utf8'))
const byId = new Map((universe.players || universe).map(p => [p.id, p]))
const getPlayerByTm = (tmId) => byId.get(`tm:${tmId}`) || null

const seasons = JSON.parse(readFileSync(path.join(ROOT, 'src/data/canonical/seasons.generated.json'), 'utf8'))
const seasonList = seasons.seasons || seasons
const seasonIndex = new Map(seasonList.map((s, i) => [String(s.id), i]))
const seasonYear = new Map(seasonList.map(s => [String(s.id), s.startYear]))

const teams = JSON.parse(readFileSync(path.join(ROOT, 'src/data/canonical/teams.generated.json'), 'utf8'))
const teamList = teams.teams || teams
const teamName = new Map(teamList.map(t => [String(t.id), t.name]))

// ── gather rosters ────────────────────────────────────────────────
const rows = []
const comps = []
for (const file of readdirSync(SQUAD_DIR).filter(f => /^squads\..+\.generated\.json$/.test(f))) {
  const comp = file.split('.')[1]
  comps.push(comp)
  const data = JSON.parse(readFileSync(path.join(SQUAD_DIR, file), 'utf8'))
  for (const [pid, tid, sid] of data.squads) rows.push([pid, tid, sid, comp])
}
console.log(`  rosters: ${rows.length} rows across ${comps.join(', ')}`)

const compIndex = new Map(comps.sort().map((c, i) => [c, i]))

// ── fold into per-player records ──────────────────────────────────
const byPlayer = new Map()
for (const [pid, tid, sid, comp] of rows) {
  const si = seasonIndex.get(String(sid))
  if (si === undefined) continue
  let rec = byPlayer.get(pid)
  if (!rec) { rec = { teamSeasons: new Set(), teams: new Set(), comps: new Set(), first: Infinity, last: -Infinity }; byPlayer.set(pid, rec) }
  // One int per team-season: teamId occupies the high bits, season index the low 7.
  rec.teamSeasons.add(Number(tid) * 128 + si)
  rec.teams.add(Number(tid))
  rec.comps.add(compIndex.get(comp))
  const yr = seasonYear.get(String(sid))
  if (yr != null) { if (yr < rec.first) rec.first = yr; if (yr > rec.last) rec.last = yr }
}
console.log(`  players with rosters: ${byPlayer.size}`)

// ── keep the recognisable, resolvable ones ────────────────────────
const players = []
let unresolved = 0
for (const [pid, rec] of byPlayer) {
  const p = getPlayerByTm(pid)
  if (!p) { unresolved++; continue }
  if ((p.fame || 0) < MIN_FAME) continue
  players.push({
    i: p.id,
    n: p.displayName,
    nat: p.nationalities?.[0] ?? null,
    pos: p.positions?.[0] ?? null,
    f: p.fame || 0,
    ts: [...rec.teamSeasons].sort((a, b) => a - b),
    tm: [...rec.teams].sort((a, b) => a - b),
    c: [...rec.comps].sort((a, b) => a - b),
    y: [rec.first === Infinity ? null : rec.first, rec.last === -Infinity ? null : rec.last],
  })
}
players.sort((a, b) => b.f - a.f || a.n.localeCompare(b.n))
console.log(`  unresolvable to registry: ${unresolved} (expected — the registry is the recognisable subset)`)
console.log(`  POOL (fame >= ${MIN_FAME}): ${players.length}`)

// Team names, only for the teams the pool actually appears in — used to explain
// a guess ("both played for Manchester City") in the result card.
const usedTeams = new Set(players.flatMap(p => p.tm))
const teamNames = Object.fromEntries([...usedTeams].map(id => [id, teamName.get(String(id)) || `Team ${id}`]).filter(([, n]) => n))

const out = {
  meta: {
    schemaVersion: 1,
    source: 'transfermarkt club-season rosters (squads.*.generated.json) + canonical registry',
    grain: 'player with packed team-seasons',
    signals: 'shared team-seasons (teammates), shared clubs, shared competitions, era overlap, nationality, position',
    minFame: MIN_FAME,
    competitions: comps,
    players: players.length,
    generatedAt: new Date().toISOString().slice(0, 10),
  },
  teamNames,
  players,
}
writeFileSync(OUT, JSON.stringify(out))
const kb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0)
console.log(`  → ${path.relative(ROOT, OUT)}  (${kb} KB, ${players.length} players, ${Object.keys(teamNames).length} teams)`)
