import { describe, it, expect } from 'vitest'
import { project, WORLD_W, WORLD_H } from '../src/geography/data/world'
import {
  QUESTIONS, scoreFor, evaluate, decayKm, dailySetFor, dailySet, unlimitedAt, unlimitedQueue,
  square, QUESTION_MAX, DAILY_SIZE, DAILY_MAX, PASS_SCORE,
} from '../src/geography/data/milestone'
import { GEO_EPOCH } from '../src/geography/data/day'

// The opening view as the map shows it at a given width:height, clamped to the world.
function viewBox([lat, lon, z], aspect) {
  const [cx, cy] = project(lat, lon)
  const w = WORLD_W / z, h = w / aspect
  const x = w >= WORLD_W ? 0 : Math.max(0, Math.min(WORLD_W - w, cx - w / 2))
  const y = h >= WORLD_H ? (WORLD_H - h) / 2 : Math.max(0, Math.min(WORLD_H - h, cy - h / 2))
  return [x, y, w, h]
}

describe('Triviverse Geography · Milestone', () => {
  it('rules: five questions, 1,000 each, one pass mark', () => {
    expect(DAILY_SIZE).toBe(5)
    expect(QUESTION_MAX).toBe(1000)
    expect(DAILY_MAX).toBe(5000)
    expect(PASS_SCORE).toBe(3500)
  })

  it('scores full marks inside the precision radius, then decay smoothly', () => {
    expect(scoreFor(0, 12)).toBe(1000)
    expect(scoreFor(12, 12)).toBe(1000)
    expect(scoreFor(12 + decayKm(12), 12)).toBe(368)
    expect(scoreFor(NaN, 12)).toBe(0)
    let prev = Infinity
    for (let km = 13; km < 20000; km *= 1.25) { const s = scoreFor(km, 12); expect(s).toBeLessThanOrEqual(prev); prev = s }
    expect(scoreFor(300, 40)).toBeGreaterThan(scoreFor(300, 12)) // regional questions are more forgiving
  })

  it('distance is great-circle, right across the antimeridian and near the poles', () => {
    const q = { lat: -16.05, lon: -142.4, r: 40 }
    expect(evaluate(q, [-16.05, -142.4])).toEqual({ km: 0, score: 1000 })
    const near = { lat: 0, lon: 179.9, r: 12 }
    expect(evaluate(near, [0, -179.9]).km).toBeCloseTo(22.2, 0)
    expect(evaluate({ lat: 84, lon: 0, r: 12 }, [84, 180]).km).toBeCloseTo(1334, -1)
  })

  it('the daily five are deterministic, distinct, easy → hard, and never repeat within a cycle', () => {
    expect(dailySet(GEO_EPOCH + 9).map(q => q.id)).toEqual(dailySetFor(9).map(q => q.id))
    const perCycle = Math.floor(QUESTIONS.length / DAILY_SIZE)
    const seen = new Set()
    for (let n = 0; n < perCycle; n++) {
      const set = dailySetFor(n)
      expect(set.length).toBe(5)
      expect(new Set(set.map(q => q.id)).size).toBe(5)
      for (let i = 1; i < 5; i++) expect(set[i].d).toBeGreaterThanOrEqual(set[i - 1].d)
      for (const q of set) { expect(seen.has(q.id)).toBe(false); seen.add(q.id) }
    }
  })

  it('unlimited never serves today’s daily five and walks the library without repeats', () => {
    const ex = dailySetFor(3).map(q => q.id)
    const base = QUESTIONS.length - ex.length
    const lap = Array.from({ length: base }, (_, i) => unlimitedAt(42, i, ex).id)
    expect(new Set(lap).size).toBe(base)
    expect(lap.some(id => ex.includes(id))).toBe(false)
    expect(unlimitedAt(42, base, ex).id).not.toBe(lap[base - 1]) // no repeat across laps
    expect(unlimitedQueue(42, ex).map(q => q.id)).toEqual(unlimitedQueue(42, ex).map(q => q.id))
  })

  it('every question is complete, opens on a view that contains its answer, and never names it in the clue', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(100)
    const bad = []
    for (const q of QUESTIONS) {
      expect(q.src.length).toBeGreaterThan(0)
      expect(q.why.length).toBeGreaterThan(20)
      expect([1, 2, 3]).toContain(q.d)
      const [ax, ay] = project(q.lat, q.lon)
      for (const aspect of [0.85, 1.5]) {
        const [x, y, w, h] = viewBox(q.view, aspect)
        const mx = w * 0.04, my = h * 0.04
        if (ax < x + mx || ax > x + w - mx || ay < y + my || ay > y + h - my) bad.push(`${q.id} outside view @${aspect}`)
      }
      const key = q.a.split(/[,(]/)[0].trim()
      if (key.length > 4 && q.q.toLowerCase().includes(key.toLowerCase())) bad.push(`${q.id} clue names "${key}"`)
    }
    expect(bad).toEqual([])
  })

  it('share squares', () => {
    expect([1000, 800, 650, 300, 50].map(square).join('')).toBe('🟩🟩🟨🟧🟥')
  })
})
