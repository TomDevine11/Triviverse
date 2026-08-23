// Generate Football Pointless questions from the qgen engine.
//
// Pipeline: question FAMILIES enumerate a large candidate space → the quality
// model resolves each candidate's COMPLETE answer pool (validation truth), scores
// nameability, and keeps only boards with an interesting rarity distribution →
// the survivors are interleaved for daily variety and written as the pre-scored
// artefact the client validates against. Deterministic: same data + code ⇒ same
// output. Recognisability shapes SELECTION and POINTS, never correctness — every
// player who genuinely appeared is a valid answer (and may score a "pointless" 0).
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadRegistry, norm } from '../qgen/registry.mjs'
import { makeResolver } from '../qgen/predicates.mjs'
import { pointlessFamilies } from '../qgen/families.mjs'
import { evaluateCandidate } from '../qgen/quality.mjs'
import { dedup, diversifyOrder } from '../qgen/similarity.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const slug = (s) => norm(s).replace(/ /g, '-').slice(0, 60)

const R = loadRegistry()
const resolve = makeResolver(R)
const candidates = pointlessFamilies(R)

const eligible = []
const rejected = {}
const familyStats = {}
for (const c of candidates) {
  const fs = familyStats[c.familyId] ||= { total: 0, ok: 0 }
  fs.total++
  const e = evaluateCandidate(c, 'pointless', R, resolve)
  if (!e.ok) { for (const r of e.reasons) rejected[r] = (rejected[r] || 0) + 1; continue }
  fs.ok++
  eligible.push({ c, e, ids: new Set(e.answers.map(a => a.id)) })
}

// Drop near-duplicate boards (same entities, or heavily overlapping answer pools)
// so the inventory is VARIED, not just large.
const { kept, dropped } = dedup(eligible)

// Daily rotation is `todayIndex() % N`, so ARTEFACT ORDER is the daily schedule.
// Round-robin across families and space repeated entities apart, so consecutive
// days feel varied — a freshness-aware order baked in at generation time.
const order = diversifyOrder(kept)

const questions = order.map(({ c, e }) => ({
  id: slug(`${c.familyId}-${c.title}`),
  title: c.title,
  description: c.description,
  family: c.familyId,
  count: e.signals.count,
  score: e.score,
  // Answerability signals (also surfaced in the dev QA debug panel).
  comfortable: e.signals.comfortable, friction: e.signals.friction, effective: e.signals.effective,
  // `n` (normalised) is derived at load via norm(d) — not stored, to keep the pool lean.
  answers: e.answers.map(a => ({ d: a.d, p: a.p, y: a.y })),
}))

const outDir = path.join(__dirname, '..', '..', 'src', 'data', 'pointless')
mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, 'questions.generated.json'), JSON.stringify({
  meta: {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'qgen: predicate families → recognisability-scored pools → quality gates → near-duplicate dedup',
    candidates: candidates.length, eligible: eligible.length, deduped: dropped.length, shipped: kept.length,
  },
  questions,
}, null, 2))

console.log(`Pointless: ${candidates.length} candidates → ${eligible.length} eligible → ${kept.length} shipped (${dropped.length} near-duplicates dropped)`)
console.log('by family (eligible/total):')
for (const [f, v] of Object.entries(familyStats)) console.log(`  ${f.padEnd(14)} ${v.ok}/${v.total}`)
console.log('rejected (reason × count):')
for (const [r, n] of Object.entries(rejected).sort((a, b) => b[1] - a[1])) console.log(`  ${r.padEnd(26)} ${n}`)
console.log('near-duplicates dropped (sample):')
for (const d of dropped.slice(0, 8)) console.log(`  "${d.title}" ≈ "${d.dupOf}" (${d.why})`)
