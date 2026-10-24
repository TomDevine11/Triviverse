// Client for Triviverse Geography's competition API (/api/geo/*, worker/api.js —
// the same Worker + D1 as football, with geography's own tables). Optional by
// design: every caller copes with `null` (offline, local dev without the Worker).
// Identity is shared with football (one device id + nickname across Triviverse).
//
// Result submissions that fail are queued and retried on the next visit, so a
// flaky connection doesn't cost a league point.
import { getMe } from '../../social/identity'

const OUTBOX_KEY = 'tvg-outbox-v1'
const BASE = '/api/geo'
let down = false // flips after a network failure / missing API so we stop retrying this visit

const readJson = (k, f) => { try { const r = localStorage.getItem(k); return r == null ? f : JSON.parse(r) } catch { return f } }
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }

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
  const body = { ...who(), day: row.d, game: row.g, w: !!row.w, v: row.v ?? null, of: row.of ?? null, low: !!row.low, u: row.u || null }
  const res = await call('/results', { method: 'POST', body })
  if (!res) { queue(body); return null }
  return res.error ? null : res
}

function queue(body) {
  const box = readJson(OUTBOX_KEY, [])
  if (!box.some(b => b.day === body.day && b.game === body.game)) box.push(body)
  writeJson(OUTBOX_KEY, box.slice(-40))
}

export async function flushOutbox() {
  const box = readJson(OUTBOX_KEY, [])
  if (!Array.isArray(box) || !box.length) return
  let left = []
  for (let i = 0; i < box.length; i++) {
    const res = await call('/results', { method: 'POST', body: { ...box[i], ...who() } })
    if (!res) { left = box.slice(i); break }
  }
  writeJson(OUTBOX_KEY, left)
}

export const rename = () => call('/players', { method: 'POST', body: who() })
export const createLeague = (leagueName) => call('/leagues', { method: 'POST', body: { ...who(), leagueName } })
export const joinLeague = (code) => call(`/leagues/${code}/join`, { method: 'POST', body: who() })
export const leaveLeague = (code) => call(`/leagues/${code}/leave`, { method: 'POST', body: who() })
export const getLeague = (code, day) => call(`/leagues/${code}?player=${encodeURIComponent(getMe().id)}&day=${day}`)
export const peekLeague = (code) => call(`/leagues/${code}/peek`)
export const worldTable = (period, day) => call(`/world?period=${period}&day=${day}&player=${encodeURIComponent(getMe().id)}`)
export const worldRank = (day) => call(`/rank?day=${day}&player=${encodeURIComponent(getMe().id)}`)
export const myLeagues = (day) => call(`/me/leagues?player=${encodeURIComponent(getMe().id)}&day=${day}`)
export const apiDown = () => down
