import { describe, it, expect } from 'vitest'
import { ROSTERS, SOURCED_CHALLENGES, validateGuess, isSourced, CHALLENGE_META } from '../src/data/five01.js'
import { MODES } from '../src/data/modes.js'

const CHALLENGE_IDS = MODES.flatMap(m => m.challenges).map(c => c.id)

describe('Football 501 sourced rosters', () => {
  it('every challenge in MODES has a sourced roster', () => {
    for (const id of CHALLENGE_IDS) {
      expect(isSourced(id), id).toBe(true)
      expect(Object.keys(ROSTERS[id]).length, id).toBeGreaterThan(10)
    }
  })

  it('every roster value is a positive integer with a matching breakdown', () => {
    for (const id of SOURCED_CHALLENGES) {
      for (const [name, e] of Object.entries(ROSTERS[id])) {
        expect(Number.isInteger(e.value) && e.value > 0, `${id}/${name}`).toBe(true)
        expect(Object.values(e.breakdown).reduce((a, b) => a + b, 0)).toBe(e.value)
      }
    }
  })

  it('every roster entry carries provenance (transfermarkt club data, or wikipedia for intl)', () => {
    // Phase 1: the four club boards derive from the canonical Transfermarkt
    // history tables; intl-goals remains wikipedia-sourced (temporary exception).
    for (const id of SOURCED_CHALLENGES)
      for (const e of Object.values(ROSTERS[id])) expect(e.source).toMatch(/^(transfermarkt|wikipedia):/)
  })

  it('real tallies are kept — over-180 scorers exist (they bust the board in-game)', () => {
    const messi = validateGuess('laliga-goals', 'Lionel Messi')
    expect(messi.status).toBe('valid')
    expect(messi.value).toBeGreaterThan(180) // 474 — busts, by design
  })
})

describe('Football 501 validation is pure + deterministic', () => {
  it('validates a leaderboard player by exact lookup', () => {
    // Assert invariants, not a specific tally — leaderboards refresh over time
    // (e.g. an active player's goal count rises), and hardcoding a value would
    // block the automated data refresh. Ronaldo is the all-time intl top scorer,
    // so a high positive integer that matches its own breakdown is the contract.
    const r = validateGuess('intl-goals', 'Cristiano Ronaldo')
    expect(r.status).toBe('valid')
    expect(Number.isInteger(r.value)).toBe(true)
    expect(r.value).toBeGreaterThan(100)
    expect(r.breakdown).toEqual({ goals: r.value })
  })

  it('resolves surnames and accents against the roster itself', () => {
    expect(validateGuess('intl-goals', 'messi').status).toBe('valid')
    expect(validateGuess('bundesliga-goals', 'Gerd Müller').status).toBe('valid')
    expect(validateGuess('bundesliga-goals', 'Gerd Muller').status).toBe('valid')
  })

  it('resolves an obscure leaderboard player not in the club/national registry', () => {
    // Telmo Zarra isn't in the canonical club/NT rosters, but he IS on the
    // La Liga list — self-contained resolution still finds him.
    const r = validateGuess('laliga-goals', 'Zarra')
    expect(r.status).toBe('valid')
  })

  it('returns the same result twice (no runtime I/O / drift)', () => {
    const a = validateGuess('ucl-goals', 'Raúl')
    const b = validateGuess('ucl-goals', 'Raul')
    expect(a).toEqual(b)
  })

  it('rejects a real player who is not on the leaderboard (honest, never a wrong score)', () => {
    // A real player with few PL goals is simply not on the all-time list.
    const r = validateGuess('prem-goals', 'N\'Golo Kante')
    expect(r.status).toBe('not-eligible')
  })

  it('reports no-data for an unknown challenge and never throws on junk', () => {
    expect(validateGuess('does-not-exist', 'x').status).toBe('no-data')
    expect(() => validateGuess('prem-goals', '###')).not.toThrow()
    expect(validateGuess('prem-goals', '###').status).toBe('not-eligible')
  })
})

describe('Football 501 challenge metadata', () => {
  it('each sourced challenge exposes a competition + stat label', () => {
    for (const id of SOURCED_CHALLENGES) {
      expect(CHALLENGE_META[id].competition).toBeTruthy()
      expect(CHALLENGE_META[id].statLabel).toBeTruthy()
    }
  })
})
