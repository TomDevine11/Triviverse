// Unfurl — the daily flag game. Data + rules, no UI.
//
// The day's flag sits under a 2×3 grid of six tiles. One tile is open at the start;
// every wrong guess opens another (in a fixed, seeded order) and scores the guess
// exactly like Borderline — great-circle distance, compass direction and proximity
// to the answer — so a wrong guess still tells you where to look. Six guesses.
//
// Flags: ./flags.generated.json (scripts/geography/build-flags.mjs) — official
// proportions, Wikimedia Commons via hampusborgos/country-flags, public domain.
// Answers are the shared geography pool, so names and codes match every game.
import flagData from './flags.generated.json'
import { COUNTRIES, mulberry32 } from './countries'
import { geoDay, GEO_EPOCH } from './day'

export { evaluate, shareRow, MAX_GUESSES } from './borderline'
export const TILES = 6
export const COLS = 3
export const ROWS = 2

export const flagOf = (code) => flagData.flags[code] || null
// Flags identical to another answer's (`same`) are never the answer — that would be a coin toss.
const POOL = COUNTRIES.filter(c => c.answer && flagData.flags[c.code] && !flagData.flags[c.code].same).map(c => c.code)
export const POOL_SIZE = POOL.length

function shuffle(list, seed) {
  const rnd = mulberry32(seed)
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Same flag for everyone each day; a seeded shuffle per cycle, its own seed so it
// never walks in step with Borderline.
export function dailyCode(day = geoDay()) {
  const n = day - GEO_EPOCH
  const cycle = Math.floor(n / POOL.length)
  return shuffle(POOL, 0xf1a6 + cycle * 7727)[((n % POOL.length) + POOL.length) % POOL.length]
}
export const puzzleNumber = (day = geoDay()) => day - GEO_EPOCH + 1
export function randomCode(exclude) {
  let c
  do { c = POOL[Math.floor(Math.random() * POOL.length)] } while (c === exclude && POOL.length > 1)
  return c
}

// The order the tiles open in for a given flag (stable per answer, so a refresh or a
// friend's screen shows the same tiles).
export function tileOrder(code) {
  let h = 0
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) | 0
  return shuffle([0, 1, 2, 3, 4, 5], 0x7113 ^ h)
}

// How many tiles are open: one to start, one more per wrong guess, all at the end.
export const openCount = (wrong, finished) => (finished ? TILES : Math.min(TILES, 1 + wrong))
