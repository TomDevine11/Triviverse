#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD CATEGORIES  →  src/data/categories.generated.json   (RFC-001 C12)
//
// Derives tic-tac-toe / connections CATEGORY MEMBERSHIP entirely from canonical
// facts (the Wikidata category groups are retired — RFC-001 C12):
//   • clubs        — who played for each category club  (canonical SquadMembership)
//   • nationalities — players by nationality              (canonical Player.nat)
//   • trophies     — Ballon d'Or / World Cup winners      (canonical Honours)
//   • clubLeague   — each category club's league          (canonical Competition)
// Members carry the canonical Player id (tm:<id>) + recognisability as `fame` so
// facts.js keys by id and the notable/broad split works unchanged.
//
//   node scripts/build-categories.mjs   (offline)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalize } from '../src/data/canonical/normalize.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const OUT = path.join(ROOT, 'src', 'data', 'categories.generated.json')
const COMPS = ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']
const LEAGUE_OF = { GB1: 'Premier League', ES1: 'La Liga', IT1: 'Serie A', FR1: 'Ligue 1', L1: 'Bundesliga' }
// Only members with at least this recognisability enter the game categories — the
// old Wikidata groups were similarly fame-gated. Keeps facts.js (and the client)
// to plausible answers instead of the full squad roster (~33k → a few thousand).
const MEMBER_MIN = 10

// The featured category sets (editorial — the clubs/nations the games quiz on).
// Members are derived from canonical facts below; only these NAMES are curated.
const CLUB_ALIASES = { 'A.S. Roma': 'Roma', 'S.S.C. Napoli': 'Napoli' }
const clubCats = ['Manchester United', 'Manchester City', 'Chelsea', 'Liverpool', 'Arsenal', 'Tottenham Hotspur', 'Everton', 'Newcastle United', 'Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Valencia', 'Sevilla', 'Juventus', 'AC Milan', 'Inter Milan', 'A.S. Roma', 'S.S.C. Napoli', 'FC Bayern Munich', 'Borussia Dortmund', 'Bayer 04 Leverkusen', 'Paris Saint-Germain', 'Olympique de Marseille', 'AS Monaco']
const natCats = ['Argentina', 'Brazil', 'France', 'Spain', 'England', 'Germany', 'Netherlands', 'Portugal', 'Italy', 'Belgium', 'Croatia', 'Uruguay']
// Trophy categories ← canonical Honours (C11). Category name → the TM honour name.
const TROPHY_MAP = { "Ballon d'Or": 'Winner Ballon d\'Or', 'FIFA World Cup': 'World Cup winner' }

// ── canonical lookups ───────────────────────────────────────────────────────
const recogById = J('src/data/recognisability.generated.json').byId
const idName = new Map(), idNat = new Map()
for (const c of COMPS) for (const p of J(`src/data/football501/history.${c}.generated.json`).players) {
  if (!idName.has(p.id) || (p.name || '').length > idName.get(p.id).length) idName.set(p.id, p.name)
  if (p.natKey && !idNat.has(p.id)) idNat.set(p.id, { natKey: p.natKey, nat: p.nat })
}
const teams = J('src/data/canonical/teams.generated.json').teams.filter(t => t.kind === 'club')
const clubNorm = (s) => normalize(String(s).replace(/\b(FC|CF|AFC|AC|AS|SS|SSC|RC|Club|de)\b/gi, '')).replace(/\s+/g, ' ').trim()

// team id → member player ids (from SquadMembership)
const membersByTeam = new Map()
for (const c of COMPS) for (const [pid, tid] of J(`src/data/football501/squads.${c}.generated.json`).squads) {
  (membersByTeam.get(tid) || membersByTeam.set(tid, new Set()).get(tid)).add(pid)
}

// norm name → the canonical team with the MOST squad members (disambiguates
// namesake collisions, e.g. FC Barcelona vs a lower-division Barcelona).
const teamByNorm = new Map()
for (const t of teams) {
  const n = clubNorm(t.name), cur = teamByNorm.get(n)
  if (!cur || (membersByTeam.get(t.id)?.size || 0) > (membersByTeam.get(cur.id)?.size || 0)) teamByNorm.set(n, t)
}
// team id → domestic league (from the club's competitions)
const teamComps = new Map(teams.map(t => [t.id, t.competitions]))

// Members carry the canonical Player id (tm:<tmId>) so facts.js keys by id, not
// name (RFC-001 Phase B — no name reconciliation).
const member = (id) => ({ id: `tm:${id}`, name: idName.get(id), fame: recogById[id] || 0 })
const membersOf = (ids) => ids.map(member).filter(m => m.fame >= MEMBER_MIN).sort((a, b) => b.fame - a.fame)

// ── clubs + clubLeague ──────────────────────────────────────────────────────
const clubs = {}, clubLeague = {}
let unmapped = []
for (const cat of clubCats) {
  const t = teamByNorm.get(clubNorm(CLUB_ALIASES[cat] || cat))
  if (!t) { unmapped.push(cat); continue }
  const ids = [...(membersByTeam.get(t.id) || [])].filter(id => idName.has(id))
  clubs[cat] = membersOf(ids)
  const league = (teamComps.get(t.id) || []).map(c => LEAGUE_OF[c]).find(Boolean)
  if (league) clubLeague[cat] = league
}

// ── nationalities ───────────────────────────────────────────────────────────
const nationalities = {}
for (const cat of natCats) {
  const key = normalize(cat)
  const ids = [...idNat.entries()].filter(([, v]) => v.natKey === key).map(([id]) => id)
  nationalities[cat] = membersOf(ids)
}

// ── trophies (from canonical Honours) ───────────────────────────────────────
const trophies = {}
let honoursMissing = false
try {
  const honTrophies = J('src/data/football501/honours.generated.json').trophies
  for (const [cat, honourName] of Object.entries(TROPHY_MAP)) {
    const ids = (honTrophies[honourName] || []).filter(id => idName.has(id))
    trophies[cat] = membersOf(ids)
  }
} catch { honoursMissing = true }

const meta = {
  schemaVersion: 1, source: 'derived from canonical SquadMembership + Player nationality + Honours',
  clubs: Object.keys(clubs).length, nationalities: Object.keys(nationalities).length,
  trophies: Object.keys(trophies).length, honours: honoursMissing ? 'MISSING (run build:honours)' : 'ok',
  generatedAt: new Date().toISOString().slice(0, 10),
}
if (unmapped.length) { console.error(`✗ unmapped club categories: ${unmapped.join(', ')}`); process.exit(1) }
writeFileSync(OUT, JSON.stringify({ meta, clubLeague, clubs, nationalities, trophies }) + '\n')
console.error(`✓ categories: ${Object.keys(clubs).length} clubs, ${Object.keys(nationalities).length} nationalities, ${Object.keys(trophies).length} trophies (all from canonical)` +
  `${honoursMissing ? ' — WARNING: honours missing, trophies empty' : ''}`)
