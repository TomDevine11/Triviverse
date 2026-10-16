import { describe, it, expect, beforeEach } from 'vitest'
import {
  ENTRIES, STATS, STAT_IDS, DAILY_SIZE, PASS_STREAK, DATA_YEAR, dailyFor, dailyQuestions, dailySig, validateDaily, outcomeOf, isCorrect,
  fairPair, gapOf, shown, formatValue, formatParts, exactLine, factFor, unlimitedNext, valueOf, rankOf, poolSize,
} from '../src/geography/data/outrank'
import {
  emptyDaily, answerDaily, advanceDaily, readDaily, saveDaily, dailyResults, dailyComplete, dailyFinished, dailyWon,
  newRun, answerRun, advanceRun, runStreak, readRun, saveRun, recordRun, loadUnlimitedStats, RUN_KEY,
} from '../src/geography/data/outrankPlay'
import { loadStats } from '../src/geography/data/progress'
import { GEO_EPOCH, geoDay } from '../src/geography/data/day'
import data from '../src/geography/data/stats.generated.json'

const store = new Map()
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
beforeEach(() => store.clear())

const right = (q) => (outcomeOf(q) === 'lower' ? 'lower' : 'higher')
const wrong = (q) => (outcomeOf(q) === 'lower' ? 'higher' : 'lower')

describe('Triviverse Geography · Outrank · data', () => {
  it('one reference year, one source, no invented values', () => {
    expect(DATA_YEAR).toBe(2024)
    expect(data.meta.source).toMatch(/World Bank/)
    expect(ENTRIES.length).toBeGreaterThan(180)
    for (const e of ENTRIES) {
      expect(e.population).toBeGreaterThan(0)
      for (const s of STAT_IDS) if (e[s] != null) expect(Number.isFinite(e[s]) && e[s] > 0).toBe(true)
    }
    // Spot checks against well-known 2024 magnitudes.
    expect(valueOf('IN', 'population')).toBeGreaterThan(valueOf('CN', 'population'))
    expect(valueOf('US', 'area')).toBeGreaterThan(valueOf('CA', 'area')) // land area: Canada's lakes are excluded
    expect(rankOf('RU', 'area')).toBe(1)
    expect(rankOf('MO', 'density')).toBe(1) // Macau, then Monaco
    expect(rankOf('MC', 'density')).toBe(2)
    expect(poolSize('area')).toBe(ENTRIES.length - 2) // Nicaragua and Kosovo have no 2024 land area
    expect(valueOf('NI', 'area')).toBeNull()
  })

  it('formats large numbers readably and keeps exact figures available', () => {
    expect(formatValue('population', 1_450_935_791)).toBe('1.45 billion')
    expect(formatValue('population', 35_712_000)).toBe('35.7 million')
    expect(formatValue('population', 38_631)).toBe('38,631 people')
    expect(exactLine('population', 1_450_935_791)).toBe('1,450,935,791 people')
    expect(formatValue('area', 9_147_420)).toBe('9.15 million km²')
    expect(formatValue('area', 241_930)).toBe('241,930 km²')
    expect(formatValue('area', 2.084)).toBe('2.08 km²')
    expect(formatValue('density', 3.47)).toBe('3.5 per km²')
    expect(formatValue('density', 18537.2)).toBe('18,537 per km²')
    expect(formatParts('life', 81.3868)).toEqual(['81.4', 'years'])
  })
})

describe('Triviverse Geography · Outrank · rules', () => {
  it('higher / lower / tie compare at the precision shown', () => {
    const [big, small] = ['CN', 'MT']
    expect(outcomeOf({ a: small, b: big, stat: 'population' })).toBe('higher')
    expect(outcomeOf({ a: big, b: small, stat: 'population' })).toBe('lower')
    expect(isCorrect({ a: small, b: big, stat: 'population' }, 'higher')).toBe(true)
    expect(isCorrect({ a: small, b: big, stat: 'population' }, 'lower')).toBe(false)
  })

  it('a tie accepts either answer and says so', () => {
    // Find two countries whose life expectancy reads the same to 0.1 years.
    const byShown = new Map()
    let pair = null
    for (const e of ENTRIES) {
      const k = shown('life', e.life)
      if (byShown.has(k)) { pair = [byShown.get(k), e.code]; break }
      byShown.set(k, e.code)
    }
    expect(pair).not.toBeNull()
    const q = { a: pair[0], b: pair[1], stat: 'life' }
    expect(outcomeOf(q)).toBe('tie')
    expect(isCorrect(q, 'higher')).toBe(true)
    expect(isCorrect(q, 'lower')).toBe(true)
    expect(factFor(q)).toMatch(/level at/)
    expect(fairPair(q.a, q.b, 'life')).toBe(false) // never generated
  })

  it('facts are derived from the figures', () => {
    expect(factFor({ a: 'IQ', b: 'US', stat: 'area' })).toMatch(/^The United States has \d+× the land area of Iraq\.$/)
    expect(factFor({ a: 'TH', b: 'ET', stat: 'life' })).toMatch(/years higher in Thailand than in Ethiopia/)
  })
})

