// One comparable score model across eleven very different games, so results can
// be ranked against a friend (challenges), a league, or everyone who played
// today (percentiles).
//
// A result is { w, v, of?, low?, u? }:
//   w   — won the daily (a win always beats a loss)
//   v   — the game's natural number (answers found, guesses used, points…)
//   of  — optional maximum, for "8/10"-style labels
//   low — true when a smaller v is better (guesses, Pointless points, mistakes)
//   u   — unit key for labels without `of` (see UNITS)
//
// The same comparison runs in the Worker (worker/social.js) — keep them in step.

export const UNITS = {
  pts: { en: 'pts', es: 'pts' },
  mistakes: { en: 'mistakes', es: 'fallos' },
  guesses: { en: 'guesses', es: 'intentos' },
  players: { en: 'players', es: 'jugadores' },
  streak: { en: 'in a row', es: 'seguidas' },
}

// Returns >0 if a beats b, <0 if b beats a, 0 for a tie.
export function compareResults(a, b) {
  if (!a || !b) return 0
  if (!!a.w !== !!b.w) return a.w ? 1 : -1
  const av = Number(a.v), bv = Number(b.v)
  if (!Number.isFinite(av) || !Number.isFinite(bv) || av === bv) return 0
  const low = a.low ?? b.low
  return low ? (av < bv ? 1 : -1) : (av > bv ? 1 : -1)
}

// "8/10", "4/6", "X/6", "43 pts", "2 mistakes", "✓" — short, share-friendly.
export function scoreLabel(r, locale = 'en') {
  if (!r) return ''
  const v = Number(r.v)
  if (r.of) {
    if (r.low && !r.w) return `X/${r.of}`
    return `${Number.isFinite(v) ? v : 0}/${r.of}`
  }
  if (!Number.isFinite(v)) return r.w ? '✓' : '✗'
  const unit = UNITS[r.u]?.[locale] || UNITS[r.u]?.en || ''
  if (r.u === 'mistakes' && r.w && v === 0) return locale === 'es' ? 'Perfecto' : 'Flawless'
  return unit ? `${v} ${unit}` : String(v)
}

// Percentile helper: share of `others` this result strictly beats, ties count half.
export function percentileAgainst(mine, others) {
  if (!others?.length) return null
  let score = 0
  for (const o of others) {
    const c = compareResults(mine, o)
    if (c > 0) score += 1
    else if (c === 0) score += 0.5
  }
  return Math.round((score / others.length) * 100)
}
