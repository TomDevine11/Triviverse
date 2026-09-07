import { describe, it, expect } from 'vitest'
import { buildMatcher, normName, surnameKey, applyGuess, acceptId } from '../src/seo/pairMatch.js'

// A tiny hand-built cohort exercising every branch deterministically.
const players = [
  { id: 1, n: 'Luís Figo', surname: surnameKey('Luís Figo'), aliases: [] },
  { id: 2, n: 'Ronaldo', surname: surnameKey('Ronaldo'), aliases: [] },
  { id: 3, n: 'Samuel Eto’o', surname: surnameKey('Samuel Eto’o'), aliases: ['etoo'] },
  { id: 4, n: 'Joaquín Navarro', surname: surnameKey('Joaquín Navarro'), aliases: [] },
  { id: 5, n: 'Alfonso Navarro', surname: surnameKey('Alfonso Navarro'), aliases: [] },
]
const m = buildMatcher(players)

describe('pairMatch — deterministic answer resolution', () => {
  it('normalises accents, case and punctuation', () => {
    expect(normName('Luís  FIGO')).toBe('luis figo')
    expect(surnameKey('Frank de Boer')).toBe('de boer')
    expect(surnameKey('Ronaldo')).toBe('ronaldo')
  })

  it('accepts a normalised full-name match → canonical id', () => {
    expect(m.resolve('luis figo')).toMatchObject({ status: 'correct', id: 1 })
    expect(m.resolve('LUÍS FIGO')).toMatchObject({ status: 'correct', id: 1 })
  })

  it('accepts a unique surname → canonical id', () => {
    expect(m.resolve('figo')).toMatchObject({ status: 'correct', id: 1 })
  })

  it('accepts an explicit alias (apostrophe-collapsed spelling)', () => {
    expect(m.resolve('etoo')).toMatchObject({ status: 'correct', id: 3 })
    expect(m.resolve("eto'o")).toMatchObject({ status: 'correct', id: 3 }) // surname "eto o"
  })

  it('single-name player matches on the name', () => {
    expect(m.resolve('ronaldo')).toMatchObject({ status: 'correct', id: 2 })
  })

  it('ambiguous surname requires disambiguation (never auto-accepts)', () => {
    const r = m.resolve('navarro')
    expect(r.status).toBe('ambiguous')
    expect(r.candidates.map(c => c.id).sort()).toEqual([4, 5])
    // but the full name resolves cleanly
    expect(m.resolve('joaquin navarro')).toMatchObject({ status: 'correct', id: 4 })
  })

  it('rejects a non-member and an empty guess', () => {
    expect(m.resolve('lionel messi').status).toBe('none')
    expect(m.resolve('   ').status).toBe('empty')
  })
})

describe('game core — applyGuess / acceptId (deterministic, DOM-free)', () => {
  it('adds a correct guess to the found list', () => {
    expect(applyGuess([], m, 'figo')).toEqual({ found: [1], action: 'add', id: 1 })
  })

  it('a duplicate never increments (by full name OR alias OR surname)', () => {
    let s = applyGuess([], m, 'figo').found          // [1]
    expect(applyGuess(s, m, 'luis figo')).toEqual({ found: [1], action: 'dupe', id: 1 })
    expect(applyGuess(s, m, 'figo')).toEqual({ found: [1], action: 'dupe', id: 1 })
    // alias then the same player again → still one entry
    s = applyGuess([], m, 'etoo').found              // [3]
    expect(applyGuess(s, m, "eto'o")).toEqual({ found: [3], action: 'dupe', id: 3 })
  })

  it('an ambiguous guess never adds anyone; the disambiguation choice does', () => {
    const amb = applyGuess([], m, 'navarro')
    expect(amb.action).toBe('ambiguous')
    expect(amb.found).toEqual([])                    // nothing added yet
    expect(acceptId(amb.found, 4)).toEqual({ found: [4], action: 'add', id: 4 })
    expect(acceptId([4], 4)).toEqual({ found: [4], action: 'dupe', id: 4 })
  })

  it('a miss and an empty guess leave the found list untouched', () => {
    expect(applyGuess([1], m, 'messi')).toEqual({ found: [1], action: 'miss' })
    expect(applyGuess([1], m, '  ')).toEqual({ found: [1], action: 'empty' })
  })
})
