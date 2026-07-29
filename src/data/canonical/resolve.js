// ─────────────────────────────────────────────────────────────────────────
// SHARED ENTITY RESOLUTION
//
// ONE normalisation + matching implementation for the whole platform. Replaces
// the three divergent copies of normalizeName/broadenPosition. Adjudication is
// pure (no I/O): map raw user text → a canonical player id (or AMBIGUOUS /
// UNKNOWN), then membership is a set lookup.
//
// Ambiguity is SURFACED, never silently guessed — this is the correct handling
// of "Ronaldo", duplicate surnames (Neville), etc., instead of a heuristic
// quietly picking one and scoring the wrong player.
// ─────────────────────────────────────────────────────────────────────────

import { allPlayers, isNotable } from './facts.js'
import { getFlagFromNationality } from '../../utils/flags.js'
// normalize/surnameKeys live in a pure, registry-free module so build scripts can
// reuse them; re-exported here so existing `from './resolve.js'` imports work.
import { normalize, surnameKeys } from './normalize.js'
export { normalize } from './normalize.js'
// Phase 3 — the identity crosswalk backs name→id resolution for games migrating
// to id-based validation.
import crosswalk from './players.crosswalk.json'

export const OK = 'ok'
export const AMBIGUOUS = 'ambiguous'
export const UNKNOWN = 'unknown'

// Curated same-person alias corrections — a real player whose registry canonical
// name differs from a name used in other data (e.g. Tenable answers, which are
// generated from raw source names and carry no player id), that the automatic
// identity build missed. Normalized name → registry id.
//
// HAND-VERIFY EVERY ENTRY. Surnames collide viciously: "Halil"/"Hamit Altıntop"
// are different twin brothers, "Keith"/"Gary Gillespie" are different players.
// Only add a pair once you've confirmed it is the SAME human — never by surname
// alone. This mirrors the curated MANUAL_FIXES in nameFixes.js.
// Value is a CANONICAL NAME (resolved through byAlias), not an id — so these
// survive id-scheme changes (RFC-001 Phase A: ids are now tm:<id> / p:<slug>).
const ALIAS_FIXES = {
  'andrew robertson': 'Andy Robertson', // Liverpool/Scotland LB — official "Andrew", known as "Andy"
}

// Resolve a display name to its stable internal player id via the identity
// crosswalk. Returns null for ambiguous (multiple candidates) or unknown names,
// so callers can fall back to name matching. Additive — does not affect resolve().
export function resolveNameToId(name) {
  const n = normalize(name)
  // A curated alias fix is an override (a name that means a specific canonical
  // player) → resolve THROUGH it, ahead of byAlias, so it wins over a namesake.
  const key = ALIAS_FIXES[n] ? normalize(ALIAS_FIXES[n]) : n
  const hit = crosswalk.byAlias[key]
  return typeof hit === 'string' ? hit : null
}

// Bare tokens that genuinely refer to more than one real person — must prompt,
// never auto-resolve. Curated, small, explicit.
const AMBIGUOUS_ALIASES = {
  ronaldo: ['Cristiano Ronaldo', 'Ronaldo Nazario'],
}

// Build the indices once.
let fullIndex = null      // normalized full name/alias -> Set(displayName)
let surnameIndex = null   // normalized surname -> Set(displayName)

function build() {
  fullIndex = new Map()
  surnameIndex = new Map()
  const add = (map, key, displayName) => {
    if (!key) return
    if (!map.has(key)) map.set(key, new Set())
    map.get(key).add(displayName)
  }
  for (const p of allPlayers()) {
    add(fullIndex, normalize(p.displayName), p.displayName)
    for (const key of surnameKeys(p.displayName)) add(surnameIndex, key, p.displayName)
  }
}

function result(status, displayNames) {
  if (status === OK) return { status, displayName: [...displayNames][0] }
  if (status === AMBIGUOUS) return { status, options: [...displayNames].sort() }
  return { status }
}

// Resolve raw text against the canonical registry.
//   { status:'ok', displayName } | { status:'ambiguous', options:[…] } | { status:'unknown' }
export function resolve(rawInput) {
  if (!fullIndex) build()
  const q = normalize(rawInput)
  if (!q) return result(UNKNOWN)

  // Known ambiguous bare token (e.g. "ronaldo").
  if (AMBIGUOUS_ALIASES[q]) return result(AMBIGUOUS, AMBIGUOUS_ALIASES[q])

  // Exact full-name/alias hit.
  if (fullIndex.has(q)) {
    const set = fullIndex.get(q)
    return set.size === 1 ? result(OK, set) : result(AMBIGUOUS, set)
  }

  // Surname-only: unique → ok, otherwise ambiguous.
  if (surnameIndex.has(q)) {
    const set = surnameIndex.get(q)
    return set.size === 1 ? result(OK, set) : result(AMBIGUOUS, set)
  }

  return result(UNKNOWN)
}

// Convenience for game code that already has a closed candidate set for a cell:
// resolve the guess, then confirm membership + not-yet-used. Returns the
// canonical display name on success, else null. Mirrors the old resolveGuess
// contract but is backed by the shared resolver.
export function resolveAgainst(rawInput, candidateNames, usedNames = new Set()) {
  const candidates = new Set(candidateNames)
  const r = resolve(rawInput)
  if (r.status === OK) {
    return candidates.has(r.displayName) && !usedNames.has(r.displayName) ? r.displayName : null
  }
  if (r.status === AMBIGUOUS) {
    // If exactly one of the disambiguation options is a valid unused candidate,
    // the cell context disambiguates it — accept that one.
    const viable = r.options.filter(n => candidates.has(n) && !usedNames.has(n))
    return viable.length === 1 ? viable[0] : null
  }
  return null
}

