// Phase 3 (search layer): autocomplete suggestions now carry the stable player
// id and dedup by it, so two spellings of one player collapse to a single entry
// and games can validate a pick by identity without re-resolving.
import { describe, it, expect } from 'vitest'
import { searchRegistry, refineSuggestions } from '../src/data/canonical/resolve.js'
import { getPlayer } from '../src/data/canonical/facts.js'

describe('searchRegistry carries stable ids', () => {
  it('every hit exposes an id that resolves in the registry', () => {
    const hits = searchRegistry('messi')
    expect(hits.length).toBeGreaterThan(0)
    for (const h of hits) {
      expect(typeof h.id).toBe('string')
      expect(getPlayer(h.id)).not.toBeNull()
    }
  })

  it('hits carry nationality and a mapped position badge (fills the 501 dropdown)', () => {
    const [messi] = searchRegistry('lionel messi')
    expect(messi.nationality).toBe('Argentina')
    expect(['GK', 'DEF', 'MID', 'FWD']).toContain(messi.position)
  })
})

describe('refineSuggestions attaches ids and dedups by identity', () => {
  it('a resolved suggestion gets its stable id', () => {
    const [s] = refineSuggestions([{ name: 'Cristiano Ronaldo' }])
    expect(s.id).toBe('tm:8198') // RFC-001 Phase A: deterministic id from the Transfermarkt id
  })

  it('two spellings of one player collapse to a single suggestion', () => {
    // Both resolve to the same registry id → one entry, not two.
    const out = refineSuggestions([{ name: 'Zlatan Ibrahimović' }, { name: 'Zlatan Ibrahimovic' }])
    const zlatans = out.filter(s => s.name.toLowerCase().includes('ibrahimovi'))
    expect(zlatans).toHaveLength(1)
    expect(zlatans[0].id).toBeTruthy()
  })

  it('a genuinely non-registry suggestion is kept (id null) and not merged away', () => {
    const out = refineSuggestions([{ name: 'Someunknown Player' }])
    expect(out).toHaveLength(1)
    expect(out[0].id ?? null).toBeNull()
  })

  it('an ambiguous bare token still expands to multiple candidates, each with an id', () => {
    const out = refineSuggestions([{ name: 'Ronaldo' }])
    // At least the two Ronaldos, each carrying an id.
    const withIds = out.filter(s => s.id)
    expect(withIds.length).toBeGreaterThanOrEqual(2)
  })
})
