// ─────────────────────────────────────────────────────────────────────────
// METRIC PASSES — objective only.
//
// Each metric is an INDEPENDENT, pure function of the leaderboard. NO weighting,
// NO collapsing to a score here — this returns the raw metric profile. Subjective
// signals (nostalgia, identity, salience) are deliberately absent for now.
// ─────────────────────────────────────────────────────────────────────────

import { RECOG_MIN } from './config.mjs'

// Darts checkout: from 501, subtract player values, land in [0, −10]  ⇔  a subset
// of values sums into [501, 511]. Boolean reachability DP over the value multiset.
function checkout(values) {
  const R = new Uint8Array(512); R[0] = 1
  for (const v of values) { if (v <= 0 || v > 511) continue; for (let s = 511; s >= v; s--) if (R[s - v]) R[s] = 1 }
  let routes = 0, feasible = false
  for (let s = 501; s <= 511; s++) if (R[s]) { routes++; feasible = true }
  return { feasible, routes } // routes = distinct checkout totals reachable (a richness proxy)
}

export function evaluate(board) {
  const n = board.length
  const values = board.map((b) => b.value)
  const total = values.reduce((a, b) => a + b, 0)
  const sorted = [...values].sort((a, b) => b - a)
  const recog = board.filter((b) => b.fame >= RECOG_MIN)
  const mean = n ? total / n : 0
  const median = n ? sorted[Math.floor(n / 2)] : 0
  const max = sorted[0] || 0
  const variance = n ? values.reduce((a, v) => a + (v - mean) ** 2, 0) / n : 0
  const top3 = (sorted[0] || 0) + (sorted[1] || 0) + (sorted[2] || 0)
  const ck = checkout(values)
  const ckKnown = checkout(recog.map((b) => b.value))

  return {
    poolSize: n,
    recognisableCount: recog.length,
    recognisableShare: n ? +(recog.length / n).toFixed(2) : 0,
    dominance: total ? +(max / total).toFixed(3) : 1,        // share of the single biggest value
    top3Share: total ? +(top3 / total).toFixed(3) : 1,       // share of the top three
    valueVariance: Math.round(variance),
    valueSpread: median ? +(max / median).toFixed(2) : 0,    // dynamic range (max ÷ median)
    maxValue: max,
    medianValue: median,
    checkoutFeasible: ck.feasible,
    checkoutRoutes: ck.routes,
    checkoutWithKnown: ckKnown.feasible,                     // finishable using only recognisable players
    completeness: n ? +(board.filter((b) => b.name).length / n).toFixed(2) : 0, // resolvable answers
    coverage: 1,                                             // 1 = scope fully within canonical data (6 comps)
  }
}
