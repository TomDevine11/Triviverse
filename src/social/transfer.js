// Move your stats between devices (work desktop ↔ phone) without an account.
// Everything in the ftg- namespace is packed into one compressed code; opening
// the link on another device restores it. With the social API up, the code is
// parked server-side for 24h behind a short 6-character key instead.
//
// Import merges rather than blindly overwriting: the results log and rivals are
// unioned, per-game counters keep whichever side has played more.

import { ownedKeys, loadJson, saveJson, emit } from './store'

const TRANSFER_VERSION = 1

function b64url(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)
  const bin = atob(b64)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}
const canCompress = () => typeof CompressionStream !== 'undefined'

export function snapshot() {
  const data = {}
  for (const k of ownedKeys()) {
    if (k === 'ftg-progress-v1') continue // half-played rounds stay on their device
    data[k] = loadJson(k)
  }
  return { v: TRANSFER_VERSION, at: Date.now(), data }
}

export async function exportCode() {
  const json = new TextEncoder().encode(JSON.stringify(snapshot()))
  if (canCompress()) return 'z' + b64url(await pipe(json, new CompressionStream('deflate-raw')))
  return 'j' + b64url(json)
}

export async function decodeCode(code) {
  const kind = code[0]
  const bytes = fromB64url(code.slice(1))
  const raw = kind === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes
  const snap = JSON.parse(new TextDecoder().decode(raw))
  if (!snap || snap.v !== TRANSFER_VERSION || typeof snap.data !== 'object') throw new Error('bad code')
  return snap
}

const unionBy = (a = [], b = [], key) => {
  const m = new Map()
  for (const r of [...a, ...b]) m.set(key(r), { ...(m.get(key(r)) || {}), ...r })
  return [...m.values()]
}

// Apply a snapshot. Returns a short summary for the confirmation toast.
export function applySnapshot(snap) {
  const incoming = snap.data || {}
  let games = 0
  for (const [k, val] of Object.entries(incoming)) {
    const mine = loadJson(k)
    let next = val
    if (k === 'ftg-log-v1') {
      next = unionBy(mine || [], val || [], r => `${r.d}:${r.g}`).sort((a, b) => a.d - b.d)
      games = next.filter(r => r.g !== 'perfect').length
    } else if (k === 'ftg-rivals-v1') {
      next = { ...(mine || {}) }
      for (const [id, r] of Object.entries(val || {})) {
        next[id] = { ...(next[id] || {}), ...r, results: { ...(next[id]?.results || {}), ...(r.results || {}) } }
      }
    } else if (k === 'ftg-stats-v1') {
      next = { ...(mine || {}) }
      for (const [g, s] of Object.entries(val || {})) if (!next[g] || (s?.played || 0) > (next[g]?.played || 0)) next[g] = s
    } else if (k === 'ftg-badges-v1') {
      next = { ...(val || {}), ...(mine || {}) }
    }
    // Everything else (identity included — leagues follow you) takes the incoming value.
    saveJson(k, next)
  }
  emit({ type: 'import' })
  return { games }
}
