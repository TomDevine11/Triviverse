// qgen/tenable-build — a fun-first Tenable generator (prototype/report).
//
// What makes a good Tenable question? Diagnosis of the current pool: 61% of the 380
// auto-generated lists have ≤2 recognisable players in their top-10 — you literally
// can't name them ("Most Appearances for 1.FC Köln"). The generator never asked the
// only question that matters for fun: CAN A FAN NAME THIS LIST?
//
// A fun Tenable top-10:
//   1. an iconic, instantly-understood category (a big club / nation / competition),
//   2. a RECOGNISABLE top-10 — you can name most of it,
//   3. a star anchor near the top to draw you in,
//   4. a clean strict ranking with no ambiguous tie at the cut line,
//   5. gettable but not trivial — a few you'll miss.
//
// This builds a large candidate pool across those families and hard-gates every one
// on recognisability. Read-only report for now.
import { loadRegistry } from './registry.mjs'
import { COMP_NAME } from './predicates.mjs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const R = loadRegistry()
const reco = (id) => R.players.get(id)?.reco || 0
const name = (id) => R.players.get(id)?.name

// Tenable NOTABILITY is deliberately RECENCY-AGNOSTIC — unlike Pointless, Tenable is
// a knowledge game about all-time greats, and `reco` (recency-weighted contemporary
// fame) rates Maradona/Ronaldo/Lineker near zero. A player is nameable for a Tenable
// list if they are contemporarily famous OR a genuine great by any recency-free
// marker: heavily capped, prolific/long career in a top league, or a major honour.
const MAJOR_HONOUR = new Set(['World Cup winner', 'UEFA Champions League winner', 'European champion',
  'Copa América winner', 'English Champion', 'Spanish champion', 'Italian champion', 'German Champion', 'French champion'])
const careerGoals = (p) => { let s = 0; for (const c in p.comps) s += p.comps[c].goals; return s }
const careerApps = (p) => { let s = 0; for (const c in p.comps) s += p.comps[c].apps; return s }
const maxCaps = (p) => { let m = 0; for (const v of p.caps.values()) m = Math.max(m, v.caps); return m }
const majorHonour = (p) => { for (const t of p.trophies.keys()) if (MAJOR_HONOUR.has(t)) return true; return false }
function notable(id) {
  const p = R.players.get(id); if (!p) return false
  // NB: caps are deliberately NOT a notability marker — for the "most capped" family
  // that would be circular (every member has caps), making every nation pass. Judge
  // by club-career fame + honours instead, so France passes and Paraguay doesn't.
  return reco(id) >= 35 || careerGoals(p) >= 110 || careerApps(p) >= 380 || majorHonour(p)
}
// A marquee name that draws you into the list (near the top).
function marquee(id) {
  const p = R.players.get(id); if (!p) return false
  return reco(id) >= 55 || maxCaps(p) >= 90 || careerGoals(p) >= 150 || majorHonour(p)
}

// Fun gate thresholds.
const FUN_MIN = 6         // at least this many of the top-10 must be nameable
const ANCHOR_IN = 5       // a marquee name must appear within the top-N

// Build a strict, tie-safe top-10 from scored rows [{id,value}]; null if it can't.
function topTen(rows, floor) {
  if (rows.length < 10) return null
  rows.sort((a, b) => b.value - a.value || name(a.id).localeCompare(name(b.id)))
  const top = rows.slice(0, 10)
  if (top[9].value < floor) return null                          // tail too weak to be a real record
  if (rows.length > 10 && rows[10].value === top[9].value) return null // ambiguous cutoff
  return top
}

// Fun evaluation: is this a nameable list with a marquee name near the top?
function evalList(top) {
  const recog = top.filter(r => notable(r.id)).length
  const anchored = top.slice(0, ANCHOR_IN).some(r => marquee(r.id))
  const ok = recog >= FUN_MIN && anchored
  return { ok, recog, anchored }
}

const candidates = []
const add = (family, title, unit, top) => {
  const ev = evalList(top)
  candidates.push({ family, title, unit, top, ...ev })
}

// ── Family 1&2: International — most caps / top scorers per nation ────────────
const nationTeams = new Map() // tid -> [{id, caps, goals}]
for (const p of R.players.values()) {
  for (const [tid, v] of p.caps) {
    if (!nationTeams.has(tid)) nationTeams.set(tid, [])
    nationTeams.get(tid).push({ id: p.id, caps: v.caps, goals: v.goals })
  }
}
for (const [tid, players] of nationTeams) {
  const nation = R.nationName.get(tid); if (!nation) continue
  const caps = topTen(players.map(p => ({ id: p.id, value: p.caps })), 25)
  if (caps) add('nation-caps', `${nation} — Most Capped Players`, 'caps', caps)
  const goals = topTen(players.map(p => ({ id: p.id, value: p.goals })).filter(r => r.value > 0), 12)
  if (goals) add('nation-goals', `${nation} — All-Time Top Goalscorers`, 'goals', goals)
}

