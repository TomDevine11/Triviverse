// Triviverse Geography's day log: one row per finished daily, kept in this
// browser. Base Camp (streak, perfect days, calendar) and the hub's perfect-day
// square read it; ./results.js writes it as games finish.
//
// Row: { d: day, g: game, w: won, v, of?, low?, u?, sent?, bf? }
//   bf — backfilled from the per-game stats of players who played before the
//        log existed (never sent to the server, never a streak-day guess).
import { GEO_GAMES } from '../games'
import { geoDay } from '../data/day'

const LOG_KEY = 'tvg-log-v1'
const MAX_ROWS = 2000
export const PERFECT_MULT = 2 // the server doubles a perfect day's points (worker/api.js)

const readJson = (k, f) => { try { const r = localStorage.getItem(k); return r == null ? f : JSON.parse(r) } catch { return f } }
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }

const GAME_IDS = new Set(GEO_GAMES.map(g => g.id))
export const loadLog = () => {
  const rows = readJson(LOG_KEY, [])
  return Array.isArray(rows) ? rows.filter(r => r && Number.isInteger(r.d) && GAME_IDS.has(r.g)) : []
}

// Insert or merge one row (keyed by day + game). Returns the stored row.
export function upsertRow(row) {
  const rows = loadLog()
  const i = rows.findIndex(r => r.d === row.d && r.g === row.g)
  const next = i >= 0 ? { ...rows[i], ...row } : row
  if (i >= 0) rows[i] = next
  else rows.push(next)
  writeJson(LOG_KEY, rows.slice(-MAX_ROWS))
  return next
}

export const rowFor = (day, game) => loadLog().find(r => r.d === day && r.g === game) || null

// Days with at least one finished daily → { day: rows[] }.
export function byDay(rows = loadLog()) {
  const out = new Map()
  for (const r of rows) (out.get(r.d) || out.set(r.d, []).get(r.d)).push(r)
  return out
}

export const isPerfect = (rows) => GEO_GAMES.every(g => rows?.some(r => r.g === g.id))

// The geography day streak: consecutive days with any daily finished, alive if
// the last one was today or yesterday. Plus the best ever and perfect-day count.
export function dayStreak(rows = loadLog(), today = geoDay()) {
  const days = byDay(rows)
  const set = new Set(days.keys())
  let streak = 0
  let d = set.has(today) ? today : today - 1
  while (set.has(d)) { streak++; d-- }
  const sorted = [...set].sort((a, b) => a - b)
  let best = 0, run = 0
  sorted.forEach((x, i) => { run = i && sorted[i - 1] === x - 1 ? run + 1 : 1; best = Math.max(best, run) })
  const perfect = [...days.values()].filter(isPerfect).length
  return { streak, best, perfect, days: set.size, atRisk: streak > 0 && !set.has(today) }
}

// Seed the log from per-game stats (each game's last played day) for players
// who played before the log existed. Runs once.
const BACKFILL_KEY = 'tvg-log-backfilled'
export function backfillFromStats(statsOf) {
  if (readJson(BACKFILL_KEY, false)) return
  for (const g of GEO_GAMES) {
    const s = statsOf(g.id)
    if (Number.isInteger(s?.lastDay) && !rowFor(s.lastDay, g.id)) upsertRow({ d: s.lastDay, g: g.id, w: s.lastWinDay === s.lastDay, bf: 1 })
  }
  writeJson(BACKFILL_KEY, true)
}
