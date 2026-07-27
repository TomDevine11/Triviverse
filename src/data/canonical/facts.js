// ─────────────────────────────────────────────────────────────────────────
// DERIVED CANONICAL FACTS + PLAYER REGISTRY  (merged, provenance-tagged)
//
// Single source of truth, built at module load by merging:
//   • curated membership.js        (source: 'curated')   — owns display names
//   • wikidata.generated.json      (source: 'wikidata' / 'wikipedia')
//
//   clubs        — curated ∪ Wikidata P54
//   leagues      — DERIVED from club facts via CLUB_LEAGUE (never authored)
//   nationality  — curated ∪ Wikidata national-team rosters (P54)
//   trophies     — World Cup (Wikipedia, Tier-1) + Ballon d'Or (P166, Tier-1)
//                  ∪ UCL + Euros (curated; the remaining un-sourced gap)
//   managers     — curated only (not exposed as a grid category any more)
//
// NOTABLE/BROAD SPLIT: every player carries `fame` (Wikipedia language count).
// `membersOf` returns the BROAD set (used to validate guesses — accept any real
// player who fits). `notableMembersOf` returns only famous players (used to
// GENERATE and reveal grids, so daily puzzles stay star-studded).
// ─────────────────────────────────────────────────────────────────────────

import {
  CLUB_LEAGUE as CURATED_CLUB_LEAGUE, CLUB_MEMBERS, NATIONALITY_MEMBERS,
  MANAGER_MEMBERS, TROPHY_MEMBERS, AS_OF_DATE,
} from './membership.js'
import wikidata from './wikidata.generated.json'
import recognisability from '../recognisability.generated.json'
// Phase 2 — stable stored identity. The identity crosswalk is the source of
// truth for player ids; facts.js resolves display names to those ids rather
// than deriving them, so it shares ONE id space with the migrated games.
import crosswalk from './players.crosswalk.json'
import { normalize as normalizeName } from './normalize.js'
import { fixName } from './nameFixes.js'

// `fame` here is the canonical RECOGNISABILITY score (0-100, recency-first
// contemporary recognisability — see build-recognisability.mjs), which REPLACED
// the old Wikidata Wikipedia-language-count signal (RFC-001). Threshold at/above
// which a player is "notable" enough to feature in generated grids / reveals.
// Curated players stay always-notable (membership flag, separate concern).
const NOTABLE_FAME = 25

// Canonicalise imported club display names so they match the curated spelling
// (otherwise "Barcelona" and "FC Barcelona" become two separate categories).
const CLUB_ALIASES = {
  'FC Barcelona': 'Barcelona',
  'FC Bayern Munich': 'Bayern Munich',
  'A.S. Roma': 'Roma',
  'S.S.C. Napoli': 'Napoli',
}
const canonClub = name => CLUB_ALIASES[name] || name

// Some famous players arrive under several names across sources (curated vs
// Wikidata full/legal name), which fragments their facts and clutters search.
// Merge those explicit aliases onto one canonical entry. EXPLICIT only — never
// merges genuinely different people (e.g. "Ronaldo Vieira" stays itself).
const PLAYER_ALIASES = {
  'Ronaldo': 'Ronaldo Nazario',
  'Ronaldo (Brazilian footballer)': 'Ronaldo Nazario',
  'Ronaldo Rodrigues de Jesus': 'Ronaldo Nazario',
}
const canonPlayer = name => PLAYER_ALIASES[name] || name

const importedClubLeague = {}
for (const [club, league] of Object.entries(wikidata.clubLeague || {})) importedClubLeague[canonClub(club)] = league

export const CLUB_LEAGUE = { ...CURATED_CLUB_LEAGUE, ...importedClubLeague }
export const LEAGUES = [...new Set(Object.values(CLUB_LEAGUE))]

// Resolve a display name to its persisted internal id via the identity
// crosswalk. Ambiguous or unknown names fall back to a deterministic slug so
// facts.js stays self-sufficient. IDs no longer carry the legacy 'p:' prefix or
// derive from the (mutable) display name. `canonPlayer` is still applied by the
// caller (ensurePlayer), so explicit aliases like "Ronaldo" stay unified.
export function playerId(displayName) {
  const n = normalizeName(displayName)
  const hit = crosswalk.byAlias[n]
  if (typeof hit === 'string') return hit
  return n.replace(/\s+/g, '-').replace(/^-|-$/g, '')
}

const registry = new Map()
const facts = []
const factSeen = new Set()

function ensurePlayer(displayName) {
  displayName = fixName(canonPlayer(displayName))
  const id = playerId(displayName)
  if (!registry.has(id)) {
    registry.set(id, { id, displayName, nationalities: [], clubs: [], managers: [], trophies: [], positions: [], fame: 0, curated: false })
  }
  return registry.get(id)
}

