import { describe, it, expect } from 'vitest'
import { dailyPair, par, PAIR_COUNT, LATE_BORDERS, borders } from '../src/geography/data/overland.js'
import { GEO_EPOCH } from '../src/geography/data/day.js'

describe('Overland: borders added late do not move the dailies', () => {
  it('the late borders are real borders in the corrected map', () => {
    for (const [a, b] of LATE_BORDERS) { expect(borders(a, b)).toBe(true); expect(borders(b, a)).toBe(true) }
  })
  it('the daily sequence is pinned (values from before the 2026-11-02 border fix)', () => {
    // Checked against the pre-fix code and data for 3,000 consecutive days: every
    // pair and every par matched. These four samples keep that true from now on.
    expect(PAIR_COUNT).toBe(4348)
    const pinned = [[0, ['YE', 'AT'], 6], [30, ['SE', 'AL'], 5], [500, ['BG', 'KZ'], 3], [2000, ['AT', 'EE'], 3]]
    for (const [k, pair, p] of pinned) {
      expect(dailyPair(GEO_EPOCH + k)).toEqual(pair)
      expect(par(...pair)).toBe(p)
    }
  })
})
