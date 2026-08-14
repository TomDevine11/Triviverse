// Prototype: infer a "how many of 100 would name this?" score for Pointless,
// from the Transfermarkt appearance/goal history. No fame field used.
//
//   nameability(p) = Σ_comp  w_comp · (apps + K·goals) · recency(last)
//
// Appearances = exposure backbone; goals weighted up (public remembers scorers);
// competitions weighted by audience; mild recency (legends stay nameable). Then
// each answer's points = its percentile within the QUESTION's answer pool
// (least nameable → 0 = the pointless jackpot; most nameable → 100 = obvious).
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const COMPS = ['CL', 'ES1', 'FR1', 'GB1', 'IT1', 'L1']
const W = { GB1: 1.0, CL: 1.0, ES1: 0.95, IT1: 0.85, L1: 0.8, FR1: 0.7 } // audience-ish
const K_GOALS = 4

// ── merge every competition's history into one player map (join by id) ────────
const players = new Map()
const clubName = {} // comp -> { clubId -> name }
for (const c of COMPS) {
  const h = require(`../../../src/data/football501/history.${c}.generated.json`)
  clubName[c] = h.clubs || {}
  for (const p of h.players) {
    let m = players.get(p.id)
    if (!m) { m = { id: p.id, name: p.name, pos: p.pos, last: 0, comps: {} }; players.set(p.id, m) }
    Object.assign(m.comps, p.comps)          // {GB1:{…}} ∪ {CL:{…}} → {GB1,CL}
    m.last = Math.max(m.last, p.last || 0)
    if (p.last >= m.last) m.pos = p.pos || m.pos
  }
}

const recency = (last) => 0.6 + 0.4 * Math.min(1, Math.max(0, (last - 1992) / (2026 - 1992)))
function nameability(p) {
  let raw = 0
  for (const [comp, s] of Object.entries(p.comps)) raw += (W[comp] ?? 0.7) * (s.apps + K_GOALS * s.goals)
  return raw * recency(p.last)
}

// least-nameable answer → 0 points (pointless); most → 100.
function board(pool) {
  const scored = pool.map(p => ({ p, n: nameability(p) })).sort((a, b) => a.n - b.n)
  const N = scored.length
  return scored.map((s, i) => ({ ...s, points: Math.round((i / (N - 1)) * 100) }))
}

function line(row, comps) {
  const p = row.p
  const stat = comps.map(c => p.comps[c] ? `${c} ${p.comps[c].apps}/${p.comps[c].goals}g` : null).filter(Boolean).join('  ')
  return `  ${String(row.points).padStart(3)}  ${p.name.slice(0, 26).padEnd(27)}${(p.pos || '').padEnd(4)} ${stat}  ·${p.last}`
}
function show(title, pool, comps) {
  const b = board(pool)
  console.log(`\n━━ ${title}  (${b.length} valid answers)`)
  console.log('  pts  player                     pos  stats (apps/goals) · last yr')
  console.log('  ── MOST OBVIOUS (high points = bad) ──')
  b.slice(-10).reverse().forEach(r => console.log(line(r, comps)))
  console.log('  ── MOST POINTLESS (low points = jackpot) ──')
  b.slice(0, 14).forEach(r => console.log(line(r, comps)))
}

const all = [...players.values()]

// Q1 — scored in BOTH the Premier League and the Champions League (apps floor to
// keep pointless answers real, not one-cap trialists).
show('Name a player who has scored in the Premier League AND the Champions League',
  all.filter(p => p.comps.GB1?.goals > 0 && p.comps.CL?.goals > 0 && (p.comps.GB1.apps + p.comps.CL.apps) >= 15),
  ['GB1', 'CL'])

// Q2 — played for Liverpool in the Premier League (club-filtered via the clubs map).
const lpoolId = Object.entries(clubName.GB1).find(([, v]) => /liverpool/i.test(v.name))?.[0]
show('Name a player who has played for Liverpool in the Premier League',
  all.filter(p => p.comps.GB1?.clubs?.[lpoolId] && p.comps.GB1.clubs[lpoolId].apps >= 5),
  ['GB1'])
