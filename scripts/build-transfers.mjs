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
// youth / reserve sides that isSeniorTeam doesn't catch (Yth., Sub-15, U19, B, II)
const isYouth = (n = '') => /\b(U-?\d{1,2}|Yth\.?|Youth|Sub-?\d{1,2}|Jr\.?|Jugend|Academy|Reserves?)\b|\bII$/i.test(n)
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

// The cache holds the raw ceapi response (no id/name) — id is the filename, name
// comes from the history tables.
const idName = new Map()
for (const c of ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']) for (const p of J(`src/data/football501/history.${c}.generated.json`).players) if (!idName.has(p.id) || (p.name || '').length > idName.get(p.id).length) idName.set(p.id, p.name)

const files = readdirSync(CACHE).filter(f => f.endsWith('.json'))
const clubNames = {}         // clubId → name
const transfers = []         // [playerId, fromId, toId, date, feeEur, type]
const careers = []           // { name, clubs:[{name,from,to}] }
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
    clubs.push({ id: toId, name: t.to?.clubName, from: year, to: '' })
  }

  const seniorClubs = clubs.filter(c => c.name && isSeniorTeam(c.name) && !isYouth(c.name))
  const nkey = normalize(pname)
  if (pname && seniorClubs.length >= MIN_CLUBS && (recog[nkey] || 0) >= MIN_RECOG && KNOWN.has(nkey)) {
    careers.push({ name: pname, clubs: seniorClubs.map(({ name, from, to }) => ({ name, from, to })) })
    withCareer++
  }
}

transfers.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }) || a[3].localeCompare(b[3]))
careers.sort((a, b) => a.name.localeCompare(b.name))

writeFileSync(OUT_T, JSON.stringify({
  meta: { schemaVersion: 1, source: 'transfermarkt:transferHistory (scraped)', columns: ['playerId', 'fromTeamId', 'toTeamId', 'date', 'feeEur', 'type'], rows: transfers.length, clubs: Object.keys(clubNames).length, generatedAt: new Date().toISOString().slice(0, 10) },
  clubs: clubNames, transfers,
}) + '\n')
writeFileSync(OUT_C, JSON.stringify({
  meta: { source: 'transfermarkt:transfer chain (canonical)', minClubs: MIN_CLUBS, minRecog: MIN_RECOG, fetchedAt: new Date().toISOString().slice(0, 10) },
  players: careers,
}) + '\n')
console.error(`✓ transfers: ${transfers.length} rows across ${Object.keys(clubNames).length} clubs; careers: ${withCareer} playable timelines`)
