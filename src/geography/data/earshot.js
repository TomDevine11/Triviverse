// Earshot — hear someone speaking, name the language. Data + rules, no UI.
//
// Each puzzle is ONE recording. The first guess hears its opening 1.5 seconds; every
// wrong guess (or skip) unlocks a longer stretch of the same recording — the stage
// lengths live on each clip (built by scripts/geography/build-voices.mjs) — until
// the sixth and last guess hears all of it.
//
//   • Daily — the same clip for everyone, picked deterministically per UK day.
//   • Unlimited — clip after clip from the bank, today's daily held back, with a
//     session score, rounds played and a solved-in-a-row streak.
//
// Clips: ./voices.generated.json. Languages: ./languages.js.
import data from './voices.generated.json' with { type: 'json' }
import { languageById } from './languages'
import { mulberry32 } from './countries'
import { geoDay, GEO_EPOCH } from './day'

export const MAX_TRIES = 6
export const SKIP = '__skip'

export const CLIPS = data.clips
  .filter(c => c.id && languageById(c.lang) && Array.isArray(c.stages) && c.stages.length === MAX_TRIES && c.dur > 0)
  .sort((a, b) => (a.id < b.id ? -1 : 1))
const BY_ID = new Map(CLIPS.map(c => [c.id, c]))
export const clipById = (id) => BY_ID.get(id) || null

// Seconds of the recording the player may hear after `tries` guesses so far.
export const stageSeconds = (clip, tries) => clip.stages[Math.max(0, Math.min(tries, MAX_TRIES - 1))]

function shuffle(list, seed) {
  const rnd = mulberry32(seed)
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Never the same language twice running (the bank has two French and two Arabic clips).
function spread(list) {
  const a = [...list]
  for (let i = 1; i < a.length; i++) {
    if (a[i].lang !== a[i - 1].lang) continue
    const k = a.findIndex((c, j) => j > i && c.lang !== a[i - 1].lang)
    if (k > 0) [a[i], a[k]] = [a[k], a[i]]
  }
  return a
}

// ── Round evaluation ──────────────────────────────────────────────────────────
// `guesses` is the list of language ids guessed so far (SKIP for a skip).
export function evaluateRound(clip, guesses = []) {
  const answer = languageById(clip.lang)
  const g = guesses.slice(0, MAX_TRIES)
  const winAt = g.indexOf(clip.lang)
  const won = winAt >= 0
  const used = won ? g.slice(0, winAt + 1) : g
  const done = won || used.length >= MAX_TRIES
  const rows = used.map(id => {
    if (id === SKIP) return { id, kind: 'skip' }
    if (id === clip.lang) return { id, kind: 'correct', lang: answer }
    const l = languageById(id)
    return { id, kind: l && l.fam === answer.fam ? 'close' : 'wrong', lang: l }
  })
  return {
    answer, rows, won, done,
    tries: used.length,
    // after the round is over the whole recording is open
    seconds: done ? clip.dur : stageSeconds(clip, used.length),
    heard: stageSeconds(clip, Math.max(0, used.length - 1)),
  }
}

// Unlimited scoring: 6 points for naming it from the first stage … 1 point on the last.
export const roundPoints = (r) => (r.won ? MAX_TRIES - r.tries + 1 : 0)

// ── Daily ─────────────────────────────────────────────────────────────────────
// Each cycle is a seeded shuffle of the id-sorted bank, one clip a day, so every
// clip plays once before any repeats; a cycle never opens with the language that
// closed the previous one.
const N = CLIPS.length
const cycleOrder = (cycle) => spread(shuffle(CLIPS, 0xea75 + cycle * 7919))

export function dailyClipFor(n) {
  const cycle = Math.floor(n / N)
  const k = ((n % N) + N) % N
  const order = cycleOrder(cycle)
  if (k === 0 && cycle > 0) {
    const prev = cycleOrder(cycle - 1)[N - 1]
    if (order[0].lang === prev.lang) return order[1]
  }
  if (k === 1 && cycle > 0) {
    const prev = cycleOrder(cycle - 1)[N - 1]
    if (order[0].lang === prev.lang) return order[0]
  }
  return order[k]
}
export const dailyClip = (day = geoDay()) => dailyClipFor(day - GEO_EPOCH)
export const puzzleNumber = (day = geoDay()) => day - GEO_EPOCH + 1

// ── Unlimited ─────────────────────────────────────────────────────────────────
// A session walks a seeded shuffle of the bank minus today's daily clip; each lap
// reshuffles and never starts with the clip (or language) just heard.
export function unlimitedQueue(seed, exclude = []) {
  const skip = new Set(exclude)
  return spread(shuffle(CLIPS.filter(c => !skip.has(c.id)), seed))
}

export function unlimitedAt(seed, index, exclude = []) {
  const base = CLIPS.length - CLIPS.filter(c => exclude.includes(c.id)).length
  const lap = Math.floor(index / base)
  const queue = unlimitedQueue(seed + lap * 104729, exclude)
  if (lap > 0) {
    const prevLast = unlimitedQueue(seed + (lap - 1) * 104729, exclude)[base - 1]
    const k = queue.findIndex(c => c.lang !== prevLast.lang)
    if (k > 0) [queue[0], queue[k]] = [queue[k], queue[0]]
  }
  return queue[index % base]
}

// ── Share ─────────────────────────────────────────────────────────────────────
// Spoiler-free: squares for each guess, the seconds of audio it took.
const SQUARE = { correct: '🟩', close: '🟨', wrong: '🟥', skip: '⬛' }
export function shareLine(r) {
  return Array.from({ length: MAX_TRIES }, (_, i) => (r.rows[i] ? SQUARE[r.rows[i].kind] : '⬜')).join('')
}
export const formatSeconds = (s) => `${Number.isInteger(s) ? s : s.toFixed(1)}s`
