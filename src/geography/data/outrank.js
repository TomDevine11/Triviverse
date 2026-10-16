// Outrank — geography higher or lower. Data + rules, no UI.
//
// Two countries, one statistic: the first country's figure is shown, the player
// says whether the second's is higher or lower. Two modes share every rule here:
//   • Daily — up to ten comparisons, the same for everyone each day, one guess
//     each; one wrong answer ends the day. PASS_STREAK in a row wins it.
//   • Unlimited — an endless chain; one wrong guess ends the run.
//
// Content: ./stats.generated.json, built by scripts/geography/build-stats.mjs from the
// World Bank's World Development Indicators — every figure for the same reference
// year, one publisher, one definition per statistic (see that script for the
// inclusion policy). Names and flags come from the shared geography country set.
//
// Comparisons are made at the precision the player sees (e.g. life expectancy to
// 0.1 years): two figures that read the same are a tie, and a tie accepts either
// answer. Generated pairs avoid ties and near-ties entirely; the tie rule is the
// safety net, never a trick.
import data from './stats.generated.json' with { type: 'json' }
import { countryByCode, mulberry32 } from './countries'
import { geoDay, GEO_EPOCH } from './day'

export const DATA_YEAR = data.meta.year
export const SOURCE = data.meta.source
export const SOURCE_URL = data.meta.url
export const DAILY_SIZE = 10
export const PASS_STREAK = 5 // the single place the daily win threshold lives

// ── Statistics ───────────────────────────────────────────────────────────────
export const STATS = {
  population: {
    id: 'population', label: 'Population', noun: 'population', unit: 'people', emoji: '👥',
    definition: 'Everyone living in the country at mid-year, whatever their citizenship.',
    indicator: data.meta.indicators.population,
  },
  area: {
    id: 'area', label: 'Land area', noun: 'land area', unit: 'km²', emoji: '🗺️',
    definition: 'Land only: lakes and major rivers are excluded, as are territorial waters.',
    indicator: data.meta.indicators.area,
  },
  density: {
    id: 'density', label: 'Population density', noun: 'population density', unit: 'people per km²', emoji: '🏙️',
    definition: 'People per square kilometre of land area.',
    indicator: data.meta.indicators.density,
  },
  life: {
    id: 'life', label: 'Life expectancy', noun: 'life expectancy', unit: 'years', emoji: '⏳',
    definition: 'Life expectancy at birth: how long a newborn would live if today’s death rates held.',
    indicator: data.meta.indicators.life,
  },
}
export const STAT_IDS = Object.keys(STATS)

// The figure as the player reads it — every comparison is made on this.
export function shown(stat, v) {
  if (stat === 'population') return Math.round(v)
  if (stat === 'life') return Math.round(v * 10) / 10
  const dp = v < 10 ? 2 : v < 100 ? 1 : 0
  if (stat === 'density') return v < 10 ? Math.round(v * 10) / 10 : Math.round(v)
  return Math.round(v * 10 ** dp) / 10 ** dp
}

const sig3 = (n) => {
  const s = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}
const grouped = (n, dp = 0) => n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })

// [headline number, unit] — "1.45" + "billion", "241,930" + "km²", "81.4" + "years".
export function formatParts(stat, v) {
  const n = shown(stat, v)
  if (stat === 'population') {
    if (n >= 1e9) return [sig3(n / 1e9), 'billion']
    if (n >= 1e6) return [sig3(n / 1e6), 'million']
    return [grouped(n), 'people']
  }
  if (stat === 'area') {
    if (n >= 1e6) return [sig3(n / 1e6), 'million km²']
    return [grouped(n, n < 10 ? 2 : n < 100 ? 1 : 0), 'km²']
  }
  if (stat === 'density') return [grouped(n, n < 10 ? 1 : 0), 'per km²']
  return [n.toFixed(1), 'years']
}
export const formatValue = (stat, v) => formatParts(stat, v).join(' ')

// The exact figure under a rounded headline ("1,450,935,791 people"), or null when
// the headline is already exact.
export function exactLine(stat, v) {
  const n = shown(stat, v)
  if (stat === 'population' && n >= 1e6) return `${grouped(n)} people`
  if (stat === 'area' && n >= 1e6) return `${grouped(n)} km²`
  return null
}

