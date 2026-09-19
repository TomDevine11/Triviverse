// Football Bingo — a 3x4 card of category squares. Players are dealt one at a
// time and you place each into a square whose category they satisfy. A wrong
// placement costs a life; filling all twelve squares is a bingo.
//
// The mechanic is the INVERSE of TicTacToe: there you are given a square and
// must supply a player, here you are given a player and must choose the square.
// That flips where the difficulty sits — knowing who someone is matters less
// than knowing everything they qualify for, because a player who fits three
// squares can only fill one and spending him on the wrong one strands another.
//
// All membership is DERIVED from the canonical facts, exactly as TicTacToe and
// Connections do. Two sets are used, and the distinction is what keeps the game
// fair:
//   • STAR set (fame >= STAR_FAME) — used to BUILD the deal, so every player
//     dealt is someone a fan can reasonably be expected to know. Same threshold
//     Connections uses.
//   • BROAD set — used to VALIDATE a placement, so a square is accepted whenever
//     the player genuinely qualifies, even via a spell the star set ignores.
//
// Solvability is guaranteed by construction: the deal is built FROM the card,
// two qualifying players per square, so a perfect game always exists. The slack
// (the second candidate) is deliberate — it means one greedy mistake does not
// necessarily kill the card, but three do.

import { membersOf, getPlayer, CATEGORY_KEYS } from './canonical/facts.js'

export const COLS = 3
export const ROWS = 4
export const CARD_SIZE = COLS * ROWS   // 12
export const MAX_LIVES = 3
export const MAX_SKIPS = 3

// Same threshold Connections uses for "genuinely well-known".
const STAR_FAME = 48
// A square is only usable if it has this many stars to draw on, so the deal is
// never forced onto the obscure tail of a thin category.
const MIN_STARS = 6
// Candidates dealt per square. Two gives the card slack without doubling length.
const PER_SQUARE = 2
// Leagues are enormous (Premier League alone has ~944 recognisable members), so
// almost any player satisfies one. More than a single league square and the card
// stops asking a real question.
const MAX_LEAGUE_SQUARES = 1

const ALL_CATEGORIES = [
  ...CATEGORY_KEYS.clubs.map(v => ({ type: 'club', value: v })),
  ...CATEGORY_KEYS.leagues.map(v => ({ type: 'league', value: v })),
  ...CATEGORY_KEYS.nationalities.map(v => ({ type: 'nationality', value: v })),
  ...CATEGORY_KEYS.trophies.map(v => ({ type: 'trophy', value: v })),
]

// `t` is an optional translator (from useI18n); without it, falls back to
// English. Mirrors tictactoe.categoryLabel so the two games read alike.
export function categoryLabel(category, t) {
  const { type, value } = category
  if (t && ['club', 'league', 'nationality', 'trophy'].includes(type)) {
    return t(`bingo.cat.${type}`, { value })
  }
  switch (type) {
    case 'club': return `Played for ${value}`
    case 'league': return `Played in the ${value}`
    case 'nationality': return `${value} international`
    case 'trophy': return `Won the ${value}`
    default: return value
  }
}

// Short form for the square face — the full sentence does not fit twelve times
// on a phone, and the type is already carried by the square's icon.
export function categoryShort(category) {
  return category.type === 'league' ? category.value : category.value
}

function seededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}
function shuffle(array, rng) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

const starsOf = (cat) => [...membersOf(cat)]
  .map(id => getPlayer(id))
  .filter(p => p && p.fame >= STAR_FAME)
  .sort((a, b) => b.fame - a.fame)

// Does a player qualify for a square? Broad membership — the forgiving set.
export function qualifies(playerId, square) {
  return membersOf(square).has(playerId)
}

// Pick CARD_SIZE categories that each have enough stars, with the league cap applied.
function pickSquares(rng) {
  const pool = shuffle(ALL_CATEGORIES, rng)
  const squares = []
  let leagues = 0
  for (const cat of pool) {
    if (squares.length === CARD_SIZE) break
    if (cat.type === 'league' && leagues >= MAX_LEAGUE_SQUARES) continue
    if (starsOf(cat).length < MIN_STARS) continue
    if (cat.type === 'league') leagues++
    squares.push(cat)
  }
  return squares.length === CARD_SIZE ? squares : null
}

// Build the deal from the card: PER_SQUARE stars per square, deduped (a player
// who covers two squares is dealt once and can only be spent once — that is the
// game), then shuffled so the order gives nothing away.
function buildDeal(squares, rng) {
  const seen = new Set()
  const deal = []
  for (let round = 0; round < PER_SQUARE; round++) {
    for (const square of squares) {
      const candidate = shuffle(starsOf(square).slice(0, 14), rng).find(p => !seen.has(p.id))
      if (!candidate) continue
      seen.add(candidate.id)
      deal.push(candidate)
    }
  }
  return shuffle(deal, rng).map(p => ({
    id: p.id,
    name: p.displayName,
    // Every square this player can legally fill — computed once so the UI never
    // has to touch the fact tables mid-game.
    fits: squares.reduce((acc, sq, i) => (qualifies(p.id, sq) ? [...acc, i] : acc), []),
  }))
}

export function getBingoForDay(dayIndex) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = seededRandom(dayIndex * 7919 + attempt + 1)
    const squares = pickSquares(rng)
    if (!squares) continue
    const deal = buildDeal(squares, rng)
    // Every square must be reachable by at least one dealt player, or the card
    // is unwinnable however well it is played.
    const covered = new Set(deal.flatMap(d => d.fits))
    if (covered.size !== CARD_SIZE) continue
    if (deal.length < CARD_SIZE) continue
    return {
      squares: squares.map(sq => ({ ...sq, label: categoryLabel(sq), short: categoryShort(sq) })),
      deal,
      dayIndex,
    }
  }
  throw new Error('Could not generate a Football Bingo card')
}

export function getRandomBingo() {
  return getBingoForDay(Math.floor(Math.random() * 100000) + 100000)
}
