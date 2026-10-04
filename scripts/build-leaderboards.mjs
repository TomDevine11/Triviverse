#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD LEADERBOARDS  →  src/data/canonical/stats.generated.json
//
// Build-time refresh of the all-time top-scorer leaderboards that power Higher
// or Lower. Output schema is UNCHANGED (five01.js consumes it as-is).
//
// Sources (all Transfermarkt, all offline — RFC-001 C7 retired Wikipedia):
//   • The four CLUB-competition boards (Premier League, La Liga, Bundesliga,
//     Champions League) derive from the canonical Performance career-rollup
//     (history.<comp> — proven == rollup of performance.<comp>, C5/C6).
//   • intl-goals derives from the canonical international facts (intl.generated,
//     player×nationalTeam caps+goals scraped from Transfermarkt, C7).
//   So one football-data refresh keeps Higher or Lower in sync (no external drift).
//
// Safety guard (unchanged): loads the EXISTING stats file first and only
// replaces a board if the fresh build looks sane (>= MIN_ROWS, not a big shrink
// vs existing). A missing source keeps that board's last-good values. Exits
// non-zero only on a real failure.
//
// ALSO emits src/data/higherlower.generated.json — the slim, per-stat Higher or
// Lower pools (goals + appearances for six competitions, international goals +
// caps). Those are fame-gated rather than top-N, so they are a separate artefact:
// stats.generated.json stays the 501/shorts top-scorer boards, untouched.
//
// Run:  node scripts/build-leaderboards.mjs   (offline)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'src', 'data', 'canonical', 'stats.generated.json')

// challengeId → source + display meta (output schema must match what five01.js
// expects). `comp` = derive OFFLINE from that Transfermarkt history table;
// `intl` = derive from the canonical international facts (intl.generated.json).
const LEADERBOARDS = {
  'intl-goals':       { intl: true,  competition: 'International',     statLabel: 'international goals' },
  'ucl-goals':        { comp: 'CL',  competition: 'Champions League', statLabel: 'Champions League goals' },
  'prem-goals':       { comp: 'GB1', competition: 'Premier League',   statLabel: 'Premier League goals' },
  'laliga-goals':     { comp: 'ES1', competition: 'La Liga',          statLabel: 'La Liga goals' },
  'bundesliga-goals': { comp: 'L1',  competition: 'Bundesliga',       statLabel: 'Bundesliga goals' },
}

const HISTORY = (comp) => path.join(__dirname, '..', 'src', 'data', 'football501', `history.${comp}.generated.json`)
const INTL = path.join(__dirname, '..', 'src', 'data', 'football501', 'intl.generated.json')
const DEFAULT_LIMIT = 40     // board depth when there's no existing board to match
const MIN_ROWS = 10          // a sane board must have at least this many players
const SHRINK_FLOOR = 0.8     // reject a refresh that drops below 80% of existing size

