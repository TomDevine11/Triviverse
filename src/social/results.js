// Glue between the games and the social layer. Importing this module (App.jsx
// does) registers the dailyStats listener, so every daily a game records flows
// into the results log, the badge check and — when the API is up — the global
// percentile and every league the player is in.
//
// A daily reaches here in two steps:
//   1. recordResult() → onRecorded listener below: outcome + points (+ perfect bonus)
//   2. the finish card → finalizeResult(card): the score and the result tiles
// The API submission happens in step 2 so the server sees the score; step 1's
// row is queued as a fallback if the player leaves before the card renders.

import { onRecorded, matchdayOf, todayIndex } from '../data/dailyStats'
import { upsertResult, resultFor, loadLog, backfillFromStats } from './log'
import { checkBadges } from './badges'
import { submitResult, flushOutbox } from './api'
import { rowsToCodes } from './shareText'
import { track } from '../utils/analytics'
import { loadJson, saveJson } from './store'
import { getStreak } from './streak'

const BOOT_KEY = 'ftg-social-boot-v1'

onRecorded(({ game, won, day, pts, perfectBonus }) => {
  upsertResult({ d: day, m: matchdayOf(day), g: game, w: won, p: pts, h: new Date().getHours() })
  if (perfectBonus) {
    const row = upsertResult({ d: day, m: matchdayOf(day), g: 'perfect', w: true, p: perfectBonus })
    submitResult(row)
  }
  getStreak() // settle streak (earn a freeze on day 7, 14…)
  checkBadges()
})

// Card → score fields (scoring.js model). Games pass `won` and `score` on the card.
function scoreOf(card) {
  const s = card.score || {}
  return { w: !!card.won, v: s.v ?? null, of: s.of, low: s.low ? true : undefined, u: s.u }
}

// Called by the finish card. Idempotent — the finish card can re-render or
// be reopened ("already played today") without double-counting anything.
export async function finalizeResult(card) {
  if (!card?.daily || !card.gameId) return null
  const d = todayIndex()
  const existing = resultFor(d, card.gameId)
  if (!existing) return null // not today's recorded daily (practice, or a stale card)
  const already = existing.v !== undefined && existing.sent
  const row = upsertResult({ d, m: matchdayOf(d), g: card.gameId, ...scoreOf(card), w: existing.w, t: rowsToCodes(card.rows) })
  if (already) return { pc: row.pc ?? null, others: row.others ?? null }
  if (row.v != null) track('daily_score', { game: card.gameId, won: !!row.w, score: row.v })
  checkBadges()
  const res = await submitResult(row)
  if (res && !res.error) {
    upsertResult({ d, g: card.gameId, sent: 1, pc: res.pc ?? undefined, others: res.others ?? undefined })
    checkBadges() // the "top 10%" badge needs the percentile
    return res
  }
  return null
}

// Once per page load: seed the log for pre-existing players, retry any queued
// submissions, and push today's rows the finish card never got to send.
let booted = false
export function bootSocial(stats) {
  if (booted || typeof window === 'undefined') return
  booted = true
  const boot = loadJson(BOOT_KEY, {}) || {}
  if (!boot.backfilled) {
    backfillFromStats(stats, matchdayOf)
    boot.backfilled = Date.now()
    saveJson(BOOT_KEY, boot)
  }
  getStreak()
  checkBadges()
  flushOutbox().then(() => {
    const d = todayIndex()
    for (const row of loadLog().filter(r => r.d >= d - 1 && !r.sent && r.g !== 'perfect' && !r.bf)) {
      submitResult(row).then(res => { if (res && !res.error) upsertResult({ d: row.d, g: row.g, sent: 1, pc: res.pc ?? undefined }) })
    }
  })
}
