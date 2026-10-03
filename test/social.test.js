import { describe, it, expect, beforeEach } from 'vitest'
import { Buffer } from 'node:buffer'

// In-memory localStorage — the social layer is browser-storage-first.
class MemStorage {
  constructor() { this.m = new Map() }
  get length() { return this.m.size }
  key(i) { return [...this.m.keys()][i] ?? null }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) { this.m.set(k, String(v)) }
  removeItem(k) { this.m.delete(k) }
  clear() { this.m.clear() }
}
globalThis.localStorage = new MemStorage()

const { compareResults, scoreLabel, percentileAgainst } = await import('../src/social/scoring.js')
const { encodeGameChallenge, encodeDayChallenge, decodeChallenge, receiveChallenge, rivalTable } = await import('../src/social/challenge.js')
const { getStreak, FREEZE_CAP } = await import('../src/social/streak.js')
const { upsertResult, loadLog } = await import('../src/social/log.js')
const { rowsToEmoji, rowsToCodes, codesToEmoji, dayText } = await import('../src/social/shareText.js')
const { buildIcs } = await import('../src/social/reminder.js')
const { snapshot, applySnapshot } = await import('../src/social/transfer.js')
const { cleanName, getMe } = await import('../src/social/identity.js')
const { weekStart: serverWeekStart } = await import('../worker/api.js')
const { weekStart: clientWeekStart } = await import('../src/data/dailyStats.js')

const today = () => { const n = new Date(); return Math.floor((n.getTime() - n.getTimezoneOffset() * 60000) / 86400000) }

beforeEach(() => localStorage.clear())

describe('scoring', () => {
  it('a win beats a loss whatever the numbers', () => {
    expect(compareResults({ w: true, v: 1, of: 10 }, { w: false, v: 9, of: 10 })).toBeGreaterThan(0)
  })
  it('respects direction: high-is-better and low-is-better', () => {
    expect(compareResults({ w: true, v: 8, of: 10 }, { w: true, v: 6, of: 10 })).toBeGreaterThan(0)
    expect(compareResults({ w: true, v: 3, of: 6, low: true }, { w: true, v: 5, of: 6, low: true })).toBeGreaterThan(0)
    expect(compareResults({ w: true, v: 40, low: true, u: 'pts' }, { w: true, v: 40, low: true, u: 'pts' })).toBe(0)
  })
  it('labels are chat-friendly', () => {
    expect(scoreLabel({ w: true, v: 8, of: 10 })).toBe('8/10')
    expect(scoreLabel({ w: false, v: 7, of: 6, low: true })).toBe('X/6')
    expect(scoreLabel({ w: true, v: 43, low: true, u: 'pts' })).toBe('43 pts')
    expect(scoreLabel({ w: true, v: 0, low: true, u: 'mistakes' })).toBe('Flawless')
  })
  it('percentile counts ties as half', () => {
    const others = [{ w: true, v: 5, of: 10 }, { w: true, v: 8, of: 10 }, { w: false, v: 9, of: 10 }, { w: true, v: 9, of: 10 }]
    expect(percentileAgainst({ w: true, v: 8, of: 10 }, others)).toBe(63) // beats 2, ties 1 → 2.5/4
    expect(percentileAgainst({ w: true, v: 8 }, [])).toBeNull()
  })
})

describe('challenge links', () => {
  it('round-trips a game challenge and never leaks the private id', () => {
    const code = encodeGameChallenge({ game: 'tenable', matchday: 271, result: { w: true, v: 8, of: 10 }, title: 'Football Tenable', tiles: 'hhhhh/hhhmm' })
    const ch = decodeChallenge(code)
    expect(ch).toMatchObject({ kind: 'game', matchday: 271, game: 'tenable', id: getMe().pub })
    expect(ch.results.tenable).toMatchObject({ w: true, v: 8, of: 10 })
    expect(Buffer.from(code, 'base64url').toString()).not.toContain(getMe().id)
  })
  it('round-trips a day challenge', () => {
    const code = encodeDayChallenge({ matchday: 271, points: 185, streak: 9, results: [{ g: 'wordle', w: true, v: 3, of: 6, low: true }, { g: 'pointless', w: true, v: 43, low: true, u: 'pts' }] })
    const ch = decodeChallenge(code)
    expect(ch.kind).toBe('day')
    expect(ch.points).toBe(185)
    expect(Object.keys(ch.results)).toEqual(['wordle', 'pointless'])
  })
  it('rejects garbage', () => {
    expect(decodeChallenge('not-a-code')).toBeNull()
    expect(decodeChallenge('')).toBeNull()
  })
  it('builds a head-to-head record from received links', () => {
    receiveChallenge({ kind: 'game', id: 'rivalpub0001', name: 'Dave', matchday: 100, game: 'tenable', results: { tenable: { w: false, v: 6, of: 10 } } })
    receiveChallenge({ kind: 'game', id: 'rivalpub0001', name: 'Dave', matchday: 101, game: 'wordle', results: { wordle: { w: true, v: 2, of: 6, low: true } } })
    upsertResult({ d: 1, m: 100, g: 'tenable', w: true, v: 10, of: 10, p: 25 })
    upsertResult({ d: 2, m: 101, g: 'wordle', w: true, v: 4, of: 6, low: true, p: 25 })
    const [dave] = rivalTable()
    expect(dave).toMatchObject({ name: 'Dave', w: 1, l: 1, d: 0 })
  })
  it('ignores your own link', () => {
    expect(receiveChallenge({ kind: 'game', id: getMe().pub, name: 'Me', matchday: 1, game: 'wordle', results: {} })).toBeNull()
  })
})

