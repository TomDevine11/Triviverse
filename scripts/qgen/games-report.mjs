// qgen/games-report — candidate generation + quality analysis for the CATEGORY
// games (Connections, Tic-Tac-Toe) over the expanded predicate universe. Produces
// REAL example puzzles/grids with quality signals so we can judge whether the
// richer category space yields good gameplay, not just more combinations.
// Deterministic (seeded). Read-only.
import { loadRegistry } from './registry.mjs'
import { makeResolver, TROPHIES, COMP_NAME, LEAGUE_COMPS } from './predicates.mjs'
import { candidateClubs, candidateNations } from './families.mjs'

const R = loadRegistry()
const resolve = makeResolver(R)
const reco = (id) => R.players.get(id)?.reco || 0
const name = (id) => R.players.get(id)?.name

// Seeded RNG (matches tictactoe.js style) for reproducible sampling.
function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647 }
function shuffle(a, rand) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1));[r[i], r[j]] = [r[j], r[i]] } return r }

// The expanded category universe (label, type, member set). Notable members only,
// so puzzles/grids are made of nameable players.
function buildCategories() {
  const cats = []
  for (const c of candidateClubs(R, { min: 120, minReco: 14 }).slice(0, 45)) cats.push({ label: c.name, type: 'club', set: R.clubMembers.get(c.cid) })
  for (const [tn, label] of TROPHIES) cats.push({ label: cap(label), type: 'trophy', set: R.trophyIndex.get(tn) || new Set() })
  for (const comp of LEAGUE_COMPS) cats.push({ label: COMP_NAME[comp].replace(/^the /, ''), type: 'league', set: resolve({ kind: 'league', comp }) })
  for (const { nat } of candidateNations(R, { min: 60 }).slice(0, 25)) cats.push({ label: nat, type: 'nationality', set: R.natIndex.get(nat) })
  return cats
}
const cap = (s) => s[0].toUpperCase() + s.slice(1)
const notableMembers = (set, bar = 45) => [...set].filter(id => reco(id) >= bar)

// ── CONNECTIONS ──────────────────────────────────────────────────────────────
// A puzzle = 4 categories; each contributes 4 members that are EXCLUSIVE to it
// among the four (guarantees a unique solution). We then MEASURE ambiguity: how
// many chosen players *also* belong to a rival group's broader membership (the
// near-miss traps that make Connections satisfying). Zero traps = flat; too many
// and it stops being uniquely solvable in spirit.
function connectionsPuzzle(cats, seed) {
  const rand = rng(seed)
  const pool = shuffle(cats.filter(c => notableMembers(c.set).length >= 6), rand)
  for (let i = 0; i < pool.length - 3; i++) {
    const combo = [pool[i]]
    for (let j = i + 1; j < pool.length && combo.length < 4; j++) {
      // avoid two categories of the same club-vs-league trivial containment
      if (combo.some(c => c.type === pool[j].type && c.type === 'league')) continue
      combo.push(pool[j])
    }
    if (combo.length < 4) continue
    const groups = []
    let ok = true
    for (let g = 0; g < 4; g++) {
      const others = combo.filter((_, k) => k !== g).map(c => c.set)
      const exclusive = notableMembers(combo[g].set).filter(id => !others.some(s => s.has(id)))
      if (exclusive.length < 4) { ok = false; break }
      groups.push({ label: combo[g].label, type: combo[g].type, players: shuffle(exclusive, rand).slice(0, 4) })
    }
    if (!ok) continue
    // ambiguity: chosen players who ALSO sit in a rival group's broad membership
    let traps = 0
    for (let g = 0; g < 4; g++) for (const id of groups[g].players) for (let h = 0; h < 4; h++) if (h !== g && combo[h].set.has(id)) traps++
    const types = new Set(groups.map(x => x.type)).size
    return { groups, traps, typeVariety: types, seed }
  }
  return null
}

// ── TIC-TAC-TOE ──────────────────────────────────────────────────────────────
// 3×3 grid = 3 row + 3 col categories. Quality = every cell solvable with ≥1
// NOTABLE answer (no dead cells), enough total answers, category-type variety, and
// no single category dominating (each row/col contributes).
function ttGrid(cats, seed) {
  const rand = rng(seed)
  const pool = shuffle(cats.filter(c => notableMembers(c.set, 40).length >= 3), rand)
  for (let attempt = 0; attempt < 60; attempt++) {
    const pick = shuffle(pool, rng(seed * 131 + attempt)).slice(0, 6)
    const rows = pick.slice(0, 3), cols = pick.slice(3, 6)
    const cells = []
    let ok = true, notableTotal = 0
    for (const r of rows) for (const c of cols) {
      const [a, b] = r.set.size < c.set.size ? [r.set, c.set] : [c.set, r.set]
      const inter = [...a].filter(id => b.has(id))
      const notable = inter.filter(id => reco(id) >= 30)
      if (notable.length < 1) { ok = false; break }
      notableTotal += notable.length
      cells.push({ rc: [r.label, c.label], answers: notable.length, sample: notable.sort((x, y) => reco(y) - reco(x)).slice(0, 2).map(name) })
    }
    if (!ok) continue
    const minCell = Math.min(...cells.map(c => c.answers))
    const types = new Set([...rows, ...cols].map(c => c.type)).size
    return { rows: rows.map(r => r.label), cols: cols.map(c => c.label), cells, minCell, avg: Math.round(notableTotal / 9), typeVariety: types, seed }
  }
  return null
}

const cats = buildCategories()
console.log(`### CATEGORY UNIVERSE: ${cats.length} (`, cats.reduce((m, c) => (m[c.type] = (m[c.type] || 0) + 1, m), {}), ')')

console.log('\n### CONNECTIONS — sample puzzles (richer categories)')
let shown = 0, tried = 0, trapSum = 0, made = 0
for (let seed = 1; shown < 6 && tried < 400; seed++, tried++) {
  const p = connectionsPuzzle(cats, seed * 2657)
  if (!p) continue
  made++; trapSum += p.traps
  if (p.typeVariety < 3) continue // want conceptually distinct groups
  shown++
  console.log(`\nPuzzle #${shown} (traps=${p.traps}, ${p.typeVariety} concept types):`)
  for (const g of p.groups) console.log(`  ${g.label.padEnd(26)} [${g.type}]  ${g.players.map(name).join(', ')}`)
}
console.log(`\nquality note: of ${made} solvable puzzles sampled, mean ambiguity traps = ${(trapSum / Math.max(1, made)).toFixed(1)} (0 = flat/too-easy, higher = more misdirection)`)

console.log('\n\n### TIC-TAC-TOE — sample grids (87-category universe)')
let g = 0
for (let seed = 1; g < 4 && seed < 200; seed++) {
  const grid = ttGrid(cats, seed * 7919)
  if (!grid || grid.minCell < 1) continue
  g++
  console.log(`\nGrid #${g}  (min cell answers=${grid.minCell}, avg=${grid.avg}, ${grid.typeVariety} category types):`)
  console.log(`        ${grid.cols.map(c => c.slice(0, 12).padEnd(13)).join('')}`)
  grid.rows.forEach((r, ri) => {
    const row = grid.cells.slice(ri * 3, ri * 3 + 3).map(c => (c.sample[0] || '—').slice(0, 12).padEnd(13)).join('')
    console.log(`  ${r.slice(0, 6).padEnd(7)} ${row}`)
  })
}
