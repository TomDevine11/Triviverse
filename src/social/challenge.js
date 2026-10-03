// Challenge links + rivals, with no backend: the sharer's result rides inside
// the link (?c=…). Opening it stores that result locally as a "rival" entry;
// finishing the same daily then shows a head-to-head and offers the reply.
// Over time the rivals store becomes a personal table of everyone who has
// challenged you — a league built entirely out of links.
//
// Payloads (JSON → base64url):
//   game: { k:'g', i, n, m, g, r:[w,v,of,low,u] }
//   day:  { k:'d', i, n, m, p, s, r:{ g:[w,v,of,low,u], … } }  (share-my-day)

import { loadJson, saveJson, emit } from './store'
import { getMe } from './identity'
import { compareResults } from './scoring'
import { loadLog } from './log'

const RIVALS_KEY = 'ftg-rivals-v1'
const ACTIVE_KEY = 'ftg-challenge-v1'

function b64urlEncode(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  return decodeURIComponent(escape(atob(b64)))
}

const pack = (r) => [r.w ? 1 : 0, r.v ?? null, r.of ?? 0, r.low ? 1 : 0, r.u || '']
const unpack = (a) => Array.isArray(a) ? { w: !!a[0], v: a[1], of: a[2] || undefined, low: !!a[3], u: a[4] || undefined } : null

// `title`/`subtitle`/`tiles` only feed the unfurl image (worker/og.js); the
// head-to-head uses `r` alone.
export function encodeGameChallenge({ game, matchday, result, title, subtitle, tiles }) {
  const me = getMe()
  const o = { k: 'g', i: me.pub, n: me.name || '', m: matchday, g: game, r: pack(result) }
  if (title) o.t = String(title).slice(0, 40)
  if (subtitle) o.c = String(subtitle).slice(0, 80)
  if (tiles) o.R = String(tiles).slice(0, 90)
  return b64urlEncode(JSON.stringify(o))
}

// Share links go through /s/… on this origin: crawlers get the result image,
// people are redirected into the game with the challenge attached.
const origin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://triviverse.com')
export const gameChallengeUrl = (game, code) => `${origin()}/s/${game}?c=${code}`
export const dayChallengeUrl = (code) => `${origin()}/s/day?c=${code}`
export const leagueInviteUrl = (code) => `${origin()}/s/league/${code}`

export function encodeDayChallenge({ matchday, points, streak, results }) {
  const me = getMe()
  const r = {}
  for (const row of results) r[row.g] = pack(row)
  return b64urlEncode(JSON.stringify({ k: 'd', i: me.pub, n: me.name || '', m: matchday, p: points, s: streak, r }))
}

export function decodeChallenge(code) {
  try {
    const o = JSON.parse(b64urlDecode(String(code)))
    if (!o || typeof o.i !== 'string' || typeof o.m !== 'number') return null
    const name = String(o.n || '').slice(0, 20)
    if (o.k === 'd' && o.r && typeof o.r === 'object') {
      const results = {}
      for (const [g, a] of Object.entries(o.r)) { const u = unpack(a); if (u) results[g] = u }
      return { kind: 'day', id: o.i, name, matchday: o.m, points: o.p || 0, streak: o.s || 0, results }
    }
    if (o.k === 'g' && typeof o.g === 'string') {
      const r = unpack(o.r)
      return r ? { kind: 'game', id: o.i, name, matchday: o.m, game: o.g, results: { [o.g]: r } } : null
    }
  } catch { /* malformed */ }
  return null
}

// ── Rivals store ─────────────────────────────────────────────────────────────
export const loadRivals = () => loadJson(RIVALS_KEY, {}) || {}

export function receiveChallenge(ch) {
  if (!ch || ch.id === getMe().pub) return null // your own link
  const rivals = loadRivals()
  const r = rivals[ch.id] || { name: '', results: {}, seen: 0, first: Date.now() }
  if (ch.name) r.name = ch.name
  for (const [g, res] of Object.entries(ch.results)) r.results[`${ch.matchday}:${g}`] = res
  if (ch.kind === 'day') r.dayPts = { ...(r.dayPts || {}), [ch.matchday]: ch.points }
  r.seen = Date.now()
  rivals[ch.id] = r
  saveJson(RIVALS_KEY, rivals)
  saveJson(ACTIVE_KEY, { id: ch.id, matchday: ch.matchday, kind: ch.kind, game: ch.game || null, at: Date.now() })
  emit({ type: 'rivals' })
  return r
}

// Pick up ?c= from the current URL (once), then strip it so a refresh or a
// re-share doesn't carry someone else's challenge along.
export function consumeChallengeFromUrl() {
  if (typeof window === 'undefined') return null
  const url = new URL(window.location.href)
  const code = url.searchParams.get('c')
  if (!code) return null
  const ch = decodeChallenge(code)
  url.searchParams.delete('c')
  try { window.history.replaceState(window.history.state, '', url.pathname + (url.search || '') + url.hash) } catch { /* ignore */ }
  if (ch) receiveChallenge(ch)
  return ch
}

// The challenge to show now: the most recent one received in the last 3 days.
export function activeChallenge() {
  const a = loadJson(ACTIVE_KEY)
  if (!a || Date.now() - a.at > 3 * 86400000) return null
  const rival = loadRivals()[a.id]
  return rival ? { ...a, name: rival.name, rival } : null
}

export function dismissChallenge() {
  saveJson(ACTIVE_KEY, null)
  emit({ type: 'rivals' })
}

// Rival's result for a given matchday + game (from any link they've sent).
export function rivalResult(rivalId, matchday, game) {
  return loadRivals()[rivalId]?.results?.[`${matchday}:${game}`] || null
}

// Every rival's result for this matchday+game — for "vs your rivals" lines.
export function rivalsOn(matchday, game) {
  const out = []
  for (const [id, r] of Object.entries(loadRivals())) {
    const res = r.results?.[`${matchday}:${game}`]
    if (res) out.push({ id, name: r.name, result: res })
  }
  return out
}

// Head-to-head table: for each rival, W/D/L across every game you both played.
export function rivalTable() {
  const mine = new Map(loadLog().filter(r => r.g !== 'perfect').map(r => [`${r.m}:${r.g}`, r]))
  return Object.entries(loadRivals()).map(([id, r]) => {
    let w = 0, d = 0, l = 0, pending = 0
    for (const [key, theirs] of Object.entries(r.results || {})) {
      const me = mine.get(key)
      if (!me) { pending++; continue }
      const c = compareResults(me, theirs)
      if (c > 0) w++; else if (c < 0) l++; else d++
    }
    return { id, name: r.name || '?', w, d, l, pending, played: w + d + l, seen: r.seen }
  }).sort((a, b) => (b.w * 3 + b.d) - (a.w * 3 + a.d) || b.seen - a.seen)
}