// ── Autocomplete cleanup ──────────────────────────────────────────────────
// Suggestion dropdowns merge names from an external API + a local list, so
// near-duplicates slip through: misspellings ("Frank Ribery" vs "Franck Ribéry"),
// first-name variants ("Emil"/"Emile Smith-Rowe") and bare ambiguous tokens
// ("Ronaldo"). Run the merged list through the registry so the dropdown only
// offers clean, resolvable players:
//   • a name the registry knows     → its canonical spelling
//   • an ambiguous bare token        → the real people it could mean
//   • a spelling variant of a known  → dropped (it could never validate)
//   • a genuinely unknown name        → kept as-is (never hide a real answer)
// Deduped by canonical identity. `list` is [{ name, flag, … }]; extra fields
// (e.g. position) are preserved for resolved names.
function fuzzyKey(name) {
  const parts = normalize(name).split(' ').filter(Boolean)
  return `${parts[parts.length - 1] || ''}|${(parts[0] || '').slice(0, 3)}`
}
const titleCase = (s) => s.replace(/\b\w/g, c => c.toUpperCase())
// For an ambiguous alias, the option the bare token is a prefix of (e.g. "Ronaldo
// Nazário" for "ronaldo") is the "primary" meaning. Different game modes disagree
// on that player's canonical spelling (501's rosters use the bare "Ronaldo",
// TicTacToe's registry uses "Ronaldo Nazário"), but the BARE token validates in
// both — so we display the primary option under its bare token.
const primaryBare = new Map() // normalized full option -> bare display
for (const [bare, opts] of Object.entries(AMBIGUOUS_ALIASES))
  for (const opt of opts)
    if (normalize(opt) === bare || normalize(opt).startsWith(bare + ' ')) primaryBare.set(normalize(opt), titleCase(bare))
const asShown = (canonicalName) => primaryBare.get(normalize(canonicalName)) || canonicalName

// Prefix/surname search over the WHOLE canonical registry, so every valid player
// is findable by full name or surname — not just whatever the external API and
// the small local list happen to return. Exact full-name and exact-surname
// matches rank first, then more famous players. Cached index built once.
// Map registry position terms → the compact badge codes the games display.
const POS_BADGE = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD', GK: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD' }
let searchIndex = null
function buildSearchIndex() {
  searchIndex = allPlayers().map(p => ({
    name: p.displayName,
    norm: normalize(p.displayName),
    surnames: surnameKeys(p.displayName),
    flag: getFlagFromNationality(p.nationalities[0] || ''),
    notable: isNotable(p),
    id: p.id,
    nationality: p.nationalities[0] || '',
    position: POS_BADGE[(p.positions || [])[0]] || null,
  }))
}
export function searchRegistry(query, limit = 14) {
  if (!searchIndex) buildSearchIndex()
  const q = normalize(query)
  if (q.length < 2) return []
  const hits = []
  for (const p of searchIndex) {
    if (!p.norm.includes(q)) continue
    let rank
    if (p.norm === q) rank = 0                                  // exact full name / mononym
    else if (p.surnames.includes(q)) rank = 1                  // exact surname
    else if (p.norm.startsWith(q)) rank = 2                    // full-name prefix
    else if (p.norm.split(' ').some(w => w.startsWith(q))) rank = 3 // any-word prefix
    else rank = 4                                              // substring
    hits.push({ p, rank })
  }
  hits.sort((a, b) => a.rank - b.rank || (b.p.notable - a.p.notable) || a.p.name.localeCompare(b.p.name))
  return hits.slice(0, limit).map(({ p }) => ({ name: p.name, flag: p.flag, id: p.id, nationality: p.nationality, position: p.position }))
}

export function refineSuggestions(list, usedNames = new Set()) {
  const canon = new Map()       // normalized canonical name -> item
  const knownFuzzy = new Set()  // fuzzy keys already covered by a known player
  const unknowns = []
  const addCanon = (name, src) => {
    const shown = asShown(name)
    const key = normalize(shown)
    // Attach the stable id from the true canonical name (not the possibly-bare
    // shown form), so suggestions carry identity and dedup by it.
    if (!canon.has(key)) canon.set(key, { ...src, name: shown, id: resolveNameToId(name) })
    knownFuzzy.add(fuzzyKey(shown))
  }
  for (const item of list) {
    const r = resolve(item.name)
    if (r.status === OK) addCanon(r.displayName, item)
    else if (r.status === AMBIGUOUS) r.options.forEach(opt => addCanon(opt, {}))
    else unknowns.push(item)
  }
  const out = []
  const seen = new Set()
  const push = (item) => {
    // Dedup by stable id when known (catches two spellings of one player), else
    // by normalized name (for non-registry suggestions).
    const key = item.id || normalize(item.name)
    if (!key || seen.has(key) || usedNames.has(item.name)) return
    seen.add(key); out.push(item)
  }
  for (const item of canon.values()) push(item)
  for (const item of unknowns) {
    if (knownFuzzy.has(fuzzyKey(item.name))) continue // spelling variant of a known player → drop
    push(item)                                        // genuinely non-registry player → keep
  }
  return out
}