function addFact(displayName, type, value, key, source, fame = 0) {
  const p = ensurePlayer(displayName)
  if (fame > p.fame) p.fame = fame
  if (source === 'curated') p.curated = true
  const k = `${p.id}|${type}|${value}`
  if (!factSeen.has(k)) {
    factSeen.add(k)
    facts.push({ playerId: p.id, type, value, source, asOfDate: AS_OF_DATE })
  }
  if (key && value != null && !p[key].includes(value)) p[key].push(value)
}

// ── 1. Curated (first; owns display names) ──────────────────────────────────
for (const [club, members] of Object.entries(CLUB_MEMBERS))
  for (const name of members) addFact(name, 'played_for_club', club, 'clubs', 'curated')
for (const [nat, members] of Object.entries(NATIONALITY_MEMBERS))
  for (const name of members) addFact(name, 'has_nationality', nat, 'nationalities', 'curated')
for (const [mgr, members] of Object.entries(MANAGER_MEMBERS))
  for (const name of members) addFact(name, 'played_under_manager', mgr, 'managers', 'curated')
for (const [trophy, members] of Object.entries(TROPHY_MEMBERS))
  for (const name of members) addFact(name, 'won_trophy', trophy, 'trophies', 'curated')

// ── 2. Wikidata / Wikipedia imports ─────────────────────────────────────────
for (const [club, members] of Object.entries(wikidata.clubs || {})) {
  const clubName = canonClub(club)
  for (const m of members) {
    addFact(m.name, 'played_for_club', clubName, 'clubs', 'wikidata', m.fame)
    const p = ensurePlayer(m.name)
    for (const pos of m.positions || []) if (!p.positions.includes(pos)) p.positions.push(pos)
  }
}
for (const [nat, members] of Object.entries(wikidata.nationalities || {}))
  for (const m of members) addFact(m.name, 'has_nationality', nat, 'nationalities', 'wikidata', m.fame)

// Trophy provenance: World Cup → wikipedia (Tier-1), others curated above.
// Awards from Wikidata get source 'wikidata'.
for (const [trophy, members] of Object.entries(wikidata.trophies || {})) {
  const source = trophy === 'FIFA World Cup' ? 'wikipedia' : 'wikidata'
  for (const m of members) addFact(m.name, 'won_trophy', trophy, 'trophies', source, m.fame)
}

// Replace the legacy Wikidata "fame" with canonical recognisability (RFC-001):
// contemporary fan recognisability by name, not Wikipedia language count. Players
// absent from the canonical top-flight/international data score 0 (correctly low
// contemporary recognisability); curated players stay notable via their flag.
const RECOG = recognisability.byName || {}
for (const p of registry.values()) p.fame = RECOG[normalizeName(p.displayName)] || 0

export const PLAYERS = registry
export const FACTS = facts
export function getPlayer(id) { return registry.get(id) || null }
export function allPlayers() { return [...registry.values()] }
export function isNotable(p) { return p.curated || p.fame >= NOTABLE_FAME }

// ── Precomputed category member index (broad + notable) ─────────────────────
const memberIndex = new Map() // `${type}:${value}` -> { broad:Set, notable:Set }
function idx(type, value, id, notable) {
  if (value == null) return
  const key = `${type}:${value}`
  if (!memberIndex.has(key)) memberIndex.set(key, { broad: new Set(), notable: new Set() })
  const e = memberIndex.get(key)
  e.broad.add(id)
  if (notable) e.notable.add(id)
}
for (const p of registry.values()) {
  const notable = isNotable(p)
  for (const club of p.clubs) { idx('club', club, p.id, notable); idx('league', CLUB_LEAGUE[club], p.id, notable) }
  for (const nat of p.nationalities) idx('nationality', nat, p.id, notable)
  for (const mgr of p.managers) idx('manager', mgr, p.id, notable)
  for (const tr of p.trophies) idx('trophy', tr, p.id, notable)
}

export function membersOf(category) {
  return memberIndex.get(`${category.type}:${category.value}`)?.broad || new Set()
}
export function notableMembersOf(category) {
  return memberIndex.get(`${category.type}:${category.value}`)?.notable || new Set()
}

// Category catalogue, derived from what actually has members. Managers are
// intentionally excluded from the playable catalogue (cannot be sourced
// reliably → would reintroduce false rejections); the data is kept for tests.
function keysWithMembers(type, minNotable = 1) {
  const out = []
  for (const [key, e] of memberIndex) {
    if (!key.startsWith(type + ':')) continue
    if (e.notable.size >= minNotable) out.push(key.slice(type.length + 1))
  }
  return out.sort()
}
export const CATEGORY_KEYS = {
  clubs: keysWithMembers('club'),
  leagues: keysWithMembers('league'),
  nationalities: keysWithMembers('nationality'),
  trophies: keysWithMembers('trophy'),
  managers: Object.keys(MANAGER_MEMBERS), // kept for tests; not in playable catalogue
}
