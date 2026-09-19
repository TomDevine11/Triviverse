import { describe, it, expect } from 'vitest'
import { getBingoForDay, getRandomBingo, qualifies, categoryLabel, CARD_SIZE, MAX_LIVES } from '../src/data/bingo.js'
import { getPlayer } from '../src/data/canonical/facts.js'

// A card that cannot be completed is worse than no card at all — the player
// loses on a puzzle that was never winnable. These assertions are the contract.
describe('Football Bingo card generation', () => {
  const days = Array.from({ length: 60 }, (_, i) => i + 1)

  it('builds a full card for every day', () => {
    for (const d of days) {
      const c = getBingoForDay(d)
      expect(c.squares, `day ${d}`).toHaveLength(CARD_SIZE)
      expect(c.deal.length, `day ${d}`).toBeGreaterThanOrEqual(CARD_SIZE)
    }
  })

  it('is deterministic per day', () => {
    for (const d of [1, 17, 99]) {
      expect(JSON.stringify(getBingoForDay(d))).toBe(JSON.stringify(getBingoForDay(d)))
    }
  })

  it('never repeats a square on one card', () => {
    for (const d of days) {
      const keys = getBingoForDay(d).squares.map(s => `${s.type}:${s.value}`)
      expect(new Set(keys).size, `day ${d}`).toBe(CARD_SIZE)
    }
  })

  it('never deals the same player twice', () => {
    for (const d of days) {
      const ids = getBingoForDay(d).deal.map(p => p.id)
      expect(new Set(ids).size, `day ${d}`).toBe(ids.length)
    }
  })

  it('caps broad league squares at one', () => {
    for (const d of days) {
      const leagues = getBingoForDay(d).squares.filter(s => s.type === 'league').length
      expect(leagues, `day ${d}`).toBeLessThanOrEqual(1)
    }
  })

  it('deals only recognisable players', () => {
    for (const d of days.slice(0, 20)) {
      for (const p of getBingoForDay(d).deal) {
        expect(getPlayer(p.id)?.fame ?? 0, `${p.name} on day ${d}`).toBeGreaterThanOrEqual(48)
      }
    }
  })

  it('records fits that the broad set actually agrees with', () => {
    for (const d of days.slice(0, 20)) {
      const c = getBingoForDay(d)
      for (const p of c.deal) {
        expect(p.fits.length, `${p.name} day ${d}`).toBeGreaterThan(0)
        for (const i of p.fits) expect(qualifies(p.id, c.squares[i]), `${p.name} → ${c.squares[i].value}`).toBe(true)
      }
    }
  })

  // The real guarantee: a perfect assignment exists. Solved as bipartite
  // matching (Hungarian-style augmenting path) over deal → squares.
  it('always has a perfect solution — every square fillable without reusing a player', () => {
    for (const d of days) {
      const { squares, deal } = getBingoForDay(d)
      const squareOwner = new Array(squares.length).fill(-1)
      const tryAssign = (pi, seen) => {
        for (const sq of deal[pi].fits) {
          if (seen.has(sq)) continue
          seen.add(sq)
          if (squareOwner[sq] === -1 || tryAssign(squareOwner[sq], seen)) { squareOwner[sq] = pi; return true }
        }
        return false
      }
      let matched = 0
      for (let pi = 0; pi < deal.length; pi++) if (tryAssign(pi, new Set())) matched++
      const filled = squareOwner.filter(o => o !== -1).length
      expect(filled, `day ${d} — only ${filled}/${CARD_SIZE} squares matchable`).toBe(CARD_SIZE)
      expect(matched).toBeGreaterThanOrEqual(CARD_SIZE)
    }
  })

  it('random cards obey the same contract', () => {
    for (let i = 0; i < 25; i++) {
      const c = getRandomBingo()
      expect(c.squares).toHaveLength(CARD_SIZE)
      expect(new Set(c.deal.flatMap(p => p.fits)).size).toBe(CARD_SIZE)
    }
  })

  it('labels every category type', () => {
    for (const s of getBingoForDay(3).squares) {
      expect(categoryLabel(s)).toBeTruthy()
      expect(categoryLabel(s)).not.toBe(s.value === undefined ? '' : '')
    }
    expect(MAX_LIVES).toBe(3)
  })
})