// ── The country set ──────────────────────────────────────────────────────────
// Familiar small countries count as well known even though their population rank
// alone would put them in the long tail.
const WELL_KNOWN = new Set(['CH', 'NO', 'DK', 'SE', 'FI', 'IE', 'NZ', 'PT', 'GR', 'AT', 'BE', 'NL', 'IL', 'SG', 'IS', 'LU', 'MC', 'JM', 'CU', 'QA', 'AE', 'HK', 'CR', 'UY', 'HR', 'PA', 'CZ', 'HU', 'KW', 'MT', 'CY', 'BS', 'BB', 'FJ', 'MV', 'MN', 'BT', 'NP', 'LK', 'JO', 'LB'])

export const ENTRIES = data.countries
  .map(r => ({ ...r, name: countryByCode(r.code)?.name }))
  .filter(r => r.name && Number.isFinite(r.population))
const BY_CODE = new Map(ENTRIES.map(e => [e.code, e]))
export const entryOf = (code) => BY_CODE.get(code) || null
export const nameOf = (code) => BY_CODE.get(code)?.name || code
// Names that read with "the" in a sentence ("the Netherlands has…").
const THE = new Set(['US', 'GB', 'NL', 'BS', 'PH', 'GM', 'MV', 'AE', 'CF', 'DO', 'MH', 'SB', 'CD', 'CG'])
const inSentence = (code) => (THE.has(code) ? `the ${nameOf(code)}` : nameOf(code))
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
// "Kenya’s", "the Maldives’", "the Philippines’".
export const possessive = (code) => { const n = inSentence(code); return n.endsWith('s') ? `${n}’` : `${n}’s` }
// The question under the cards: "Is the Maldives’ land area higher or lower than Kenya’s?"
export const questionFor = (q) => `Is ${possessive(q.b)} ${STATS[q.stat].noun} higher or lower than ${possessive(q.a)}?`
export const valueOf = (code, stat) => {
  const v = BY_CODE.get(code)?.[stat]
  return Number.isFinite(v) ? v : null
}

// Familiarity tier by population rank (1 = household names, 3 = the long tail).
const POP_RANK = new Map([...ENTRIES].filter(e => e.kind === 'country').sort((a, b) => b.population - a.population).map((e, i) => [e.code, i]))
export function tierOf(code) {
  if (WELL_KNOWN.has(code)) return 1
  const i = POP_RANK.get(code)
  return i == null ? 3 : i < 55 ? 1 : i < 120 ? 2 : 3
}

// Per statistic: who has a figure, highest first, and each one's rank.
const POOLS = Object.fromEntries(STAT_IDS.map(stat => {
  const list = ENTRIES.filter(e => Number.isFinite(e[stat])).sort((a, b) => b[stat] - a[stat] || (a.code < b.code ? -1 : 1))
  return [stat, { list, rank: new Map(list.map((e, i) => [e.code, i + 1])) }]
}))
export const poolSize = (stat) => POOLS[stat].list.length
export const rankOf = (code, stat) => POOLS[stat].rank.get(code) || null
const pctOf = (code, stat) => (rankOf(code, stat) - 1) / (poolSize(stat) - 1)

// ── Rules ────────────────────────────────────────────────────────────────────
// How B compares with A: 'higher', 'lower' or 'tie', at the precision shown.
export function outcomeOf(q) {
  const a = shown(q.stat, valueOf(q.a, q.stat)), b = shown(q.stat, valueOf(q.b, q.stat))
  return b > a ? 'higher' : b < a ? 'lower' : 'tie'
}
export const isCorrect = (q, guess) => {
  const o = outcomeOf(q)
  return o === 'tie' || o === guess
}

// A comparison is fair when both figures exist, differ clearly as displayed and
// the countries are different.
const MIN_REL = 0.03
const MIN_LIFE_YEARS = 0.5
const LABELS = new Map()
const labelOf = (code, stat) => {
  const k = code + stat
  if (!LABELS.has(k)) LABELS.set(k, formatValue(stat, valueOf(code, stat)))
  return LABELS.get(k)
}
export function fairPair(a, b, stat) {
  if (a === b) return false
  const va = valueOf(a, stat), vb = valueOf(b, stat)
  if (va == null || vb == null) return false
  if (labelOf(a, stat) === labelOf(b, stat)) return false
  if (stat === 'life') return Math.abs(shown(stat, va) - shown(stat, vb)) >= MIN_LIFE_YEARS
  return Math.abs(va - vb) / Math.max(va, vb) >= MIN_REL
}

// Difficulty bands on the gap between the two countries' rank percentiles —
// the same yardstick for every statistic.
export const BANDS = {
  easy: [0.42, 1.01],
  medium: [0.16, 0.42],
  hard: [0.025, 0.16],
}
export const gapOf = (a, b, stat) => Math.abs(pctOf(a, stat) - pctOf(b, stat))

