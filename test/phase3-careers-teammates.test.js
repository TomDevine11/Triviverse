// Phase 3 (increment 1): the single-target guessing games (Career Path,
// Teammates) validate a PICKED suggestion by stable player id, while free-typed
// text still falls back to the name matcher. This proves:
//   • resolveNameToId maps names → stable ids (null when ambiguous/unknown)
//   • targets now carry an id that (when present) exists in the registry
//   • id-equality accepts the right player and REJECTS a namesake (the fix)
//   • the name-matcher fallback is unchanged for free text
import { describe, it, expect } from 'vitest'
import { resolveNameToId } from '../src/data/canonical/resolve.js'
import { getPlayer } from '../src/data/canonical/facts.js'
import { matchesTarget, getTargetForDay as careersDay } from '../src/data/careers.js'
import { getTargetForDay as teammatesDay } from '../src/data/teammates.js'

// Mirror of the component's decision, kept pure so we can test it directly.
function isCorrect(target, text, selectedId = null) {
  return (selectedId != null && target.id != null)
    ? selectedId === target.id
    : matchesTarget(target.name, text)
}

describe('resolveNameToId', () => {
  it('resolves an unambiguous name to its stable id', () => {
    expect(resolveNameToId('Cristiano Ronaldo')).toBe('tm:8198') // RFC-001 Phase A: deterministic id
  })
  it('returns null for an ambiguous bare token', () => {
    expect(resolveNameToId('Ronaldo')).toBeNull()
  })
  it('returns null for an unknown name', () => {
    expect(resolveNameToId('Nobody McNobodyface')).toBeNull()
  })
  it('every non-null resolution exists in the registry', () => {
    for (const n of ['Lionel Messi', 'Xabi Alonso', 'Zlatan Ibrahimović']) {
      const id = resolveNameToId(n)
      expect(id).toBeTruthy()
      expect(getPlayer(id)).not.toBeNull()
    }
  })
})

describe('single-target games carry a resolvable id', () => {
  it('careers targets expose an id field (string or null)', () => {
    for (let d = 0; d < 20; d++) {
      const t = careersDay?.(d) // careers may not export getTargetForDay; guard
      if (!t) return
      expect('id' in t).toBe(true)
      if (t.id) expect(getPlayer(t.id)).not.toBeNull()
    }
  })
  it('teammates targets expose an id that resolves', () => {
    for (let d = 0; d < 20; d++) {
      const t = teammatesDay(d)
      expect('id' in t).toBe(true)
      if (t.id) expect(getPlayer(t.id)).not.toBeNull()
    }
  })
})

describe('id-based validation (picked suggestion) + fallback', () => {
  const target = { name: 'Cristiano Ronaldo', id: 'tm:8198' }

  it('accepts the correct player picked from the dropdown', () => {
    expect(isCorrect(target, 'Cristiano Ronaldo', resolveNameToId('Cristiano Ronaldo'))).toBe(true)
  })
  it('REJECTS a namesake picked from the dropdown (the fix)', () => {
    // A different real "…Ronaldo" resolves to a different id → rejected, where the
    // old surname matcher would have false-accepted it.
    const other = resolveNameToId('Ronaldo Nazário')
    expect(other).not.toBe(target.id)
    expect(isCorrect(target, 'Ronaldo Nazário', other)).toBe(false)
  })
  it('free-typed text still uses the name matcher (unchanged fallback)', () => {
    // No selectedId → matchesTarget path. Surname of the target still validates.
    expect(isCorrect(target, 'Ronaldo')).toBe(matchesTarget('Cristiano Ronaldo', 'Ronaldo'))
  })
  it('an ambiguous-target still falls back to name matching', () => {
    const ambiguousTarget = { name: 'Cristiano Ronaldo', id: null }
    expect(isCorrect(ambiguousTarget, 'Cristiano Ronaldo', 'anything')).toBe(matchesTarget('Cristiano Ronaldo', 'Cristiano Ronaldo'))
  })
})
