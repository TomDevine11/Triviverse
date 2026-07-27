#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD CATALOG — the space of valid procedurally-generated questions,
// across ALL competitions.
//
// For each competition's canonical Performance career-rollup (history.<comp>,
// == rollup of performance.<comp>, RFC-001 C5/C6), enumerates {1-or-2 stats} ×
// {1–3 filters from club/nationality/position}, keeps only completable questions
// (checkout engine), and writes a single combined catalog.generated.json. Every entry
// carries its `comp`, and its club/nationality options come only from that
// competition — so a question can never mix (no Man Utd in a La Liga question).
//
//   npm run build:pl-catalog   (after the fact tables are built)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveRoster, titleFor } from '../../src/data/football501/spec.js'
import { checkoutCombos, maxDisjoint, SOLO_MIN_COMBOS } from '../../src/data/football501/checkout.js'
import { COMPETITIONS } from './config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const FACT = (comp) => path.join(ROOT, 'src', 'data', 'football501', `history.${comp}.generated.json`)
const OUT = path.join(ROOT, 'src', 'data', 'football501', 'catalog.generated.json')

// ── Recognisability ("reco") ────────────────────────────────────────────────
// How many of a question's eligible players are names a moderate-to-avid fan
// would actually know — measured against the canonical fame data. Drives the
// DAILY pool so it stops serving obscure clubs/slices (e.g. Real Murcia) while
// leaving the full catalogue intact for Random/Unlimited.
const RECOG = path.join(ROOT, 'src', 'data', 'recognisability.generated.json')
const FAME_BAR = 30   // fame floor for "recognisable" (canonical's own floor is ~20)
const PROM_SINCE = 2018 // club "prominence" is measured over squads since this season
const RECENCY = 2012  // and active since ~this season — all-time fame skews to legends a
                      // modern fan won't know (e.g. Deportivo's Super Depor era). Recency
                      // also defuses name-collision fame (an obscure old namesake drops out).
const normName = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const FAME = (() => {
  try {
    // Canonical recognisability (RFC-001) replaces the Wikidata fame signal — and
    // already bakes in recency, so it aligns with the RECENCY gate below.
    return new Map(Object.entries(JSON.parse(readFileSync(RECOG, 'utf8')).byName))
  } catch { return new Map() /* no recognisability → reco stays 0, daily falls back gracefully */ }
})()
const isReco = (id, p, lastById) => (FAME.get(normName(p.name)) || 0) >= FAME_BAR && (lastById[id] || 0) >= RECENCY
const recoOf = (roster, lastById) => Object.entries(roster).filter(([id, p]) => isReco(id, p, lastById)).length
// Throwable stat values of the recognisable players only — used to check the
// question can actually be CHECKED OUT with players a fan knows (not just via
// obscure low-value fringe players needed for the last dart).
const recoValues = (roster, lastById) => Object.entries(roster).filter(([id, p]) => isReco(id, p, lastById) && p.value >= 1 && p.value <= 180).map(([, p]) => p.value)

const MIN_ANSWERS = 8
const MIN_NAT_PLAYERS = 15   // ignore nationalities too sparse to ever qualify
const MIN_CLUB_PLAYERS = 15  // ignore tiny (qualifier) clubs — keeps CL sane

const STATS = ['goals', 'apps', { a: 'apps', op: '+', b: 'goals' }, { a: 'apps', op: '-', b: 'goals' }]
const POSITIONS = ['GK', 'DEF', 'MID', 'FWD']

const statSlug = (s) => (typeof s === 'string' ? s : `apps-${s.op === '-' ? 'minus' : 'plus'}-goals`)
const specId = (comp, spec) => {
  const f = spec.filter, parts = [comp, statSlug(spec.stat)]
  if (f.club) parts.push(`c${f.club}`)
  if (f.nationality) parts.push(`n-${f.nationality.replace(/\s+/g, '_')}`)
  if (f.position) parts.push(f.position)
  return parts.join('__')
}
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