// One-line, data-derived context for a revealed comparison.
export function factFor(q) {
  const { stat } = q
  const va = valueOf(q.a, stat), vb = valueOf(q.b, stat)
  const o = outcomeOf(q)
  if (o === 'tie') return `${cap(inSentence(q.a))} and ${inSentence(q.b)} are level at ${formatValue(stat, va)}.`
  const [h, l, vh, vl] = vb > va ? [q.b, q.a, vb, va] : [q.a, q.b, va, vb]
  const hi = inSentence(h), lo = inSentence(l)
  if (stat === 'life') {
    const d = shown('life', vh) - shown('life', vl)
    return `Life expectancy at birth is ${d.toFixed(1)} years higher in ${hi} than in ${lo}.`
  }
  const r = vh / vl
  const noun = STATS[stat].noun
  if (r >= 1.95) {
    const x = r >= 100 ? grouped(Math.round(r)) : r >= 10 ? Math.round(r) : r.toFixed(1)
    if (stat === 'density') return `${cap(hi)} is ${x}× as densely populated as ${lo}.`
    return `${cap(hi)} has ${x}× the ${noun} of ${lo}.`
  }
  const pct = (r - 1) * 100
  return `${cap(possessive(h))} ${noun} is ${pct < 10 ? pct.toFixed(1) : Math.round(pct)}% greater than ${possessive(l)}.`
}

