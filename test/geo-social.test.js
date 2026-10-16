import { describe, it, expect, beforeEach } from 'vitest'

const store = new Map()
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
beforeEach(() => store.clear())

const { GEO_GAMES } = await import('../src/geography/games')
const { SECTIONS } = await import('../worker/api.js')
const { loadLog, upsertRow, dayStreak, isPerfect, byDay } = await import('../src/geography/social/log')
const { shapeOf } = await import('../src/geography/social/results')
const { recordResult, recordScore, onRecorded } = await import('../src/geography/data/progress')

describe('Triviverse Geography · competition layer', () => {
  it('the server knows exactly the geography dailies', () => {
    expect([...SECTIONS.geography.games].sort()).toEqual(GEO_GAMES.map(g => g.id).sort())
  })

  it('football keeps its own tables; geography never shares one', () => {
    const f = SECTIONS.football, g = SECTIONS.geography
    expect([f.results, f.totals, f.all, f.scores, f.leagues, f.members]).toEqual(['results', 'daily_totals', 'world_all', 'score_counts', 'leagues', 'members'])
    for (const k of ['results', 'totals', 'all', 'scores', 'leagues', 'members']) expect(g[k]).not.toBe(f[k])
    expect(f.games.size).toBe(11)
  })

  it('turns each game’s finish into one comparable result', () => {
    expect(shapeOf({ game: 'borderline', kind: 'guesses', won: true, value: 3, slots: 6 })).toEqual({ w: true, v: 3, of: 6, low: true })
    expect(shapeOf({ game: 'outrank', kind: 'score', won: true, value: 8, slots: 11 })).toEqual({ w: true, v: 8, of: 10 })
    expect(shapeOf({ game: 'postcard', kind: 'score', won: true, value: 4210, slots: 5 })).toEqual({ w: true, v: 4210, u: 'pts' })
  })

  it('announces each first-time finish once', () => {
    const seen = []
    const off = onRecorded(e => seen.push(e))
    recordResult('unfurl', true, 2, 6, 100)
    recordResult('unfurl', true, 2, 6, 100) // same day again: ignored
    recordScore('milestone', 3900, 3, 5, 100, true)
    off()
    expect(seen.map(e => [e.game, e.kind, e.value])).toEqual([['unfurl', 'guesses', 2], ['milestone', 'score', 3900]])
  })

  it('day streak, best run and perfect days', () => {
    for (const d of [10, 11, 12, 14, 15]) upsertRow({ d, g: 'borderline', w: true })
    for (const g of GEO_GAMES) upsertRow({ d: 15, g: g.id, w: true })
    expect(dayStreak(loadLog(), 15)).toMatchObject({ streak: 2, best: 3, perfect: 1, days: 5, atRisk: false })
    expect(dayStreak(loadLog(), 16)).toMatchObject({ streak: 2, atRisk: true }) // yesterday counts until today ends
    expect(dayStreak(loadLog(), 17).streak).toBe(0)
    expect(isPerfect(byDay().get(15))).toBe(true)
    expect(isPerfect(byDay().get(14))).toBe(false)
    upsertRow({ d: 15, g: 'borderline', sent: 1 }) // merges, never duplicates
    expect(loadLog().filter(r => r.d === 15 && r.g === 'borderline')).toEqual([{ d: 15, g: 'borderline', w: true, sent: 1 }])
  })
})
