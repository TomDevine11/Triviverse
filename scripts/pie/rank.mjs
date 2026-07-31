// ─────────────────────────────────────────────────────────────────────────
// RANK — gates + a deliberately simple weighted score.
//
// Ranking is separate from metrics (which stay raw). This applies the config's
// gates (reject + reasons) and a weighted average of normalised metrics. The
// explorer inlines the SAME normVal/scoreProfile logic so its live sliders
// reproduce these numbers exactly. Keep this trivial — it is meant to change.
// ─────────────────────────────────────────────────────────────────────────

import { GATES, WEIGHTS } from './config.mjs'

// raw metric value → 0–1 goodness, per the norm spec.
export function normVal(spec, x) {
  const [t, a, b, c] = spec
  if (t === 'band') { const lo = a, id = b, hi = c; if (x <= lo || x >= hi) return 0; return x < id ? (x - lo) / (id - lo) : (hi - x) / (hi - id) }
  if (t === 'lower') { const good = a, bad = b; if (x <= good) return 1; if (x >= bad) return 0; return (bad - x) / (bad - good) }
  if (t === 'higher') { const cap = a; return Math.max(0, Math.min(1, x / cap)) }
  if (t === 'bool') return x ? 1 : 0
  return 0
}

export function gateCheck(profile, gates = GATES) {
  const failed = []
  for (const [name, g] of Object.entries(gates)) {
    const v = profile[g.metric]
    const ok = g.op === 'gte' ? v >= g.value : g.op === 'lte' ? v <= g.value : !!v
    if (!ok) failed.push({ gate: name, metric: g.metric, value: v, need: `${g.op === 'true' ? 'must be true' : g.op + ' ' + g.value}` })
  }
  return failed
}

export function scoreProfile(profile, weights = WEIGHTS) {
  const breakdown = {}
  let sum = 0, wsum = 0
  for (const [m, cfg] of Object.entries(weights)) {
    const raw = profile[m]
    const nv = normVal(cfg.norm, raw)
    breakdown[m] = { raw, norm: +nv.toFixed(3), weight: cfg.weight, contribution: +(nv * cfg.weight).toFixed(3) }
    sum += nv * cfg.weight; wsum += cfg.weight
  }
  return { score: +(wsum ? sum / wsum : 0).toFixed(4), breakdown }
}

// Human-readable "why": dominant strengths + weaknesses + gate failures.
export function explain(profile, breakdown, gatesFailed) {
  const ranked = Object.entries(breakdown).sort((a, b) => b[1].norm - a[1].norm)
  return {
    strengths: ranked.filter(([, b]) => b.norm >= 0.66).map(([m, b]) => `${m} (${b.norm})`),
    weaknesses: ranked.filter(([, b]) => b.norm <= 0.34).map(([m, b]) => `${m} (${b.norm}, raw ${b.raw})`),
    penalties: gatesFailed.map((g) => `GATE ${g.gate}: ${g.metric}=${g.value} (${g.need})`),
    passed: gatesFailed.length === 0,
  }
}
