// Generate Football Pointless questions: for each, the full valid answer pool
// with a "how many of 100 would name this" score derived from Transfermarkt
// appearances/goals/recency (see the prototype). Writes a small artifact the
// client validates + scores against. Curve pushes most answers low so it feels
// like Pointless (only genuine stars score high).
import { createRequire } from 'module'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const COMPS = ['CL', 'ES1', 'FR1', 'GB1', 'IT1', 'L1']
const W = { GB1: 1.0, CL: 1.0, ES1: 0.95, IT1: 0.85, L1: 0.8, FR1: 0.7 }
const K_GOALS = 4

const players = new Map()
const clubs = {}
for (const c of COMPS) {
  const h = require(`../../src/data/football501/history.${c}.generated.json`)
  clubs[c] = h.clubs || {}
  for (const p of h.players) {
    let m = players.get(p.id)
    if (!m) { m = { id: p.id, name: p.name, pos: p.pos, last: 0, comps: {} }; players.set(p.id, m) }
    Object.assign(m.comps, p.comps)
    if ((p.last || 0) >= m.last) { m.last = p.last; m.pos = p.pos || m.pos }
  }
}
const all = [...players.values()]
const recency = (last) => 0.6 + 0.4 * Math.min(1, Math.max(0, (last - 1992) / (2026 - 1992)))
const nameability = (p) => Object.entries(p.comps).reduce((s, [c, v]) => s + (W[c] ?? 0.7) * (v.apps + K_GOALS * v.goals), 0) * recency(p.last)
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const clubId = (comp, re) => Object.entries(clubs[comp]).find(([, v]) => re.test(v.name))?.[0]

// Build a question from a predicate. Points = nameability as a % of the pool's
// most-nameable player (linear, NOT percentile) — fame is a power law, so this
// keeps only the genuine stars high and lets the long obscure tail fall to ~0,
// which is what real Pointless scoring looks like. `y` (last year) powers a
// "gettable deep cuts" reveal. Sorted ascending → first entries are pointless.
const FLOOR = 0.03 // players below FLOOR × the pool's star → a "pointless" band (0)
function build(id, title, description, pred) {
  const pool = all.filter(pred).map(p => ({ p, nm: nameability(p) })).sort((a, b) => a.nm - b.nm)
  const max = pool[pool.length - 1]?.nm || 1
  const pts = (nm) => Math.round(100 * Math.max(0, (nm / max - FLOOR) / (1 - FLOOR)))
  const answers = pool.map(({ p, nm }) => ({ n: norm(p.name), d: p.name, p: pts(nm), y: p.last || 0 }))
  return { id, title, description, count: pool.length, answers }
}

const lpool = clubId('GB1', /liverpool/i)
const real = clubId('ES1', /real madrid/i)
const barca = clubId('ES1', /fc barcelona/i)
const bayern = clubId('L1', /bayern munich|bayern münchen|fc bayern/i)

const questions = [
  build('pl-cl-scorers', 'Scored in the Premier League AND the Champions League', 'Name a player who has scored in both.',
    p => p.comps.GB1?.goals > 0 && p.comps.CL?.goals > 0 && (p.comps.GB1.apps + p.comps.CL.apps) >= 15),
  build('liverpool-pl', 'Played for Liverpool in the Premier League', 'Name anyone who made 5+ PL apps for Liverpool.',
    p => p.comps.GB1?.clubs?.[lpool]?.apps >= 5),
  build('real-laliga', 'Played for Real Madrid in La Liga', 'Name anyone with 5+ La Liga apps for Real Madrid.',
    p => p.comps.ES1?.clubs?.[real]?.apps >= 5),
  build('barca-laliga', 'Played for Barcelona in La Liga', 'Name anyone with 5+ La Liga apps for Barcelona.',
    p => p.comps.ES1?.clubs?.[barca]?.apps >= 5),
  build('seriea-pl', 'Played in BOTH Serie A and the Premier League', 'Name a player who appeared in both.',
    p => p.comps.IT1?.apps >= 5 && p.comps.GB1?.apps >= 5),
  build('bayern-bundesliga', 'Played for Bayern Munich in the Bundesliga', 'Name anyone with 5+ Bundesliga apps for Bayern.',
    p => p.comps.L1?.clubs?.[bayern]?.apps >= 5),
]

const outDir = path.join(__dirname, '..', '..', 'src', 'data', 'pointless')
mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, 'questions.generated.json'),
  JSON.stringify({ meta: { generatedAt: new Date().toISOString().slice(0, 10), source: 'transfermarkt apps/goals/recency, curved percentile' }, questions }, null, 2))
console.log('Wrote questions.generated.json:')
for (const q of questions) console.log(`  ${q.count.toString().padStart(4)} answers · ${q.title}`)
