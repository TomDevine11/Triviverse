// The personal results log — one row per daily played, kept for a year. It is
// the source for everything that looks back: records, averages, the calendar
// heatmap, the matchday streak, the "my day" share text and badges. dailyStats
// keeps its own compact per-game counters (streaks, form); this is the detail.
//
// Row: { d, m, g, w, v?, of?, low?, u?, p, t? }
//   d day index · m matchday · g dailyStats key · w won · v/of/low/u score (see
//   scoring.js) · p matchday points earned · t result tiles (share-text rows)

import { loadJson, saveJson, emit } from './store'

const KEY = 'ftg-log-v1'
const MAX_ROWS = 4000 // ~a year of every daily

export const loadLog = () => loadJson(KEY, []) || []

function save(rows) {
  saveJson(KEY, rows.slice(-MAX_ROWS))
}

// Insert or merge the row for (day, game). Called twice per daily: once by
// recordResult (won + points) and once by the finish card (score + tiles).
export function upsertResult(row) {
  const rows = loadLog()
  const i = rows.findIndex(r => r.d === row.d && r.g === row.g)
  const merged = i >= 0 ? { ...rows[i], ...stripUndefined(row) } : stripUndefined(row)
  if (i >= 0) rows[i] = merged
  else rows.push(merged)
  save(rows)
  emit({ type: 'result', row: merged })
  return merged
}

function stripUndefined(o) {
  const out = {}
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v
  return out
}

export const resultFor = (d, g) => loadLog().find(r => r.d === d && r.g === g) || null
export const resultsOn = (d) => loadLog().filter(r => r.d === d && r.g !== 'perfect')

// Distinct days with at least one daily played, ascending.
export function playedDays(rows = loadLog()) {
  return [...new Set(rows.filter(r => r.g !== 'perfect').map(r => r.d))].sort((a, b) => a - b)
}

// Import helper for people who played before the log existed: seed rows from
// dailyStats' 14-day per-game result history so streaks/heatmaps aren't empty.
export function backfillFromStats(stats, matchdayOf) {
  const rows = loadLog()
  const have = new Set(rows.map(r => `${r.d}:${r.g}`))
  let added = 0
  for (const [g, s] of Object.entries(stats || {})) {
    for (const res of s?.results || []) {
      if (have.has(`${res.d}:${g}`)) continue
      rows.push({ d: res.d, m: matchdayOf(res.d), g, w: !!res.w, p: 0, bf: 1 })
      added++
    }
  }
  if (added) save(rows.sort((a, b) => a.d - b.d))
  return added
}
