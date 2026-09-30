// Badges — long-tail goals that give tomorrow a reason. All derived from local
// data (results log, streak, rivals, leagues), so they work offline and survive
// a device transfer. `checkBadges()` returns anything newly earned; the toast
// layer (components/social/BadgeToast.jsx) announces it.

import { loadJson, saveJson, emit } from './store'
import { loadLog, playedDays } from './log'
import { getStreak } from './streak'
import { rivalTable } from './challenge'
import { DAILY_GAMES } from '../data/dailyStats'

const KEY = 'ftg-badges-v1'
const COUNTERS_KEY = 'ftg-counters-v1'

// tier: bronze / silver / gold. mark: the short glyph on the crest.
export const BADGES = [
  { id: 'first-whistle', tier: 'bronze', mark: '1', test: c => c.played >= 1 },
  { id: 'hat-trick', tier: 'bronze', mark: '3', test: c => c.maxInDay >= 3 },
  { id: 'full-squad', tier: 'silver', mark: String(DAILY_GAMES.length), test: c => c.distinctGames >= DAILY_GAMES.length },
  { id: 'perfect-day', tier: 'gold', mark: '★', test: c => c.perfectDays >= 1 },
  { id: 'treble', tier: 'gold', mark: '★3', test: c => c.perfectDays >= 3 },
  { id: 'streak-3', tier: 'bronze', mark: '3', flame: true, test: c => c.bestStreak >= 3 },
  { id: 'streak-7', tier: 'silver', mark: '7', flame: true, test: c => c.bestStreak >= 7 },
  { id: 'streak-30', tier: 'gold', mark: '30', flame: true, test: c => c.bestStreak >= 30 },
  { id: 'streak-100', tier: 'gold', mark: '100', flame: true, test: c => c.bestStreak >= 100 },
  { id: 'fifty', tier: 'silver', mark: '50', test: c => c.played >= 50 },
  { id: 'century', tier: 'gold', mark: '100', test: c => c.played >= 100 },
  { id: 'tenable-ten', tier: 'gold', mark: '10', test: c => c.has(r => r.g === 'tenable' && r.v >= 10) },
  { id: 'wordle-two', tier: 'gold', mark: '2', test: c => c.has(r => r.g === 'wordle' && r.w && r.v <= 2) },
  { id: 'connections-flawless', tier: 'silver', mark: '0', test: c => c.has(r => r.g === 'connections' && r.w && r.v === 0) },
  { id: 'pointless-low', tier: 'silver', mark: '≤30', test: c => c.has(r => r.g === 'pointless' && r.w && r.v != null && r.v <= 30) },
  { id: 'early-kickoff', tier: 'bronze', mark: 'AM', test: c => c.has(r => r.h != null && r.h < 8) },
  { id: 'late-kickoff', tier: 'bronze', mark: 'PM', test: c => c.has(r => r.h != null && r.h >= 23) },
  { id: 'top-ten', tier: 'silver', mark: '%', test: c => c.has(r => r.pc != null && r.pc >= 90) },
  { id: 'messenger', tier: 'bronze', mark: '↗', test: c => c.shares >= 1 },
  { id: 'recruiter', tier: 'silver', mark: '↗5', test: c => c.shares >= 5 },
  { id: 'derby-win', tier: 'bronze', mark: 'VS', test: c => c.rivalWins >= 1 },
  { id: 'derby-king', tier: 'gold', mark: 'VS10', test: c => c.rivalWins >= 10 },
  { id: 'gaffer', tier: 'silver', mark: 'C', test: c => c.leaguesCreated >= 1 },
  { id: 'champion', tier: 'gold', mark: 'CUP', test: c => c.leagueTitles >= 1 },
]

export const loadBadges = () => loadJson(KEY, {}) || {}
export const counters = () => loadJson(COUNTERS_KEY, {}) || {}

export function bump(counter, by = 1) {
  const c = counters()
  c[counter] = (c[counter] || 0) + by
  saveJson(COUNTERS_KEY, c)
  return c[counter]
}

function context() {
  const log = loadLog()
  const rows = log.filter(r => r.g !== 'perfect')
  const perDay = new Map()
  for (const r of rows) perDay.set(r.d, (perDay.get(r.d) || 0) + 1)
  const cnt = counters()
  let rivalWins = 0
  try { rivalWins = rivalTable().reduce((s, r) => s + r.w, 0) } catch { /* no rivals */ }
  return {
    played: rows.length,
    maxInDay: Math.max(0, ...perDay.values()),
    distinctGames: new Set(rows.map(r => r.g)).size,
    perfectDays: log.filter(r => r.g === 'perfect').length,
    bestStreak: getStreak().best,
    days: playedDays(log).length,
    shares: cnt.shares || 0,
    leaguesCreated: cnt.leaguesCreated || 0,
    leagueTitles: cnt.leagueTitles || 0,
    rivalWins,
    has: (pred) => rows.some(pred),
  }
}

// Evaluate everything; persist + return badges earned since the last check.
export function checkBadges() {
  const got = loadBadges()
  const ctx = context()
  const fresh = []
  for (const b of BADGES) {
    if (got[b.id]) continue
    let ok
    try { ok = b.test(ctx) } catch { ok = false }
    if (ok) { got[b.id] = Date.now(); fresh.push(b) }
  }
  if (fresh.length) { saveJson(KEY, got); emit({ type: 'badges', fresh }) }
  return fresh
}

// Progress snapshot for the badge cabinet.
export function badgeCabinet() {
  const got = loadBadges()
  return BADGES.map(b => ({ ...b, earned: got[b.id] || null }))
}
