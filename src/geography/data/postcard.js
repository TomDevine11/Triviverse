// Postcard — guess where a photograph was taken by dropping a pin. Data + rules, no UI.
//
// Content: ./postcards.generated.json, built by scripts/geography/build-postcards.mjs
// from Wikimedia Commons photos with verified free licences (see that script). Each
// entry carries a stable id, a local hashed WebP, the place's coordinates (from its
// Wikipedia article) and the photo's attribution.
//
// Scoring — one smooth curve of great-circle distance and nothing else:
//
//     score = round(5000 · e^(−km / 1500))        full 5,000 within 1 km
//
//   ≈ 4,970 at 10 km · 4,670 at 100 km · 3,580 at 500 km · 2,570 at 1,000 km
//   · 1,320 at 2,000 km · 180 at 5,000 km · 0 beyond ~13,000 km
//
// Distance is the haversine great circle (./borderline distanceKm), so it is right
// across the antimeridian and near the poles: longitude wraps by trigonometry, and
// no flat-map distance is ever used.
import data from './postcards.generated.json' with { type: 'json' }
import { distanceKm } from './borderline'
import { mulberry32 } from './countries'
import { geoDay, GEO_EPOCH } from './day'
import { project, WORLD_W } from './world'

export const SCORE_MAX = 5000
export const PASS_SCORE = 2500 // the single place the daily win threshold lives (≈1,040 km)
export const SCORE_SCALE_KM = 1500
export const SEGMENTS = 5 // share bar: one segment per 1,000 points

const IMG = /^\/geography\/postcards\/[0-9a-f]{12}\.webp$/
const okCoord = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 85 && Math.abs(lon) <= 180

// Only entries with real coordinates and a local photo can ever be picked.
export const POSTCARDS = data.postcards
  .filter(p => p.id && okCoord(p.lat, p.lon) && IMG.test(p.img) && p.name)
  .sort((a, b) => (a.id < b.id ? -1 : 1))
const BY_ID = new Map(POSTCARDS.map(p => [p.id, p]))
export const postcardById = (id) => BY_ID.get(id) || null

export function scoreFor(km) {
  if (!Number.isFinite(km) || km < 0) return 0
  if (km <= 1) return SCORE_MAX
  return Math.round(SCORE_MAX * Math.exp(-km / SCORE_SCALE_KM))
}

export const distanceBetween = ([lat1, lon1], [lat2, lon2]) => distanceKm({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 })

export function evaluateGuess(postcard, guess) {
  const km = distanceBetween(guess, [postcard.lat, postcard.lon])
  return { km, score: scoreFor(km) }
}

// ── The daily pick ────────────────────────────────────────────────────────────
// Every postcard once per cycle, in a seeded shuffle of the id-sorted library, so
// the order depends only on the ids and the day — never on the visitor. Neighbouring
// days are nudged apart so two photos from the same part of the world don't run
// back to back.
const zone = (p) => (p.lon < -30 ? 'americas' : p.lat < -10 && p.lon > 110 ? 'oceania' : p.lon > 60 ? 'asia' : p.lat < 36 ? 'africa-me' : 'europe')

function cycleOrder(cycle) {
  const rnd = mulberry32(0x5057 + cycle * 7919)
  const a = [...POSTCARDS]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  for (let i = 1; i < a.length; i++) {
    if (zone(a[i]) !== zone(a[i - 1])) continue
    const k = a.findIndex((p, j) => j > i && zone(p) !== zone(a[i - 1]))
    if (k > 0) [a[i], a[k]] = [a[k], a[i]]
  }
  return a
}

export function postcardFor(n) {
  const N = POSTCARDS.length
  const cycle = Math.floor(n / N)
  return cycleOrder(cycle)[((n % N) + N) % N]
}
export const dailyPostcard = (day = geoDay()) => postcardFor(day - GEO_EPOCH)
export const puzzleNumber = (day = geoDay()) => day - GEO_EPOCH + 1

// ── Presentation helpers ──────────────────────────────────────────────────────
export function formatKm(km) {
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km).toLocaleString('en-GB')} km`
}

export function formatCoord([lat, lon]) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`
}

// A word for the result, by score.
export function verdictKey(score) {
  return score >= 4950 ? 'bullseye' : score >= 4500 ? 'spotOn' : score >= 3500 ? 'great' : score >= 2000 ? 'good' : score >= 800 ? 'warmer' : 'far'
}

// Spoiler-free share bar: one square per 1,000 points — full, half (≥500) or empty.
export function shareBar(score) {
  return Array.from({ length: SEGMENTS }, (_, i) => {
    const left = score - i * 1000
    return left >= 1000 ? '🟩' : left >= 500 ? '🟨' : '⬛'
  }).join('')
}

// Stats distribution bucket (0–4) — 1,000-point bands.
export const bandOf = (score) => Math.min(SEGMENTS - 1, Math.floor(score / 1000))

// The great circle between two points as map-unit polylines, broken where it
// crosses the map's seam so no segment streaks across the whole world.
export function greatCircle([lat1, lon1], [lat2, lon2], steps = 96) {
  const r = Math.PI / 180
  const toV = (lat, lon) => [Math.cos(lat * r) * Math.cos(lon * r), Math.cos(lat * r) * Math.sin(lon * r), Math.sin(lat * r)]
  const a = toV(lat1, lon1), b = toV(lat2, lon2)
  const omega = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))
  const lines = [[]]
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    let v
    if (omega < 1e-9) v = a
    else {
      const s1 = Math.sin((1 - t) * omega) / Math.sin(omega), s2 = Math.sin(t * omega) / Math.sin(omega)
      v = [a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2]
    }
    const lat = Math.atan2(v[2], Math.hypot(v[0], v[1])) / r
    const lon = Math.atan2(v[1], v[0]) / r
    const pt = project(lat, lon)
    const line = lines[lines.length - 1]
    const prev = line[line.length - 1]
    if (prev && Math.abs(pt[0] - prev[0]) > WORLD_W / 2) lines.push([pt])
    else line.push(pt)
  }
  return lines.filter(l => l.length > 1)
}
