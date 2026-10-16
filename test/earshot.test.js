import { describe, it, expect, beforeEach } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import {
  CLIPS, MAX_TRIES, SKIP, dailyClipFor, dailyClip, evaluateRound, roundPoints, unlimitedAt, unlimitedQueue,
  shareLine, stageSeconds,
} from '../src/geography/data/earshot'
import { LANGUAGES, FAMILIES, languageById, searchLanguages, resolveLanguage, fold } from '../src/geography/data/languages'
import { loadProgress, saveProgress, loadStats, recordResult } from '../src/geography/data/progress'
import { geoDay, GEO_EPOCH } from '../src/geography/data/day'

const OK_LICENCE = /^(cc0|cc[- ]by(-sa)?[- ]\d(\.\d)?([- ][a-z-]+)?|public domain|pd[- ]?\w*)$/i
const clipOf = (lang) => CLIPS.find(c => c.lang === lang)

describe('Triviverse Geography · Earshot · languages', () => {
  it('has unique ids, known families and a fact for every answer', () => {
    expect(new Set(LANGUAGES.map(l => l.id)).size).toBe(LANGUAGES.length)
    for (const l of LANGUAGES) {
      expect(FAMILIES[l.fam], l.id).toBeTruthy()
      expect(l.end, l.id).toBeTruthy()
    }
    for (const c of CLIPS) expect(languageById(c.lang).fact, c.lang).toBeTruthy()
  })

  it('never makes one language an alias of another', () => {
    const names = new Map(LANGUAGES.map(l => [fold(l.name), l.id]))
    for (const l of LANGUAGES) {
      for (const a of l.alias) {
        const other = names.get(fold(a))
        expect(other === undefined || other === l.id, `${a} → ${l.id} but names ${other}`).toBe(true)
      }
    }
    expect(languageById('hindi').alias).not.toContain('urdu')
    expect(languageById('malay').alias).not.toContain('indonesian')
    expect(languageById('serbian').alias).not.toContain('croatian')
  })

  it('finds languages by endonym, exonym and alias, accents folded', () => {
    expect(searchLanguages('francais')[0].id).toBe('french')
    expect(searchLanguages('Deutsch')[0].id).toBe('german')
    expect(searchLanguages('farsi')[0].id).toBe('persian')
    expect(searchLanguages('tagalog')[0].id).toBe('filipino')
    expect(searchLanguages('日本語')[0].id).toBe('japanese')
    expect(searchLanguages('isizulu')[0].id).toBe('zulu')
    expect(resolveLanguage('Español').id).toBe('spanish')
    expect(resolveLanguage('Kiswahili').id).toBe('swahili')
  })

  it('treats ambiguous names as ambiguous rather than guessing', () => {
    expect(resolveLanguage('chinese')).toBeNull()
    const ids = searchLanguages('chinese').map(l => l.id)
    expect(ids).toContain('mandarin')
    expect(ids).toContain('cantonese')
    expect(resolveLanguage('gaelic')).toBeNull()
  })

  it('drops already-guessed languages from suggestions', () => {
    expect(searchLanguages('fren', new Set(['french'])).map(l => l.id)).not.toContain('french')
  })
})