// ── Family 3: Competition all-time — top scorers / most appearances ──────────
for (const comp of ['GB1', 'ES1', 'IT1', 'L1', 'FR1', 'CL']) {
  for (const [stat, unit, noun, floor] of [['goals', 'goals', 'Top Goalscorers', 40], ['apps', 'apps', 'Most Appearances', 250]]) {
    const rows = []
    for (const p of R.players.values()) { const v = p.comps[comp]?.[stat] || 0; if (v > 0) rows.push({ id: p.id, value: v }) }
    const top = topTen(rows, floor)
    if (top) add('competition', `${cap(COMP_NAME[comp])} — All-Time ${noun}`, unit, top)
  }
}

// ── Family 4: Club records within a competition ("PL top scorers for Arsenal") ─
// Uses the per-competition per-club split from the history fact tables (the
// registry only keeps career-wide club totals), so numbers are true single-comp.
for (const comp of ['GB1', 'ES1', 'IT1', 'L1', 'FR1']) {
  const h = require(`../../src/data/football501/history.${comp}.generated.json`)
  const clubName = new Map(Object.entries(h.clubs || {}).map(([cid, c]) => [cid, c.name]))
  const byClub = new Map() // cid -> [{ id, goals, apps }]
  for (const p of h.players) {
    const cc = p.comps?.[comp]; if (!cc?.clubs) continue
    for (const [cid, cv] of Object.entries(cc.clubs)) {
      if (!byClub.has(cid)) byClub.set(cid, [])
      byClub.get(cid).push({ id: p.id, goals: cv.goals || 0, apps: cv.apps || 0 })
    }
  }
  for (const [cid, players] of byClub) {
    const club = clubName.get(cid); if (!club) continue
    for (const [stat, unit, noun, floor] of [['goals', 'goals', 'Top Goalscorers', 20], ['apps', 'apps', 'Most Appearances', 90]]) {
      const top = topTen(players.map(p => ({ id: p.id, value: p[stat] })).filter(r => r.value > 0), floor)
      if (top) add('club-in-comp', `${cap(COMP_NAME[comp])} — ${noun} for ${club}`, unit, top)
    }
  }
}

// ── Family 5: Nationality within a competition (e.g. Brazilians in the PL) ───
for (const comp of ['GB1', 'ES1', 'IT1', 'L1', 'FR1']) {
  const byNat = new Map() // nat -> [{id, goals, apps}]
  for (const p of R.players.values()) {
    const c = p.comps[comp]; if (!c) continue
    for (const nat of p.nats) {
      if (!byNat.has(nat)) byNat.set(nat, [])
      byNat.get(nat).push({ id: p.id, goals: c.goals, apps: c.apps })
    }
  }
  for (const [nat, players] of byNat) {
    for (const [stat, unit, noun, floor] of [['goals', 'goals', 'Goalscorers', 25], ['apps', 'apps', 'Appearances', 120]]) {
      const top = topTen(players.map(p => ({ id: p.id, value: p[stat] })).filter(r => r.value > 0), floor)
      if (top) add('nat-in-comp', `${cap(COMP_NAME[comp])} — Top ${nat} ${noun}`, unit, top)
    }
  }
}

function cap(s) { return s.replace(/^the /, '') }

// ── Report ───────────────────────────────────────────────────────────────────
const fun = candidates.filter(c => c.ok).sort((a, b) => b.recog - a.recog)
const byFam = {}
for (const c of candidates) { const f = byFam[c.family] ||= { total: 0, fun: 0 }; f.total++; if (c.ok) f.fun++ }
console.log(`CANDIDATES: ${candidates.length}   FUN (nameable top-10 + star anchor): ${fun.length}`)
console.log('by family (fun/total):', Object.entries(byFam).map(([k, v]) => `${k} ${v.fun}/${v.total}`).join('  '))
const dist = { '6': 0, '7': 0, '8': 0, '9': 0, '10': 0 }
for (const c of fun) dist[Math.min(10, c.recog)]++
console.log('recognisable-in-top-10 distribution (fun set):', Object.entries(dist).map(([k, v]) => `${k}:${v}`).join('  '))

console.log('\n=== 20 FUN example questions (recognisable count · top of list) ===')
for (const c of [...fun].filter(c => c.family !== 'nat-in-comp').slice(0, 14).concat(fun.filter(c => c.family === 'nat-in-comp').slice(0, 6))) {
  console.log(`\n[${c.recog}/10 recognisable] ${c.title}`)
  console.log('   ' + c.top.slice(0, 6).map(r => `${name(r.id)} (${r.value})`).join(', '))
}
