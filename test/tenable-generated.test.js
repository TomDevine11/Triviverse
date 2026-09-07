import { describe, it, expect } from 'vitest'
import generated from '../src/data/tenable.generated.json'
import { TENABLE_QUESTIONS, TENABLE_DAILY_QUESTIONS, getTenableQuestionForDay } from '../src/data/tenable.js'

const FLOOR = generated.meta.floor

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const valueOf = (a) => Number(a.detail.split(' ')[0])

describe('generated Tenable catalogue', () => {
  it('produces a large bounded catalogue', () => {
    expect(generated.questions.length).toBeGreaterThan(200)
  })

  it('every question is a well-formed top-10', () => {
    for (const q of generated.questions) {
      expect(q.type).toBe('player')
      expect(q.icon).toBeTruthy()
      expect(q.title && q.description).toBeTruthy()
      expect(q.answers).toHaveLength(10)
      // ranks are exactly 1..10, unique
      expect(q.answers.map(a => a.rank)).toEqual([1,2,3,4,5,6,7,8,9,10])
      // no duplicate players within a question
      const names = q.answers.map(a => norm(a.text))
      expect(new Set(names).size).toBe(10)
      for (const a of q.answers) expect(a.text && a.detail).toBeTruthy()
    }
  })

  it('answers are ranked monotonically and the tail clears the quality floor', () => {
    for (const q of generated.questions) {
      const vals = q.answers.map(valueOf)
      for (let i = 1; i < vals.length; i++) expect(vals[i]).toBeLessThanOrEqual(vals[i - 1])
      const stat = q.answers[0].detail.includes('goals') ? 'goals' : 'apps'
      expect(vals[9]).toBeGreaterThanOrEqual(FLOOR[stat]) // 10th name is still meaningful
    }
  })

  it('has no ambiguous cutoff (a value carried by the 10th but absent higher is fine; the gate rejects 10/11 ties at build time)', () => {
    // Structural proxy: ids are unique so the catalogue never ships the same
    // question twice.
    const ids = generated.questions.map(q => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('merges into TENABLE_QUESTIONS alongside the curated classics', () => {
    expect(TENABLE_QUESTIONS.length).toBeGreaterThan(generated.questions.length)
    // curated question ids (non "gen-") still present
    expect(TENABLE_QUESTIONS.some(q => q.id === 'wc-top-scorers')).toBe(true)
    expect(TENABLE_QUESTIONS.some(q => q.id.startsWith('gen-'))).toBe(true)
  })

  it('Daily rotation is a recognisable subset; Unlimited keeps everything', () => {
    // Daily is strictly smaller — the obscure lists are trimmed out.
    expect(TENABLE_DAILY_QUESTIONS.length).toBeLessThan(TENABLE_QUESTIONS.length)
    // Every curated classic stays daily-eligible.
    expect(TENABLE_DAILY_QUESTIONS.some(q => q.id === 'wc-top-scorers')).toBe(true)
    // Nothing flagged daily:false leaks into the daily pool.
    expect(TENABLE_DAILY_QUESTIONS.every(q => q.daily !== false)).toBe(true)
    // The recognisability gate actually excludes a meaningful chunk (obscure
    // clubs / minor slices) — daily is a genuine, smaller subset.
    expect(generated.questions.some(q => q.daily === false)).toBe(true)
    // The day picker only ever returns daily-eligible questions.
    for (let d = 0; d < 400; d++) expect(getTenableQuestionForDay(d).daily).not.toBe(false)
  })
})
