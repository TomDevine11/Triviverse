// ─────────────────────────────────────────────────────────────────────────
// PIE — the ONE tunable config. Everything the scoring engine's judgement
// depends on lives here. Editing this file (and re-opening the explorer, or
// moving the explorer's sliders) is the entire calibration loop.
//
// Experimental developer tool (RFC-002 vertical slice). Touches NO gameplay.
// ─────────────────────────────────────────────────────────────────────────

// A player counts as "recognisable" at/above this canonical recognisability.
export const RECOG_MIN = 15

// HARD GATES — a candidate that fails any of these is rejected outright, with a
// reason. Gates encode playability floors; they are never traded off.
//   op: 'gte' | 'lte' | 'true'
export const GATES = {
  minPool:          { metric: 'poolSize',          op: 'gte',  value: 6 },
  minRecognisable:  { metric: 'recognisableCount', op: 'gte',  value: 8 },
  maxPool:          { metric: 'poolSize',          op: 'lte',  value: 400 },
  finishable:       { metric: 'checkoutFeasible',  op: 'true' },
  finishableKnown:  { metric: 'checkoutWithKnown', op: 'true' },
}

// WEIGHTED METRICS — the survivors of the gates are ranked by a simple weighted
// average of these, each normalised to a 0–1 "goodness". Deliberately simple and
// deliberately easy to change. The explorer reads these as its slider defaults.
//   norm forms:  ['band', lo, ideal, hi]  triangular (0 at lo/hi, 1 at ideal)
//                ['lower', good, bad]      1 at/below good → 0 at/above bad
//                ['higher', cap]           linear 0→1 up to cap
//                ['bool']                  0 / 1
export const WEIGHTS = {
  recognisableCount: { weight: 2.0, norm: ['band', 8, 26, 75] },   // "I know loads here"
  dominance:         { weight: 1.0, norm: ['lower', 0.12, 0.55] }, // no single giant
  top3Share:         { weight: 0.8, norm: ['lower', 0.30, 0.78] }, // depth behind the leaders
  valueSpread:       { weight: 1.0, norm: ['band', 1.5, 4, 16] },  // interesting darts board
  checkoutRoutes:    { weight: 1.5, norm: ['higher', 11] },        // many ways to finish
  poolSize:          { weight: 0.6, norm: ['band', 12, 45, 160] }, // nameable, not endless
}
