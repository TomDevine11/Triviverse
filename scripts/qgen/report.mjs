// qgen/report — demonstrates the expanded question space across the game suite
// using the SAME engine (registry → predicates → quality). Pointless is already
// wired live (gen-pointless.mjs); Tenable / Higher-Lower / Tic-Tac-Toe candidate
// spaces are generated here to prove the expansion is suite-wide and to quantify
// eligible inventory before their live generators are migrated in later stages.
// Read-only: prints numbers + examples, writes nothing to runtime artefacts.
import { loadRegistry } from './registry.mjs'
import { makeResolver, TROPHIES, COMP_NAME, LEAGUE_COMPS } from './predicates.mjs'
import { pointlessFamilies, candidateClubs, candidateNations } from './families.mjs'
import { evaluateCandidate, RECO_BAR } from './quality.mjs'

const R = loadRegistry()
const resolve = makeResolver(R)
const H = (s) => console.log(`\n### ${s}`)
const reco = (id) => R.players.get(id)?.reco || 0

// ── POINTLESS ────────────────────────────────────────────────────────────────
H('POINTLESS')
{
  const cands = pointlessFamilies(R)
  const rej = {}; let ok = 0; const good = []
  for (const c of cands) { const e = evaluateCandidate(c, 'pointless', R, resolve); if (e.ok) { ok++; good.push({ c, e }) } else for (const r of e.reasons) rej[r] = (rej[r] || 0) + 1 }
  good.sort((a, b) => b.e.score - a.e.score)
  console.log(`old eligible: 6 (hand-authored)   →   new candidates: ${cands.length}   new eligible: ${ok}   (${(100 * ok / cands.length).toFixed(0)}% kept)`)
  console.log(`daily inventory: ${ok} boards ≈ ${(ok / 365).toFixed(1)} years before repeat`)
  console.log('rejections:', Object.entries(rej).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '))
  console.log('quality score distribution:', dist(good.map(g => g.e.score)))
  console.log('example NEW families (strong):')
  for (const fam of ['both-clubs', 'club-trophy', 'nat-league', 'trophy', 'scored-both']) {
    const g = good.find(x => x.c.familyId === fam); if (g) console.log(`  [${g.e.score}] ${g.c.title}  (pool ${g.e.signals.count}, ${g.e.signals.surface} nameable, ${Math.round(g.e.signals.zeroShare * 100)}% pointless tail)`)
  }
  console.log('deliberately REJECTED examples:')
  let shown = 0
  for (const c of cands) { const e = evaluateCandidate(c, 'pointless', R, resolve); if (!e.ok) { console.log(`  ${e.reasons.join('+').padEnd(28)} ${c.title.slice(0, 50)} (pool ${e.signals.count}, ${e.signals.surface} retrievable surface)`); if (++shown >= 4) break } }
}

// ── TENABLE (ranked top-10s) ────────────────────────────────────────────────
H('TENABLE')
{
  const cands = []
  // NEW families: most-capped + most international goals, per nation.
  for (const { nat } of candidateNations(R, { min: 40 })) {
    // map nationality → the intl national-team pool via caps on players of that nat
    const capsPool = [], goalsPool = []
    for (const id of R.natIndex.get(nat) || []) {
      const pl = R.players.get(id); let caps = 0, ig = 0
      for (const v of pl.caps.values()) { caps += v.caps; ig += v.goals } // career international totals
      if (caps > 0) capsPool.push({ id, value: caps })
      if (ig > 0) goalsPool.push({ id, value: ig })
    }
    cands.push({ game: 'tenable', title: `Most-capped ${nat} players`, pool: capsPool, floor: 20 })
    cands.push({ game: 'tenable', title: `${nat}'s top international goalscorers`, pool: goalsPool, floor: 10 })
  }
  // Existing-style families (club records) for comparison.
  for (const c of candidateClubs(R, { min: 120, minReco: 10 }).slice(0, 60)) {
    const apps = [], goals = []
    for (const id of R.clubMembers.get(c.cid)) { const cc = R.players.get(id).clubApps.get(c.cid); apps.push({ id, value: cc.apps }); goals.push({ id, value: cc.goals }) }
    cands.push({ game: 'tenable', title: `${c.name} — most appearances`, pool: apps, floor: 100 })
    cands.push({ game: 'tenable', title: `${c.name} — top scorers`, pool: goals, floor: 20 })
  }
  const rej = {}; const good = []
  for (const c of cands) { const e = evaluateCandidate(c, 'tenable', R, resolve); if (e.ok) good.push({ c, e }); else for (const r of e.reasons) rej[r] = (rej[r] || 0) + 1 }
  good.sort((a, b) => b.e.score - a.e.score)
  console.log(`old inventory: 380   →   new candidates: ${cands.length}   new eligible (tie-safe, ≥3 famous): ${good.length}`)
  console.log('rejections:', Object.entries(rej).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '))
  console.log('example NEW rankings (caps/intl-goals were previously ungenerated):')
  for (const g of good.filter(x => /capped|international/.test(x.c.title)).slice(0, 5)) console.log(`  [${g.e.score}] ${g.c.title}  → #1 ${R.players.get(g.e.answers[0].id).name} (${g.e.answers[0].value})`)
  console.log('deliberately REJECTED examples:')
  let k = 0; for (const c of cands) { const e = evaluateCandidate(c, 'tenable', R, resolve); if (!e.ok) { console.log(`  ${e.reasons.join('+').padEnd(26)} ${c.title.slice(0, 48)}`); if (++k >= 3) break } }
}

// ── HIGHER / LOWER (numeric leaderboards) ───────────────────────────────────
H('HIGHER / LOWER')
{
  const cands = []
  for (const comp of [...LEAGUE_COMPS, 'CL']) {
    for (const stat of ['goals', 'apps']) {
      const pool = []
      for (const pl of R.players.values()) { const v = pl.comps[comp]?.[stat] || 0; if (v > 0) pool.push({ id: pl.id, value: v }) }
      cands.push({ game: 'higherlower', title: `${COMP_NAME[comp]} — career ${stat}`, pool })
    }
  }
  // international caps + goals leaderboards (new)
  for (const stat of ['caps', 'goals']) {
    const pool = []
    for (const pl of R.players.values()) { let v = 0; for (const c of pl.caps.values()) v += c[stat]; if (v > 0) pool.push({ id: pl.id, value: v }) }
    cands.push({ game: 'higherlower', title: `International ${stat}`, pool })
  }
  const good = [], rej = {}
  for (const c of cands) { const e = evaluateCandidate(c, 'higherlower', R, resolve); if (e.ok) good.push({ c, e }); else for (const r of e.reasons) rej[r] = (rej[r] || 0) + 1 }
  console.log(`old modes: 5   →   new candidate modes: ${cands.length}   eligible: ${good.length}`)
  for (const g of good) console.log(`  [${g.e.score}] ${g.c.title}  (${g.e.signals.recallable} recallable entries)`)
}

// ── TIC-TAC-TOE (category universe) ─────────────────────────────────────────
H('TIC-TAC-TOE (category intersection space)')
{
  const cats = []
  for (const c of candidateClubs(R, { min: 120, minReco: 12 }).slice(0, 40)) cats.push({ label: c.name, set: R.clubMembers.get(c.cid) })
  for (const [name, label] of TROPHIES) cats.push({ label, set: R.trophyIndex.get(name) || new Set() })
  for (const comp of LEAGUE_COMPS) cats.push({ label: COMP_NAME[comp], set: resolve({ kind: 'league', comp }) })
  for (const { nat } of candidateNations(R, { min: 60 }).slice(0, 25)) cats.push({ label: nat, set: R.natIndex.get(nat) })
  // A grid CELL is playable if its two categories share ≥2 NOTABLE players.
  let playable = 0, total = 0
  for (let i = 0; i < cats.length; i++) for (let j = i + 1; j < cats.length; j++) {
    total++
    let notable = 0
    const [a, b] = cats[i].set.size < cats[j].set.size ? [cats[i].set, cats[j].set] : [cats[j].set, cats[i].set]
    for (const id of a) { if (b.has(id) && reco(id) >= RECO_BAR) { if (++notable >= 2) break } }
    if (notable >= 2) playable++
  }
  console.log(`old category universe: 24 clubs + 3 trophies + leagues + nations`)
  console.log(`new category universe: ${cats.length} categories (40 clubs + ${TROPHIES.length} trophies + ${LEAGUE_COMPS.length} leagues + 25 nations)`)
  console.log(`playable intersections (≥2 notable shared): ${playable} of ${total} category pairs  → the pool the grid solver draws from`)
}

function dist(vals) {
  const b = { '0-40': 0, '40-60': 0, '60-75': 0, '75-90': 0, '90+': 0 }
  for (const v of vals) b[v < 40 ? '0-40' : v < 60 ? '40-60' : v < 75 ? '60-75' : v < 90 ? '75-90' : '90+']++
  return Object.entries(b).map(([k, n]) => `${k}:${n}`).join('  ')
}
