#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD TRANSFERS + CAREERS  (RFC-001 C10 part 2)
//
// Canonicalises the transfer-history cache into:
//   • src/data/football501/transfers.generated.json — canonical Transfer facts
//     (player, from→to club, date, fee, type)
//   • src/data/careers.generated.json — the Career Path timeline, DERIVED from
//     the transfer chain, replacing the Wikidata careers import (import-careers).
//
//   node scripts/build-transfers.mjs   (offline; reads the transfers cache)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalize } from '../src/data/canonical/normalize.js'
import { isSeniorTeam } from '../src/data/teamFilter.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const CACHE = path.join(ROOT, 'data', 'pl-history', 'cache', 'transfers')
const OUT_T = path.join(ROOT, 'src', 'data', 'football501', 'transfers.generated.json')
const OUT_C = path.join(ROOT, 'src', 'data', 'careers.generated.json')
const MIN_CLUBS = 5   // Career Path needs a full journeyman career
const MIN_RECOG = 40  // and a recognisable subject to guess

if (!existsSync(CACHE)) { console.error(`No transfers cache — skipping (run \`npm run scrape:transfers\`; keeping last-good careers/transfers).`); process.exit(0) }

const clubId = (href) => href?.match(/verein\/(\d+)/)?.[1] || null
// youth / reserve sides that isSeniorTeam doesn't catch. Transfermarkt truncates
// club names to ~15 characters, so the youth marker is often clipped: "Malmö FF
// Jgd." (Jugend), "Valencia CF You", "SSC Napoli Yout", "AlbinoLeffe Y.",
// "Southampton Aca", "Montpellier For" (formation), "Tires Fo.". Third teams end
// in " C" (Real Madrid C, Barcelona C) and some reserve sides have their own name
// (Castilla, Mestalla, Bilbao Athletic, Juve Next Gen). B-037.
const AGE_GROUP_RE = [
  /\b(U-?\d{1,2}|Yth\.?|Youth|Sub-?\d{1,2}|Jr\.?|Jugend|Juvenil|Primavera|Academy)\b/i,
  /\s(Jgd\.?|You|Yout|Y\.|Yo|Y\d{2}|S\d{2}|Aca|Acad\.?|For|Fo\.|J\.)$/i,
  /\b(Right to Dream|JMG|EFYM)\b/i,
]
const RESERVE_RE = [
  /\bReserves?\b|\bII$/i,
  /\s(C|B\.?|Res\.|Atl\.)$/,
  /\b(Castilla|Mestalla|Bilbao Athletic|Madrileño|Next Gen)\b/i,
]
const isAgeGroup = (n = '') => AGE_GROUP_RE.some(re => re.test(n))
const isYouth = (n = '') => isAgeGroup(n) || RESERVE_RE.some(re => re.test(n))
// Clubs before a player's LAST age-group side are his boyhood clubs (Zlatan:
// Malmö ABI → FBK Balkan → Malmö FF U17 → U19 → Malmö). The career starts after
// it, unless a real fee was paid before then (he was already senior). Reserve
// sides do not trigger this: Klose played senior football at Homburg before
// Kaiserslautern II, and that spell is real.
function dropBoyhood(clubs, paidBefore) {
  let cut = -1
  clubs.forEach((c, i) => { if (isAgeGroup(c.name) && !paidBefore(i)) cut = i })
  return clubs.slice(cut + 1)
}
function parseFee(fee) {
  if (!fee || fee === '-' || fee === '?') return { eur: null, type: 'unknown' }
  const low = fee.toLowerCase()
  if (low.includes('end of loan')) return { eur: null, type: 'end-of-loan' }
  const loan = low.includes('loan')
  if (low.includes('free')) return { eur: 0, type: 'free' }
  const m = fee.match(/€\s*([\d.]+)\s*(m|k)?/i)
  const eur = m ? Math.round(parseFloat(m[1]) * (/(m)/i.test(m[2] || '') ? 1e6 : /(k)/i.test(m[2] || '') ? 1e3 : 1)) : null
  return { eur, type: loan ? 'loan' : 'permanent' }
}

