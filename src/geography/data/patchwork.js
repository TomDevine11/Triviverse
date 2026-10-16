// Patchwork — restore the world map. Data + rules, no UI.
//
// The board is the shared world map (./world.js): every country drawn from one set
// of geometries. Each day seven countries are cut out; name one and its exact shape
// (every polygon, overseas parts included) returns in green. Find all seven to win.
// Six lives: wrong guesses are kept as misses, and the sixth miss ends the day.
//
// Daily pick: two from Africa, two from Europe, and one each from Asia, the Americas
// and Oceania (UN regions, from Natural Earth via countries.js), drawn from the shared
// answer pool minus micro-states too small to see on a world map. Each region walks
// through its own seeded shuffle, so a country doesn't come back until its region's
// list has been used up.
import { COUNTRIES, mulberry32 } from './countries'
import { shapeOf } from './world'
import { geoDay, GEO_EPOCH } from './day'

export const QUOTA = { Africa: 2, Europe: 2, Asia: 1, Americas: 1, Oceania: 1 }
export const MISSING = Object.values(QUOTA).reduce((a, b) => a + b, 0) // 7
export const MAX_MISSES = 6 // the sixth miss ends the puzzle — the daily's losing threshold
export const MISS_SLOTS = MAX_MISSES // result distribution: a win with 0 … 5 misses
const MIN_SIZE = 12 // world-map units across (4000 = the whole map) — smaller is a speck

const bySize = (code) => { const b = shapeOf(code)?.bb; return b ? Math.max(b[2] - b[0], b[3] - b[1]) : 0 }
const POOLS = Object.fromEntries(Object.keys(QUOTA).map(r => [
  r,
  COUNTRIES.filter(c => c.answer && c.r === r && shapeOf(c.code) && bySize(c.code) >= MIN_SIZE).map(c => c.code),
]))
export const poolSize = (region) => POOLS[region].length

function shuffle(list, seed) {
  const rnd = mulberry32(seed)
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Puzzle n (any integer): `quota` countries per region, no repeats within a cycle.
export function puzzleFor(n) {
  const out = []
  Object.entries(QUOTA).forEach(([region, q], ri) => {
    const pool = POOLS[region]
    const perCycle = Math.floor(pool.length / q)
    const cycle = Math.floor(n / perCycle)
    const k = ((n % perCycle) + perCycle) % perCycle
    out.push(...shuffle(pool, 0x9a7c + ri * 131 + cycle * 7919).slice(k * q, k * q + q))
  })
  return out
}

export const dailyMissing = (day = geoDay()) => puzzleFor(day - GEO_EPOCH)
export const puzzleNumber = (day = geoDay()) => day - GEO_EPOCH + 1
export const randomMissing = () => puzzleFor(1000 + Math.floor(Math.random() * 1_000_000))
export const puzzleSig = (missing) => missing.join('-')

// State after a list of guesses (codes, in order).
export function evaluatePatchwork(missing, guesses) {
  const target = new Set(missing)
  const restored = guesses.filter(g => target.has(g))
  const misses = guesses.filter(g => !target.has(g))
  const won = restored.length === missing.length
  return { restored, misses, won, lost: !won && misses.length >= MAX_MISSES }
}

export const SHARE = { hit: '🟩', miss: '🟥' }
