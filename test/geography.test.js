import { describe, it, expect } from 'vitest'
import {
  COUNTRIES, countryByCode, distanceKm, bearing, compassPoint, proximity, evaluate, shareRow,
  dailyCode, searchCountries, resolveCountry, HALF_EARTH_KM,
} from '../src/geography/data/borderline'
import { geoDay, msUntilNextDay } from '../src/geography/data/day'

const pt = (lat, lon) => ({ lat, lon })

describe('Triviverse Geography · Borderline', () => {
  it('great-circle distance matches known values', () => {
    // London → Paris ≈ 344 km; London → New York ≈ 5,570 km
    expect(distanceKm(pt(51.5074, -0.1278), pt(48.8566, 2.3522))).toBeCloseTo(344, -1)
    expect(distanceKm(pt(51.5074, -0.1278), pt(40.7128, -74.006))).toBeCloseTo(5570, -2)
    expect(distanceKm(pt(0, 0), pt(0, 180))).toBeCloseTo(HALF_EARTH_KM, 3)
    expect(distanceKm(pt(10, 10), pt(10, 10))).toBe(0)
  })

  it('bearings point the right way, including across the antimeridian', () => {
    expect(compassPoint(bearing(pt(0, 0), pt(10, 0)))).toBe('N')
    expect(compassPoint(bearing(pt(0, 0), pt(-10, 0)))).toBe('S')
    expect(compassPoint(bearing(pt(0, 0), pt(0, 10)))).toBe('E')
    expect(compassPoint(bearing(pt(0, 0), pt(0, -10)))).toBe('W')
    expect(compassPoint(bearing(pt(0, 0), pt(10, 10)))).toBe('NE')
    // Fiji (178°E) → Samoa (172°W) is a short hop east, not most of the way round west
    const fs = bearing(pt(-17.8, 178), pt(-13.8, -172))
    expect(fs).toBeGreaterThan(45); expect(fs).toBeLessThan(90)
    expect(compassPoint(bearing(pt(0, 175), pt(0, -175)))).toBe('E')
    const fr = countryByCode('FR'), es = countryByCode('ES')
    expect(compassPoint(bearing(es, fr))).toMatch(/^N/)
  })

  it('proximity is 100 only at the answer and 0 at the antipode', () => {
    expect(proximity(0)).toBe(100)
    expect(proximity(1)).toBe(99)
    expect(proximity(HALF_EARTH_KM)).toBe(0)
    expect(evaluate('FR', 'FR')).toMatchObject({ win: true, pct: 100, km: 0 })
    const r = evaluate('ES', 'FR')
    expect(r.win).toBe(false)
    expect(r.km).toBeGreaterThan(300)
    expect(r.km).toBeLessThan(1500)
    expect(shareRow(r)).toMatch(/^(🟩|🟨|⬜){5}/u)
  })

  it('every country has valid geometry and metadata', () => {
    expect(COUNTRIES.length).toBeGreaterThan(200)
    const codes = new Set()
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/)
      expect(codes.has(c.code)).toBe(false); codes.add(c.code)
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90)
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180)
      expect(c.d).toMatch(/^M\d+ \d+l/)
      expect(c.name.length).toBeGreaterThan(1)
    }
    expect(COUNTRIES.filter(c => c.answer).length).toBeGreaterThan(150)
  })

  it('picks one answer-pool country per day without repeating within a cycle', () => {
    const pool = COUNTRIES.filter(c => c.answer).length
    const seen = new Set()
    for (let d = 20736; d < 20736 + pool; d++) {
      const code = dailyCode(d)
      expect(countryByCode(code).answer).toBe(true)
      seen.add(code)
    }
    expect(seen.size).toBe(pool)
    expect(dailyCode(20800)).toBe(dailyCode(20800))
  })

  it('search finds names, aliases and accent-free spellings', () => {
    expect(searchCountries('fra')[0].code).toBe('FR')
    expect(searchCountries('uk').map(c => c.code)).toContain('GB')
    expect(searchCountries('cote')[0].code).toBe('CI')
    expect(searchCountries('fra', new Set(['FR'])).map(c => c.code)).not.toContain('FR')
    expect(resolveCountry('united states').code).toBe('US')
    expect(resolveCountry('Narnia')).toBeNull()
  })

  it('the geography day turns over at UK midnight (matches Intl tz data)', () => {
    for (const iso of ['2026-01-15T12:00:00Z', '2026-07-15T23:30:00Z', '2026-03-29T00:30:00Z', '2026-10-25T00:30:00Z']) {
      const t = Date.parse(iso)
      const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(t)
      expect(geoDay(t)).toBe(Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86400000))
      expect(geoDay(t + msUntilNextDay(t))).toBe(geoDay(t) + 1)
      expect(geoDay(t + msUntilNextDay(t) - 1)).toBe(geoDay(t))
    }
  })
})

