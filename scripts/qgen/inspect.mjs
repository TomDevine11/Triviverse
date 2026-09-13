// qgen/inspect — empirical validation of the Pointless quality model. Reads REAL
// eligible boards across the whole score distribution (not just the top) so a human
// can judge whether high scores mean enjoyable trivia. Also computes answer-pool
// overlap to surface near-duplicate clusters (the "many questions, one concept"
// failure). Read-only.
import { loadRegistry } from './registry.mjs'
import { makeResolver } from './predicates.mjs'
import { pointlessFamilies } from './families.mjs'
import { evaluateCandidate, RECO_BAR } from './quality.mjs'

const R = loadRegistry()
const resolve = makeResolver(R)
const cands = pointlessFamilies(R)
const eligible = []
for (const c of cands) {
  const e = evaluateCandidate(c, 'pointless', R, resolve)
  if (e.ok) eligible.push({ c, e, ids: new Set(e.answers.map(a => a.id)) })
}
eligible.sort((a, b) => b.e.score - a.e.score)

// Recognisability profile: how the nameable answers split into fame tiers.
function fameTiers(answers) {
  const t = { star: 0, known: 0, deep: 0 } // >=60, 25-59, <25
  for (const a of answers) { const r = R.players.get(a.id)?.reco || 0; if (r >= 60) t.star++; else if (r >= RECO_BAR) t.known++; else t.deep++ }
  return t
}
const topAnswers = (answers, k) => answers.slice().sort((a, b) => b.p - a.p).slice(0, k).map(a => a.d)
const tailAnswers = (answers, k) => answers.filter(a => a.p === 0).slice(0, k).map(a => a.d)

// ── Near-duplicate clustering by answer-pool Jaccard ────────────────────────
function jaccard(a, b) { let inter = 0; const [s, l] = a.size < b.size ? [a, b] : [b, a]; for (const x of s) if (l.has(x)) inter++; return inter / (a.size + b.size - inter) }
const clusters = []
const seen = new Set()
for (let i = 0; i < eligible.length; i++) {
  if (seen.has(i)) continue
  const group = [i]
  for (let j = i + 1; j < eligible.length; j++) {
    if (seen.has(j)) continue
    if (jaccard(eligible[i].ids, eligible[j].ids) >= 0.5) { group.push(j); seen.add(j) }
  }
  if (group.length > 1) { clusters.push(group); for (const g of group) seen.add(g) }
}

console.log(`ELIGIBLE: ${eligible.length}\n`)

// Stratified sample across score bands.
const bands = [[90, 200], [80, 90], [70, 80], [60, 70], [40, 60]]
for (const [lo, hi] of bands) {
  const inBand = eligible.filter(x => x.e.score >= lo && x.e.score < hi)
  const take = inBand.filter((_, i) => i % Math.max(1, Math.ceil(inBand.length / 22)) === 0).slice(0, 22)
  console.log(`\n========== SCORE ${lo}–${hi}  (${inBand.length} boards, showing ${take.length}) ==========`)
  for (const { c, e } of take) {
    const t = fameTiers(e.answers)
    console.log(`[${e.score}] ${c.title}`)
    console.log(`    fam=${c.familyId} pool=${e.signals.count} fame(star/known/deep)=${t.star}/${t.known}/${t.deep} decades=${e.signals.decades} nats=${e.signals.nations} zero%=${Math.round(e.signals.zeroShare * 100)} obv%=${Math.round(e.signals.obviousShare * 100)}`)
    console.log(`    top: ${topAnswers(e.answers, 5).join(', ')}`)
    console.log(`    tail(0pt valid): ${tailAnswers(e.answers, 4).join(', ')}`)
  }
}

console.log(`\n\n========== NEAR-DUPLICATE CLUSTERS (answer-pool Jaccard ≥ 0.5) ==========`)
console.log(`clusters: ${clusters.length}, boards inside clusters: ${clusters.reduce((s, g) => s + g.length, 0)}`)
for (const g of clusters.slice(0, 12)) {
  console.log(`  cluster (${g.length}): ${g.map(i => eligible[i].c.title).slice(0, 4).join('  |  ')}`)
}
