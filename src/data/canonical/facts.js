// ─────────────────────────────────────────────────────────────────────────
// PLAYER REGISTRY + CATEGORY MEMBERSHIP  —  two views over ONE truth.
//
//   • VALIDATION  (membersOf)        — the COMPLETE, canonical set of real players
//                                      who satisfy a category. Pruned by NOTHING
//                                      (no recognisability floor, no editorial
//                                      pruning). Answers "is this football fact
//                                      objectively true?". This is what accepts a
//                                      guess.
//   • GENERATION  (notableMembersOf) — a deterministic PROJECTION of validation:
//                                      its recognisable members (fame ≥ NOTABLE_FAME)
//                                      PLUS the curated editorial whitelist. Used to
//                                      pick and reveal puzzles. ALWAYS a subset of
//                                      validation, so a revealed answer is never
//                                      rejected. Generation cannot drift from
//                                      validation because it is computed from it here.
//
// No data is duplicated: player ATTRIBUTES (name, fame, nationality, position) live
// once in the universe seed (players.recognisable.generated — every valid answer);
// category MEMBERSHIP lives once in categories.generated (complete, bare ids).
// NATIONALITY is NOT materialised — it is validated directly from the seed's
// `nationalities` attribute (no giant per-nation lists).
//
// The curated membership.js layer is a GENERATION whitelist only: it force-includes
// a canonical member into puzzles (and owns its display name), but never defines
// validation truth. A curated name absent from the canonical validation set is
// ignored — so a category can never become an incomplete curated stub.
// ─────────────────────────────────────────────────────────────────────────

import {
  CLUB_LEAGUE as CURATED_CLUB_LEAGUE, CLUB_MEMBERS, NATIONALITY_MEMBERS,
  MANAGER_MEMBERS, TROPHY_MEMBERS, AS_OF_DATE,
} from './membership.js'
import categories from '../categories.generated.json'
import universePlayers from './players.recognisable.generated.json'
import byAlias from './players.aliases.generated.json'
import { normalize as normalizeName } from './normalize.js'
import { fixName } from './nameFixes.js'

// Threshold at/above which a validation member is "recognisable" enough to feature
// in generated grids / reveals. GENERATION concern only — never affects validation.
const NOTABLE_FAME = 15

// Offered NATIONALITY categories (editorial — WHICH nationalities the games quiz on).
// Membership is NOT materialised: nationality is validated from each player's
// canonical `nationalities` attribute. These are only the names offered as cells.
const NAT_CATEGORIES = new Set(['Argentina', 'Brazil', 'France', 'Spain', 'England', 'Germany', 'Netherlands', 'Portugal', 'Italy', 'Belgium', 'Croatia', 'Uruguay'])

// Canonical club display name → curated spelling, so "FC Barcelona" and "Barcelona"
// are one category.
const CLUB_ALIASES = { 'FC Barcelona': 'Barcelona', 'FC Bayern Munich': 'Bayern Munich', 'A.S. Roma': 'Roma', 'S.S.C. Napoli': 'Napoli' }
const canonClub = name => CLUB_ALIASES[name] || name

// Explicit same-person aliases (curated vs full/legal name) → one canonical entry.
const PLAYER_ALIASES = { 'Ronaldo': 'Ronaldo Nazario', 'Ronaldo (Brazilian footballer)': 'Ronaldo Nazario', 'Ronaldo Rodrigues de Jesus': 'Ronaldo Nazario' }
const canonPlayer = name => PLAYER_ALIASES[name] || name

const importedClubLeague = {}
for (const [club, league] of Object.entries(categories.clubLeague || {})) importedClubLeague[canonClub(club)] = league
export const CLUB_LEAGUE = { ...CURATED_CLUB_LEAGUE, ...importedClubLeague }
export const LEAGUES = [...new Set(Object.values(CLUB_LEAGUE))]

// Resolve a display name to its canonical id via the client alias index — which
// covers EVERY valid answer (every category member), so no real answer is
// unresolvable. Returns null for ambiguous / unknown names.
export function playerId(displayName) {
  const hit = byAlias[normalizeName(displayName)]
  return typeof hit === 'string' ? hit : null
}

const registry = new Map()
const facts = []
const factSeen = new Set()

function ensureById(id, displayName) {
  if (!registry.has(id)) registry.set(id, { id, displayName: fixName(displayName), nationalities: [], clubs: [], trophies: [], positions: [], fame: 0, curated: false })
  return registry.get(id)
}
function recordFact(playerId, type, value, source) {
  if (value == null) return
  const k = `${playerId}|${type}|${value}`
  if (factSeen.has(k)) return
  factSeen.add(k)
  facts.push({ playerId, type, value, source, asOfDate: AS_OF_DATE })
}

