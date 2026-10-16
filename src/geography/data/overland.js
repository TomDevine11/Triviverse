// Overland — connect two countries by land. Data + graph logic, no UI.
//
// The board is the land-border graph from ./countries.js (`n`: neighbours sharing a
// land border in Natural Earth; overseas territories don't count, exclaves do).
// A puzzle is a start and a destination; the player names countries, in any order,
// until the named countries link the two by land.
//
// Every guess is coloured by how far off a shortest route it is:
//   detour(c) = hops(start → c) + hops(c → end) − hops(start → end)
//   0 → green (on a shortest route) · 1 → yellow · 2 → orange · more, or no land
//   connection at all → red
// Guesses allowed = the shortest route's country count + 4. Three hints, each once:
// the next country's outline, every border on the map, the route's initials.

import { COUNTRIES, countryByCode, mulberry32 } from './countries'
import { geoDay, GEO_EPOCH } from './day'

export const EXTRA_GUESSES = 4
export const HINTS = ['next', 'outlines', 'initials']

const ADJ = new Map(COUNTRIES.map(c => [c.code, c.n || []]))
export const neighbours = (code) => ADJ.get(code) || []
export const borders = (a, b) => neighbours(a).includes(b)

// Hop counts from one country to every country reachable by land.
const HOPS = new Map()
export function hopsFrom(code) {
  if (HOPS.has(code)) return HOPS.get(code)
  const dist = new Map([[code, 0]])
  const queue = [code]
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]
    for (const n of neighbours(c)) if (!dist.has(n)) { dist.set(n, dist.get(c) + 1); queue.push(n) }
  }
  HOPS.set(code, dist)
  return dist
}

// Countries strictly between start and end on a shortest route.
export const par = (start, end) => hopsFrom(start).get(end) - 1
export const maxGuesses = (start, end) => par(start, end) + EXTRA_GUESSES

export function detour(code, start, end) {
  const a = hopsFrom(start).get(code), b = hopsFrom(end).get(code), best = hopsFrom(start).get(end)
  return a == null || b == null ? Infinity : a + b - best
}
export const TIERS = ['green', 'yellow', 'orange', 'red']
export const tierOf = (code, start, end) => TIERS[Math.min(3, detour(code, start, end))]

// The cheapest way to finish from here: the route start → end that needs the fewest
// countries not yet named, and among those the fewest hops (so hints and progress
// slots always follow a genuinely short route). Dijkstra with a lexicographic
// weight: an unnamed country costs 1000, a named one 1. Returns the full chain.
const UNNAMED = 1000
export function bestRoute(start, end, named) {
  const cost = new Map([[start, 0]])
  const prev = new Map()
  const done = new Set()
  const open = new Set([start])
  while (open.size) {
    let c = null
    for (const o of open) if (c === null || cost.get(o) < cost.get(c) || (cost.get(o) === cost.get(c) && o < c)) c = o
    open.delete(c)
    if (c === end) break
    done.add(c)
    for (const n of neighbours(c)) {
      if (done.has(n)) continue
      const nc = cost.get(c) + (n === end || named.has(n) ? 1 : UNNAMED)
      if (!cost.has(n) || nc < cost.get(n)) { cost.set(n, nc); prev.set(n, c); open.add(n) }
    }
  }
  if (!prev.has(end)) return null
  const path = [end]
  while (path[0] !== start) path.unshift(prev.get(path[0]))
  return path
}

// Are start and end linked through named countries alone?
export function connected(start, end, named) {
  const seen = new Set([start])
  const queue = [start]
  for (let i = 0; i < queue.length; i++) {
    for (const n of neighbours(queue[i])) {
      if (n === end) return true
      if (named.has(n) && !seen.has(n)) { seen.add(n); queue.push(n) }
    }
  }
  return false
}

// The winning chain once connected (shortest path through named countries only).
export function namedRoute(start, end, named) {
  const prev = new Map([[start, null]])
  const queue = [start]
  for (let i = 0; i < queue.length; i++) {
    for (const n of neighbours(queue[i])) {
      if (prev.has(n) || (n !== end && !named.has(n))) continue
      prev.set(n, queue[i])
      if (n === end) { const p = [end]; while (prev.get(p[0])) p.unshift(prev.get(p[0])); return p }
      queue.push(n)
    }
  }
  return null
}

// Everything the board needs after a list of guesses.
export function evaluateGame(start, end, guesses) {
  const named = new Set(guesses)
  const rows = guesses.map(code => ({ code, tier: tierOf(code, start, end) }))
  const won = connected(start, end, named)
  const max = maxGuesses(start, end)
  const lost = !won && guesses.length >= max
  const best = bestRoute(start, end, named)
  return { rows, won, lost, max, par: par(start, end), best, route: won ? namedRoute(start, end, named) : null, left: max - guesses.length }
}

export const SHARE_TILE = { green: '🟩', yellow: '🟨', orange: '🟧', red: '🟥' }

// ── Daily puzzle ─────────────────────────────────────────────────────────────
// Endpoints come from the recognisable answer pool; the shortest route has 2–6
// countries in between. Seeded shuffle per cycle, so no pair repeats in a cycle.
const ENDPOINTS = COUNTRIES.filter(c => c.answer && c.n?.length).map(c => c.code)
const PAIRS = []
for (let i = 0; i < ENDPOINTS.length; i++) {
  for (let j = i + 1; j < ENDPOINTS.length; j++) {
    const p = hopsFrom(ENDPOINTS[i]).get(ENDPOINTS[j])
    if (p != null && p - 1 >= 2 && p - 1 <= 6) PAIRS.push([ENDPOINTS[i], ENDPOINTS[j]])
  }
}
export const PAIR_COUNT = PAIRS.length

function pairsFor(cycle) {
  const rnd = mulberry32(0x0e1a + cycle * 104729)
  const a = PAIRS.map(p => [...p])
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a.map(p => (rnd() < 0.5 ? p : [p[1], p[0]]))
}

export function dailyPair(day = geoDay()) {
  const n = day - GEO_EPOCH
  const cycle = Math.floor(n / PAIRS.length)
  return pairsFor(cycle)[((n % PAIRS.length) + PAIRS.length) % PAIRS.length]
}
export const puzzleNumber = (day = geoDay()) => day - GEO_EPOCH + 1

export function randomPair() {
  const p = PAIRS[Math.floor(Math.random() * PAIRS.length)]
  return Math.random() < 0.5 ? p : [p[1], p[0]]
}

export const pairSig = ([a, b]) => `${a}-${b}`
export const nameOf = (code) => countryByCode(code)?.name || code
