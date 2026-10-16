// Glue between the geography games and the competition layer. Importing this
// module (GeographyApp does) registers the listener, so every daily a game
// records lands in the day log and — when the API is up — in the player's
// geography leagues.
//
// Each game's result becomes one comparable shape (the same model as football's
// src/social/scoring.js): { w, v, of?, low?, u? } — won, the game's number, an
// optional maximum, whether lower is better, and a unit for point scores.
import { onRecorded, loadStats } from '../data/progress'
import { upsertRow, loadLog, backfillFromStats } from './log'
import { submitResult, flushOutbox } from './api'
import { geoDay } from '../data/day'
import { emitGeo } from './leagues'

// Score games that are marks out of a fixed total rather than points.
const OUT_OF = { outrank: 10 }

export function shapeOf({ game, kind, won, value, slots }) {
  if (kind === 'guesses') return { w: won, v: value, of: slots, low: true }
  if (OUT_OF[game]) return { w: won, v: value, of: OUT_OF[game] }
  return { w: won, v: value, u: 'pts' }
}

async function send(row) {
  const res = await submitResult(row)
  if (res) { upsertRow({ d: row.d, g: row.g, sent: 1 }); emitGeo('result') }
  return res
}

onRecorded((event) => {
  const row = upsertRow({ d: event.day, g: event.game, ...shapeOf(event) })
  emitGeo('logged')
  send(row)
})

// Once per page load: seed the log for earlier players, retry the outbox and
// anything from today or yesterday that never reached the server.
let booted = false
export function bootGeoSocial() {
  if (booted || typeof window === 'undefined') return
  booted = true
  backfillFromStats((g) => loadStats(g))
  flushOutbox().then(() => {
    const d = geoDay()
    for (const row of loadLog().filter(r => r.d >= d - 1 && !r.sent && !r.bf)) send(row)
  })
}
