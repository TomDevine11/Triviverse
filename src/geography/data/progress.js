// Triviverse Geography's player-side storage (this browser only, no backend).
// Its own localStorage keys, never shared with Triviverse Football's stores.
//
//   • daily progress — the live state of today's puzzle per game, so a refresh
//     resumes it and a finished one stays locked to its result
//   • per-game stats — played / wins / streak / guess distribution
import { geoDay } from './day'

const PROGRESS_KEY = 'tvg-progress-v1'
const STATS_KEY = 'tvg-stats-v1'

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

// Today's saved state for a game, or null. `sig` names today's puzzle, so a
// snapshot from a different puzzle is ignored.
export function loadProgress(game, sig = null) {
  const p = read(PROGRESS_KEY)[game]
  if (!p || p.d !== geoDay()) return null
  if (sig != null && p.sig !== sig) return null
  return p.state
}

export function saveProgress(game, state, done, sig = null) {
  const all = read(PROGRESS_KEY)
  all[game] = { d: geoDay(), sig, state: { ...state, done } }
  write(PROGRESS_KEY, all)
}

export const finishedToday = (game) => !!loadProgress(game)?.done
export const inProgressToday = (game) => { const s = loadProgress(game); return !!s && !s.done }

// Every first-time daily finish is announced here (the competition layer in
// ../social listens: base-camp log, league points). Listeners must not throw.
const listeners = new Set()
export function onRecorded(fn) { listeners.add(fn); return () => listeners.delete(fn) }
function announce(event) {
  for (const fn of listeners) { try { fn(event) } catch { /* a listener never breaks a game */ } }
}

const blank = (slots) => ({ played: 0, wins: 0, streak: 0, maxStreak: 0, lastDay: null, lastWinDay: null, dist: Array(slots).fill(0) })

export function loadStats(game, slots = 6) {
  return { ...blank(slots), ...(read(STATS_KEY)[game] || {}) }
}

// Record today's result once (idempotent per day). `guesses` fills the
// distribution on a win.
export function recordResult(game, won, guesses, slots = 6, day = geoDay()) {
  const all = read(STATS_KEY)
  const s = { ...blank(slots), ...(all[game] || {}) }
  if (s.lastDay === day) return s
  s.played += 1
  s.lastDay = day
  if (won) {
    s.wins += 1
    s.streak = s.lastWinDay === day - 1 ? s.streak + 1 : 1
    s.maxStreak = Math.max(s.maxStreak, s.streak)
    s.lastWinDay = day
    s.dist[guesses - 1] = (s.dist[guesses - 1] || 0) + 1
  } else {
    s.streak = 0
  }
  all[game] = s
  write(STATS_KEY, all)
  announce({ game, day, kind: 'guesses', won: !!won, value: guesses, slots })
  return s
}

// The longest live streak across every geography game (the hub's flame).
export function bestLiveStreak(games) {
  const all = read(STATS_KEY)
  const today = geoDay()
  return Math.max(0, ...games.map(g => {
    const s = all[g]
    return s && s.lastWinDay >= today - 1 ? s.streak : 0
  }))
}

// Score games (Postcard, Milestone): by default every finished daily counts toward the streak — there
// is no losing a pin drop — plus total/best for the average, and the score band in
// `dist`. Same store and streak fields as the other games, so the hub's flame and
// cards read it unchanged. Idempotent per day.
// `won` = false (Milestone below its pass mark) counts the play but breaks the streak.
export function recordScore(game, score, band, slots = 5, day = geoDay(), won = true) {
  const all = read(STATS_KEY)
  const s = { ...blank(slots), total: 0, best: 0, ...(all[game] || {}) }
  if (s.lastDay === day) return s
  s.played += 1
  s.lastDay = day
  if (won) {
    s.wins += 1
    s.streak = s.lastWinDay === day - 1 ? s.streak + 1 : 1
    s.maxStreak = Math.max(s.maxStreak, s.streak)
    s.lastWinDay = day
  } else {
    s.streak = 0
  }
  s.total += score
  s.best = Math.max(s.best, score)
  s.dist[band] = (s.dist[band] || 0) + 1
  all[game] = s
  write(STATS_KEY, all)
  announce({ game, day, kind: 'score', won: !!won, value: score, slots })
  return s
}
