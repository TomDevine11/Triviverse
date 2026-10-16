// Milestone — history on the map: read a clue, drop a pin where it happened.
// Data + rules, no UI. Two modes share every rule here:
//   • Daily — the same five questions, in the same order, for everyone each day.
//     Up to 1,000 points each; PASS_SCORE out of 5,000 wins the day.
//   • Unlimited — one question after another from the library, today's daily
//     five held back so Unlimited can never spoil them.
//
// Content: ./milestones.generated.json, built by scripts/geography/build-milestones.mjs
// (answer coordinates checked against each site's Wikipedia article).
//
// Scoring — one curve for every question, tuned per question by its precision r:
//
//     score = 1000                                 within r km
//     score = round(1000 · e^(−(km − r) / s))      beyond, with s = 100 + 11·r km
//
//   r is small for a single site (12 km → s 232: ~650 at 110 km, ~130 at 480 km) and
//   larger for events spread over a region (40 km → s 540). Distance is the haversine
//   great circle, so it is correct across the antimeridian and near the poles.
import data from './milestones.generated.json' with { type: 'json' }
import { distanceKm } from './borderline'
import { mulberry32 } from './countries'
import { geoDay, GEO_EPOCH } from './day'

export const QUESTION_MAX = 1000
export const DAILY_SIZE = 5
export const DAILY_MAX = QUESTION_MAX * DAILY_SIZE
export const PASS_SCORE = 3500 // the single place the daily win threshold lives

const okCoord = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 85 && Math.abs(lon) <= 180
const okView = (v) => Array.isArray(v) && v.length === 3 && okCoord(v[0], v[1]) && v[2] >= 1

export const QUESTIONS = data.questions
  .filter(q => q.id && q.q && q.a && okCoord(q.lat, q.lon) && okView(q.view) && q.r > 0)
  .sort((a, b) => (a.id < b.id ? -1 : 1))
const BY_ID = new Map(QUESTIONS.map(q => [q.id, q]))
export const questionById = (id) => BY_ID.get(id) || null

export const decayKm = (r) => 100 + 11 * r

export function scoreFor(km, r) {
  if (!Number.isFinite(km) || km < 0) return 0
  if (km <= r) return QUESTION_MAX
  return Math.round(QUESTION_MAX * Math.exp(-(km - r) / decayKm(r)))
}

export function evaluate(question, guess) {
  const km = distanceKm({ lat: guess[0], lon: guess[1] }, { lat: question.lat, lon: question.lon })
  return { km, score: scoreFor(km, question.r) }
}

function shuffle(list, seed) {
  const rnd = mulberry32(seed)
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// ── Daily ─────────────────────────────────────────────────────────────────────
// Each cycle is a seeded shuffle of the id-sorted library, dealt five a day, so
// every question appears once before any repeats. Within a day the five run from
// easiest to hardest (stable for ties), and no day has two from the same category
// when it can be avoided.
const PER_CYCLE = Math.floor(QUESTIONS.length / DAILY_SIZE)

function cycleDeal(cycle) {
  const a = shuffle(QUESTIONS, 0x4d1e + cycle * 7919)
  for (let start = 0; start + DAILY_SIZE <= a.length; start += DAILY_SIZE) {
    for (let i = start + 1; i < start + DAILY_SIZE; i++) {
      const seen = new Set(a.slice(start, i).map(q => q.cat))
      if (!seen.has(a[i].cat)) continue
      const k = a.findIndex((q, j) => j >= start + DAILY_SIZE && !seen.has(q.cat))
      if (k > 0) [a[i], a[k]] = [a[k], a[i]]
    }
  }
  return a
}

export function dailySetFor(n) {
  const cycle = Math.floor(n / PER_CYCLE)
  const k = ((n % PER_CYCLE) + PER_CYCLE) % PER_CYCLE
  return cycleDeal(cycle).slice(k * DAILY_SIZE, k * DAILY_SIZE + DAILY_SIZE)
    .map((q, i) => ({ q, i })).sort((a, b) => a.q.d - b.q.d || a.i - b.i).map(x => x.q)
}
export const dailySet = (day = geoDay()) => dailySetFor(day - GEO_EPOCH)
export const puzzleNumber = (day = geoDay()) => day - GEO_EPOCH + 1
export const dailySig = (set) => set.map(q => q.id).join(',')

// ── Unlimited ─────────────────────────────────────────────────────────────────
// A session walks a seeded shuffle of the library minus today's daily five; when
// it runs out, the next lap reshuffles, never starting with the question just seen.
export function unlimitedQueue(seed, exclude = []) {
  const skip = new Set(exclude)
  return shuffle(QUESTIONS.filter(q => !skip.has(q.id)), seed)
}

export function unlimitedAt(seed, index, exclude = []) {
  const base = QUESTIONS.length - new Set(exclude).size
  const lap = Math.floor(index / base)
  const queue = unlimitedQueue(seed + lap * 104729, exclude)
  if (lap > 0) {
    const prevLast = unlimitedQueue(seed + (lap - 1) * 104729, exclude)[base - 1]
    if (queue[0].id === prevLast.id) [queue[0], queue[1]] = [queue[1], queue[0]]
  }
  return queue[index % base]
}

// ── Presentation ──────────────────────────────────────────────────────────────
export const square = (score) => (score >= 800 ? '🟩' : score >= 500 ? '🟨' : score >= 200 ? '🟧' : '🟥')
export const tierOf = (score) => (score >= 800 ? 'great' : score >= 500 ? 'good' : score >= 200 ? 'fair' : 'far')
export const formatYear = (y) => (y < 0 ? `${-y} BCE` : y < 1000 ? `${y} CE` : String(y))
