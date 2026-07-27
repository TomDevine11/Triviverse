#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD TEAMMATES  (RFC-001 backlog C8, part 2)  — src/data/teammates.generated.json
//
// Derives the "Guess the Player from teammates" graph from canonical
// SquadMembership (squads.<comp>): two players are teammates if they shared a
// club-season roster. Replaces the network Wikidata importer (import-teammates).
//
// Fame (recognisability) is unchanged — still the committed wikidata.generated
// signal — so clue quality is preserved; only the co-occurrence SOURCE changes
// from Wikidata P54 spells to Transfermarkt rosters. Coverage is club-only across
// the six scraped competitions (national-team teammates arrive with C9 squads).
//
//   node scripts/build-teammates.mjs   (offline)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalize } from '../src/data/canonical/normalize.js'
import { famousPlayers } from '../src/data/famousPlayers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const OUT = path.join(ROOT, 'src', 'data', 'teammates.generated.json')
const COMPS = ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']

const MATE_FAME_MIN = 30 // teammates must be recognisable (recognisability score, 0-100)
const MIN_MATES = 6      // targets need at least this many to be playable
const TOTAL_CAP = 30     // keep the most-recognisable N mates per target (keeps the file lean)

// Curated marquee targets, merged with the famousPlayers pool (as the old importer did).
const HARDCODED = [
  'Lionel Messi', 'Cristiano Ronaldo', 'Neymar', 'Kylian Mbappé', 'Luis Suárez', 'Andrés Iniesta',
  'Xavi', 'Sergio Busquets', 'Gerard Piqué', 'Carles Puyol', 'Sergio Ramos', 'Iker Casillas',
  'Karim Benzema', 'Luka Modrić', 'Toni Kroos', 'Gareth Bale', 'Ronaldinho', 'Kaká',
  'Thierry Henry', 'Dennis Bergkamp', 'Patrick Vieira', 'Steven Gerrard', 'Frank Lampard', 'John Terry',
  'Didier Drogba', 'Petr Čech', 'Ashley Cole', 'Rio Ferdinand', 'Nemanja Vidić', 'Wayne Rooney',
  'Paul Scholes', 'Ryan Giggs', 'David Beckham', 'Mohamed Salah', 'Sadio Mané', 'Virgil van Dijk',
  'Kevin De Bruyne', 'Sergio Agüero', 'David Silva', 'Yaya Touré', 'Vincent Kompany', 'Robert Lewandowski',
  'Thomas Müller', 'Manuel Neuer', 'Philipp Lahm', 'Bastian Schweinsteiger', 'Arjen Robben', 'Franck Ribéry',
  'Zlatan Ibrahimović', 'Andrea Pirlo', 'Gianluigi Buffon', 'Francesco Totti', 'Samuel Eto\'o', 'David Villa',
  'Cesc Fàbregas', 'Eden Hazard', 'Edinson Cavani', 'Ángel Di María', 'Carlos Tevez', 'Wesley Sneijder',
]
const TARGETS = [...new Set([...HARDCODED, ...famousPlayers.map(p => p.name)])]

// ── identity: tmId → {name,nat,apps}; normName → most-prominent tmId ─────────
const idInfo = new Map()
for (const c of COMPS) for (const p of J(`src/data/football501/history.${c}.generated.json`).players) {
  const e = idInfo.get(p.id) || { name: p.name, nat: p.nat, apps: 0 }
  e.apps += p.comps?.[c]?.apps || 0
  if ((p.name || '').length > e.name.length) e.name = p.name
  idInfo.set(p.id, e)
}
const nameToId = new Map()
for (const [id, e] of idInfo) { const n = normalize(e.name); const cur = nameToId.get(n); if (!cur || e.apps > idInfo.get(cur).apps) nameToId.set(n, id) }

// ── recognisability: normName → 0-100 contemporary-recognisability (RFC-001,
// replaces the Wikidata fame signal). Drives both the mate cutoff and clue order.
const FAME = new Map(Object.entries(J('src/data/recognisability.generated.json').byName))
// getPlayer-known proxy: a target must exist in the facts registry (wikidata
// membership) so the game can resolve it. That is a C12 (category-membership)
// concern, not a fame one — kept until membership is canonical.
const KNOWN = new Set()
for (const g of ['clubs', 'nationalities', 'trophies']) for (const arr of Object.values(J('src/data/canonical/wikidata.generated.json')[g] || {})) for (const p of arr) KNOWN.add(normalize(p.name))
const teamName = new Map(J('src/data/canonical/teams.generated.json').teams.map(t => [t.id, t.name]))

// ── rosters from canonical SquadMembership ──────────────────────────────────
const roster = new Map()   // `${teamId}|${season}` → [playerId]
const memberOf = new Map() // playerId → [[teamId, season]]
for (const c of COMPS) for (const [pid, tid, sid] of J(`src/data/football501/squads.${c}.generated.json`).squads) {
  const key = `${tid}|${sid}`; (roster.get(key) || roster.set(key, []).get(key)).push(pid)
  ;(memberOf.get(pid) || memberOf.set(pid, []).get(pid)).push([tid, sid])
}

// One entry per distinct mate (deduped across all shared club-seasons), labelled
// with the club they most shared with the target; keep the TOTAL_CAP most famous.
// (A per-club cap would drop one-club legends, whose mates all share one club,
// below MIN_MATES — national-team mates that used to lift them arrive with C9.)
function teammatesOf(targetId) {
  const byMate = new Map() // mateId → { name, nationality, fame, teams: Map(team→sharedSeasons) }
  for (const [tid, sid] of memberOf.get(targetId) || []) {
    const team = teamName.get(tid) || `#${tid}`
    for (const mid of roster.get(`${tid}|${sid}`) || []) {
      if (mid === targetId) continue
      const info = idInfo.get(mid); if (!info) continue
      const fame = FAME.get(normalize(info.name)) || 0
      if (fame < MATE_FAME_MIN) continue
      const e = byMate.get(mid) || { name: info.name, nationality: info.nat || null, fame, teams: new Map() }
      e.teams.set(team, (e.teams.get(team) || 0) + 1)
      byMate.set(mid, e)
    }
  }
  return [...byMate.values()]
    .map(e => ({ name: e.name, nationality: e.nationality, team: [...e.teams.entries()].sort((a, b) => b[1] - a[1])[0][0], fame: e.fame }))
    .sort((a, b) => b.fame - a.fame)
    .slice(0, TOTAL_CAP)
}

const players = [], tried = []
for (const name of TARGETS) {
  const id = nameToId.get(normalize(name))
  if (!id) continue
  tried.push(name)
  // Only emit targets the game can identify (getPlayer-known), so the runtime
  // resolveNameToId→getPlayer lookup in teammates.js is never null.
  if (!KNOWN.has(normalize(name))) continue
  const mates = teammatesOf(id)
  if (mates.length >= MIN_MATES) players.push({ name, teammates: mates })
}
players.sort((a, b) => a.name.localeCompare(b.name))

const out = { meta: { source: 'transfermarkt:squad co-occurrence (canonical SquadMembership)', mateFameMin: MATE_FAME_MIN, fetchedAt: new Date().toISOString().slice(0, 10) }, players, tried }
writeFileSync(OUT, JSON.stringify(out) + '\n')
console.error(`✓ teammates: ${players.length} playable targets (of ${tried.length} resolved), avg ${(players.reduce((a, p) => a + p.teammates.length, 0) / players.length).toFixed(1)} mates`)