describe('Triviverse Geography · Outrank · daily', () => {
  it('is deterministic and the same for everyone on a day', () => {
    expect(dailyFor(5)).toEqual(dailyFor(5))
    expect(dailySig(dailyFor(5))).not.toBe(dailySig(dailyFor(6)))
    expect(dailyQuestions(GEO_EPOCH + 4)).toEqual(dailyFor(4))
    // UK midnight boundary: 23:59 and 00:01 London time fall on consecutive puzzle days.
    const before = geoDay(Date.UTC(2026, 11, 24, 23, 59)), after = geoDay(Date.UTC(2026, 11, 25, 0, 1))
    expect(after).toBe(before + 1)
  })

  it('every day for three years is a valid, varied ten', () => {
    const counts = Object.fromEntries(STAT_IDS.map(s => [s, 0]))
    const seenCountries = new Set()
    for (let n = 0; n < 1100; n++) {
      const qs = dailyFor(n)
      expect(validateDaily(qs), `day ${n}`).toEqual([])
      expect(qs).toHaveLength(DAILY_SIZE)
      const codes = [qs[0].a, ...qs.map(q => q.b)]
      expect(new Set(codes).size).toBe(DAILY_SIZE + 1)
      for (const q of qs) { counts[q.stat]++; expect(STATS[q.stat]).toBeTruthy() }
      codes.forEach(c => seenCountries.add(c))
      expect(['population', 'area']).toContain(qs[0].stat)
    }
    for (const s of STAT_IDS) expect(counts[s]).toBeGreaterThanOrEqual(1100 * 2)
    expect(seenCountries.size).toBeGreaterThan(150) // the whole set, not a favourite few
  })

  it('opens accessible and closes close', () => {
    let early = 0, late = 0, balanced = 0
    const N = 400
    for (let n = 0; n < N; n++) {
      const qs = dailyFor(n)
      early += qs.slice(0, 3).reduce((s, q) => s + gapOf(q.a, q.b, q.stat), 0) / 3
      late += qs.slice(7).reduce((s, q) => s + gapOf(q.a, q.b, q.stat), 0) / 3
      const highs = qs.filter(q => outcomeOf(q) === 'higher').length
      if (highs >= 3 && highs <= 7) balanced++
    }
    expect(early / N).toBeGreaterThan(0.4)
    expect(late / N).toBeLessThan(0.2)
    expect(balanced / N).toBeGreaterThan(0.95)
  })
})

describe('Triviverse Geography · Outrank · daily play', () => {
  const qs = dailyFor(3)

  it('one guess per question; the first wrong answer ends the day', () => {
    let s = emptyDaily()
    for (let i = 0; i < 6; i++) {
      s = answerDaily(qs, s, right(qs[i]))
      expect(answerDaily(qs, s, wrong(qs[i]))).toBe(s) // no second guess
      expect(dailyComplete(qs, s)).toBe(false)
      s = advanceDaily(s)
    }
    expect(advanceDaily(s)).toBe(s) // can't skip an unanswered question
    s = answerDaily(qs, s, wrong(qs[6]))
    expect(dailyComplete(qs, s)).toBe(true)
    expect(dailyFinished(qs, s)).toBe(false) // still looking at the reveal
    expect(answerDaily(qs, advanceDaily(s), right(qs[7]))).toEqual(advanceDaily(s)) // no play after a miss
    s = advanceDaily(s)
    expect(dailyFinished(qs, s)).toBe(true)
    expect(dailyResults(qs, s.answers).filter(Boolean).length).toBe(6)
  })

  it('wins at PASS_STREAK in a row and records a loss below it', () => {
    expect(dailyWon(PASS_STREAK - 1)).toBe(false)
    expect(dailyWon(PASS_STREAK)).toBe(true)
    let s = emptyDaily()
    for (let i = 0; i < PASS_STREAK - 1; i++) s = advanceDaily(answerDaily(qs, s, right(qs[i])))
    s = answerDaily(qs, s, wrong(qs[PASS_STREAK - 1]))
    const stats = saveDaily(qs, s)
    expect(stats.played).toBe(1)
    expect(stats.wins).toBe(0)
    expect(stats.streak).toBe(0)
  })

  it('persists across a refresh and records the finish once', () => {
    let s = answerDaily(qs, emptyDaily(), right(qs[0]))
    saveDaily(qs, s)
    expect(readDaily(qs)).toEqual(s) // revealed, not yet advanced
    for (let i = 0; i < DAILY_SIZE; i++) {
      if (i > 0) s = answerDaily(qs, s, right(qs[i]))
      s = advanceDaily(s)
      saveDaily(qs, s)
    }
    saveDaily(qs, s)
    const stats = loadStats('outrank', DAILY_SIZE + 1)
    expect(stats.played).toBe(1)
    expect(stats.best).toBe(10)
    expect(stats.streak).toBe(1)
    expect(readDaily(qs)).toEqual({ answers: s.answers, pos: DAILY_SIZE })
    expect(readDaily(dailyFor(4))).toEqual(emptyDaily()) // another day's puzzle never resumes this one
  })

  it('ignores tampered saves', () => {
    store.set('tvg-progress-v1', JSON.stringify({ outrank: { d: geoDay(), sig: dailySig(qs), state: { answers: ['up'], pos: 0 } } }))
    expect(readDaily(qs)).toEqual(emptyDaily())
    // answers saved past a miss (an older save) are cut at the miss
    const answers = [wrong(qs[0]), right(qs[1]), right(qs[2])]
    store.set('tvg-progress-v1', JSON.stringify({ outrank: { d: geoDay(), sig: dailySig(qs), state: { answers, pos: 3 } } }))
    expect(readDaily(qs)).toEqual({ answers: [answers[0]], pos: 1 })
  })
})