// recognisability + getPlayer-known proxy: names that resolve to a RECOGNISABLE
// canonical player (facts.js's universe) — replaces wikidata membership (C12).
const recog = J('src/data/recognisability.generated.json').byName
const recogIds = new Set(J('src/data/canonical/players.recognisable.generated.json').map(r => r.id))
const KNOWN = new Set()
for (const [n, v] of Object.entries(J('src/data/canonical/players.crosswalk.json').byAlias)) if (typeof v === 'string' && recogIds.has(v)) KNOWN.add(n)
// name → the Transfermarkt id of the RECOGNISABLE player with that name. Careers
// used to be matched by name alone, so "Koke" showed a Spanish journeyman's clubs
// (Málaga, Marseille, Houston…) instead of Atlético's Koke, and likewise Fabinho
// and Diego López. Ambiguous names resolve only when exactly one namesake is
// recognisable. (B-037)
const CROSSWALK = J('src/data/canonical/players.crosswalk.json').byAlias
const FAME = new Map(J('src/data/canonical/players.recognisable.generated.json').map(r => [r.id, r.fame || 0]))
function tmIdFor(name) {
  const v = CROSSWALK[normalize(name)]
  const ids = (Array.isArray(v) ? v : v ? [v] : []).filter(id => recogIds.has(id))
    .sort((a, b) => (FAME.get(b) || 0) - (FAME.get(a) || 0))
  // The most famous namesake, if he is clearly the one people mean.
  if (!ids.length || (ids.length > 1 && (FAME.get(ids[0]) || 0) === (FAME.get(ids[1]) || 0))) return null
  return ids[0].replace(/^tm:/, '')
}

// The cache holds the raw ceapi response (no id/name) — id is the filename, name
// comes from the history tables.
const idName = new Map()
for (const c of ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']) for (const p of J(`src/data/football501/history.${c}.generated.json`).players) if (!idName.has(p.id) || (p.name || '').length > idName.get(p.id).length) idName.set(p.id, p.name)

const files = readdirSync(CACHE).filter(f => f.endsWith('.json'))
const clubNames = {}         // clubId → name
const transfers = []         // [playerId, fromId, toId, date, feeEur, type]
const careers = []           // { name, clubs:[{name,from,to}] }
const timelineByName = new Map() // name → [cleaned timeline, …] (namesakes share a name)
const timelineById = new Map()   // Transfermarkt id → cleaned timeline
let withCareer = 0

for (const f of files) {
  const j = JSON.parse(readFileSync(path.join(CACHE, f), 'utf8'))
  const pid = path.basename(f, '.json')
  const pname = idName.get(pid) || ''
  const ts = (j.transfers || []).filter(t => /^\d{4}-\d\d-\d\d$/.test(t.dateUnformatted || '') && t.dateUnformatted !== '0000-00-00')
    .sort((a, b) => a.dateUnformatted.localeCompare(b.dateUnformatted))
  if (!ts.length) continue

  // canonical Transfer rows + club-name index
  for (const t of ts) {
    const fromId = clubId(t.from?.href), toId = clubId(t.to?.href)
    if (t.from?.clubName && fromId) clubNames[fromId] = t.from.clubName
    if (t.to?.clubName && toId) clubNames[toId] = t.to.clubName
    const { eur, type } = parseFee(t.fee)
    transfers.push([pid, fromId, toId, t.dateUnformatted, eur, type])
  }

  // derive the ordered club timeline from the chain (dedupe loan-return, drop
  // "special" clubs like Without Club / Retired).
  const clubs = []
  const first = ts[0].from
  if (first && !first.isSpecial) clubs.push({ id: clubId(first.href), name: first.clubName, from: '', to: '' })
  for (const t of ts) {
    const year = t.dateUnformatted.slice(0, 4)
    if (clubs.length) clubs[clubs.length - 1].to = year
    // Skip returns-to-parent (end of loan) and moves to Without Club/Retired —
    // this collapses loan round-trips (Barça→Milan→Barça→Milan) to one spell.
    if (t.to?.isSpecial || parseFee(t.fee).type === 'end-of-loan') continue
    const toId = clubId(t.to?.href)
    if (clubs.length && clubs[clubs.length - 1].id === toId) { clubs[clubs.length - 1].to = ''; continue }
    clubs.push({ id: toId, name: t.to?.clubName, from: year, to: '', paid: (parseFee(t.fee).eur || 0) > 0 })
  }

  const paidBefore = (i) => clubs.slice(1, i + 1).some(c => c.paid)
  const seniorClubs = dropBoyhood(clubs, paidBefore).filter(c => c.name && isSeniorTeam(c.name) && !isYouth(c.name))
  const nkey = normalize(pname)
  const timeline = seniorClubs.map(({ name, from, to }) => ({ name, from, to }))
  timelineById.set(pid, timeline)
  if (pname) timelineByName.set(pname, [...(timelineByName.get(pname) || []), timeline])
  if (pname && seniorClubs.length >= MIN_CLUBS && (recog[nkey] || 0) >= MIN_RECOG && KNOWN.has(nkey) && tmIdFor(pname) === pid) {
    careers.push({ name: pname, clubs: seniorClubs.map(({ name, from, to }) => ({ name, from, to })) })
    withCareer++
  }
}

transfers.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }) || a[3].localeCompare(b[3]))
careers.sort((a, b) => a.name.localeCompare(b.name))

