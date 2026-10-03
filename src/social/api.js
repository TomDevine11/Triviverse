// Client for the social API (worker/index.js, Cloudflare Worker + D1). It is
// strictly optional: every caller must cope with `null` (offline, API not
// deployed, local dev without the worker). The local-only layer — streaks,
// challenge links, rivals, badges — never depends on it.
//
// Result submissions that fail are queued in an outbox and retried on the next
// page load, so a flaky connection doesn't cost you a league point.

import { loadJson, saveJson } from './store'
import { getMe } from './identity'

const OUTBOX_KEY = 'ftg-outbox-v1'
const BASE = '/api'
let down = false // flips true after a network failure/404 so we stop hammering

async function call(path, { method = 'GET', body } = {}) {
  if (down || typeof fetch === 'undefined') return null
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 404 && !res.headers.get('content-type')?.includes('json')) { down = true; return null }
    const data = await res.json().catch(() => null)
    if (!res.ok) return { error: data?.error || `HTTP ${res.status}` }
    return data
  } catch {
    down = true
    return null
  }
}

const who = () => { const me = getMe(); return { player: me.id, pub: me.pub, name: me.name || '' } }

export async function submitResult(row) {
  const body = { ...who(), day: row.d, m: row.m, game: row.g, w: !!row.w, v: row.v ?? null, of: row.of ?? null, low: !!row.low, u: row.u || null, p: row.p || 0 }
  const res = await call('/results', { method: 'POST', body })
  if (!res || res.error) {
    if (!res) queue(body)
    return null
  }
  return res
}

function queue(body) {
  const box = loadJson(OUTBOX_KEY, []) || []
  if (!box.some(b => b.day === body.day && b.game === body.game)) box.push(body)
  saveJson(OUTBOX_KEY, box.slice(-60))
}

export async function flushOutbox() {
  const box = loadJson(OUTBOX_KEY, []) || []
  if (!box.length) return
  let left = []
  for (let i = 0; i < box.length; i++) {
    const res = await call('/results', { method: 'POST', body: { ...box[i], ...who() } })
    if (!res) { left = box.slice(i); break } // still offline — keep the rest for next time
  }
  saveJson(OUTBOX_KEY, left)
}

export const today = (day) => call(`/today?day=${day}`)
export const distribution = (day, game) => call(`/dist?day=${day}&game=${encodeURIComponent(game)}`)
export const rename = () => call('/players', { method: 'POST', body: who() })

export const createLeague = (leagueName) => call('/leagues', { method: 'POST', body: { ...who(), leagueName } })
export const joinLeague = (code) => call(`/leagues/${code}/join`, { method: 'POST', body: who() })
export const leaveLeague = (code) => call(`/leagues/${code}/leave`, { method: 'POST', body: who() })
export const getLeague = (code, day) => call(`/leagues/${code}?player=${encodeURIComponent(getMe().id)}&day=${day}`)
export const peekLeague = (code) => call(`/leagues/${code}/peek`)
export const worldTable = (period, day) => call(`/world?period=${period}&day=${day}&player=${encodeURIComponent(getMe().id)}`)
export const worldRank = (day) => call(`/rank?day=${day}&player=${encodeURIComponent(getMe().id)}`)
export const myLeagues = (day, game) => call(`/me/leagues?player=${encodeURIComponent(getMe().id)}&day=${day}${game ? `&game=${encodeURIComponent(game)}` : ''}`)

export const shortLink = (c) => call('/links', { method: 'POST', body: { c } })

export const putTransfer = (blob) => call('/transfer', { method: 'POST', body: { blob } })
export const getTransfer = (code) => call(`/transfer/${encodeURIComponent(code)}`)

export const apiDown = () => down
