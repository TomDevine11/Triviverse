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
// Weights below were OPTIMISED against 113 real "would I play this as the daily?"
// ratings (see the correlations in scripts/pie/README.md). The norm SHAPES are set
// from metric semantics; the WEIGHTS are data-fit. Every metric here earned its
// place by predicting your yes/no — this is no longer intuition.
export const WEIGHTS = {
  top3Share:         { weight: 1.5, norm: ['lower', 0.30, 0.80] }, // strongest signal (r −0.45): depth, not a top-3 stack
  dominance:         { weight: 1.5, norm: ['lower', 0.12, 0.55] }, // (r −0.43): no single giant
  recognisableCount: { weight: 1.9, norm: ['band', 8, 30, 110] }, // (r +0.33): "I know loads here"
  surpriseHeadroom:  { weight: 1.4, norm: ['higher', 35] },        // (r +0.30): room to pull an unexpected name
  isGoalkeeper:      { weight: 1.0, norm: ['lower', 0, 1] },       // (r −0.25): GK questions are weaker
  nationalityFilter: { weight: 1.0, norm: ['lower', 0, 1] },       // (r −0.23): nationality filters kill headroom (position filters don't)
  medianValue:       { weight: 0.5, norm: ['lower', 40, 250] },    // (r −0.16): a high median = trivially easy (all big values)
  checkoutRoutes:    { weight: 0.8, norm: ['higher', 11] },        // (r +0.20)
  poolSize:          { weight: 0.9, norm: ['band', 12, 60, 300] }, // (r +0.18)
  valueSpread:       { weight: 0.5, norm: ['band', 1.5, 4, 18] },  // (r +0.14)
}
