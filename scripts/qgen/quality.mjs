// qgen/quality — the "what is GOOD" layer.
//
// evaluateCandidate(cand, game, R) resolves the COMPLETE answer set (validation
// truth) and returns structured judgement:
//   { ok, reasons:[CODE...], score, signals:{...}, answers:[...] }
// Two strictly separated layers:
//   HARD GATES   → reasons[] (a non-empty list means "valid maybe, but do not
//                  generate", or in some cases "not even valid"). Deterministic.
//   SOFT SIGNALS → score (0-100) used only to RANK, never to decide correctness.
// Each game defines quality DIFFERENTLY. There is deliberately no universal
// "good question" formula — only a shared shape for the answer.
import { statOf } from './predicates.mjs'
import { norm } from './registry.mjs'
import { buildProminence, retrievability, classifyPredicate, comfortableRecall, MEGASTAR, RECALL_HIGH, RECALL_MED } from './retrievability.mjs'

const RECO_BAR = 25   // recognisability score at/above which an answer is "nameable"

// Prominence table is expensive to build; memoise per registry.
const promCache = new WeakMap()
function getProm(R) { let p = promCache.get(R); if (!p) promCache.set(R, p = buildProminence(R)); return p }

// Score a resolved pool for Pointless. "Points" model how many of 100 people would
// NAME this player FOR THIS QUESTION, so points track RETRIEVABILITY — fame gated by
// how strongly the player is associated with EVERY defining entity of the question.
// A megastar loosely tied to one entity (a Milan star with a Genoa cameo) is a deep
// cut here, not an obvious answer. The floor is ABSOLUTE, so the "pointless" tail
// reflects the real retrievability distribution. Sorted ascending → first are the
// most pointless. Fields kept lean; `n` is derived at load from `d`.
const RETR_FLOOR = 8     // retrievability ≤ this ⇒ a genuine 0-point deep cut
const RETR_ANCHOR = 62   // retrievability ≥ this ⇒ a maximally obvious 100-point answer
function scorePool(ids, R, entities) {
  const scored = []
  for (const id of ids) {
    const pl = R.players.get(id); if (!pl) continue
    scored.push({ id, pl, retr: retrievability(pl, entities) })
  }
  scored.sort((a, b) => a.retr - b.retr)
  const pts = (r) => (r <= RETR_FLOOR ? 0 : Math.min(100, Math.round(100 * (r - RETR_FLOOR) / (RETR_ANCHOR - RETR_FLOOR))))
  return scored.map(({ id, pl, retr }) => ({ id, d: pl.name, n: norm(pl.name), p: pts(retr), y: pl.last || 0, retr, reco: pl.reco }))
}

// Diversity across clubs / nationality / era among the recognisable answers — a
// board dominated by one club or one decade is duller than a varied one.
function diversity(answers, R) {
  const decades = new Set(), nats = new Set()
  let recoN = 0
  for (const a of answers) {
    if (a.reco < RECO_BAR) continue
    recoN++
    const pl = R.players.get(a.id)
    decades.add(Math.floor((a.y || 2000) / 10))
    for (const nat of pl.nats) nats.add(nat)
  }
  return { decades: decades.size, nats: nats.size, recoN }
}

// ── Pointless ───────────────────────────────────────────────────────────────
// The Pointless mechanic asks the player to THINK OF FIVE valid answers (a
// pointless-0 wins instantly, else five answers under 100 pts). So the FIRST
// requirement is not rarity — it is: can a fan comfortably reach five from memory?
// We model that as the COMFORTABLE RECALL SURFACE (spontaneously-recalled answers,
// via career-share association) discounted by CATEGORY RECALL FRICTION (a single
// club is a rehearsed list; an intersection forces a hard mental cross). A good
// board needs this comfortably ABOVE five, plus a real obscure tail to hunt.
const COMFORT_FLOOR = 13   // effective comfortable recall must clear this (>> 5) — calibrated:
                           // Brazil∩PL 16 passes, Senegal∩Ligue1 12 / all club∩club <2 reject.
