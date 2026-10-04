import { describe, it, expect } from 'vitest'
import { getBingoForDay, getRandomBingo, qualifies, categoryLabel, pruneQueue, strandedSquares, CARD_SIZE, TIME_LIMIT_S, WRONG_PENALTY_S } from '../src/data/bingo.js'
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
  })
})

describe('Football Bingo — timed play with unlimited skips', () => {
  it('is a three-minute card with a time penalty, not lives', () => {
    expect(TIME_LIMIT_S).toBe(180)
    expect(WRONG_PENALTY_S).toBeGreaterThan(0)
  })

  it('deals several candidates per square so a cycling queue stays deep', () => {
    for (let d = 1; d <= 30; d++) expect(getBingoForDay(d).deal.length).toBeGreaterThanOrEqual(CARD_SIZE * 3)
  })

  it('prunes players who can no longer fill any open square', () => {
    const { deal } = getBingoForDay(5)
    const placed = new Array(CARD_SIZE).fill(null)
    const q = deal.map((_, i) => i)
    expect(pruneQueue(q, deal, placed)).toEqual(q) // nothing filled → everyone useful
    const full = new Array(CARD_SIZE).fill({ id: 'x' })
    expect(pruneQueue(q, deal, full)).toEqual([])  // card full → nobody left to place
    expect(strandedSquares([], deal, placed)).toHaveLength(CARD_SIZE)
  })

  // The complaint this mode answers: one bad placement must not make the card
  // impossible. A careless player — random valid squares, random skips — never
  // strands a square.
  it('never strands a square under careless play', () => {
    let stuck = 0
    for (let d = 1; d <= 60; d++) {
      const { deal } = getBingoForDay(d)
      for (let run = 0; run < 20; run++) {
        let s = d * 1000 + run + 1
        const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
        let placed = new Array(CARD_SIZE).fill(null), queue = deal.map((_, i) => i), steps = 0
        while (placed.some(p => !p) && steps++ < 2000) {
          if (strandedSquares(queue, deal, placed).length) { stuck++; break }
          const cur = queue[0], open = deal[cur].fits.filter(sq => !placed[sq])
          if (open.length && rnd() < 0.8) { placed = placed.map((p, i) => (i === open[Math.floor(rnd() * open.length)] ? { id: cur } : p)); queue = queue.slice(1) }
          else queue = [...queue.slice(1), cur]
          queue = pruneQueue(queue, deal, placed)
        }
        expect(placed.every(Boolean), `day ${d} run ${run}`).toBe(true)
      }
    }
    expect(stuck).toBe(0)
  })
})