describe('Triviverse Geography · Earshot · clip bank', () => {
  it('has a real, playable bank across many languages', () => {
    expect(CLIPS.length).toBeGreaterThanOrEqual(40)
    expect(new Set(CLIPS.map(c => c.lang)).size).toBeGreaterThanOrEqual(40)
    expect(new Set(CLIPS.map(c => c.id)).size).toBe(CLIPS.length)
  })

  it('every clip: six rising stages ending at the full clip, a committed mp3, credits', () => {
    for (const c of CLIPS) {
      expect(c.stages).toHaveLength(MAX_TRIES)
      expect(c.stages[0]).toBe(1.5)
      for (let i = 1; i < MAX_TRIES; i++) expect(c.stages[i], c.id).toBeGreaterThan(c.stages[i - 1])
      expect(c.stages[MAX_TRIES - 1]).toBe(c.dur)
      expect(c.dur).toBeGreaterThanOrEqual(13.5)
      expect(c.dur).toBeLessThanOrEqual(20)
      expect(c.peaks).toMatch(/^[0-9a-z]{72}$/)
      const file = path.join('public', c.src)
      expect(existsSync(file), c.src).toBe(true)
      expect(statSync(file).size).toBeLessThan(160 * 1024)
      expect(OK_LICENCE.test(c.credit.licence), c.credit.licence).toBe(true)
      expect(c.credit.source).toMatch(/^https:\/\//)
      expect(c.credit.author).toBeTruthy()
    }
  })

  it('never names the answer in the clip id or URL', () => {
    for (const c of CLIPS) {
      const l = languageById(c.lang)
      const bad = [l.id, l.name, ...l.alias].map(fold).filter(k => k.length >= 3)
      for (const k of bad) {
        expect(fold(c.src).includes(k), `${c.src} contains ${k}`).toBe(false)
        expect(fold(c.id).includes(k)).toBe(false)
      }
      expect(c.src).toMatch(/^\/geography\/voices\/[0-9a-f]{12}\.mp3$/)
    }
  })

  it('records how each clip’s language was established', () => {
    for (const c of CLIPS) {
      expect(['whisper', 'family', 'label']).toContain(c.check.rule)
      if (c.check.rule === 'whisper') expect(c.check.p, c.lang).toBeGreaterThanOrEqual(0.6)
      if (c.check.rule === 'label') expect(c.kind === 'read' || !languageById(c.lang).wh, c.lang).toBe(true)
      expect(c.check.speech).toBeGreaterThanOrEqual(0.65)
    }
    // most of the bank is machine-confirmed, not taken on trust
    expect(CLIPS.filter(c => c.check.rule === 'whisper').length / CLIPS.length).toBeGreaterThan(0.5)
  })
})

describe('Triviverse Geography · Earshot · rounds', () => {
  const fr = clipOf('french')
  it('unlocks the same recording stage by stage', () => {
    expect(stageSeconds(fr, 0)).toBe(1.5)
    expect(evaluateRound(fr, []).seconds).toBe(1.5)
    expect(evaluateRound(fr, ['german']).seconds).toBe(fr.stages[1])
    expect(evaluateRound(fr, ['german', SKIP]).seconds).toBe(fr.stages[2])
    expect(stageSeconds(fr, 99)).toBe(fr.dur)
  })

  it('a correct guess ends the round at once and later guesses are ignored', () => {
    const r = evaluateRound(fr, ['german', 'french', 'italian'])
    expect(r).toMatchObject({ won: true, done: true, tries: 2, seconds: fr.dur, heard: fr.stages[1] })
    expect(r.rows.map(x => x.kind)).toEqual(['wrong', 'correct'])
    expect(roundPoints(r)).toBe(5)
  })

  it('amber for the right family, red otherwise, grey for skips', () => {
    const r = evaluateRound(fr, ['spanish', 'japanese', SKIP])
    expect(r.rows.map(x => x.kind)).toEqual(['close', 'wrong', 'skip'])
    expect(r.done).toBe(false)
  })

  it('six misses reveal the answer and score nothing', () => {
    const r = evaluateRound(fr, ['spanish', 'italian', SKIP, 'catalan', 'romanian', 'portuguese'])
    expect(r).toMatchObject({ won: false, done: true, tries: 6, seconds: fr.dur })
    expect(roundPoints(r)).toBe(0)
  })

  it('shares squares only — never the language', () => {
    const r = evaluateRound(fr, ['spanish', SKIP, 'french'])
    expect(shareLine(r)).toBe('🟨⬛🟩⬜⬜⬜')
  })
})

describe('Triviverse Geography · Earshot · daily and unlimited', () => {
  it('daily is deterministic and plays every clip once per cycle', () => {
    expect(dailyClipFor(5).id).toBe(dailyClipFor(5).id)
    expect(dailyClip(GEO_EPOCH + 4).id).toBe(dailyClipFor(4).id)
    const cycle = Array.from({ length: CLIPS.length }, (_, n) => dailyClipFor(n).id)
    expect(new Set(cycle).size).toBe(CLIPS.length)
  })

  it('never serves the same language two days running', () => {
    for (let n = 1; n < CLIPS.length * 3; n++) expect(dailyClipFor(n).lang === dailyClipFor(n - 1).lang, `day ${n}`).toBe(false)
  })

  it('unlimited skips the daily, cycles the whole bank, and never repeats back to back', () => {
    const today = dailyClip().id
    expect(unlimitedQueue(42, [today]).map(c => c.id)).not.toContain(today)
    const base = CLIPS.length - 1
    const lap = Array.from({ length: base }, (_, i) => unlimitedAt(42, i, [today]).id)
    expect(new Set(lap).size).toBe(base)
    for (let i = 1; i < base * 3; i++) expect(unlimitedAt(42, i, [today]).lang).not.toBe(unlimitedAt(42, i - 1, [today]).lang)
  })
})

describe('Triviverse Geography · Earshot · persistence', () => {
  beforeEach(() => {
    const store = new Map()
    globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
  })

  it('resumes today’s guesses and ignores a different clip’s', () => {
    const clip = dailyClip()
    saveProgress('earshot', { g: ['german'] }, false, clip.id)
    expect(loadProgress('earshot', clip.id)).toEqual({ g: ['german'], done: false })
    expect(loadProgress('earshot', 'some-other-clip')).toBeNull()
  })

  it('records the daily result once', () => {
    const d = geoDay()
    recordResult('earshot', true, 3, MAX_TRIES, d)
    recordResult('earshot', true, 3, MAX_TRIES, d)
    const s = loadStats('earshot', MAX_TRIES)
    expect(s).toMatchObject({ played: 1, wins: 1, streak: 1 })
    expect(s.dist[2]).toBe(1)
  })
})
