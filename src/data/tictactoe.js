// Football TicTacToe — daily 3x3 grid where each row/column is a category.
// To fill a cell, name a player who satisfies BOTH the row and column category.
//
// All membership is DERIVED from the canonical facts (src/data/canonical/*),
// which merge curated data with sourced Wikidata/Wikipedia imports. Two sets
// are used per category:
//   • NOTABLE set — famous players; used to GENERATE and reveal grids so the
//     daily puzzle is always star-studded.
//   • BROAD set — every sourced player; used to VALIDATE a guess, so any real
//     player who genuinely fits is accepted (the fix for the false-rejection
//     bug class). Categories: club, league (derived), nationality, trophy.
//     Managers are intentionally not used (can't be sourced reliably).

import { membersOf, notableMembersOf, getPlayer, CATEGORY_KEYS } from './canonical/facts.js'
import { resolveAgainst, normalize } from './canonical/resolve.js'
import { matchdayIndex } from '../utils/matchday.js'

export { CLUB_LEAGUE } from './canonical/facts.js'

// --- Category model -------------------------------------------------------

function buildCategories() {
  const categories = []
  for (const club of CATEGORY_KEYS.clubs) categories.push({ type: 'club', value: club })
  for (const league of CATEGORY_KEYS.leagues) categories.push({ type: 'league', value: league })
  for (const nat of CATEGORY_KEYS.nationalities) categories.push({ type: 'nationality', value: nat })
  for (const trophy of CATEGORY_KEYS.trophies) categories.push({ type: 'trophy', value: trophy })
  return categories
}

export const CATEGORIES = buildCategories()

// `t` is an optional translator (from useI18n). When provided, the label is
// localized via the tictactoe.cat.* templates; without it, falls back to English.
export function categoryLabel(category, t) {
  const { type, value } = category
  if (t && ['club', 'league', 'nationality', 'manager', 'trophy'].includes(type)) {
    return t(`tictactoe.cat.${type}`, { value })
  }
  switch (type) {
    case 'club': return `Played for ${value}`
    case 'league': return `Played in the ${value}`
    case 'nationality': return `${value} international`
    case 'manager': return `Played under ${value}`
    case 'trophy': return `Won the ${value}`
    default: return ''
  }
}

const namesOf = set => [...set].map(id => getPlayer(id)?.displayName).filter(Boolean)

// Intersect two id-sets (iterate the smaller).
function intersectIds(a, b) {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  const out = new Set()
  for (const id of small) if (large.has(id)) out.add(id)
  return out
}

function notableCandidates(rowCat, colCat) {
  return namesOf(intersectIds(notableMembersOf(rowCat), notableMembersOf(colCat)))
}
// Every valid player for the cell, most famous first — used for validation and
// for the "view all answers" reveal once a game ends.
function broadCandidates(rowCat, colCat) {
  const ids = [...intersectIds(membersOf(rowCat), membersOf(colCat))]
  ids.sort((a, b) => (getPlayer(b)?.fame || 0) - (getPlayer(a)?.fame || 0))
  return ids.map(id => getPlayer(id)?.displayName).filter(Boolean)
}

// --- Solvability check (System of Distinct Representatives) ---------------

const MIN_CANDIDATES = 2 // every cell must have ≥2 NOTABLE answers

function solveNotable(rowCats, colCats) {
  const cells = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const candidates = notableCandidates(rowCats[r], colCats[c])
      if (candidates.length < MIN_CANDIDATES) return null
      cells.push(candidates)
    }
  }
  const order = cells.map((_, i) => i).sort((a, b) => cells[a].length - cells[b].length)
  const used = new Set()
  function backtrack(idx) {
    if (idx === 9) return true
    const cellIdx = order[idx]
    for (const name of cells[cellIdx]) {
      if (used.has(name)) continue
      used.add(name)
      if (backtrack(idx + 1)) return true
      used.delete(name)
    }
    return false
  }
  return backtrack(0) ? cells : null
}

// --- Deterministic daily selection -----------------------------------------

function seededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return function next() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}
function shuffle(array, rng) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Generate the grid for a given day index. The grid is solved over the NOTABLE
// set (a famous 9-player solution must exist, every cell ≥ MIN_CANDIDATES
// notable answers); the BROAD intersections are stored as `candidates` for
// lenient validation, and the NOTABLE intersections as `reveal` for give-up
// examples. Pure (no Date) for testing across many days.
export function getGridForDay(dayIndex) {
  for (let attempt = 0; attempt < 1500; attempt++) {
    const rng = seededRandom(dayIndex * 9973 + attempt + 1)
    const shuffled = shuffle(CATEGORIES, rng)
    const rowCats = shuffled.slice(0, 3)
    const colCats = shuffled.slice(3, 6)
    if (rowCats.some(r => colCats.some(c => r.type === c.type && r.value === c.value))) continue

    const reveal = solveNotable(rowCats, colCats)
    if (!reveal) continue

    const candidates = []
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) candidates.push(broadCandidates(rowCats[r], colCats[c]))

    return { rowCategories: rowCats, colCategories: colCats, candidates, reveal, dayIndex }
  }
  throw new Error('Could not generate a valid Football TicTacToe grid')
}

export function getDailyGrid() {
  const dayIndex = matchdayIndex() // UK-time matchday, the same for every visitor
  return getGridForDay(dayIndex)
}

// Build a grid from explicitly chosen categories (1v1 "build your own"). No
// solvability gate — the builder UI shows each cell's candidate count so players
// can avoid empty pairings themselves. `candidates` = every valid player per
// cell (validation), `reveal` = famous examples (give-up).
export function buildGrid(rowCats, colCats) {
  const candidates = []
  const reveal = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      candidates.push(broadCandidates(rowCats[r], colCats[c]))
      reveal.push(notableCandidates(rowCats[r], colCats[c]))
    }
  }
  return { rowCategories: rowCats, colCategories: colCats, candidates, reveal }
}

// A fresh random (but still fully solvable) grid — used for replayable modes
// like local 1v1, where each match should get a different board.
export function getRandomGrid() {
  return getGridForDay(100000 + Math.floor(Math.random() * 1e9))
}

// --- Guess resolution -------------------------------------------------------

export function normalizeName(str) { return normalize(str) }

// Validate a guess against the cell's BROAD candidate set (accept any real
// player who fits, not just the intended one). Backed by the shared resolver.
export function resolveGuess(guessText, candidateNames, usedNames) {
  return resolveAgainst(guessText, candidateNames, usedNames)
}

// Find one distinct-player assignment across cell candidate lists, skipping
// `exclude`. Used to reveal example answers (callers pass the NOTABLE `reveal`
// lists so examples are famous).
export function findAssignment(cellsCandidates, exclude = new Set()) {
  const n = cellsCandidates.length
  const pools = cellsCandidates.map(list => list.filter(name => !exclude.has(name)))
  const order = pools.map((_, i) => i).sort((a, b) => pools[a].length - pools[b].length)
  const used = new Set()
  const assignment = new Array(n).fill(null)
  function backtrack(idx) {
    if (idx === n) return true
    const cellIdx = order[idx]
    for (const name of pools[cellIdx]) {
      if (used.has(name)) continue
      used.add(name); assignment[cellIdx] = name
      if (backtrack(idx + 1)) return true
      used.delete(name); assignment[cellIdx] = null
    }
    return false
  }
  return backtrack(0) ? assignment : null
}
