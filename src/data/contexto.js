// Football Contexto — guess the hidden player; every guess comes back with its
// RANK in a list of players ordered by how closely they are associated with the
// target. Rank 1 is the player themselves. Rank 3,000 means you are nowhere.
//
// Unlike every other game here, this one needs a SIMILARITY RELATION over
// players rather than membership of a category. The basis is the Transfermarkt
// club-season rosters (player × team × season) that already back 501 and the
// teammates game, reduced at build time by scripts/build-contexto.mjs into
// contexto.generated.json.
//
// What makes two footballers feel related, in the order that matters:
//   • they played in the same team in the same season — literal teammates, and
//     by far the strongest signal a fan actually feels
//   • they played for the same club in different eras
//   • they were around at the same time, in the same competitions
//   • nationality, then position
//
// The weights below are deliberately steep. A single shared season as teammates
// outranks any amount of "both were Brazilian midfielders", because that is how
// association works to a human: Fernandinho's nearest players should be the
// Manchester City side he played in, not every defensive midfielder from Brazil.
// Checked against that exact case — the top of his list is Agüero, De Bruyne,
// Silva, Sterling, Gündoğan, and then Darijo Srna from his Shakhtar years.

import data from './contexto.generated.json'

export const POOL = data.players
export const POOL_SIZE = POOL.length
export const TEAM_NAMES = data.teamNames
export const AS_OF = data.meta?.generatedAt || ''

const BY_ID = new Map(POOL.map(p => [p.i, p]))
export const getPoolPlayer = (id) => BY_ID.get(id) || null
export const isInPool = (id) => BY_ID.has(id)

// A target has to be someone whose neighbours mean something: well known, and
// with enough of a career in the data that the list around them is real.
const TARGET_MIN_FAME = 55
const TARGET_MIN_SEASONS = 6
const TARGETS = POOL.filter(p => p.f >= TARGET_MIN_FAME && p.ts.length >= TARGET_MIN_SEASONS)
export const TARGET_COUNT = TARGETS.length

const W = {
  teammateSeason: 100,  // same team, same season
  sharedClub: 30,       // same club, any era
  sharedComp: 6,        // same competition
  eraSeason: 4,         // capped — being contemporaries is context, not closeness
  nationality: 12,
  position: 5,
}
const ERA_CAP = 10

// Both arrays are short (7 team-seasons on average) and pre-sorted, so a plain
// scan beats building a Set per comparison across 5,000 candidates.
function intersectionSize(a, b) {
  let i = 0, j = 0, n = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { n++; i++; j++ }
    else if (a[i] < b[j]) i++
    else j++
  }
  return n
}

function eraOverlap(a, b) {
  if (a.y[0] == null || b.y[0] == null) return 0
  return Math.max(0, Math.min(a.y[1], b.y[1]) - Math.max(a.y[0], b.y[0]) + 1)
}

export function similarity(target, other) {
  return W.teammateSeason * intersectionSize(target.ts, other.ts)
    + W.sharedClub * intersectionSize(target.tm, other.tm)
    + W.sharedComp * intersectionSize(target.c, other.c)
    + W.eraSeason * Math.min(eraOverlap(target, other), ERA_CAP)
    + (target.nat && target.nat === other.nat ? W.nationality : 0)
    + (target.pos && target.pos === other.pos ? W.position : 0)
    // Famous players edge ahead of equally-associated unknowns, so the top of a
    // list reads like names rather than squad filler. Small enough never to
    // outweigh a real connection.
    + (other.f || 0) / 50
}

// The ranked list for one target. Built once per game — 5,000 comparisons of
// short arrays, a few milliseconds — then every guess is a Map lookup.
export function createBoard(target) {
  const scored = new Array(POOL.length)
  for (let i = 0; i < POOL.length; i++) {
    const p = POOL[i]
    scored[i] = { p, s: p.i === target.i ? Infinity : similarity(target, p) }
  }
  // Ties broken by name so the ranking is stable across reloads and devices.
  scored.sort((a, b) => b.s - a.s || a.p.n.localeCompare(b.p.n))

  const ranks = new Map()
  for (let i = 0; i < scored.length; i++) ranks.set(scored[i].p.i, i + 1)

  return {
    target,
    size: scored.length,
    rankOf: (id) => ranks.get(id) ?? null,
    nearest: (n = 10) => scored.slice(1, n + 1).map(x => ({ ...x.p, rank: ranks.get(x.p.i) })),
  }
}

// Why a guess landed where it did — shown on the board and in the result card,
// because a rank with no explanation teaches the player nothing.
export function relation(target, other) {
  const sharedSeasons = intersectionSize(target.ts, other.ts)
  const sharedClubIds = target.tm.filter(t => other.tm.includes(t))
  const clubLabel = sharedClubIds.map(id => TEAM_NAMES[id]).filter(Boolean)[0] || null
  if (sharedSeasons > 0 && clubLabel) return { kind: 'teammate', club: clubLabel, seasons: sharedSeasons }
  if (clubLabel) return { kind: 'club', club: clubLabel }
  if (target.nat && target.nat === other.nat) return { kind: 'nationality', value: target.nat }
  if (intersectionSize(target.c, other.c) > 0) return { kind: 'era' }
  return { kind: 'none' }
}

function seededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

export function getContextoForDay(dayIndex) {
  const rng = seededRandom(dayIndex * 7919 + 13)
  // Walk a seeded offset so consecutive days are unrelated rather than adjacent
  // in the fame-sorted pool.
  const pick = TARGETS[Math.floor(rng() * TARGETS.length)]
  return { target: pick, dayIndex }
}

export function getRandomContexto() {
  return getContextoForDay(Math.floor(Math.random() * 100000) + 500000)
}
