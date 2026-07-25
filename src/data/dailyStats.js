// Local daily-game stats + streaks + retention layer (per browser, no backend).
// Only DAILY mode records here — unlimited/practice play never touches these.
//
// Two shapes, both stored the same way:
//   • win/lose games  → streak = consecutive winning days; show Played/Win%/Streak/Max
//   • score games     → streak = consecutive days PLAYED; also track `best` score;
//                        show Played/Best/Streak/Max
// recordResult(game, won, score?): pass won=true for a "successful" day (a win,
// or simply having played a score game), and the score for score games.
//
// The retention layer (2026-07 hub redesign) also records, per result:
//   • form history — last results by day, driving the hub's form-guide dots
//   • matchday points — see the tunable economy constants below

import { track } from '../utils/analytics'

const KEY = 'ftg-stats-v1'
const VISIT_KEY = 'ftg-visits-v1'
const POINTS_KEY = 'ftg-points-v1'

// The nine daily games (dailyStats keys). Perfect day = all of these in one day.
export const DAILY_GAMES = ['tenable', 'wordle', 'tictactoe', 'teammates', 'careers', 'wcsquads', 'connections', 'higherlower', '501']

// ── Points economy (tune here, nowhere else) ──────────────────────
export const PTS_PLAY = 10 //          playing a daily
export const PTS_WIN = 25 //           winning it (replaces PTS_PLAY, not added)
export const PTS_STREAK_PER = 5 //     bonus per day of that game's current streak…
export const PTS_STREAK_CAP = 25 //    …capped here
export const PERFECT_MULT = 2 //       clearing all nine doubles the whole day

export function todayIndex() {
  const now = new Date()
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000)
}

// Matchday 1 = site launch day. Every visitor worldwide shares today's number.
const MATCHDAY_EPOCH = 20455
export function matchdayNumber() {
  return todayIndex() - MATCHDAY_EPOCH
}

// Monday that starts the week containing local day `idx` (day 0 = a Thursday).
export function weekStart(idx = todayIndex()) {
  return idx - ((idx + 3) % 7)
}

function loadJson(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}
const load = () => loadJson(KEY) || {}

const blank = () => ({ played: 0, wins: 0, currentStreak: 0, maxStreak: 0, best: 0, lastPlayed: null, lastWin: null, results: [] })

export function getStats(game) {
  return { ...blank(), ...(load()[game] || {}) }
}

// Whether a game's daily was played today (drives the hub's "FT" marks).
export function playedToday(game) {
  const s = load()[game]
  return !!s && s.lastPlayed === todayIndex()
}

// Form guide: one char per day for the last `n` days ending today —
// 'W' won, 'L' played and lost, '-' didn't play. Drives the hub's form dots.
export function formGuide(game, n = 5) {
  const results = getStats(game).results || []
  const today = todayIndex()
  const byDay = new Map(results.map(r => [r.d, r.w]))
  let out = ''
  for (let d = today - n + 1; d <= today; d++) {
    out += byDay.has(d) ? (byDay.get(d) ? 'W' : 'L') : '-'
  }
  return out
}

// Hub visit streak: consecutive days the site was opened, recorded once per day.
// `returning` is false for the whole first day so a brand-new visitor is never
// greeted with "welcome back".
export function recordVisit() {
  const day = todayIndex()
  let v = loadJson(VISIT_KEY)
  if (!v || typeof v.lastDay !== 'number') v = { firstDay: day, lastDay: null, streak: 0 }
  if (v.lastDay !== day) {
    v.streak = v.lastDay === day - 1 ? v.streak + 1 : 1
    v.lastDay = day
    saveJson(VISIT_KEY, v)
  }
  return { streak: v.streak, returning: v.firstDay < day }
}

// ── Matchday points ledger (weekly, resets Monday) ────────────────
function loadLedger() {
  const ws = weekStart()
  let p = loadJson(POINTS_KEY)
  if (!p || p.weekStart !== ws) p = { weekStart: ws, total: 0, dayBase: 0, day: todayIndex(), perfect: false }
  if (p.day !== todayIndex()) { p.day = todayIndex(); p.dayBase = 0; p.perfect = false }
  return p
}

export function weeklyPoints() {
  return loadLedger().total
}

// Points earned TODAY (the day's base, doubled on a perfect day — matching how
// awardPoints folds the perfect bonus into the weekly total).
export function dailyPoints() {
  const p = loadLedger()
  return p.perfect ? p.dayBase * PERFECT_MULT : p.dayBase
}

// Called once per game per day from recordResult (which is idempotent).
function awardPoints(all, won, streak) {
  const p = loadLedger()
  const pts = (won ? PTS_WIN : PTS_PLAY) + Math.min(streak * PTS_STREAK_PER, PTS_STREAK_CAP)
  p.total += pts
  p.dayBase += pts
  // Perfect day: the moment all nine have recorded today, the day's base doubles.
  const day = todayIndex()
  if (!p.perfect && DAILY_GAMES.every(g => all[g]?.lastPlayed === day)) {
    p.total += p.dayBase * (PERFECT_MULT - 1)
    p.perfect = true
  }
  saveJson(POINTS_KEY, p)
}

// Record today's result once (idempotent per day). Returns the updated stats.
export function recordResult(game, won, score = null) {
  const all = load()
  const day = todayIndex()
  const s = { ...blank(), ...(all[game] || {}) }
  if (s.lastPlayed === day) return s // already recorded today

  s.played += 1
  if (won) {
    s.wins += 1
    s.currentStreak = s.lastWin === day - 1 ? s.currentStreak + 1 : 1
    s.maxStreak = Math.max(s.maxStreak, s.currentStreak)
    s.lastWin = day
  } else {
    s.currentStreak = 0
  }
  if (score != null && score > s.best) s.best = score
  s.lastPlayed = day
  s.results = [...(s.results || []), { d: day, w: !!won }].slice(-14)
  all[game] = s
  saveJson(KEY, all)
  awardPoints(all, won, s.currentStreak)
  // Fires once per game per day (guarded above) → daily engagement signal.
  track('game_complete', { game, won: !!won, streak: s.currentStreak })
  return s
}
