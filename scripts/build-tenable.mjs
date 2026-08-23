// Build Football Tenable questions — a FUN-first, 100% Transfermarkt-sourced pool.
//
// Every question is a strict, tie-safe top-10 resolved from the daily-scraped fact
// tables (leagues, international caps/goals) — NO hand-typed answers, which go stale
// (e.g. a "World Cup top scorers" list frozen before a tournament). The only gate
// that matters for fun is: CAN A FAN NAME THIS LIST? So each list must have a
// recognisable top-10 with a marquee name near the top.
//
// What makes a list fun is mostly ENTITY PROMINENCE — a fan can name Germany's or
// Arsenal's top-10 but not the USA's or Slovakia's, no matter how many caps those
// players have. So questions are restricted to nations/clubs with a real density of
// genuine stars (derived from the data, no manual whitelist). The RANKING itself is
// always exact from the scraped data — this only decides what's fun to ship.
//
// Writes src/data/tenable.generated.json + an (empty) daily allowlist so the runtime
// falls back to each question's `daily` flag. Regenerate via `npm run build:tenable`.
import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { loadRegistry } from './qgen/registry.mjs'
import { COMP_NAME } from './qgen/predicates.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const R = loadRegistry()
const reco = (id) => R.players.get(id)?.reco || 0
const nm = (id) => R.players.get(id)?.name

// The real driver of "is this fun?" is ENTITY PROMINENCE — is this a nation/club the
// audience actually follows? A general fan can name Germany's or Arsenal's top-10 but
// not the USA's or Slovakia's, however many caps those players racked up. `reco`
// (which conflates "recently active in a big league" with fame — it rates Slovak
// journeymen highly) can't separate them, but the CONCENTRATION OF GENUINE STARS at
// an entity can, derived here from the data (no manual whitelist).
const STAR = 80          // reco of a genuine megastar (Kane/Müller/Messi ~100)
const natStars = new Map()
for (const p of R.players.values()) {
  if (reco(p.id) < STAR) continue
  for (const nat of p.nats) natStars.set(nat, (natStars.get(nat) || 0) + 1)
}
const NAT_MIN_STARS = 10   // ~11 nations (Spain…Switzerland); drops USA(2)/Slovakia(4)
const majorNation = (nat) => (natStars.get(nat) || 0) >= NAT_MIN_STARS

// Clubs: `reco` can't tell Liverpool from Villarreal — club STATURE isn't in the
// data (star density says Liverpool 24 ≈ Villarreal 21). For a "name this club's
// top-10" game the club itself must be globally famous, so club questions use a
// curated ELITE set. Small + stable; edit this list to add/remove a club.
const ELITE_RE = /real madrid|fc barcelona|^barcelona|atletico (de )?madrid|bayern|dortmund|paris saint|psg|manchester (city|united)|man (city|utd)|liverpool|chelsea|arsenal|tottenham|juventus|inter|milan|napoli/
const normClub = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const ELITE_IDS = new Set()
for (const [cid, name] of R.clubName) if (ELITE_RE.test(normClub(name))) ELITE_IDS.add(cid)
const eliteClub = (cid) => ELITE_IDS.has(cid)

// Per-player recognisability is now only a light backstop (the entity gate does the
// work), so a prominent entity's list isn't all obscure servants.
const notable = (id) => reco(id) >= 40
const marquee = (id) => reco(id) >= 65

const FUN_MIN = 4        // backstop: ≥ this many of the top-10 recognisable
const FUN_DAILY = 6      // ≥ this many ⇒ eligible for the DAILY rotation
const ANCHOR_IN = 5      // a marquee name must appear within the top-N
const FLOOR = { goals: 10, apps: 80, caps: 25, fee: 10_000_000 } // loosest per-unit tail floor (meta)

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Strict, tie-safe top-10 from [{id,value}]; null if it can't form a clean list.
function topTen(rows, floor) {
  if (rows.length < 10) return null
  // de-dup by display name (guards the "unique names" invariant)
  const seen = new Set(); rows = rows.filter(r => { const n = nm(r.id); if (!n || seen.has(n)) return false; seen.add(n); return true })
  rows.sort((a, b) => b.value - a.value || nm(a.id).localeCompare(nm(b.id)))
  const top = rows.slice(0, 10)
  if (top.length < 10 || top[9].value < floor) return null
  // A tie on the 10th value is NOT a reason to drop a good list (England's most
  // capped ties at 90). The extra tied record-holders join a tiePool so any of them
  // counts for the joint slot — same pattern as the marquee competition lists.
  const tied = rows.slice(10).filter(r => r.value === top[9].value)
  return { top, tieValue: tied.length ? top[9].value : undefined, tiePool: tied.length ? tied.map(r => ({ text: nm(r.id) })) : undefined }
}