import {
  neighbours, borders, par, tierOf, bestRoute, connected, namedRoute, evaluateGame, dailyPair, PAIR_COUNT, maxGuesses,
} from '../src/geography/data/overland'
import { COUNTRIES as ALL } from '../src/geography/data/countries'
import { shapeOf } from '../src/geography/data/world'

describe('Triviverse Geography · Overland', () => {
  it('land borders are symmetric and match known geography', () => {
    for (const c of ALL) for (const n of c.n || []) expect(neighbours(n)).toContain(c.code)
    for (const [a, b] of [['FR', 'ES'], ['ES', 'MA'], ['RU', 'PL'], ['BW', 'ZM'], ['US', 'CA'], ['GB', 'IE'], ['ZA', 'LS']]) expect(borders(a, b)).toBe(true)
    for (const [a, b] of [['GB', 'FR'], ['FR', 'BR'], ['SE', 'DK'], ['JP', 'KR'], ['SG', 'MY']]) expect(borders(a, b)).toBe(false)
    expect(neighbours('IS')).toEqual([])
  })

  it('colours guesses by detour from a shortest route', () => {
    expect(par('ES', 'DE')).toBe(1) // via France
    expect(tierOf('FR', 'ES', 'DE')).toBe('green')
    expect(tierOf('BE', 'ES', 'DE')).toBe('yellow') // ES→FR→BE→DE is one longer
    expect(tierOf('JP', 'ES', 'DE')).toBe('red') // no land route at all
    expect(maxGuesses('ES', 'DE')).toBe(5)
  })

  it('wins only when named countries link start and end over land', () => {
    expect(connected('ES', 'DE', new Set(['BE']))).toBe(false)
    expect(connected('ES', 'DE', new Set(['BE', 'FR']))).toBe(true)
    expect(namedRoute('ES', 'DE', new Set(['BE', 'FR']))).toEqual(['ES', 'FR', 'DE'])
    const g = evaluateGame('PT', 'PL', ['ES', 'FR', 'DE'])
    expect(g.won).toBe(true)
    expect(g.route).toEqual(['PT', 'ES', 'FR', 'DE', 'PL'])
    const lost = evaluateGame('ES', 'DE', ['JP', 'BR', 'AU', 'CN', 'IN'])
    expect(lost.lost).toBe(true)
  })

  it('best route is a valid land chain that reuses named countries', () => {
    const r = bestRoute('GR', 'PL', new Set())
    expect(r[0]).toBe('GR'); expect(r[r.length - 1]).toBe('PL')
    for (let i = 0; i < r.length - 1; i++) expect(borders(r[i], r[i + 1])).toBe(true)
    expect(r.length - 2).toBe(par('GR', 'PL'))
    const via = bestRoute('GR', 'PL', new Set(['RO']))
    expect(via).toContain('RO')
    // A named detour never pulls the hint route off the shortest one on a tie.
    const yeAt = bestRoute('YE', 'AT', new Set(['SA', 'SY', 'TR', 'DE']))
    expect(yeAt.length - 2).toBe(par('YE', 'AT'))
  })

  it('daily pairs are deterministic, solvable and 2–6 countries apart', () => {
    expect(PAIR_COUNT).toBeGreaterThan(500)
    for (let d = 20736; d < 20736 + 120; d++) {
      const [a, b] = dailyPair(d)
      expect(dailyPair(d)).toEqual([a, b])
      expect(par(a, b)).toBeGreaterThanOrEqual(2)
      expect(par(a, b)).toBeLessThanOrEqual(6)
      for (const c of bestRoute(a, b, new Set())) expect(shapeOf(c)).toBeTruthy()
    }
  })
})

import { dailyCode as unfurlDaily, tileOrder, openCount, flagOf, POOL_SIZE } from '../src/geography/data/unfurl'
import { existsSync, readFileSync } from 'node:fs'

