#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD CATEGORIES  →  src/data/categories.generated.json
//
// The COMPLETE, canonical VALIDATION membership for club and trophy categories —
// the objective truth "did player X play for this club / win this trophy", derived
// wholly from canonical facts (SquadMembership + Honours). This is the source of
// truth for accepting a guess. It is deliberately:
//   • COMPLETE   — every real member, NO recognisability floor (unlike generation).
//   • BARE IDS   — member lists are just canonical Player ids (tm:<id>); the display
//                  name / fame / nationality live once in the player universe seed
//                  (players.recognisable.generated), so nothing is duplicated here.
// Generation (which recognisable members make a good puzzle) is a PROJECTION of this
// truth, computed in facts.js — it is NOT a second dataset.
//
// NATIONALITY is intentionally NOT materialised here: it is a player attribute, so
// facts.js validates it directly from the seed's `nationalities` (no giant per-nation
// lists, no duplication).
//
//   node scripts/build-categories.mjs   (offline)   — run BEFORE build-identity.
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

// The featured club categories (editorial — WHICH clubs the games quiz on). Only
// these NAMES are curated; membership is complete canonical fact.
const CLUB_ALIASES = { 'A.S. Roma': 'Roma', 'S.S.C. Napoli': 'Napoli' }
const clubCats = ['Manchester United', 'Manchester City', 'Chelsea', 'Liverpool', 'Arsenal', 'Tottenham Hotspur', 'Everton', 'Newcastle United', 'Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Valencia', 'Sevilla', 'Juventus', 'AC Milan', 'Inter Milan', 'A.S. Roma', 'S.S.C. Napoli', 'FC Bayern Munich', 'Borussia Dortmund', 'Bayer 04 Leverkusen', 'Paris Saint-Germain', 'Olympique de Marseille', 'AS Monaco']
// Trophy categories ← canonical Honours. Category name → the exact TM honour key(s)
// that define it. This mapping is editorial + tiny; the resulting MEMBERSHIP is
// complete canonical fact. A trophy only becomes a playable category if it has a
// clean, complete honour key.
//   NOTE: the European Championship is intentionally ABSENT — its honour data in
//   Transfermarkt is unreliable (tangled with club/youth competitions; genuine
//   winners like Iniesta are missing). Better to omit the category than ship an
//   incomplete one. Re-add here only once a clean, complete key is confirmed.
const TROPHY_MAP = {
  "Ballon d'Or": ["Winner Ballon d'Or"],
  'FIFA World Cup': ['World Cup winner'],
  'UEFA Champions League': ['UEFA Champions League winner'],
}

// ── canonical lookups ───────────────────────────────────────────────────────
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

const tmIds = (ids) => [...ids].map(id => `tm:${id}`)

// ── clubs + clubLeague ──────────────────────────────────────────────────────
// COMPLETE squad membership, no recognisability floor (validation truth).
const clubs = {}, clubLeague = {}
let unmapped = []
for (const cat of clubCats) {
  const t = teamByNorm.get(clubNorm(CLUB_ALIASES[cat] || cat))
  if (!t) { unmapped.push(cat); continue }
  clubs[cat] = tmIds(membersByTeam.get(t.id) || [])
  const league = (teamComps.get(t.id) || []).map(c => LEAGUE_OF[c]).find(Boolean)
  if (league) clubLeague[cat] = league
}

// ── trophies (from canonical Honours) — COMPLETE, no floor ───────────────────
const trophies = {}
let honoursMissing = false
try {
  const honTrophies = J('src/data/football501/honours.generated.json').trophies
  for (const [cat, honourKeys] of Object.entries(TROPHY_MAP)) {
    const ids = new Set()
    for (const key of honourKeys) for (const id of (honTrophies[key] || [])) ids.add(id)
    trophies[cat] = tmIds(ids)
  }
} catch { honoursMissing = true }

const meta = {
  schemaVersion: 2, source: 'complete canonical validation membership (SquadMembership + Honours); bare ids; no floor; nationality validated from player attribute',
  clubs: Object.keys(clubs).length, trophies: Object.keys(trophies).length,
  honours: honoursMissing ? 'MISSING (run build:honours)' : 'ok',
  generatedAt: new Date().toISOString().slice(0, 10),
}
if (unmapped.length) { console.error(`✗ unmapped club categories: ${unmapped.join(', ')}`); process.exit(1) }
if (honoursMissing) { console.error('✗ honours.generated.json missing — run build:honours first'); process.exit(1) }
writeFileSync(OUT, JSON.stringify({ meta, clubLeague, clubs, trophies }) + '\n')
console.error(`✓ categories (validation truth): ${Object.keys(clubs).length} clubs, ${Object.keys(trophies).length} trophies — complete, unfloored. ` +
  `CL members: ${trophies['UEFA Champions League']?.length ?? 0}`)