const questions = []
function emit({ id, scope, title, description, icon, unit, list, detail }) {
  if (!list) return
  const { top, tieValue, tiePool } = list
  const recogN = top.filter(r => notable(r.id)).length
  const anchored = top.slice(0, ANCHOR_IN).some(r => marquee(r.id))
  if (recogN < FUN_MIN || !anchored) return
  const fmt = detail || ((v) => `${v} ${unit}`)
  const answers = top.map((r, i) => ({ rank: i + 1, text: nm(r.id), detail: fmt(r.value), value: r.value }))
  const q = { id, type: 'player', scope, title, description, icon, daily: recogN >= FUN_DAILY, answers }
  if (tieValue) { q.tieValue = tieValue; q.tiePool = tiePool }
  questions.push(q)
}

// ── International: most caps / top scorers per nation ────────────────────────
const nations = new Map()
for (const p of R.players.values()) for (const [tid, v] of p.caps) {
  if (!nations.has(tid)) nations.set(tid, [])
  nations.get(tid).push({ id: p.id, caps: v.caps, goals: v.goals })
}
for (const [tid, players] of nations) {
  const nation = R.nationName.get(tid)
  if (!nation || / U-?\d| B$| C$| [Ww]omen| Olympic/.test(nation)) continue // seniors only
  if (!majorNation(nation)) continue // only nations the audience actually follows
  const icon = { type: 'nationality', value: nation }
  const caps = topTen(players.map(p => ({ id: p.id, value: p.caps })), FLOOR.caps)
  if (caps) emit({ id: `gen-nat-${slug(nation)}-caps`, scope: 'nationality', title: `${nation} — Most Capped Players`, description: `Name the 10 players with the most caps for ${nation}.`, icon, unit: 'caps', list: caps })
  const goals = topTen(players.map(p => ({ id: p.id, value: p.goals })).filter(r => r.value > 0), 12)
  if (goals) emit({ id: `gen-nat-${slug(nation)}-goals`, scope: 'nationality', title: `${nation} — All-Time Top Goalscorers`, description: `Name the 10 all-time top goalscorers for ${nation}.`, icon, unit: 'goals', list: goals })
}

// ── Transfer fees: most expensive signings / sales (overall, per club, per league) ─
// Real permanent moves only, keeping each player's single biggest fee. Very fun and
// recognisable — these lists are recent by nature.
{
  const tr = require('../src/data/football501/transfers.generated.json')
  const clubName = new Map(Object.entries(tr.clubs))
  const feeDetail = (v) => `€${Math.round(v / 1e6)}m`
  const real = tr.transfers.filter(t => t[4] > 0 && t[5] !== 'loan' && t[5] !== 'end-of-loan')
  // dedup per player → biggest incoming fee; also index per destination + origin club
  const bestIn = new Map(), byTo = new Map(), byFrom = new Map()
  for (const [pid, from, to, , fee] of real) {
    if (!R.players.get(pid)) continue
    if (!bestIn.has(pid) || fee > bestIn.get(pid).fee) bestIn.set(pid, { id: pid, fee })
    const keep = (m, cid) => { if (!cid) return; if (!m.has(cid)) m.set(cid, new Map()); const g = m.get(cid); if (!g.has(pid) || fee > g.get(pid).fee) g.set(pid, { id: pid, fee }) }
    keep(byTo, to); keep(byFrom, from)
  }
  const feeRows = (m) => [...m.values()].map(r => ({ id: r.id, value: r.fee }))
  const emitFee = (id, scope, title, description, icon, list) =>
    list && emit({ id, scope, title, description, icon, unit: 'fee', list, detail: feeDetail })

  // Overall
  emitFee('gen-fee-all', 'competition', 'Most Expensive Signings of All Time',
    'Name the 10 players who moved for the biggest transfer fees ever.', { type: 'league', value: 'Transfers' }, topTen(feeRows(bestIn), 40_000_000))
  // Per destination club — record signings
  for (const [cid, m] of byTo) {
    const club = clubName.get(cid); if (!club || !eliteClub(cid)) continue
    emitFee(`gen-fee-in-${cid}`, 'club', `${club} — Record Signings`, `Name the 10 most expensive signings in ${club}'s history.`, { type: 'club', value: club }, topTen(feeRows(m), 18_000_000))
  }
  // Per origin club — biggest sales
  for (const [cid, m] of byFrom) {
    const club = clubName.get(cid); if (!club || !eliteClub(cid)) continue
    emitFee(`gen-fee-out-${cid}`, 'club', `${club} — Biggest Sales`, `Name the 10 players ${club} sold for the biggest fees.`, { type: 'club', value: club }, topTen(feeRows(m), 18_000_000))
  }
}

