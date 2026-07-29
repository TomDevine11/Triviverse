// Phase 1 (targeted cleanup): corrupt source names (a stray lowercase fragment
// appended by the Wikidata import) are fixed to one canonical spelling, so the
// search dropdown stops showing the same player twice. Verified end-to-end for
// "Divock Origi" (was stored as "Divock Origi kolman").
import { describe, it, expect } from 'vitest'
import { fixName } from '../src/data/canonical/nameFixes.js'
import { allPlayers } from '../src/data/canonical/facts.js'
import { resolveNameToId, refineSuggestions } from '../src/data/canonical/resolve.js'

describe('curated name fixes', () => {
  it('maps the corrupt spelling to the clean one', () => {
    expect(fixName('Divock Origi kolman')).toBe('Divock Origi')
    expect(fixName('A Normal Name')).toBe('A Normal Name') // pass-through
  })

  it('facts.js (the search/board source) no longer exposes the corrupt name', () => {
    const names = new Set(allPlayers().map(p => p.displayName))
    expect(names.has('Divock Origi kolman')).toBe(false)
    expect(names.has('Divock Origi')).toBe(true)
  })

  it('both spellings resolve to the SAME stable id (corrupt form kept as alias)', () => {
    const id = resolveNameToId('Divock Origi')
    expect(id).toBeTruthy()
    expect(resolveNameToId('Divock Origi kolman')).toBe(id) // corrupt form → same deterministic id
  })

  it('the dropdown dedups the two Origi entries into one', () => {
    // Simulates searchRegistry + TheSportsDB both surfacing the (now clean) name.
    const merged = refineSuggestions([{ name: 'Divock Origi' }, { name: 'Divock Origi' }])
    const origis = merged.filter(s => s.name.toLowerCase().includes('origi'))
    expect(origis).toHaveLength(1)
  })
})
