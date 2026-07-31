// ─────────────────────────────────────────────────────────────────────────
// CATEGORY VALIDATION INVARIANTS
//
// Enforces the property the migration is actually about: a game must accept EVERY
// real player who satisfies a category (no false negatives). Completeness is a
// checked invariant here, not an assumption — so no category can ever silently
// become an incomplete curated stub or a recognisability-floored subset again.
// (Born from the Chelsea × Champions League bug: Bertrand/Ramires were real winners
// rejected because the trophy category was a 74-name curated stub.)
// ─────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { membersOf, notableMembersOf, getPlayer, playerId, CATEGORY_KEYS } from '../src/data/canonical/facts.js'
import { normalize } from '../src/data/canonical/normalize.js'

const cats = JSON.parse(readFileSync('src/data/categories.generated.json', 'utf8'))
const aliases = JSON.parse(readFileSync('src/data/canonical/players.aliases.generated.json', 'utf8'))
const registryIds = new Set(JSON.parse(readFileSync('src/data/canonical/players.registry.json', 'utf8')).map(p => p.id))

// A member is "resolvable" if a user could type it — its name maps to its id in the
// client alias index (uniquely, or as one option of an ambiguous surname).
const resolvable = (id) => {
  const p = getPlayer(id); if (!p) return false
  const hit = aliases[normalize(p.displayName)]
  return hit === id || (Array.isArray(hit) && hit.includes(id))
}

describe('category validation — completeness & correctness invariants', () => {
  // GOLDEN — the exact bug that reopened this work.
  it('accepts Chelsea Champions League winners (Bertrand, Ramires)', () => {
    const chelsea = membersOf({ type: 'club', value: 'Chelsea' })
    const cl = membersOf({ type: 'trophy', value: 'UEFA Champions League' })
    for (const [id, who] of [['tm:40611', 'Bertrand'], ['tm:54170', 'Ramires']]) {
      expect(chelsea.has(id), `${who} in Chelsea`).toBe(true)
      expect(cl.has(id), `${who} in CL`).toBe(true)
      expect(playerId(getPlayer(id).displayName), `${who} resolves`).toBe(id)
    }
  })

  // COMPLETENESS — validation ⊇ every resolvable canonical fact, for EVERY category.
  it('every resolvable canonical club member is a validation member', () => {
    for (const [club, ids] of Object.entries(cats.clubs)) {
      const broad = membersOf({ type: 'club', value: club.replace('FC Barcelona', 'Barcelona').replace('FC Bayern Munich', 'Bayern Munich').replace('A.S. Roma', 'Roma').replace('S.S.C. Napoli', 'Napoli') })
      const missing = ids.filter(id => registryIds.has(id) && !broad.has(id))
      expect(missing, `${club}: ${missing.slice(0, 6).join(', ')}`).toHaveLength(0)
    }
  })
  it('every resolvable canonical trophy winner is a validation member', () => {
    for (const [trophy, ids] of Object.entries(cats.trophies)) {
      const broad = membersOf({ type: 'trophy', value: trophy })
      const missing = ids.filter(id => registryIds.has(id) && !broad.has(id))
      expect(missing, `${trophy}: ${missing.slice(0, 6).join(', ')}`).toHaveLength(0)
    }
  })

  // NO STUB — a category is offered ONLY with a canonical validation backing.
  it('every offered category has a non-empty canonical validation set', () => {
    for (const club of CATEGORY_KEYS.clubs) expect(membersOf({ type: 'club', value: club }).size, club).toBeGreaterThan(0)
    for (const t of CATEGORY_KEYS.trophies) expect(membersOf({ type: 'trophy', value: t }).size, t).toBeGreaterThan(0)
    for (const n of CATEGORY_KEYS.nationalities) expect(membersOf({ type: 'nationality', value: n }).size, n).toBeGreaterThan(0)
  })
  it('does not offer a trophy that lacks clean canonical honours (Euros stay out until sourced)', () => {
    expect(CATEGORY_KEYS.trophies).not.toContain('UEFA European Championship')
    expect(CATEGORY_KEYS.trophies).toContain('UEFA Champions League')
  })

  // NO FLOOR ON VALIDATION — broad is not recognisability-filtered. A deep squad
  // (Chelsea, 400+) contains many sub-recognisability members that validation must
  // accept but generation would not feature.
  it('validation is unfloored (broad strictly larger than notable on a deep squad)', () => {
    const che = { type: 'club', value: 'Chelsea' }
    expect(membersOf(che).size).toBeGreaterThan(notableMembersOf(che).size)
    expect(membersOf({ type: 'trophy', value: 'UEFA Champions League' }).has('tm:54170')).toBe(true) // Ramires
  })

  // GENERATION ⊆ VALIDATION — a revealed/generated answer can never be rejected.
  it('generation (notable) is always a subset of validation (broad)', () => {
    for (const club of CATEGORY_KEYS.clubs) {
      const b = membersOf({ type: 'club', value: club }), n = notableMembersOf({ type: 'club', value: club })
      for (const id of n) expect(b.has(id), `${club}: ${id} notable∉broad`).toBe(true)
    }
    for (const t of CATEGORY_KEYS.trophies) {
      const b = membersOf({ type: 'trophy', value: t }), n = notableMembersOf({ type: 'trophy', value: t })
      for (const id of n) expect(b.has(id), `${t}: ${id} notable∉broad`).toBe(true)
    }
  })

  // RESOLVABILITY — every validation member is a SEARCHABLE registered player, so the
  // autocomplete can surface them and a guess can be validated by id. This is the
  // property Ramires failed (he wasn't in the registry at all). Unique free-text
  // name→id round-tripping is NOT required — genuine namesakes (mononyms like
  // "Emerson") are reachable via autocomplete + cell-context disambiguation.
  const searchable = (id) => { const p = getPlayer(id); return !!(p && p.displayName && !p.displayName.startsWith('tm:')) }
  it('every validation member is a searchable registered player', () => {
    for (const club of CATEGORY_KEYS.clubs) {
      const bad = [...membersOf({ type: 'club', value: club })].filter(id => !searchable(id))
      expect(bad, `${club}: ${bad.slice(0, 6).join(', ')}`).toHaveLength(0)
    }
    for (const t of CATEGORY_KEYS.trophies) {
      const bad = [...membersOf({ type: 'trophy', value: t })].filter(id => !searchable(id))
      expect(bad, `${t}: ${bad.slice(0, 6).join(', ')}`).toHaveLength(0)
    }
  })
  // The specific regression: the golden players DO round-trip by exact name.
  it('the golden regression players resolve by exact name', () => {
    expect(playerId('Ryan Bertrand')).toBe('tm:40611')
    expect(playerId('Ramires')).toBe('tm:54170')
  })
})