// ── Competition all-time: top scorers / most appearances ────────────────────
for (const comp of ['GB1', 'ES1', 'IT1', 'L1', 'FR1', 'CL']) {
  const compName = cap(COMP_NAME[comp])
  const icon = { type: 'league', value: compName }
  for (const [stat, unit, noun, floor] of [['goals', 'goals', 'Top Goalscorers', 40], ['apps', 'apps', 'Most Appearances', 250]]) {
    const rows = []
    for (const p of R.players.values()) { const v = p.comps[comp]?.[stat] || 0; if (v > 0) rows.push({ id: p.id, value: v }) }
    const top = topTen(rows, floor)
    if (top) emit({ id: `gen-comp-${comp}-${stat}`, scope: 'competition', title: `${compName} — All-Time ${noun}`, description: `Name the 10 players with the most ${compName} ${unit} of all time.`, icon, unit, list: top })
  }
}

// ── Club records within a competition ("PL Top Goalscorers for Arsenal") ─────
for (const comp of ['GB1', 'ES1', 'IT1', 'L1', 'FR1']) {
  const h = require(`../src/data/football501/history.${comp}.generated.json`)
  const compName = cap(COMP_NAME[comp])
  const byClub = new Map()
  for (const p of h.players) {
    const cc = p.comps?.[comp]; if (!cc?.clubs) continue
    for (const [cid, cv] of Object.entries(cc.clubs)) {
      if (!byClub.has(cid)) byClub.set(cid, [])
      byClub.get(cid).push({ id: p.id, goals: cv.goals || 0, apps: cv.apps || 0 })
    }
  }
  for (const [cid, players] of byClub) {
    const club = h.clubs?.[cid]?.name; if (!club || !eliteClub(cid)) continue
    const icon = { type: 'club', value: club }
    for (const [stat, unit, noun, floor] of [['goals', 'goals', 'Top Goalscorers', 20], ['apps', 'apps', 'Most Appearances', 90]]) {
      const top = topTen(players.map(p => ({ id: p.id, value: p[stat] })).filter(r => r.value > 0), floor)
      if (top) emit({ id: `gen-club-${comp}-${cid}-${stat}`, scope: 'club', title: `${compName} — ${noun} for ${club}`, description: `Name the 10 players with the most ${compName} ${unit} for ${club}.`, icon, unit, list: top })
    }
  }
}

// ── Nationality within a competition ("PL Top Brazilian Goalscorers") ────────
for (const comp of ['GB1', 'ES1', 'IT1', 'L1', 'FR1']) {
  const compName = cap(COMP_NAME[comp])
  const byNat = new Map()
  for (const p of R.players.values()) {
    const c = p.comps[comp]; if (!c) continue
    for (const nat of p.nats) { if (!byNat.has(nat)) byNat.set(nat, []); byNat.get(nat).push({ id: p.id, goals: c.goals, apps: c.apps }) }
  }
  for (const [nat, players] of byNat) {
    if (!majorNation(nat)) continue
    const icon = { type: 'nationality', value: nat }
    for (const [stat, unit, noun, floor] of [['goals', 'goals', 'Goalscorers', 25], ['apps', 'apps', 'Appearances', 120]]) {
      const top = topTen(players.map(p => ({ id: p.id, value: p[stat] })).filter(r => r.value > 0), floor)
      if (top) emit({ id: `gen-natcomp-${comp}-${slug(nat)}-${stat}`, scope: 'nationality', title: `${compName} — Top ${nat} ${noun}`, description: `Name the 10 top ${nat} ${stat === 'goals' ? 'goalscorers' : 'players by appearances'} in the ${compName}.`, icon, unit, list: top })
    }
  }
}

function cap(s) { return s.replace(/^the /, '') }

// De-dup any accidental id clashes (keep first).
const byId = new Map(); for (const q of questions) if (!byId.has(q.id)) byId.set(q.id, q)
const finalQs = [...byId.values()]

const outDir = path.join(__dirname, '..', 'src', 'data')
writeFileSync(path.join(outDir, 'tenable.generated.json'), JSON.stringify({
  meta: { generatedAt: new Date().toISOString().slice(0, 10), source: 'transfermarkt (leagues + international), fun-gated recognisable top-10s', floor: FLOOR, count: finalQs.length },
  questions: finalQs,
}, null, 2))
// Empty allowlist ⇒ the runtime falls back to each question's `daily` flag (no
// hand-maintained text file). Kept as a file so the import in tenable.js resolves.
writeFileSync(path.join(outDir, 'tenable.daily.generated.json'), JSON.stringify({ meta: { source: 'daily rotation is driven by the per-question `daily` flag' }, titles: [] }, null, 2))

const daily = finalQs.filter(q => q.daily).length
const byScope = finalQs.reduce((m, q) => (m[q.scope] = (m[q.scope] || 0) + 1, m), {})
console.log(`Tenable: ${finalQs.length} fun questions (${daily} daily-eligible)`)
console.log('by scope:', byScope)