// ── 1. UNIVERSE SEED — the single source of player attributes ────────────────
for (const p of universePlayers) {
  const r = ensureById(p.id, p.displayName)
  if ((p.fame || 0) > r.fame) r.fame = p.fame
  for (const n of p.nationalities || []) if (!r.nationalities.includes(n)) r.nationalities.push(n)
  for (const pos of p.positions || []) if (!r.positions.includes(pos)) r.positions.push(pos)
}

// ── 2. CANONICAL VALIDATION MEMBERSHIP (complete, bare ids) ──────────────────
// clubs + trophies from categories.generated → registry.clubs/trophies. This — plus
// the nationality attribute — IS the validation truth (broad set, below).
// Only members present in the universe seed are indexed: a member with no canonical
// name (in a squad/honour list but never in our history → registry) is unresolvable,
// so a user can never type them. Skipping them is invisible to any typeable answer
// and keeps facts.js within the registry id-space.
for (const [club, ids] of Object.entries(categories.clubs || {})) {
  const cat = canonClub(club)
  for (const id of ids) { const r = registry.get(id); if (!r) continue; if (!r.clubs.includes(cat)) r.clubs.push(cat); recordFact(id, 'played_for_club', cat, 'canonical') }
}
for (const [trophy, ids] of Object.entries(categories.trophies || {})) {
  for (const id of ids) { const r = registry.get(id); if (!r) continue; if (!r.trophies.includes(trophy)) r.trophies.push(trophy); recordFact(id, 'won_trophy', trophy, 'canonical') }
}

// ── 3. CURATED EDITORIAL WHITELIST (membership.js) → GENERATION only ──────────
// Resolve curated names → ids. A curated entry force-includes a canonical member
// into the generation set (and owns the display spelling), but NEVER defines
// validation. A curated name absent from the canonical set is simply ignored.
const curatedMembers = new Map() // `${type}:${value}` -> Set(id)
function addCurated(members, type, valueMap = x => x) {
  for (const [rawCat, names] of Object.entries(members)) {
    const cat = valueMap(rawCat)
    const key = `${type}:${cat}`
    if (!curatedMembers.has(key)) curatedMembers.set(key, new Set())
    for (const nm of names) {
      const id = playerId(canonPlayer(nm)); if (!id) continue
      const r = ensureById(id, nm)
      r.displayName = fixName(canonPlayer(nm)) // curated owns the display name (ASCII/known spelling)
      r.curated = true
      curatedMembers.get(key).add(id)
      recordFact(id, `curated_${type}`, cat, 'curated')
    }
  }
}
addCurated(CLUB_MEMBERS, 'club', canonClub)
addCurated(NATIONALITY_MEMBERS, 'nationality')
addCurated(TROPHY_MEMBERS, 'trophy')
addCurated(MANAGER_MEMBERS, 'manager')

export const PLAYERS = registry
export const FACTS = facts
export function getPlayer(id) { return registry.get(id) || null }
// Resolve a Transfermarkt id straight to its canonical Player (ids are deterministic).
export function getPlayerByTm(tmId) { return registry.get(`tm:${tmId}`) || null }
export function allPlayers() { return [...registry.values()] }
export function isNotable(p) { return p.curated || p.fame >= NOTABLE_FAME }

// ── Category member index: broad (VALIDATION) + notable (GENERATION) ─────────
const memberIndex = new Map() // `${type}:${value}` -> { broad:Set, notable:Set }
function addBroad(type, value, id) {
  if (value == null) return
  const key = `${type}:${value}`
  let e = memberIndex.get(key)
  if (!e) memberIndex.set(key, e = { broad: new Set(), notable: new Set() })
  e.broad.add(id)
  // generation = recognisable OR curated-whitelisted — necessarily a subset of broad.
  if ((registry.get(id)?.fame || 0) >= NOTABLE_FAME || curatedMembers.get(key)?.has(id)) e.notable.add(id)
}
for (const p of registry.values()) {
  for (const club of p.clubs) { addBroad('club', club, p.id); addBroad('league', CLUB_LEAGUE[club], p.id) }
  for (const tr of p.trophies) addBroad('trophy', tr, p.id)
  // nationality — validated straight from the canonical attribute (not materialised).
  for (const nat of p.nationalities) if (NAT_CATEGORIES.has(nat)) { addBroad('nationality', nat, p.id); recordFact(p.id, 'has_nationality', nat, 'canonical') }
}

export function membersOf(category) {
  return memberIndex.get(`${category.type}:${category.value}`)?.broad || new Set()
}
export function notableMembersOf(category) {
  return memberIndex.get(`${category.type}:${category.value}`)?.notable || new Set()
}

// Category catalogue = only categories with a canonical GENERATION set. Because
// notable ⊆ broad ⊆ canonical, requiring notable members structurally excludes any
// curated-only stub (e.g. the Euros, managers) — no category can be offered without
// canonical backing. Managers are kept here for tests but not a playable catalogue.
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
  managers: Object.keys(MANAGER_MEMBERS), // kept for tests; not in the playable catalogue
}
