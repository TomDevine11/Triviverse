// Outrank's game state: pure transitions + this browser's saved state. No UI.
//
// Daily and Unlimited never share a key:
//   • Daily lives in the suite's daily-progress store (./progress, game 'outrank'),
//     keyed to today's puzzle, so the hub sees it and it expires with the day.
//     Its finish is recorded once in the suite's stats store (day streak, best).
//   • Unlimited keeps its run under RUN_KEY and its own totals under USTATS_KEY.
//
// Every transition returns the same object when the move isn't allowed (a second
// guess on an answered question, Next before answering), so a double tap or a
// stale timer can never corrupt the state.
import { DAILY_SIZE, PASS_STREAK, UNLIMITED_STATS, dailySig, isCorrect, unlimitedNext, validQuestion } from './outrank'
import { loadProgress, saveProgress, recordScore } from './progress'
import { geoDay } from './day'

export const GAME = 'outrank'
export const MODE_KEY = 'tvg-outrank-mode'
export const SETTING_KEY = 'tvg-outrank-stat'
export const RUN_KEY = 'tvg-outrank-run-v1'
export const USTATS_KEY = 'tvg-outrank-ustats-v1'

const GUESSES = new Set(['higher', 'lower'])
const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }

// ── Daily ────────────────────────────────────────────────────────────────────
// { answers: ['higher' | 'lower', …] in question order, pos: the question on screen }.
// pos === answers.length → waiting for a guess; pos === answers.length − 1 → revealed.
export const emptyDaily = () => ({ answers: [], pos: 0 })

export function readDaily(qs) {
  const s = loadProgress(GAME, dailySig(qs))
  if (!s || !Array.isArray(s.answers) || !s.answers.every(g => GUESSES.has(g))) return emptyDaily()
  const wrong = s.answers.findIndex((g, i) => i < DAILY_SIZE && !isCorrect(qs[i], g))
  const answers = s.answers.slice(0, wrong >= 0 ? wrong + 1 : DAILY_SIZE)
  const pos = Number.isInteger(s.pos) ? Math.max(Math.max(0, answers.length - 1), Math.min(answers.length, s.pos)) : answers.length
  return { answers, pos }
}

export function answerDaily(qs, state, guess) {
  if (!GUESSES.has(guess) || dailyComplete(qs, state) || state.answers.length !== state.pos) return state
  return { answers: [...state.answers, guess], pos: state.pos }
}

export function advanceDaily(state) {
  if (state.answers.length !== state.pos + 1) return state
  return { ...state, pos: state.pos + 1 }
}

export const dailyResults = (qs, answers) => answers.map((g, i) => isCorrect(qs[i], g))
// The day is over at the first wrong answer, or after all ten.
export const dailyComplete = (qs, state) => state.answers.length >= DAILY_SIZE || dailyResults(qs, state.answers).includes(false)
// …and finished once the player has moved on from the last reveal.
export const dailyFinished = (qs, state) => dailyComplete(qs, state) && state.pos >= state.answers.length
export const dailyWon = (score) => score >= PASS_STREAK

// Save today's progress; the finish is recorded once (recordScore is idempotent per day).
export function saveDaily(qs, state, day = geoDay()) {
  const done = dailyComplete(qs, state)
  saveProgress(GAME, state, done, dailySig(qs))
  if (done) {
    const score = dailyResults(qs, state.answers).filter(Boolean).length
    return recordScore(GAME, score, score, DAILY_SIZE + 1, day, dailyWon(score))
  }
  return null
}

// ── Unlimited ────────────────────────────────────────────────────────────────
// { seed, setting, qs: [{ a, b, stat }], guesses: [...], over, recorded }
export function newRun(setting = 'mixed', seed = Math.floor(Math.random() * 2 ** 31)) {
  const s = UNLIMITED_STATS.includes(setting) ? setting : 'mixed'
  return { seed, setting: s, qs: [unlimitedNext(seed, s, [])], guesses: [], over: false, recorded: false }
}

export function answerRun(run, guess) {
  if (!GUESSES.has(guess) || run.over || run.guesses.length !== run.qs.length - 1) return run
  const q = run.qs[run.qs.length - 1]
  const guesses = [...run.guesses, guess]
  return { ...run, guesses, over: !isCorrect(q, guess) }
}

export function advanceRun(run) {
  if (run.over || run.guesses.length !== run.qs.length) return run
  return { ...run, qs: [...run.qs, unlimitedNext(run.seed, run.setting, run.qs)] }
}

export const runStreak = (run) => run.guesses.filter((g, i) => isCorrect(run.qs[i], g)).length
export const runRevealed = (run) => run.guesses.length === run.qs.length

export function readRun() {
  const r = readJson(RUN_KEY)
  if (!r || !Number.isInteger(r.seed) || !UNLIMITED_STATS.includes(r.setting) || !Array.isArray(r.qs) || !Array.isArray(r.guesses)) return null
  if (!r.qs.length || !r.qs.every(validQuestion) || !r.guesses.every(g => GUESSES.has(g))) return null
  if (r.guesses.length > r.qs.length || r.guesses.length < r.qs.length - 1) return null
  const wrong = r.guesses.findIndex((g, i) => !isCorrect(r.qs[i], g))
  if (wrong >= 0 && wrong !== r.guesses.length - 1) return null
  return { seed: r.seed, setting: r.setting, qs: r.qs, guesses: r.guesses, over: wrong >= 0, recorded: !!r.recorded }
}
export const saveRun = (run) => writeJson(RUN_KEY, run)

export function loadUnlimitedStats() {
  const s = readJson(USTATS_KEY) || {}
  const best = Object.fromEntries(UNLIMITED_STATS.map(k => [k, Number.isInteger(s.best?.[k]) ? s.best[k] : 0]))
  return { played: Number.isInteger(s.played) ? s.played : 0, best }
}

// Record a finished run once; returns [updated run, stats].
export function recordRun(run) {
  const stats = loadUnlimitedStats()
  if (!run.over || run.recorded) return [run, stats]
  const streak = runStreak(run)
  const next = { played: stats.played + 1, best: { ...stats.best, [run.setting]: Math.max(stats.best[run.setting] || 0, streak) } }
  writeJson(USTATS_KEY, next)
  return [{ ...run, recorded: true }, next]
}

export const readSetting = () => { const s = readJson(SETTING_KEY); return UNLIMITED_STATS.includes(s) ? s : 'mixed' }
export const saveSetting = (s) => writeJson(SETTING_KEY, s)
export const readMode = () => { const m = readJson(MODE_KEY); return m === 'daily' || m === 'unlimited' ? m : null }
export const saveMode = (m) => writeJson(MODE_KEY, m)
