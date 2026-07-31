#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// POOL — build a DIVERSE, cross-dimensional candidate pool for the calibration
// workbench. Variety across stat · population type · filter · competition is what
// makes the disagreement/correlation analysis meaningful (goals-vs-apps,
// competition-vs-nationality, european, position filters…).
//
// Includes any candidate that is a real, playable question (recognisable≥8 and
// finishable) — even the big all-competition-scorer questions the maxPool gate
// would reject, so the workbench can reveal whether that gate is mis-calibrated.
//
//   node scripts/pie/pool.mjs
// Output: scripts/pie/out/pool.json
// ─────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COMP_IDS, resolveClub, buildPopulation, nationalitiesIn } from './population.mjs'
import { makeCandidate, COMPS, STAT_KEYS, POS_KEYS, COMPILER_VERSION } from './generate.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'out')

const CLUBS = ['Chelsea', 'Manchester United', 'Liverpool', 'Arsenal', 'Manchester City', 'Tottenham Hotspur',
  'Real Madrid', 'Barcelona', 'Juventus', 'AC Milan', 'Bayern Munich', 'Paris Saint-Germain']

// "playable enough to compare": real answer set + can actually finish.
const playable = (c) => c && c.profile.recognisableCount >= 8 && c.profile.checkoutFeasible

function clubCandidates(name, out) {
  const club = resolveClub(name); if (!club) return
  for (const scope of [...club.comps, 'ALL']) {
    const competition = scope === 'ALL' ? null : scope
    const base = buildPopulation({ clubId: club.id, competition })
    if (base.length < 8) continue
    const nats = nationalitiesIn(base, 3).slice(0, 8)
    const filterSets = [{}, ...POS_KEYS.map((p) => ({ position: p })), ...nats.map((n) => ({ nationality: n }))]
    for (const filters of filterSets) for (const statKey of STAT_KEYS) {
      const c = makeCandidate({ club: club.name, clubId: club.id, competition, statKey, filters, base })
      if (playable(c)) out.push(c)
    }
  }
}

function competitionCandidates(cid, out) {
  const base = buildPopulation({ competition: cid })
  const nats = nationalitiesIn(base, 20).slice(0, 8) // "Foreign Legion" angles
  const filterSets = [{}, ...POS_KEYS.map((p) => ({ position: p })), ...nats.map((n) => ({ nationality: n }))]
  for (const filters of filterSets) for (const statKey of STAT_KEYS) {
    const c = makeCandidate({ competition: cid, statKey, filters, base })
    if (playable(c)) out.push(c)
  }
}

const pool = []
for (const c of CLUBS) clubCandidates(c, pool)
for (const cid of COMP_IDS) competitionCandidates(cid, pool)

// de-dupe by id
const seen = new Set(), uniq = []
for (const c of pool) if (!seen.has(c.id)) { seen.add(c.id); uniq.push(c) }

mkdirSync(OUT, { recursive: true })
const payload = { compilerVersion: COMPILER_VERSION, generatedAt: new Date().toISOString(), count: uniq.length, candidates: uniq }
writeFileSync(path.join(OUT, 'pool.json'), JSON.stringify(payload) + '\n')
console.error(`✓ pool: ${uniq.length} playable candidates across ${CLUBS.length} clubs + ${COMP_IDS.length} competitions (compiler ${COMPILER_VERSION}).`)
