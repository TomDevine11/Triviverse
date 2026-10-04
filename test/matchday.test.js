import { describe, it, expect } from 'vitest'
import { matchdayIndex, msUntilNextMatchday, londonOffsetMs } from '../src/utils/matchday.js'

// Reference: the UK calendar date of an instant, from Intl's tz database.
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
function intlLondon(t) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map(x => [x.type, x.value]))
  return { day: Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000, hour: +p.hour }
}

describe('matchday clock (UK time)', () => {
  it('matches the UK calendar every 20 minutes from 2024 to 2030, through every clock change', () => {
    for (let t = Date.UTC(2024, 0, 1); t < Date.UTC(2031, 0, 1); t += 20 * 60000) {
      expect(matchdayIndex(t), new Date(t).toISOString()).toBe(intlLondon(t).day)
    }
  })

  it('keeps the existing numbering (4 Oct 2026 is day 20730)', () => {
    expect(matchdayIndex(Date.UTC(2026, 9, 4, 12))).toBe(20730)
  })

  it('turns over at UK midnight, not UTC midnight, in summer', () => {
    // 4 Oct 2026 is BST: UK midnight is 23:00 UTC the night before.
    expect(matchdayIndex(Date.UTC(2026, 9, 4, 22, 59))).toBe(20730)
    expect(matchdayIndex(Date.UTC(2026, 9, 4, 23, 0))).toBe(20731)
    // January is GMT: midnight UK = midnight UTC.
    expect(matchdayIndex(Date.UTC(2027, 0, 10, 23, 59))).toBe(matchdayIndex(Date.UTC(2027, 0, 10, 0, 0)))
  })

  it('is the same day for everyone at the same instant, wherever they are', () => {
    // matchdayIndex takes an instant, so a Sydney or New York browser computes
    // exactly what London does — there is no local-time input at all.
    const t = Date.UTC(2026, 9, 4, 14, 30)
    expect(matchdayIndex(t)).toBe(intlLondon(t).day)
  })

  it('counts down to the next UK midnight exactly, including across clock changes', () => {
    for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2028, 0, 1); t += 37 * 60000) {
      const ms = msUntilNextMatchday(t)
      expect(ms > 0 && ms <= 25 * 3600000, new Date(t).toISOString()).toBe(true)
      expect(matchdayIndex(t + ms), new Date(t).toISOString()).toBe(matchdayIndex(t) + 1)
      expect(matchdayIndex(t + ms - 1000)).toBe(matchdayIndex(t))
      expect(intlLondon(t + ms).hour).toBe(0)
    }
  })

  it('applies BST only between the last Sundays of March and October', () => {
    expect(londonOffsetMs(Date.UTC(2026, 6, 1))).toBe(3600000)
    expect(londonOffsetMs(Date.UTC(2026, 11, 1))).toBe(0)
  })
})