function buildCompetition(comp, catalog) {
  if (!existsSync(FACT(comp.id))) { console.error(`  ! ${comp.id}: no fact file — skipped`); return 0 }
  const fact = JSON.parse(readFileSync(FACT(comp.id), 'utf8'))
  const players = fact.players
  const clubs = fact.clubs
  const lastById = {}; for (const p of players) lastById[p.id] = p.last || 0 // player id → last season played

  // Club "prominence": distinct recognisable players in the club's RECENT squads
  // (seasons >= PROM_SINCE), read from the per-season scrape cache. This is the
  // real "would a fan know this club's players" signal — it separates prominent
  // clubs (stars now) from small feeder clubs whose famous names only passed
  // through (Empoli) and from clubs long gone (Deportivo).
  const clubProm = {}
  const cacheDir = path.join(ROOT, 'data', 'pl-history', 'cache', comp.id)
  try {
    for (const fn of readdirSync(cacheDir)) {
      const season = +fn.split('-')[0]; if (season < PROM_SINCE) continue
      const clubId = fn.split('-')[1]?.replace('.json', ''); if (!clubId) continue
      for (const r of JSON.parse(readFileSync(path.join(cacheDir, fn), 'utf8')).players) {
        if ((FAME.get(normName(r.name)) || 0) >= FAME_BAR) (clubProm[clubId] ||= new Set()).add(normName(r.name))
      }
    }
  } catch { /* cache absent → clubProm stays 0; club questions won't qualify for daily */ }
  const promOf = (clubId) => clubProm[clubId]?.size || 0

  // Player counts per club/nationality (to drop sparse ones).
  const natDisplay = {}, natCount = {}, clubCount = {}
  for (const p of players) {
    if (p.natKey) { natDisplay[p.natKey] ||= p.nat; natCount[p.natKey] = (natCount[p.natKey] || 0) + 1 }
    for (const cid of Object.keys(p.comps[comp.id]?.clubs || {})) clubCount[cid] = (clubCount[cid] || 0) + 1
  }
  const clubIds = Object.keys(clubs).filter(id => (clubCount[id] || 0) >= MIN_CLUB_PLAYERS)
  const nats = Object.keys(natCount).filter(k => natCount[k] >= MIN_NAT_PLAYERS)

  const combos = []
  for (const c of clubIds) combos.push({ club: c })
  for (const n of nats) combos.push({ nationality: n })
  for (const pos of POSITIONS) combos.push({ position: pos })
  for (const c of clubIds) for (const n of nats) combos.push({ club: c, nationality: n })
  for (const c of clubIds) for (const pos of POSITIONS) combos.push({ club: c, position: pos })
  for (const n of nats) for (const pos of POSITIONS) combos.push({ nationality: n, position: pos })
  for (const c of clubIds) for (const n of nats) for (const pos of POSITIONS) combos.push({ club: c, nationality: n, position: pos })

  let added = 0
  for (const stat of STATS) {
    for (const filter of combos) {
      const spec = { comp: comp.id, stat, filter }
      const { players: roster, values } = resolveRoster(spec, players)
      if (Object.keys(roster).length < MIN_ANSWERS) continue
      if (checkoutCombos(values) < SOLO_MIN_COMBOS) continue
      const maxPlayers = maxDisjoint(values)
      if (maxPlayers < 1) continue
      catalog.push({
        id: specId(comp.id, spec), comp: comp.id, stat, filter,
        title: titleFor(spec, { compName: comp.name, clubName: clubs[filter.club]?.name, natDisplay: natDisplay[filter.nationality] }),
        answers: Object.keys(roster).length, maxPlayers, reco: recoOf(roster, lastById), recoCk: checkoutCombos(recoValues(roster, lastById)), clubProm: filter.club ? promOf(filter.club) : 0,
      })
      added++
    }
  }
  console.error(`  ${comp.id.padEnd(4)} ${added} valid questions`)
  return added
}

function build() {
  const catalog = []
  for (const comp of Object.values(COMPETITIONS)) buildCompetition(comp, catalog)
  catalog.sort((a, b) => hash(a.id) - hash(b.id))
  writeFileSync(OUT, JSON.stringify({ meta: { builtAt: new Date().toISOString().slice(0, 10), valid: catalog.length }, catalog }))
  const byComp = {}; for (const c of catalog) byComp[c.comp] = (byComp[c.comp] || 0) + 1
  console.error(`\nCatalog: ${catalog.length} valid questions · ${Object.entries(byComp).map(([k, v]) => `${k}:${v}`).join('  ')}`)
  console.error(`  e.g. ${catalog.slice(0, 4).map(c => '"' + c.title + '"').join(', ')}`)
}

build()
