// Shared card logic for the OG service: decode the packed result, plus the
// Triviverse design tokens (mirrors the app's shareImage.js / accents.js).

export const SITE_URL = 'https://triviverse.com'

export const C = {
  canvas: '#0b0a14', canvasHigh: '#151024',
  primary: '#ecebf2', secondary: '#b9b8c6', muted: '#8c89a3', faint: '#57536e',
  brandBright: '#a78bfa', surface: '#16151f', borderStrong: '#2c2947',
}

// Tile char → colour. hit/near/miss (h/n/m) plus the four Connections tiers.
export const TILE = {
  h: '#22c55e', n: '#fbbf24', m: '#26243a',
  1: '#a3e635', 2: '#22d3ee', 3: '#eab308', 4: '#a78bfa',
}

// Per-game accent (the .bright value from the app).
export const ACCENT = {
  tenable: '#facc15', wordle: '#60a5fa', tictactoe: '#818cf8', teammates: '#f472b6',
  careers: '#22d3ee', wcsquads: '#fbbf24', connections: '#bef264', higherlower: '#fb923c', 501: '#f87171',
}

export const GAME_ROUTES = {
  501: '/501', wordle: '/wordle', tenable: '/tenable', tictactoe: '/tictactoe',
  teammates: '/teammates', connections: '/connections', careers: '/career-path',
  wcsquads: '/world-cup', higherlower: '/higher-or-lower',
}

// Reverse of the app's encodeCard (utf8-safe base64url).
export function decodeCard(r) {
  try {
    const b64 = (r || '').replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const p = JSON.parse(new TextDecoder().decode(bytes))
    if (!p || !p.g) return null
    return {
      gameId: String(p.g),
      title: String(p.t || ''),
      result: String(p.r || ''),
      matchday: p.m,
      challenge: p.c ? String(p.c) : '',
      rows: (p.R || []).map((s) => [...String(s)]), // each char → a tile
    }
  } catch { return null }
}