// Build a club-competition board from a Transfermarkt history fact table:
// { name: goals } for the top `limit` scorers. Namesakes (two different tm
// players sharing a display name) are merged to the higher tally and counted.
function buildClubBoard(comp, limit) {
  const file = HISTORY(comp)
  if (!existsSync(file)) throw new Error(`missing ${path.basename(file)}`)
  const players = JSON.parse(readFileSync(file, 'utf8')).players || []
  const byName = new Map()
  let namesakes = 0
  for (const p of players) {
    const goals = p.comps?.[comp]?.goals || 0
    if (goals <= 0) continue
    if (byName.has(p.name)) { namesakes++; byName.set(p.name, Math.max(byName.get(p.name), goals)) }
    else byName.set(p.name, goals)
  }
  const top = [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  return { players: Object.fromEntries(top), namesakes }
}

// Build the international goals board from the canonical international facts
// (intl.generated.json), joined with player names from the history tables. Every
// scraped intl player came from the history universe, so names always resolve.
function buildIntlBoard(limit) {
  if (!existsSync(INTL)) throw new Error('missing intl.generated.json (run build:intl)')
  const { intl } = JSON.parse(readFileSync(INTL, 'utf8'))
  const name = new Map()
  for (const c of ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']) {
    if (!existsSync(HISTORY(c))) continue
    for (const p of JSON.parse(readFileSync(HISTORY(c), 'utf8')).players) if (!name.has(p.id)) name.set(p.id, p.name)
  }
  const byName = new Map()
  let namesakes = 0
  for (const [pid, , , goals] of intl) {
    if (goals <= 0) continue
    const nm = name.get(pid); if (!nm) continue
    if (byName.has(nm)) { namesakes++; byName.set(nm, Math.max(byName.get(nm), goals)) }
    else byName.set(nm, goals)
  }
  const top = [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  return { players: Object.fromEntries(top), namesakes }
}

function loadExisting() {
  try { return JSON.parse(readFileSync(OUT, 'utf8')) } catch { return { meta: {}, challenges: {} } }
}

async function main() {
  const existing = loadExisting()
  const out = {
    meta: { source: 'transfermarkt (club history + international)', fetchedAt: new Date().toISOString().slice(0, 10) },
    challenges: {},
  }
  let refreshed = 0, kept = 0

  for (const [id, cfg] of Object.entries(LEADERBOARDS)) {
    const prev = existing.challenges?.[id]
    const prevCount = prev ? Object.keys(prev.players || {}).length : 0
    try {
      let players, source

      const limit = prevCount || DEFAULT_LIMIT
      if (cfg.comp) {
        // Club board: derive offline from the Transfermarkt history fact table,
        // matching the existing board depth so the pool never shrinks.
        const built = buildClubBoard(cfg.comp, limit)
        players = built.players
        source = `transfermarkt:${cfg.comp}`
        process.stderr.write(`  ${id} (${cfg.comp})… ${built.namesakes ? `${built.namesakes} namesake(s) merged; ` : ''}`)
      } else if (cfg.intl) {
        // International board: derive offline from the canonical intl facts.
        const built = buildIntlBoard(limit)
        players = built.players
        source = 'transfermarkt:intl'
        process.stderr.write(`  ${id} (international)… ${built.namesakes ? `${built.namesakes} namesake(s) merged; ` : ''}`)
      } else {
        throw new Error(`unknown board config for ${id}`)
      }

      const count = Object.keys(players).length
      if (count < MIN_ROWS) throw new Error(`only ${count} rows (< ${MIN_ROWS})`)
      if (prevCount && count < prevCount * SHRINK_FLOOR) throw new Error(`suspicious shrink ${prevCount} → ${count}`)
      out.challenges[id] = { competition: cfg.competition, statLabel: cfg.statLabel, source, players }
      refreshed++
      process.stderr.write(`${count} players ✓\n`)
    } catch (err) {
      if (prev) {
        out.challenges[id] = prev // keep last-good data
        kept++
        process.stderr.write(`  ${id}: FAILED (${err.message}) — kept ${prevCount} existing\n`)
      } else {
        process.stderr.write(`  ${id}: FAILED (${err.message}) — no existing data!\n`)
      }
    }
  }

  if (Object.keys(out.challenges).length < Object.keys(LEADERBOARDS).length) {
    console.error(`✗ Missing leaderboards (have ${Object.keys(out.challenges).length}/${Object.keys(LEADERBOARDS).length}) — not writing.`)
    process.exit(1)
  }

  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
  console.error(`\nWrote ${OUT} — ${refreshed} refreshed, ${kept} kept from last-good.`)
}

// ── Higher or Lower pools ────────────────────────────────────────────────
// One pool per stat. A player is eligible when they clear the stat's FLOOR (so a
// famous player with 3 appearances never enters an appearances pool) AND either
//   • fame ≥ FAME_MIN — recognisable to a football fan, or
//   • they are a RECORD-HOLDER: top RECORD_RANK for that stat, however obscure
//     their fame score (Zarra, Onnis, Klaus Fischer sit near the top of all-time
//     boards but score low on every fame signal we have).
// Fame = max(registry fame, recognisability), plus a floor for major honours.
// Recognisability is the sanctioned signal but is deliberately recency-weighted
// (Gerd Müller ≈ 12), which is wrong for ALL-TIME career totals; the registry's
// legacy fame keeps most legends, but it has holes (Ronaldo Nazário and Lothar
// Matthäus both score 0), so a World Cup / Euro / Copa América / Champions League
// winner or Ballon d'Or holder is always treated as recognisable.
const HL_OUT = path.join(__dirname, '..', 'src', 'data', 'higherlower.generated.json')
const REGISTRY = path.join(__dirname, '..', 'src', 'data', 'canonical', 'players.registry.json')
const RECOG = path.join(__dirname, '..', 'src', 'data', 'recognisability.generated.json')
const FAME_MIN = 55
const RECORD_RANK = 50   // the old top-scorer boards ran 28–55 deep; every name they showed stays
const HONOURS = path.join(__dirname, '..', 'src', 'data', 'football501', 'honours.generated.json')
const MAJOR_HONOURS = new Set(['World Cup winner', 'World Cup', 'European champion', 'UEFA Euro', 'Copa América winner', 'Copa América', 'UEFA Champions League winner', 'UEFA Champions League', "Winner Ballon d'Or"])
const HL_MIN_POOL = 40   // a stat with fewer eligible players is dropped (and reported)

// id → { src, field, floor, competition, label, kind }. `src` is a history comp
// code or 'intl'. Floors are per stat: league goals ≥ 20 and apps ≥ 50 are a real
// top-flight career; the CL and international boards run lower by nature.
const HL_STATS = {
  'prem-goals':       { src: 'GB1',  field: 'goals', floor: 20, competition: 'Premier League',   label: 'Premier League goals' },
  'prem-apps':        { src: 'GB1',  field: 'apps',  floor: 50, competition: 'Premier League',   label: 'Premier League appearances' },
  'ucl-goals':        { src: 'CL',   field: 'goals', floor: 5,  competition: 'Champions League', label: 'Champions League goals' },
  'ucl-apps':         { src: 'CL',   field: 'apps',  floor: 20, competition: 'Champions League', label: 'Champions League appearances' },
  'intl-goals':       { src: 'intl', field: 'goals', floor: 10, competition: 'International',    label: 'international goals' },
  'intl-caps':        { src: 'intl', field: 'caps',  floor: 20, competition: 'International',    label: 'international caps' },
  'laliga-goals':     { src: 'ES1',  field: 'goals', floor: 20, competition: 'La Liga',          label: 'La Liga goals' },
  'laliga-apps':      { src: 'ES1',  field: 'apps',  floor: 50, competition: 'La Liga',          label: 'La Liga appearances' },
  'seriea-goals':     { src: 'IT1',  field: 'goals', floor: 20, competition: 'Serie A',          label: 'Serie A goals' },
  'seriea-apps':      { src: 'IT1',  field: 'apps',  floor: 50, competition: 'Serie A',          label: 'Serie A appearances' },
  'bundesliga-goals': { src: 'L1',   field: 'goals', floor: 20, competition: 'Bundesliga',       label: 'Bundesliga goals' },
  'bundesliga-apps':  { src: 'L1',   field: 'apps',  floor: 50, competition: 'Bundesliga',       label: 'Bundesliga appearances' },
  'ligue1-goals':     { src: 'FR1',  field: 'goals', floor: 20, competition: 'Ligue 1',          label: 'Ligue 1 goals' },
  'ligue1-apps':      { src: 'FR1',  field: 'apps',  floor: 50, competition: 'Ligue 1',          label: 'Ligue 1 appearances' },
}

// Club stats: a club's league goals/appearances FOR THAT CLUB ("Premier League
// goals for Arsenal"). Clubs are chosen by the data, not a list: both pools must
// reach HL_MIN_POOL and at least CLUB_FAMOUS of the scorers must be recognisable
// on fame alone — otherwise the pool is mostly record-holders nobody knows.
const CLUB_COMPS = { GB1: 'prem', ES1: 'laliga', IT1: 'seriea', L1: 'bundesliga', FR1: 'ligue1' }
const CLUB_FLOOR = { goals: 5, apps: 30 }
const CLUB_RECORD_RANK = 30
const CLUB_FAMOUS = 35
// Display names for the clubs that qualify today; anything else falls back to
// stripping the legal-form affixes ("Sevilla FC" → "Sevilla").
const CLUB_SHORT = {
  'FC Barcelona': 'Barcelona', 'Inter Milan': 'Inter', 'Juventus FC': 'Juventus', 'Chelsea FC': 'Chelsea',
  'Arsenal FC': 'Arsenal', 'AS Roma': 'Roma', 'AS Monaco': 'Monaco', 'Olympique Marseille': 'Marseille',
  'ACF Fiorentina': 'Fiorentina', 'Atlético de Madrid': 'Atlético Madrid', 'Liverpool FC': 'Liverpool',
  'Tottenham Hotspur': 'Tottenham', 'Olympique Lyon': 'Lyon', 'SSC Napoli': 'Napoli', 'SS Lazio': 'Lazio',
  'Bayer 04 Leverkusen': 'Leverkusen', 'AC Milan': 'AC Milan',
}
const shortClub = (n) => CLUB_SHORT[n] || n.replace(/^(FC|AC|AS|SSC|ACF|SS|RCD|CA|CD|SV|VfL|TSG|1\.\s?FC) /, '').replace(/ (FC|CF|BC|CFC)$/, '')

// Single-season bests: a player's most goals in one season of a competition
// (summed across clubs if they moved mid-season). From canonical Performance.
const SEASON_STATS = {
  'prem-season':       { src: 'GB1', floor: 10, competition: 'Premier League',   label: 'Most Premier League goals in a season' },
  'laliga-season':     { src: 'ES1', floor: 10, competition: 'La Liga',          label: 'Most La Liga goals in a season' },
  'seriea-season':     { src: 'IT1', floor: 10, competition: 'Serie A',          label: 'Most Serie A goals in a season' },
  'bundesliga-season': { src: 'L1',  floor: 10, competition: 'Bundesliga',       label: 'Most Bundesliga goals in a season' },
  'ligue1-season':     { src: 'FR1', floor: 10, competition: 'Ligue 1',          label: 'Most Ligue 1 goals in a season' },
  'ucl-season':        { src: 'CL',  floor: 5,  competition: 'Champions League', label: 'Most Champions League goals in a season' },
}
const PERFORMANCE = (comp) => path.join(__dirname, '..', 'src', 'data', 'football501', `performance.${comp}.generated.json`)

// Transfer fees in today's money: a player's biggest permanent fee, inflated to
// the latest year with the euro-area HICP. HICP starts in 1996, so earlier fees
// are left out rather than guessed; fees after the latest index year use it as is.
// Source: Eurostat prc_hicp_aind (geo=EA, coicop=CP00, unit=INX_A_AVG, 2015=100),
// fetched 2026-10-04. Update the table when Eurostat publishes a new year.
const TRANSFERS = path.join(__dirname, '..', 'src', 'data', 'football501', 'transfers.generated.json')
const HICP = {
  1996: 71.74, 1997: 72.87, 1998: 73.67, 1999: 74.48, 2000: 76.05, 2001: 77.83, 2002: 79.58, 2003: 81.24,
  2004: 82.98, 2005: 84.79, 2006: 86.64, 2007: 88.49, 2008: 91.38, 2009: 91.65, 2010: 93.14, 2011: 95.66,
  2012: 98.05, 2013: 99.38, 2014: 99.81, 2015: 100.0, 2016: 100.23, 2017: 101.78, 2018: 103.56, 2019: 104.8,
  2020: 105.06, 2021: 107.78, 2022: 116.82, 2023: 123.15, 2024: 126.07, 2025: 128.75,
}
const HICP_LAST = Math.max(...Object.keys(HICP).map(Number))
const FEE_FLOOR = 15 // €m, today's money

function buildHigherLower() {
  // tm id → name (history names keep their accents; the registry folds some, e.g.
  // "Gerd Muller"), plus each player's per-source values.
  const names = new Map()
  const values = {} // src → Map(id → { goals, apps|caps, clubs })
  const clubNames = {} // src → { clubId → name }
  for (const src of new Set(Object.values(HL_STATS).map(s => s.src))) {
    if (src === 'intl') continue
    const m = values[src] = new Map()
    const h = JSON.parse(readFileSync(HISTORY(src), 'utf8'))
    for (const p of h.players) {
      // Strip invisible format characters (TM's "Nemanja Vidic" carries a U+200E).
      if (!names.has(p.id)) names.set(p.id, p.name.replace(/\p{Cf}/gu, '').trim())
      const c = p.comps?.[src]
      if (c) m.set(p.id, { goals: c.goals || 0, apps: c.apps || 0, clubs: c.clubs || {} })
    }
    clubNames[src] = Object.fromEntries(Object.entries(h.clubs || {}).map(([id, c]) => [id, c.name]))
  }

  // Fame. Registry fame was attached by NAME, so every namesake inherits it (both
  // "Rodri"s score 100; a 1960s Rodri would sail into the pool). Only the id-keyed
  // recognisability tells namesakes apart, so registry fame counts solely for the
  // best-recognised holder of each name; everyone else gets recognisability alone.
  const recog = JSON.parse(readFileSync(RECOG, 'utf8')).byId
  const regFame = new Map()
  for (const r of JSON.parse(readFileSync(REGISTRY, 'utf8'))) if (r.refs?.tm) regFame.set(String(r.refs.tm), r.fame || 0)
  const ownerOf = new Map() // name → id with the highest recognisability
  for (const [id, nm] of names) { const o = ownerOf.get(nm); if (o == null || (recog[id] || 0) > (recog[o] || 0)) ownerOf.set(nm, id) }
  const honoured = new Set()
  if (existsSync(HONOURS)) {
    for (const [id, list] of Object.entries(JSON.parse(readFileSync(HONOURS, 'utf8')).byId)) if (list.some(([t]) => MAJOR_HONOURS.has(t))) honoured.add(id)
  } else console.error('  (no honours.generated.json — major-honours floor skipped)')
  const fame = new Map()
  for (const [id, nm] of names) {
    const f = Math.max(recog[id] || 0, ownerOf.get(nm) === id ? (regFame.get(id) || 0) : 0)
    fame.set(id, honoured.has(id) ? Math.max(f, FAME_MIN) : f)
  }

  values.intl = new Map()
  let intlUnnamed = 0
  for (const [pid, , caps, goals] of JSON.parse(readFileSync(INTL, 'utf8')).intl) {
    if (!names.has(pid)) { intlUnnamed++; continue }
    values.intl.set(pid, { goals: goals || 0, caps: caps || 0 })
  }

  const players = [] // [name, fame] — shared across pools, referenced by index
  const index = new Map()
  const ref = (id) => {
    if (!index.has(id)) { index.set(id, players.length); players.push([names.get(id), Math.min(100, fame.get(id) || 0)]) }
    return index.get(id)
  }
  const stats = {}, report = []
  // One pool from candidate rows [{ pid, value, extra? }] (already floor-filtered):
  // fame-gated with record-holders kept, namesakes collapsed. Returns the pool
  // or null when it is too small to play.
  const addStat = (id, meta, rows, recordRank = RECORD_RANK) => {
    rows = rows.filter(r => Number.isInteger(r.value) && r.value > 0 && names.get(r.pid)).sort((a, b) => b.value - a.value)
    const eligible = rows.filter((r, i) => i < recordRank || (fame.get(r.pid) || 0) >= FAME_MIN)
    // Two different players sharing a display name in one pool would read as one
    // person with two numbers — keep the better recognised (ties → bigger number;
    // rows are value-sorted, so the first seen wins).
    const better = (a, b) => (recog[a] || 0) > (recog[b] || 0)
    const byName = new Map()
    let namesakes = 0
    for (const r of eligible) {
      const nm = names.get(r.pid), prev = byName.get(nm)
      if (!prev) byName.set(nm, r)
      else { namesakes++; if (better(r.pid, prev.pid)) byName.set(nm, r) }
    }
    const pool = [...byName.values()].sort((a, b) => b.value - a.value)
    if (pool.length < HL_MIN_POOL) { report.push(`  ${id}: DROPPED — only ${pool.length} eligible (< ${HL_MIN_POOL})`); return null }
    stats[id] = { ...meta, rows: pool.map(r => (r.extra != null ? [ref(r.pid), r.value, r.extra] : [ref(r.pid), r.value])) }
    const distinct = new Set(pool.map(r => r.value)).size
    report.push(`  ${id.padEnd(28)} ${String(pool.length).padStart(4)} players  (${pool[pool.length - 1].value}–${pool[0].value}, ${distinct} distinct${namesakes ? `, ${namesakes} namesake(s) dropped` : ''})`)
    return pool
  }

  // Career totals.
  for (const [id, cfg] of Object.entries(HL_STATS)) {
    const rows = [...values[cfg.src]].map(([pid, v]) => ({ pid, value: v[cfg.field] })).filter(r => r.value >= cfg.floor)
    addStat(id, { competition: cfg.competition, label: cfg.label, kind: cfg.field === 'goals' ? 'goals' : 'apps', group: 'career' }, rows)
  }

  // Club totals (league goals/apps for one club).
  const clubReport = []
  for (const [src, prefix] of Object.entries(CLUB_COMPS)) {
    const comp = HL_STATS[`${prefix}-goals`].competition
    const byClub = new Map() // clubId → [{ pid, goals, apps }]
    for (const [pid, v] of values[src]) for (const [cid, c] of Object.entries(v.clubs)) {
      if (!byClub.has(cid)) byClub.set(cid, [])
      byClub.get(cid).push({ pid, goals: c.goals || 0, apps: c.apps || 0 })
    }
    for (const [cid, list] of byClub) {
      const rowsFor = (field) => list.filter(r => r[field] >= CLUB_FLOOR[field]).map(r => ({ pid: r.pid, value: r[field] }))
      const goals = rowsFor('goals'), apps = rowsFor('apps')
      const famous = goals.filter(r => (fame.get(r.pid) || 0) >= FAME_MIN).length
      // Cheap pre-check before building: both pools must be able to reach the minimum.
      if (famous < CLUB_FAMOUS || goals.length < HL_MIN_POOL || apps.length < HL_MIN_POOL) continue
      const club = shortClub(clubNames[src][cid] || cid)
      const meta = (kind) => ({ competition: comp, label: `${HL_STATS[`${prefix}-${kind}`].label} for ${club}`, kind, group: 'club', club, base: `${prefix}-${kind}` })
      const id = (kind) => `club-${prefix}-${cid}-${kind}`
      const g = addStat(id('goals'), meta('goals'), goals, CLUB_RECORD_RANK)
      const a = g && addStat(id('apps'), meta('apps'), apps, CLUB_RECORD_RANK)
      if (g && !a) delete stats[id('goals')] // a club ships both stats or neither
      if (g && a) clubReport.push(club)
    }
  }
  report.push(`  clubs (${clubReport.length}): ${clubReport.join(', ')}`)

  // Single-season bests.
  for (const [id, cfg] of Object.entries(SEASON_STATS)) {
    if (!existsSync(PERFORMANCE(cfg.src))) { report.push(`  ${id}: SKIPPED — no performance.${cfg.src}`); continue }
    const perSeason = new Map() // pid → Map(season → goals)
    for (const [pid, , season, , goals] of JSON.parse(readFileSync(PERFORMANCE(cfg.src), 'utf8')).performance) {
      if (!goals) continue
      if (!perSeason.has(pid)) perSeason.set(pid, new Map())
      const m = perSeason.get(pid); m.set(season, (m.get(season) || 0) + goals)
    }
    const rows = []
    for (const [pid, m] of perSeason) {
      let best = 0, season = null
      for (const [s, g] of m) if (g > best || (g === best && s > season)) { best = g; season = s }
      if (best >= cfg.floor) rows.push({ pid, value: best, extra: Number(season) })
    }
    addStat(id, { competition: cfg.competition, label: cfg.label, kind: 'season', group: 'season' }, rows)
  }

  // Transfer fees, today's money.
  if (existsSync(TRANSFERS)) {
    const best = new Map() // pid → { value, extra:[nominal €m, year] }
    let pre1996 = 0
    for (const [pid, , , date, fee, type] of JSON.parse(readFileSync(TRANSFERS, 'utf8')).transfers) {
      if (type !== 'permanent' || !(fee > 0)) continue
      const year = Number(String(date).slice(0, 4))
      if (!HICP[Math.min(year, HICP_LAST)]) { pre1996++; continue }
      const real = fee * HICP[HICP_LAST] / HICP[Math.min(year, HICP_LAST)] / 1e6
      if (!best.has(pid) || real > best.get(pid).real) best.set(pid, { real, nominal: Math.round(fee / 1e5) / 10, year })
    }
    const rows = [...best].map(([pid, b]) => ({ pid, value: Math.round(b.real), extra: [b.nominal, b.year] })).filter(r => r.value >= FEE_FLOOR)
    addStat('transfer-fee', { competition: 'Transfers', label: `Record transfer fee (in ${HICP_LAST} euros)`, kind: 'fee', group: 'transfer' }, rows)
    report.push(`  (transfer fees: ${pre1996} permanent fees before 1996 skipped — no HICP)`)
  } else report.push('  transfer-fee: SKIPPED — no transfers.generated.json')

  if (intlUnnamed) report.push(`  (${intlUnnamed} international rows had no history name and were skipped)`)

  const out = {
    meta: {
      source: 'derived: history/performance.<comp> + intl + transfers (Transfermarkt); fees inflated with Eurostat HICP', generatedAt: new Date().toISOString().slice(0, 10),
      fameMin: FAME_MIN, recordRank: RECORD_RANK, feeYear: HICP_LAST,
      columns: { players: ['name', 'fame'], rows: ['playerIndex', 'value', 'extra? (season start year | [nominal fee €m, year])'] },
    },
    players, stats,
  }
  if (Object.keys(stats).length < 3) throw new Error(`only ${Object.keys(stats).length} Higher or Lower stats built — not writing`)
  writeFileSync(HL_OUT, JSON.stringify(out) + '\n')
  console.error(`\nHigher or Lower pools → ${path.relative(path.join(__dirname, '..'), HL_OUT)}: ${Object.keys(stats).length} stats, ${players.length} players\n${report.join('\n')}`)
}

main().then(buildHigherLower).catch(e => { console.error(e); process.exit(1) })