describe('Triviverse Geography · Outrank · unlimited', () => {
  it('a wrong guess ends the run; right guesses keep it going', () => {
    let run = newRun('mixed', 42)
    for (let i = 0; i < 25; i++) {
      const q = run.qs.at(-1)
      run = answerRun(run, right(q))
      expect(answerRun(run, right(q))).toBe(run) // no double submission
      run = advanceRun(run)
    }
    expect(runStreak(run)).toBe(25)
    run = answerRun(run, wrong(run.qs.at(-1)))
    expect(run.over).toBe(true)
    expect(advanceRun(run)).toBe(run)
    expect(runStreak(run)).toBe(25)
  })

  it('varies countries and statistics without repeating pairs', () => {
    let run = newRun('mixed', 7)
    for (let i = 0; i < 120; i++) run = advanceRun(answerRun(run, right(run.qs.at(-1))))
    const pairs = run.qs.map(q => [q.a, q.b].sort().join('-'))
    expect(new Set(pairs).size).toBe(pairs.length)
    expect(new Set(run.qs.map(q => q.b)).size).toBeGreaterThan(90)
    for (const s of STAT_IDS) expect(run.qs.filter(q => q.stat === s).length).toBeGreaterThan(15)
    run.qs.forEach(q => expect(fairPair(q.a, q.b, q.stat)).toBe(true))
    run.qs.slice(1).forEach((q, i) => expect(q.a).toBe(run.qs[i].b))
  })

  it('a single-stat run only asks that stat, over everyone who has it', () => {
    let run = newRun('density', 9)
    for (let i = 0; i < 40; i++) run = advanceRun(answerRun(run, right(run.qs.at(-1))))
    expect(run.qs.every(q => q.stat === 'density')).toBe(true)
    expect(unlimitedNext(9, 'density', [])).toEqual(newRun('density', 9).qs[0])
  })

  it('persists the run and records personal bests per stat, once', () => {
    let run = newRun('population', 1)
    run = advanceRun(answerRun(run, right(run.qs[0])))
    saveRun(run)
    expect(readRun()).toEqual(run)
    run = answerRun(run, wrong(run.qs[1]))
    let stats
    ;[run, stats] = recordRun(run)
    expect(stats).toEqual({ played: 1, best: { mixed: 0, population: 1, area: 0, density: 0, life: 0 } })
    ;[run, stats] = recordRun(run)
    expect(stats.played).toBe(1)
    saveRun(run)
    expect(readRun().over).toBe(true)
    store.set(RUN_KEY, '{"seed":1,"setting":"nope","qs":[],"guesses":[]}')
    expect(readRun()).toBeNull()
  })

  it('keeps Unlimited and Daily state apart', () => {
    const qs = dailyFor(0)
    saveDaily(qs, answerDaily(qs, emptyDaily(), right(qs[0])))
    const run = answerRun(newRun('mixed', 3), 'higher')
    saveRun(run)
    recordRun({ ...run, over: true })
    expect(readDaily(qs).answers).toHaveLength(1)
    expect(loadStats('outrank', DAILY_SIZE + 1).played).toBe(0)
    expect(loadUnlimitedStats().played).toBe(1)
  })
})

describe('Triviverse Geography · Outrank · copy', () => {
  it('possessives and articles read naturally', async () => {
    const { questionFor } = await import('../src/geography/data/outrank')
    expect(questionFor({ a: 'KE', b: 'MV', stat: 'area' })).toBe('Is the Maldives’ land area higher or lower than Kenya’s?')
    expect(questionFor({ a: 'US', b: 'FR', stat: 'population' })).toBe('Is France’s population higher or lower than the United States’?')
  })
})
