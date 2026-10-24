// Generate Football Pointless questions from the qgen engine.
//
// Pipeline: question FAMILIES enumerate a large candidate space → the quality
// model resolves each candidate's COMPLETE answer pool (validation truth), scores
// nameability, and keeps only boards with an interesting rarity distribution →
// the survivors are interleaved for daily variety and written as the pre-scored
// artefact the client validates against. Deterministic: same data + code ⇒ same
// output. Recognisability shapes SELECTION and POINTS, never correctness — every
// player who genuinely appeared is a valid answer (and may score a "pointless" 0).
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadRegistry, norm } from '../qgen/registry.mjs'
import { makeResolver } from '../qgen/predicates.mjs'
import { pointlessFamilies } from '../qgen/families.mjs'
import { evaluateCandidate } from '../qgen/quality.mjs'
import { dedup, diversifyOrder } from '../qgen/similarity.mjs'
import { normalize } from '../../src/data/canonical/normalize.js'

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

// An answer whose name more than one player shares (two Nico Gonzálezes, or two
// namesakes on one board) carries that player's id as `i`, so a namesake picked
// from the dropdown isn't scored as them. Unique names stay id-free to keep the
// pool lean; the client matches those by name.
const ALIASES = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'src/data/canonical/players.aliases.generated.json'), 'utf8'))
function withIds(answers) {
  const count = new Map()
  for (const a of answers) count.set(normalize(a.d), (count.get(normalize(a.d)) || 0) + 1)
  return answers.map(a => {
    const k = normalize(a.d)
    const shared = Array.isArray(ALIASES[k]) || count.get(k) > 1
    return { d: a.d, p: a.p, y: a.y, ...(shared && a.id != null ? { i: `tm:${a.id}` } : {}) }
  })
}

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
  answers: withIds(e.answers),
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