function evalPointless(cand, R, resolve) {
  const entities = cand.entities || []
  const ids = resolve(cand.predicate)
  const answers = scorePool([...ids], R, entities)
  const n = answers.length
  const reasons = []
  const bands = { obvious: 0, medium: 0, low: 0, zero: 0 }
  for (const a of answers) {
    if (a.p >= 60) bands.obvious++; else if (a.p >= 20) bands.medium++
    else if (a.p >= 1) bands.low++; else bands.zero++
  }
  const div = diversity(answers, R)
  const megastars = answers.reduce((s, a) => s + (a.retr >= MEGASTAR ? 1 : 0), 0)
  const cls = classifyPredicate(entities, getProm(R), megastars)
  const cr = comfortableRecall(answers, entities, R)   // { comfortable, friction, effective }
  const obviousShare = n ? bands.obvious / n : 0
  const zeroShare = n ? bands.zero / n : 0

  // HARD GATES — could a fan actually PLAY this (get to five), and is it real trivia?
  if (n < 45) reasons.push('ANSWER_POOL_TOO_SMALL')
  if (n > 1600) reasons.push('ANSWER_POOL_TOO_LARGE')
  if (cls.arbitraryIntersection) reasons.push('ARBITRARY_INTERSECTION')  // not a real football fact
  // The core gameplay gate: comfortable recall well above five. High-friction
  // categories (intersections) must clear it on a much larger raw surface.
  if (cr.effective < COMFORT_FLOOR) reasons.push(cr.friction < 1 ? 'HIGH_RECALL_FRICTION' : 'CANT_REACH_FIVE')
  if (obviousShare > 0.55) reasons.push('TOO_OBVIOUS')                   // everyone famous → not pointless
  if (zeroShare < 0.08) reasons.push('NO_POINTLESS_TAIL')                // nothing obscure to hunt

  // SOFT SIGNALS → desirability among playable boards
  const comfort = Math.min(1, cr.effective / 40)          // reward an easy, rich category
  const naturalness = cls.naturalness
  const depth = Math.min(1, zeroShare / 0.5)              // a real fair tail to explore
  const shape = 1 - Math.abs(obviousShare - 0.12) / 0.4  // a few obvious, not all
  const varietyScore = Math.min(1, (div.decades / 5) * 0.5 + (div.nats / 20) * 0.5)
  const score = Math.round(100 * (0.36 * comfort + 0.20 * naturalness + 0.18 * depth + 0.14 * Math.max(0, shape) + 0.12 * varietyScore))

  return {
    ok: reasons.length === 0, reasons, score,
    signals: { count: n, ...bands, comfortable: cr.comfortable, friction: cr.friction, effective: +cr.effective.toFixed(1), megastars, tier: cls.tier, naturalness: +naturalness.toFixed(2), decades: div.decades, nations: div.nats, obviousShare: +obviousShare.toFixed(2), zeroShare: +zeroShare.toFixed(2) },
    answers,
  }
}

// ── Tenable ─────────────────────────────────────────────────────────────────
// A clean, strictly-ranked top-10 with no tie at the cut line — and, crucially,
// one a fan can actually RECALL: the list is only fun if you can name several of
// its members. Answerability = how many of the top-10 are retrievable, plus a
// genuine star at #1 to anchor on. Ranking families pass a scoped `pool`.
function evalTenable(cand, R) {
  const rows = cand.pool.slice().sort((a, b) => b.value - a.value)
  const reasons = []
  if (rows.length < 10) reasons.push('NOT_ENOUGH_FOR_TOP10')
  const top = rows.slice(0, 10)
  if (rows.length >= 11 && rows[10].value === top[9].value) reasons.push('RANKING_TIE')  // ambiguous cutoff
  if (top.length === 10 && top[9].value < cand.floor) reasons.push('TAIL_BELOW_FLOOR')   // #10 too weak to be a real record
  const reco = (r) => R.players.get(r.id)?.reco || 0
  const recallable = top.filter(r => reco(r) >= RECALL_MED).length   // members a fan could name
  const anchored = top.slice(0, 3).some(r => reco(r) >= RECALL_HIGH) // a marquee name near the top
  if (recallable < 4) reasons.push('TOP10_LOW_RECALL')               // can't recall the list → not fun
  if (!anchored) reasons.push('NO_STAR_ANCHOR')
  const spread = top.length ? (top[0].value - top[9].value) : 0
  const score = Math.round(100 * (0.6 * Math.min(1, recallable / 7) + 0.4 * Math.min(1, spread / (top[0]?.value || 1))))
  return { ok: reasons.length === 0, reasons, score, signals: { rows: rows.length, recallable, top1: top[0]?.value, top10: top[9]?.value }, answers: top }
}

// ── Higher / Lower ────────────────────────────────────────────────────────────
// A good HL mode compares two players the fan KNOWS but is unsure about — so the
// pool must be full of retrievable names with a smooth value gradient. Uses a
// retrievability bar, not bare recognisability.
function evalHigherLower(cand, R) {
  const rows = cand.pool.filter(r => (R.players.get(r.id)?.reco || 0) >= RECALL_MED).sort((a, b) => b.value - a.value)
  const reasons = []
  if (rows.length < 20) reasons.push('LOW_RECALL_SURFACE')        // too few players a fan can compare
  if (rows.length && rows[0].value === rows[rows.length - 1].value) reasons.push('NO_VALUE_RANGE')
  const score = Math.round(100 * Math.min(1, rows.length / 40))
  return { ok: reasons.length === 0, reasons, score, signals: { recallable: rows.length, top: rows[0]?.value }, answers: rows }
}

export function evaluateCandidate(cand, game, R, resolve) {
  switch (game) {
    case 'pointless': return evalPointless(cand, R, resolve)
    case 'tenable': return evalTenable(cand, R)
    case 'higherlower': return evalHigherLower(cand, R)
    default: throw new Error('no quality model for game: ' + game)
  }
}

export { scorePool, RECO_BAR, statOf }
