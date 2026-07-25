import { describe, it, expect } from 'vitest'
import { resolve, resolveAgainst, resolveNameToId, normalize, OK, AMBIGUOUS, UNKNOWN } from '../src/data/canonical/resolve.js'

describe('normalize', () => {
  it('strips diacritics, punctuation, case, and extra whitespace', () => {
    expect(normalize('João Félix')).toBe('joao felix')
    expect(normalize("N'Golo  Kanté")).toBe('ngolo kante')
    expect(normalize('  Kylian Mbappé ')).toBe('kylian mbappe')
  })
})

describe('entity resolution — named cases from the review', () => {
  it('exact full name resolves', () => {
    expect(resolve('Cristiano Ronaldo')).toEqual({ status: OK, displayName: 'Cristiano Ronaldo' })
  })

  it('accent-insensitive: Joao Felix === João Félix', () => {
    expect(resolve('Joao Felix')).toEqual({ status: OK, displayName: 'Joao Felix' })
    expect(resolve('João Félix')).toEqual({ status: OK, displayName: 'Joao Felix' })
  })

  it('"Ronaldo" is ambiguous and is surfaced, not guessed', () => {
    const r = resolve('Ronaldo')
    expect(r.status).toBe(AMBIGUOUS)
    expect(r.options).toEqual(['Cristiano Ronaldo', 'Ronaldo Nazario'])
  })

  it('unique surname resolves', () => {
    expect(resolve('Lewandowski').status).toBe(OK)
    expect(resolve('Iniesta')).toEqual({ status: OK, displayName: 'Andres Iniesta' })
  })

  it('a surname that is genuinely shared is surfaced as ambiguous', () => {
    // With the full sourced rosters, "Mbappe" now matches both Kylian and his
    // brother Ethan — the resolver correctly refuses to guess between them.
    const r = resolve('Mbappe')
    expect(r.status).toBe(AMBIGUOUS)
    expect(r.options.length).toBeGreaterThanOrEqual(2)
  })

  it('unknown input returns unknown, never a wrong-but-confident id', () => {
    expect(resolve('zzzznotaplayer')).toEqual({ status: UNKNOWN })
    expect(resolve('')).toEqual({ status: UNKNOWN })
  })

  it('never throws on adversarial input', () => {
    for (const junk of ['', '   ', '!!!', '🤖', '123', 'a'.repeat(500), 'O\'\'\'Shea']) {
      expect(() => resolve(junk)).not.toThrow()
      expect([OK, AMBIGUOUS, UNKNOWN]).toContain(resolve(junk).status)
    }
  })
})

describe('resolveAgainst — cell-context disambiguation', () => {
  const cell = ['Lionel Messi', 'Cristiano Ronaldo', 'Karim Benzema']

  it('accepts a valid unused candidate', () => {
    expect(resolveAgainst('Messi', cell, new Set())).toBe('Lionel Messi')
  })

  it('accepts by surname/accents', () => {
    expect(resolveAgainst('benzema', cell, new Set())).toBe('Karim Benzema')
  })

  it('rejects an already-used candidate', () => {
    expect(resolveAgainst('Messi', cell, new Set(['Lionel Messi']))).toBeNull()
  })

  it('rejects a real player not in this cell', () => {
    expect(resolveAgainst('Xavi', cell, new Set())).toBeNull()
  })

  it('"Ronaldo" disambiguates to the candidate present in the cell', () => {
    // Only Cristiano is in the cell, so the ambiguous token resolves to him.
    expect(resolveAgainst('Ronaldo', cell, new Set())).toBe('Cristiano Ronaldo')
  })
})

describe('resolveNameToId — curated same-person alias fixes', () => {
  it('resolves "Andrew Robertson" to the "Andy Robertson" id', () => {
    // Tenable answers use "Andrew Robertson"; the registry canonicalised him to
    // "Andy Robertson". The curated fix bridges them so a picked suggestion matches.
    const id = resolveNameToId('Andy Robertson')
    expect(id).toBeTruthy()
    expect(resolveNameToId('Andrew Robertson')).toBe(id)
  })
})
