// "Higher or Lower" — compare two footballers on a real career stat: goals or
// appearances in the Premier League, La Liga, Serie A, the Bundesliga, Ligue 1
// and the Champions League, or international goals and caps.
//
// Pools come from src/data/higherlower.generated.json (scripts/build-leaderboards.mjs):
// per stat, every player who clears that stat's floor AND is either recognisable
// (fame ≥ 55) or a record-holder (top 30). The client only sees { name, value, fame }.
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
    .map(([i, value], rank) => ({ id: i, name: data.players[i]?.[0], fame: data.players[i]?.[1] || 0, value, rank: rank + 1 }))
    .filter(p => p.name && Number.isInteger(p.value) && p.value > 0) // the build guarantees this; never trust it blindly
}

// Enough players to play a stat at all (a smaller pool is a data problem —
// test/higherlower.test.js asserts every shipped stat clears it).
export const MIN_POOL = 40

export const STAT_MODES = Object.entries(data.stats)
  .filter(([id]) => POOLS[id].length >= MIN_POOL)
  .map(([id, s]) => ({ id, label: s.label, competition: s.competition, kind: s.kind, size: POOLS[id].length }))

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
// Constraints relax in order — shorter memory, then any value — so a small or
// lopsided pool (Messi's 474 has few neighbours) can always produce a question.
export const RATIO_MAX = 2.5
export const RECENT = 20

export function pickChallenger(pool, current, recent = [], rng = Math.random) {
  const steps = [[RECENT, RATIO_MAX], [5, RATIO_MAX], [5, Infinity], [0, Infinity]]
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

// Stat cards. The most-followed stats get two cards each; every other stat one.
// Days are dealt in order from an endless stream of shuffled decks, so across
// consecutive days each stat comes round at a steady rate and no combination
// repeats on a short cycle (unlike a fixed `day % n` rotation).
const DOUBLED = new Set(['prem-goals', 'prem-apps', 'ucl-goals', 'intl-goals', 'intl-caps'])
const DECK = STAT_MODES.flatMap(m => (DOUBLED.has(m.id) ? [m.id, m.id] : [m.id]))
const MAX_PER_STAT = 2

function cardAt(pos) {
  const k = Math.floor(pos / DECK.length)
  return shuffle(DECK, rngFor(0xdec4, k))[pos % DECK.length]
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
  // (excluding the one just used) — the standard way to keep repeats apart.
  const out = []
  while (dealt.length) {
    const last = out.length ? BY_ID[out[out.length - 1]].competition : null
    const left = {}
    for (const id of dealt) left[BY_ID[id].competition] = (left[BY_ID[id].competition] || 0) + 1
    let best = -1
    for (const [i, id] of dealt.entries()) {
      const c = BY_ID[id].competition
      if (c !== last && (best < 0 || left[c] > left[BY_ID[dealt[best]].competition])) best = i
    }
    out.push(dealt.splice(Math.max(0, best), 1)[0])
  }
  return out
}

// A gentle ramp: the opening questions use household names and clearly
// different numbers; later ones allow closer calls and less obvious players.
// None of it is meant to be brutal — a "hard" pair is still 1.08–1.6× apart.
const TIERS = [
  { until: 4,  famous: (p) => p.fame >= 90 || p.rank <= 10, ratio: [1.5, 3] },
  { until: 10, famous: (p) => p.fame >= 75 || p.rank <= 20, ratio: [1.2, 2.2] },
  { until: Infinity, famous: (p) => p.fame >= 60 || p.rank <= 30, ratio: [1.08, 1.6] },
]
// Small tallies make coin flips (7 vs 9 Champions League goals), so a daily pair
// is always at least this many apart.
const MIN_GAP = 3
const tierFor = (q) => TIERS.find(t => q < t.until)

function dailyPair(pool, tier, used, rng) {
  const fresh = (p) => !used.has(p.id)
  const attempts = [
    { who: (p) => fresh(p) && tier.famous(p), ratio: tier.ratio, gap: MIN_GAP },
    { who: (p) => fresh(p) && tier.famous(p), ratio: [1, RATIO_MAX], gap: MIN_GAP },
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
    const pair = dailyPair(POOLS[statId], tierFor(q), used, rng)
    if (!pair) continue
    used.add(pair.a.id); used.add(pair.b.id)
    questions.push({ stat: BY_ID[statId], a: pair.a, b: pair.b })
  }
  return { questions }
}
