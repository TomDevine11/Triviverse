// Borderline — the daily country-silhouette game. Data + geography, no UI.
//
// Countries come from ./countries.js (Natural Earth, public domain). Each carries an ISO code, a display name, search
// aliases, the centre of its silhouette (spherical centroid of the drawn parts) and
// an SVG path in a 1000×1000 box. Only `answer` countries can be the daily target;
// every country can be guessed.
//
// Feedback, per guess:
//   • distance  — great-circle (haversine) distance between the two centres, km
//   • direction — rhumb-line bearing from the guess to the target, i.e. the compass
//                 heading you would read off an ordinary world map
//   • proximity — 100% at the target, falling linearly to 0% at the antipode
// Proximity says how CLOSE you are; the arrow says WHICH WAY. They are independent.

import { COUNTRIES, countryByCode, mulberry32 } from './countries'
import { geoDay, GEO_EPOCH } from './day'

export { BOX, COUNTRIES, countryByCode, searchCountries, resolveCountry } from './countries'
export const MAX_GUESSES = 6

const EARTH_RADIUS_KM = 6371.0088 // IUGG mean radius
export const HALF_EARTH_KM = Math.PI * EARTH_RADIUS_KM // ≈ 20,015 km, the farthest two points can be
const rad = (d) => (d * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

// Great-circle distance in km (haversine).
export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Rhumb-line bearing from a to b in degrees clockwise from north, [0, 360).
// Longitude difference takes the short way round, so Fiji → Samoa points east
// across the antimeridian rather than all the way west.
export function bearing(a, b) {
  let dLon = rad(b.lon - a.lon)
  if (Math.abs(dLon) > Math.PI) dLon = dLon > 0 ? dLon - 2 * Math.PI : dLon + 2 * Math.PI
  const clampLat = (l) => Math.max(-89.9, Math.min(89.9, l))
  const dPsi = Math.log(Math.tan(Math.PI / 4 + rad(clampLat(b.lat)) / 2) / Math.tan(Math.PI / 4 + rad(clampLat(a.lat)) / 2))
  return (deg(Math.atan2(dLon, dPsi)) + 360) % 360
}

// The nearest of the 8 compass points (N, NE, … NW).
export const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export const compassPoint = (b) => COMPASS[Math.round(b / 45) % 8]
const ARROWS = { N: '⬆️', NE: '↗️', E: '➡️', SE: '↘️', S: '⬇️', SW: '↙️', W: '⬅️', NW: '↖️' }

// 0–100, floored so only the answer itself shows 100%.
export function proximity(km) {
  return Math.max(0, Math.floor(((HALF_EARTH_KM - km) / HALF_EARTH_KM) * 100))
}

// Everything a guess row shows.
export function evaluate(guessCode, targetCode) {
  const g = countryByCode(guessCode), t = countryByCode(targetCode)
  if (!g || !t) return null
  if (g.code === t.code) return { code: g.code, km: 0, bearing: null, dir: null, pct: 100, win: true }
  const km = distanceKm(g, t)
  const b = bearing(g, t)
  return { code: g.code, km: Math.round(km), bearing: b, dir: compassPoint(b), pct: proximity(km), win: false }
}

// Share squares: proximity in fifths (🟩 = 20%, 🟨 = 10%, ⬜ = nothing), then the arrow.
export function shareRow(r) {
  if (r.win) return '🟩🟩🟩🟩🟩🎉'
  const tens = Math.floor(r.pct / 10)
  const squares = '🟩'.repeat(Math.floor(tens / 2)) + '🟨'.repeat(tens % 2)
  return squares.padEnd(10, '⬜').slice(0, 10) + ARROWS[r.dir]
}

// ── Daily selection ──────────────────────────────────────────────────────────
// The same country for everyone each day (midnight UK time). A seeded shuffle of the answer pool means no repeat until it runs out.
const POOL = COUNTRIES.filter(c => c.answer).map(c => c.code)

function shuffled(cycle) {
  const rnd = mulberry32(0xb0d3 + cycle * 7919)
  const a = [...POOL]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function dailyCode(day = geoDay()) {
  const n = day - GEO_EPOCH
  const cycle = Math.floor(n / POOL.length)
  const idx = ((n % POOL.length) + POOL.length) % POOL.length
  return shuffled(cycle)[idx]
}
export const puzzleNumber = (day = geoDay()) => day - GEO_EPOCH + 1

export function randomCode(exclude) {
  let c
  do { c = POOL[Math.floor(Math.random() * POOL.length)] } while (c === exclude && POOL.length > 1)
  return c
}