describe('Triviverse Geography · Unfurl', () => {
  it('every answer has a bundled flag at a sane official ratio', () => {
    const answers = ALL.filter(c => c.answer)
    expect(flagOf('NC').same).toBe('FR') // identical tricolour → never the answer
    expect(POOL_SIZE).toBe(answers.length - 1)
    for (const c of answers) {
      const f = flagOf(c.code)
      expect(f, c.code).toBeTruthy()
      expect(f.ratio).toBeGreaterThan(0.8); expect(f.ratio).toBeLessThan(2.6)
      expect(f.file).toMatch(/^f[0-9a-f]{10}\.svg$/) // opaque: file names don't spell the answer
      const svg = readFileSync(`src/geography/flags/${f.file}`, 'utf8')
      expect(svg).toMatch(/<svg[^>]*viewBox=/)
    }
    expect(flagOf('CH').ratio).toBe(1)
    expect(flagOf('NP').ratio).toBeLessThan(1)
    expect(existsSync('src/geography/flags')).toBe(true)
  })

  it('opens one tile to start, one per wrong guess, all at the end — in a stable order', () => {
    expect(openCount(0, false)).toBe(1)
    expect(openCount(3, false)).toBe(4)
    expect(openCount(5, false)).toBe(6)
    expect(openCount(1, true)).toBe(6)
    const o = tileOrder('FR')
    expect([...o].sort()).toEqual([0, 1, 2, 3, 4, 5])
    expect(tileOrder('FR')).toEqual(o)
  })

  it('daily flag is deterministic, from the pool, and not in step with Borderline', () => {
    let same = 0
    for (let d = 20736; d < 20736 + 60; d++) {
      expect(unfurlDaily(d)).toBe(unfurlDaily(d))
      expect(flagOf(unfurlDaily(d))).toBeTruthy()
      if (unfurlDaily(d) === dailyCode(d)) same++
    }
    expect(same).toBeLessThan(3)
  })
})

import { puzzleFor, dailyMissing, evaluatePatchwork, QUOTA, MISSING, MAX_MISSES, poolSize } from '../src/geography/data/patchwork'

describe('Triviverse Geography · Patchwork', () => {
  it('cuts 7 distinct, drawable, guessable countries spread across regions', () => {
    expect(MISSING).toBe(7)
    for (let d = 20736; d < 20736 + 90; d++) {
      const m = dailyMissing(d)
      expect(m).toHaveLength(7)
      expect(new Set(m).size).toBe(7)
      const regions = {}
      for (const c of m) {
        const country = ALL.find(x => x.code === c)
        expect(country.answer).toBe(true)
        expect(shapeOf(c)?.d).toBeTruthy()
        regions[country.r] = (regions[country.r] || 0) + 1
      }
      expect(regions).toEqual(QUOTA)
      expect(dailyMissing(d)).toEqual(m) // deterministic
    }
  })

  it('does not repeat a country until its region has cycled', () => {
    const perCycle = Math.floor(poolSize('Oceania') / QUOTA.Oceania)
    const seen = new Set()
    for (let n = 0; n < perCycle; n++) {
      const oc = puzzleFor(n).filter(c => ALL.find(x => x.code === c).r === 'Oceania')
      for (const c of oc) { expect(seen.has(c)).toBe(false); seen.add(c) }
    }
  })

  it('restores only missing countries, and wins only when all are found', () => {
    const m = puzzleFor(0)
    const wrong = ALL.find(c => !m.includes(c.code) && c.answer).code
    let g = evaluatePatchwork(m, [m[0], wrong, m[1]])
    expect(g.restored).toEqual([m[0], m[1]])
    expect(g.misses).toEqual([wrong])
    expect(g.won).toBe(false)
    g = evaluatePatchwork(m, [...m])
    expect(g.won).toBe(true)
  })

  it('the sixth miss loses; five misses can still win', () => {
    const m = puzzleFor(0)
    const wrongs = ALL.filter(c => !m.includes(c.code) && c.answer).slice(0, MAX_MISSES).map(c => c.code)
    expect(evaluatePatchwork(m, wrongs.slice(0, MAX_MISSES - 1)).lost).toBe(false)
    expect(evaluatePatchwork(m, [...wrongs.slice(0, MAX_MISSES - 1), ...m]).won).toBe(true)
    const g = evaluatePatchwork(m, wrongs)
    expect(g.lost).toBe(true)
    expect(g.won).toBe(false)
  })
})
