// Build the share URL that unfurls into the result image.
//
// The whole result "fixture card" is captured in the card object, so we pack it
// into the URL itself (no backend/storage). A separate free OG service (see
// og-service/) reads it, renders the image, and 302s human clicks into the game.
//
// Configure VITE_OG_HOST (e.g. https://share.triviverse.com) to turn this on.
// Without it, buildShareUrl falls back to the plain game link, so sharing keeps
// working (just previewing the generic game card, not the result).

import { GAME_ROUTES, TILE } from './shareImage'
import { SITE_URL } from './site'

const OG_HOST = (import.meta.env.VITE_OG_HOST || '').replace(/\/$/, '')
export const OG_ENABLED = !!OG_HOST

// Tile colour → single char. hit/near/miss for most games, plus the four
// Connections group tiers so its colour grid survives in the share image.
const HEX_TO_CH = {
  [TILE.hit]: 'h', [TILE.near]: 'n', [TILE.miss]: 'm',
  '#a3e635': '1', '#22d3ee': '2', '#eab308': '3', '#a78bfa': '4',
}

function b64url(str) {
  const b64 = btoa(unescape(encodeURIComponent(str))) // utf8-safe
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Compact, URL-safe encoding of the fixture card.
export function encodeCard(card) {
  const payload = {
    g: card.gameId,
    t: card.title,
    r: card.result,
    m: card.matchday,
    ...(card.challenge ? { c: card.challenge } : {}),
    ...(card.rows?.length ? { R: card.rows.map(row => row.map(c => HEX_TO_CH[c] || 'm').join('')) } : {}),
  }
  return b64url(JSON.stringify(payload))
}

// The share link. With an OG host configured it previews the RESULT and sends
// clicks into the game; otherwise it's just the game link.
export function buildShareUrl(card) {
  const route = GAME_ROUTES[card?.gameId] || ''
  if (!OG_HOST || !card) return SITE_URL + route
  return `${OG_HOST}/s/${card.gameId}?r=${encodeCard(card)}`
}

// ── "My matchday" day-recap card ─────────────────────────────────────────────
// day = { matchday, dailyPoints, weeklyPoints, dayStreak, won }
export function encodeDay(day) {
  return b64url(JSON.stringify({ m: day.matchday, p: day.dailyPoints, w: day.weeklyPoints, s: day.dayStreak, n: day.won }))
}

// Link that unfurls into the day-recap image and opens the hub. Falls back to
// the plain site link when no OG host is configured.
export function buildDayShareUrl(day) {
  if (!OG_HOST) return SITE_URL
  return `${OG_HOST}/s/day?r=${encodeDay(day)}`
}
