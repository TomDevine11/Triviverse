// "Higher or Lower" — compare two footballers on a real stat:
//   • career goals / appearances in the Premier League, La Liga, Serie A, the
//     Bundesliga, Ligue 1 and the Champions League, international goals / caps
//   • club totals ("Premier League goals for Arsenal")
//   • single-season bests ("most Premier League goals in a season")
//   • record transfer fee, inflated to today's money
//
// Pools come from src/data/higherlower.generated.json (scripts/build-leaderboards.mjs):
// per stat, every player who clears that stat's floor AND is either recognisable
// (fame ≥ 55), a record-holder or a major-honour winner. The client only sees
// { name, value, fame } plus an optional `extra` (the season of a season best;
// [nominal fee €m, year] for a transfer fee).
//
// Two ways to play:
//   • Unlimited — pick one stat; an endless chain where each revealed player
//     becomes the next one to beat.
//   • Daily — 15 questions, each on its own stat, the same for everyone that day.
// Neither ever generates a tie, and both prefer pairs whose numbers are within
// a sensible ratio of each other, so "474 vs 115" style giveaways are rare.

import data from './higherlower.generated.json'

// ── Pools ─────────────────────────────────────────────────────────────────
const POOLS = {}
for (const [id, s] of Object.entries(data.stats)) {
  POOLS[id] = s.rows
    .map(([i, value, extra], rank) => ({ id: i, name: data.players[i]?.[0], fame: data.players[i]?.[1] || 0, value, rank: rank + 1, extra }))
    .filter(p => p.name && Number.isInteger(p.value) && p.value > 0) // the build guarantees this; never trust it blindly
}

// Enough players to play a stat at all (a smaller pool is a data problem —
// test/higherlower.test.js asserts every shipped stat clears it).
export const MIN_POOL = 40

export const STAT_MODES = Object.entries(data.stats)
  .filter(([id]) => POOLS[id].length >= MIN_POOL)
  .map(([id, s]) => ({ id, label: s.label, competition: s.competition, kind: s.kind, group: s.group, club: s.club, base: s.base, size: POOLS[id].length }))

const BY_ID = Object.fromEntries(STAT_MODES.map(m => [m.id, m]))
export const statById = (id) => BY_ID[id] || null

export function poolFor(modeId) { return POOLS[modeId] || [] }

// Ties are never generated (see pickChallenger / getDailyRun), so equal values
// can't reach here; if a bad pool ever produced one, don't punish the player.
export function isCorrect(direction, current, challenger) {
  if (challenger.value === current.value) return true
  return direction === 'higher' ? challenger.value > current.value : challenger.value < current.value
}

const ratioOf = (a, b) => Math.max(a, b) / Math.min(a, b)

// ── Unlimited ─────────────────────────────────────────────────────────────
// The next challenger: never the current player, never an equal value, ideally
// not one of the last RECENT players and within RATIO_MAX of the current value.
// Constraints relax in order — a wider band, then shorter memory, then any
// value — so a small (club) or lopsided pool (Messi's 474 has few neighbours)
// can always produce a question, and repeats are the last thing to give way.
export const RATIO_MAX = 2.5
export const RECENT = 20

export function pickChallenger(pool, current, recent = [], rng = Math.random) {
  const steps = [[RECENT, RATIO_MAX], [RECENT, 4], [5, 4], [5, Infinity], [0, Infinity]]
  for (const [memory, ratio] of steps) {
    const avoid = new Set(memory ? recent.slice(-memory) : [])
    const c = pool.filter(p => p.id !== current.id && p.value !== current.value && !avoid.has(p.id) && ratioOf(p.value, current.value) <= ratio)
    if (c.length) return c[Math.floor(rng() * c.length)]
  }
  return null
}

// A recognisable opener: the first card sets the tone, so start from someone
// most fans will know (falls back to the whole pool for a thin stat).
export function pickStarter(pool, rng = Math.random) {
  const known = pool.filter(p => p.fame >= 70 || p.rank <= 10)
  const from = known.length >= 10 ? known : pool
  return from[Math.floor(rng() * from.length)]
}

// ── Daily ─────────────────────────────────────────────────────────────────
// Deterministic from the day index alone, so every browser gets the same run.
export const DAILY_LENGTH = 15