// Pool stability. Career Path picks its daily by POSITION in this list, so adding
// or dropping one player reshuffles every future daily (and today's). By default
// the pool keeps its size and order: each existing player gets his freshly cleaned
// timeline (the namesake whose clubs best match what shipped — "Pepe" and "Pedro"
// are several people). A player who no longer has MIN_CLUBS real clubs once
// youth sides are removed (Messi only reached five via "Barcelona C") is replaced
// IN PLACE by the next newly qualifying player, so only that slot's days change.
// Set REFRESH_POOL=1 to re-select the whole pool from scratch.
let finalCareers = careers
if (!process.env.REFRESH_POOL && existsSync(OUT_C)) {
  const prev = JSON.parse(readFileSync(OUT_C, 'utf8')).players
  const inPool = new Set(prev.map(p => p.name))
  // Replacements: the most recognisable newly qualifying players, one per name.
  const seenSpare = new Set()
  const spare = careers
    .filter(c => !inPool.has(c.name) && !seenSpare.has(c.name) && seenSpare.add(c.name))
    .sort((a, b) => (recog[normalize(b.name)] || 0) - (recog[normalize(a.name)] || 0) || a.name.localeCompare(b.name))
  const overlap = (a, b) => { const s = new Set(b.map(c => c.name)); return a.filter(c => s.has(c.name)).length }
  let replaced = 0
  const placed = new Set() // one slot per name: a namesake duplicate is replaced
  finalCareers = prev.map(p => {
    const id = placed.has(p.name) ? null : tmIdFor(p.name)
    if (placed.has(p.name)) {
      const sub = spare.shift()
      if (sub) { replaced++; if (process.env.DEBUG_POOL) console.error(`REPLACE dup ${p.name} → ${sub.name}`); placed.add(sub.name); return sub }
      return p
    }
    placed.add(p.name)
    let fresh = id ? timelineById.get(id) : null
    if (!fresh && !id) {
      // No unambiguous identity: fall back to the namesake whose clubs best match.
      const options = timelineByName.get(p.name) || []
      fresh = options.sort((x, y) => overlap(y, p.clubs) - overlap(x, p.clubs))[0]
      if (fresh && overlap(fresh, p.clubs) < 2) fresh = null
    }
    if (fresh && fresh.length >= MIN_CLUBS) return { name: p.name, clubs: fresh }
    const sub = spare.shift()
    if (!sub) return p
    replaced++
    if (process.env.DEBUG_POOL) console.error(`REPLACE ${p.name} → ${sub.name}`)
    placed.add(sub.name)
    return sub
  })
  withCareer = finalCareers.length
  console.error(`  careers pool kept at ${finalCareers.length}; ${replaced} players without ${MIN_CLUBS} senior clubs replaced in place`)
}

writeFileSync(OUT_T, JSON.stringify({
  meta: { schemaVersion: 1, source: 'transfermarkt:transferHistory (scraped)', columns: ['playerId', 'fromTeamId', 'toTeamId', 'date', 'feeEur', 'type'], rows: transfers.length, clubs: Object.keys(clubNames).length, generatedAt: new Date().toISOString().slice(0, 10) },
  clubs: clubNames, transfers,
}) + '\n')
writeFileSync(OUT_C, JSON.stringify({
  meta: { source: 'transfermarkt:transfer chain (canonical)', minClubs: MIN_CLUBS, minRecog: MIN_RECOG, fetchedAt: new Date().toISOString().slice(0, 10) },
  players: finalCareers,
}) + '\n')
console.error(`✓ transfers: ${transfers.length} rows across ${Object.keys(clubNames).length} clubs; careers: ${withCareer} playable timelines`)