describe('matchday streak + freezes', () => {
  const play = (d) => upsertResult({ d, m: d, g: 'wordle', w: true, p: 10 })
  it('counts consecutive days and stays alive (at risk) until today is played', () => {
    const t = today()
    for (let d = t - 3; d < t; d++) play(d)
    const s = getStreak(t)
    expect(s.streak).toBe(3)
    expect(s.atRisk).toBe(true)
    play(t)
    expect(getStreak(t).streak).toBe(4)
  })
  it('banks a freeze every 7 days and spends it to bridge a missed day', () => {
    const t = today()
    for (let d = t - 9; d <= t - 3; d++) play(d) // 7-day run ending t-3
    expect(getStreak(t - 2).freezes).toBe(1)
    // t-2 missed; opening the site on t-1 spends the freeze
    const s = getStreak(t - 1)
    expect(s.freezes).toBe(0)
    expect(s.frozenDays).toContain(t - 2)
    expect(s.streak).toBe(8)
    expect(FREEZE_CAP).toBe(2)
  })
  it('breaks when the gap is longer than the bank', () => {
    const t = today()
    for (let d = t - 12; d <= t - 6; d++) play(d)
    getStreak(t - 5) // earn 1
    expect(getStreak(t).streak).toBe(0)
  })
})

describe('share text', () => {
  const TILE = { hit: '#22c55e', near: '#fbbf24', miss: '#26243a' }
  it('maps tiles to emoji and compact codes', () => {
    const rows = [[TILE.hit, TILE.near, TILE.miss]]
    expect(rowsToEmoji(rows)).toBe('🟩🟨⬛')
    expect(rowsToCodes(rows)).toBe('hnm')
    expect(codesToEmoji('hnm/hh')).toBe('🟩🟨⬛\n🟩🟩')
  })
  it('wraps long rows so a 501 run stays pasteable', () => {
    const row = Array(23).fill(TILE.hit)
    expect(rowsToEmoji([row]).split('\n').length).toBe(3)
  })
  it('day text lists every daily with its score', () => {
    const txt = dayText({ matchday: 5, results: [{ g: 'wordle', w: true, v: 3, of: 6, low: true }], total: 11, points: 35, streak: 4, url: 'https://x', titleOf: g => g })
    expect(txt).toContain('Matchday 5 — 1/11')
    expect(txt).toContain('✅ wordle 3/6')
    expect(txt).toContain('https://x')
  })
})

describe('reminder + transfer + identity', () => {
  it('builds a recurring weekday .ics', () => {
    const ics = buildIcs({ time: '12:55', weekdaysOnly: true })
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')
    expect(ics).toMatch(/DTSTART:\d{8}T125500/)
  })
  it('merges a transfer snapshot instead of overwriting the log', () => {
    upsertResult({ d: 1, m: 1, g: 'wordle', w: true, p: 25 })
    const snap = snapshot()
    localStorage.clear()
    upsertResult({ d: 2, m: 2, g: 'tenable', w: false, p: 10 })
    const { games } = applySnapshot(snap)
    expect(games).toBe(2)
    expect(loadLog().map(r => r.g).sort()).toEqual(['tenable', 'wordle'])
  })
  it('cleans nicknames', () => {
    expect(cleanName('  <b>Tom</b>   Devine  ')).toBe('bTom/b Devine')
    expect(cleanName('x'.repeat(40)).length).toBe(20)
  })
  it('client and worker agree on the league week', () => {
    for (let d = 20700; d < 20720; d++) expect(serverWeekStart(d)).toBe(clientWeekStart(d))
  })
})