// mulberry32 — small, fast, well-mixed; xmur3-style seed hashing keeps adjacent
// days (seeds n, n+1) from producing correlated sequences.
function rngFor(...parts) {
  let h = 1779033703 ^ parts.length
  for (const p of parts) { h = Math.imul(h ^ (p | 0), 3432918353); h = (h << 13) | (h >>> 19) }
  let a = h >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Stat cards. The most-followed career stats get two cards each, every other
// career stat one; club and season stats share two wildcard cards each (a club
// card becomes one of the clubs, seeded by its position), and transfer fees get
// one. Days are dealt in order from an endless stream of shuffled decks, so
// across consecutive days each stat comes round at a steady rate and no
// combination repeats on a short cycle (unlike a fixed `day % n` rotation).
const DOUBLED = new Set(['prem-goals', 'prem-apps', 'ucl-goals', 'intl-goals', 'intl-caps'])
const ofGroup = (g) => STAT_MODES.filter(m => m.group === g).map(m => m.id)
const WILD = { '@club': ofGroup('club'), '@season': ofGroup('season') }
const DECK = [
  ...STAT_MODES.filter(m => m.group === 'career').flatMap(m => (DOUBLED.has(m.id) ? [m.id, m.id] : [m.id])),
  ...Object.entries(WILD).flatMap(([card, ids]) => (ids.length ? [card, card] : [])),
  ...ofGroup('transfer'),
]
const MAX_PER_STAT = 2

function cardAt(pos) {
  const k = Math.floor(pos / DECK.length)
  const card = shuffle(DECK, rngFor(0xdec4, k))[pos % DECK.length]
  const wild = WILD[card]
  return wild ? wild[Math.floor(rngFor(0x317d, pos)() * wild.length)] : card
}

// The day's 15 stats: dealt from the stream (a stat already used twice today is
// skipped), then ordered so the same competition never appears back to back.
export function dailyStats(dayIndex) {
  const dealt = [], count = {}
  for (let pos = dayIndex * DAILY_LENGTH; dealt.length < DAILY_LENGTH; pos++) {
    const id = cardAt(pos)
    if ((count[id] || 0) >= MAX_PER_STAT) continue
    count[id] = (count[id] || 0) + 1
    dealt.push(id)
  }
  // Order: at each step take the competition with the most cards still to place
  // (excluding the one just used) — the standard way to keep repeats apart. The
  // opening questions prefer plain career stats; club, season and fee questions
  // ask more of the player, so they come once the run is under way.
  const out = []
  while (dealt.length) {
    const last = out.length ? BY_ID[out[out.length - 1]].competition : null
    const left = {}
    for (const id of dealt) left[BY_ID[id].competition] = (left[BY_ID[id].competition] || 0) + 1
    const rank = (id) => (out.length < EASY && BY_ID[id].group === 'career' ? 1000 : 0) + left[BY_ID[id].competition]
    let best = -1
    for (const [i, id] of dealt.entries()) {
      if (BY_ID[id].competition !== last && (best < 0 || rank(id) > rank(dealt[best]))) best = i
    }
    out.push(dealt.splice(Math.max(0, best), 1)[0])
  }
  return out
}

// A gentle ramp: the opening questions use household names and clearly
// different numbers; later ones allow closer calls and less obvious players.
// None of it is meant to be brutal — a "hard" pair is still 1.08–1.6× apart.
// Record-holders count as known (Zarra, Onnis) — but only near the very top of a
// club or season list, where the all-time names are often pre-war (Aldo Boffi).
const EASY = 4
const TIERS = [
  { until: EASY, fame: 90, rank: 10, ratio: [1.5, 3] },
  { until: 10, fame: 75, rank: 20, ratio: [1.2, 2.2] },
  { until: Infinity, fame: 60, rank: 30, ratio: [1.08, 1.6] },
]
const knownFor = (tier, stat) => {
  const rank = stat.group === 'career' ? tier.rank : Math.ceil(tier.rank / 10)
  return (p) => p.fame >= tier.fame || p.rank <= rank
}
// Small tallies make coin flips (7 vs 9 Champions League goals), so a daily pair
// is always at least this many apart.
const MIN_GAP = 3
const tierFor = (q) => TIERS.find(t => q < t.until)

function dailyPair(pool, tier, stat, used, rng) {
  const fresh = (p) => !used.has(p.id)
  const famous = knownFor(tier, stat)
  const attempts = [
    { who: (p) => fresh(p) && famous(p), ratio: tier.ratio, gap: MIN_GAP },
    { who: (p) => fresh(p) && famous(p), ratio: [1, RATIO_MAX], gap: MIN_GAP },
    { who: fresh, ratio: [1, RATIO_MAX], gap: 1 },
    { who: fresh, ratio: [1, Infinity], gap: 1 },
    { who: () => true, ratio: [1, Infinity], gap: 1 }, // gap 1 = never a tie
  ]
  for (const { who, ratio: [lo, hi], gap } of attempts) {
    const cands = shuffle(pool.filter(who), rng)
    for (const a of cands) {
      const bs = cands.filter(b => b !== a && Math.abs(b.value - a.value) >= gap && ratioOf(a.value, b.value) >= lo && ratioOf(a.value, b.value) <= hi)
      if (bs.length) return { a, b: bs[Math.floor(rng() * bs.length)] }
    }
  }
  return null
}

// { questions: [{ stat, a, b }] } — `a` is shown, `b` is the one to call.
// Players are not reused within a day (matched by Transfermarkt id, so the same
// person can't come back under another stat).
export function getDailyRun(dayIndex) {
  const rng = rngFor(0x4c0, dayIndex)
  const used = new Set()
  const questions = []
  for (const [q, statId] of dailyStats(dayIndex).entries()) {
    const pair = dailyPair(POOLS[statId], tierFor(q), BY_ID[statId], used, rng)
    if (!pair) continue
    used.add(pair.a.id); used.add(pair.b.id)
    questions.push({ stat: BY_ID[statId], a: pair.a, b: pair.b })
  }
  return { questions }
}