// ── Seeded helpers ───────────────────────────────────────────────────────────
function shuffle(list, rnd) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
const pick = (list, rnd) => list[Math.floor(rnd() * list.length)]
function hashSeed(...parts) {
  let h = 2166136261
  for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// Challenger for reference `a`: the first non-empty candidate list, from strictest
// (band, tier, direction) to loosest (any fair pair). Deterministic for a given rnd.
function chooseChallenger({ a, stat, band, maxTier, dir, exclude, pool, rnd }) {
  const base = pool.filter(c => !exclude.has(c) && fairPair(a, c, stat))
  const inBand = (c, [lo, hi]) => { const g = gapOf(a, c, stat); return g >= lo && g < hi }
  const wantDir = (c) => !dir || (valueOf(c, stat) > valueOf(a, stat) ? 'higher' : 'lower') === dir
  const widen = ([lo, hi]) => [Math.max(BANDS.hard[0], lo * 0.6), Math.min(1.01, hi * 1.5)]
  const tries = [
    c => inBand(c, band) && tierOf(c) <= maxTier && wantDir(c),
    c => inBand(c, band) && tierOf(c) <= maxTier + 1 && wantDir(c),
    c => inBand(c, widen(band)) && tierOf(c) <= maxTier + 1 && wantDir(c),
    c => inBand(c, band) && tierOf(c) <= maxTier + 1,
    c => inBand(c, widen(band)),
    () => true,
  ]
  for (const ok of tries) {
    const list = base.filter(ok)
    if (list.length) return pick(list, rnd)
  }
  return null
}

// ── Daily ────────────────────────────────────────────────────────────────────
// Sovereign countries with every statistic: 11 distinct countries per day.
const DAILY_POOL = ENTRIES.filter(e => e.kind === 'country' && STAT_IDS.every(s => Number.isFinite(e[s]))).map(e => e.code).sort()
const DAILY_STATS = ['population', 'population', 'population', 'area', 'area', 'area', 'density', 'density', 'life', 'life']
const DAILY_PLAN = [
  ['easy', 1], ['easy', 1], ['easy', 1],
  ['medium', 1], ['medium', 2], ['medium', 2], ['medium', 2],
  ['hard', 2], ['hard', 3], ['hard', 3],
]

function statOrder(rnd) {
  for (;;) {
    const s = shuffle(DAILY_STATS, rnd)
    const opensFamiliar = s[0] === 'population' || s[0] === 'area'
    const noTriple = s.every((x, i) => i < 2 || x !== s[i - 1] || x !== s[i - 2])
    if (opensFamiliar && noTriple) return s
  }
}

function directionOrder(rnd) {
  for (;;) {
    const d = Array.from({ length: DAILY_SIZE }, () => (rnd() < 0.5 ? 'higher' : 'lower'))
    const highs = d.filter(x => x === 'higher').length
    const noRun4 = d.every((x, i) => i < 3 || !(x === d[i - 1] && x === d[i - 2] && x === d[i - 3]))
    if (highs >= 4 && highs <= 6 && noRun4) return d
  }
}

// The day's ten comparisons for puzzle number n (day − GEO_EPOCH). A chain: each
// question's reference is the previous question's challenger.
export function dailyFor(n) {
  const rnd = mulberry32(hashSeed('outrank-v1', n))
  const stats = statOrder(rnd)
  const dirs = directionOrder(rnd)
  const used = new Set()
  let a = pick(DAILY_POOL.filter(c => tierOf(c) === 1), rnd)
  used.add(a)
  const out = []
  for (let i = 0; i < DAILY_SIZE; i++) {
    const [band, maxTier] = DAILY_PLAN[i]
    const b = chooseChallenger({ a, stat: stats[i], band: BANDS[band], maxTier, dir: dirs[i], exclude: used, pool: DAILY_POOL, rnd })
    out.push({ a, b, stat: stats[i] })
    used.add(b)
    a = b
  }
  return out
}
export const dailyQuestions = (day = geoDay()) => dailyFor(day - GEO_EPOCH)
export const puzzleNumber = (day = geoDay()) => day - GEO_EPOCH + 1
export const dailySig = (qs) => qs.map(q => `${q.stat[0]}${q.a}${q.b}`).join('')

// Checks a daily against the dataset; returns a list of problems (empty = valid).
export function validateDaily(qs) {
  const problems = []
  if (qs.length !== DAILY_SIZE) problems.push(`expected ${DAILY_SIZE} questions, got ${qs.length}`)
  const seen = new Set([qs[0]?.a])
  qs.forEach((q, i) => {
    if (!STATS[q.stat]) problems.push(`Q${i + 1}: unknown stat ${q.stat}`)
    if (!q.b) { problems.push(`Q${i + 1}: no challenger`); return }
    if (!fairPair(q.a, q.b, q.stat)) problems.push(`Q${i + 1}: unfair pair ${q.a}/${q.b} on ${q.stat}`)
    if (outcomeOf(q) === 'tie') problems.push(`Q${i + 1}: tie`)
    if (i > 0 && q.a !== qs[i - 1].b) problems.push(`Q${i + 1}: chain broken`)
    if (seen.has(q.b)) problems.push(`Q${i + 1}: ${q.b} repeats`)
    seen.add(q.b)
  })
  return problems
}

// ── Unlimited ────────────────────────────────────────────────────────────────
export const UNLIMITED_STATS = ['mixed', ...STAT_IDS]

// Pool for a stat setting: everyone with that figure (Mixed: everyone with all four).
const unlimitedPool = (setting) => ENTRIES
  .filter(e => (setting === 'mixed' ? STAT_IDS.every(s => Number.isFinite(e[s])) : Number.isFinite(e[setting])))
  .map(e => e.code).sort()

// Difficulty ramps with the streak: easy openers, then medium, then mostly hard.
function unlimitedPlan(step, rnd) {
  if (step < 3) return ['easy', 1]
  if (step < 8) return ['medium', 2]
  if (step < 15) return rnd() < 0.5 ? ['medium', 3] : ['hard', 2]
  return rnd() < 0.25 ? ['medium', 3] : ['hard', 3]
}

// The comparison at `step` of a run, given what has been shown so far. `history`
// is the run's previous questions ({ a, b, stat }). Recent countries are held back
// so a run walks the whole pool rather than circling a small subset.
export function unlimitedNext(seed, setting, history) {
  const pool = unlimitedPool(setting)
  const step = history.length
  const rnd = mulberry32(hashSeed('outrank-u', seed, step))
  const prev = history[step - 1]
  const a = prev ? prev.b : pick(pool.filter(c => tierOf(c) === 1), rnd)
  let stat = setting
  if (setting === 'mixed') {
    const last2 = history.slice(-2).map(q => q.stat)
    const options = STAT_IDS.filter(s => !(last2.length === 2 && last2[0] === s && last2[1] === s))
    stat = pick(options, rnd)
  }
  const memory = Math.floor(pool.length * 0.6)
  const recent = new Set(history.slice(-memory).flatMap(q => [q.a, q.b]))
  recent.add(a)
  const [band, maxTier] = unlimitedPlan(step, rnd)
  const b = chooseChallenger({ a, stat, band: BANDS[band], maxTier, dir: rnd() < 0.5 ? 'higher' : 'lower', exclude: recent, pool, rnd })
    || chooseChallenger({ a, stat, band: BANDS[band], maxTier: 3, dir: null, exclude: new Set([a]), pool, rnd })
  return { a, b, stat }
}

// Is a stored question still playable against today's dataset?
export const validQuestion = (q) => !!q && STATS[q.stat] && valueOf(q.a, q.stat) != null && valueOf(q.b, q.stat) != null && q.a !== q.b

// ── Presentation ─────────────────────────────────────────────────────────────
export const square = (ok) => (ok ? '🟩' : '🟥')
