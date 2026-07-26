#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD CANONICAL DIMENSIONS  (RFC-001 backlog C4)
//
// Extracts the canonical DIMENSION entities — Competition, Season, Team (club),
// CompetitionEdition (skeleton) — from the existing Transfermarkt history fact
// tables (src/data/football501/history.<comp>.generated.json).
//
// This is additive: nothing consumes these artefacts yet (later tasks re-point
// derived builders at them). Editions carry NO outcomes yet (champion/topScorer
// null) — that is C11. Team is club-only here; national teams arrive in C7.
//
// Referential integrity is ASSERTED: every competition/season/club referenced by
// the fact tables must resolve to an emitted canonical id, or the build fails.
//
// Run:  node scripts/build-canonical.mjs   (offline; reads committed history.*)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const HIST = (c) => path.join(ROOT, 'src', 'data', 'football501', `history.${c}.generated.json`)
const CANON = path.join(ROOT, 'src', 'data', 'canonical')
const COMPS = ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']
const SCHEMA_VERSION = 1

// Competition classification not present in the fact tables (enumerate 'league'
// = a domestic top flight; 'teilnehmer' = a continental cup). Country/confed is
// stable reference data for the six competitions we cover.
const COMP_INFO = {
  GB1: { type: 'domestic_league', tier: 1, country: 'England' },
  ES1: { type: 'domestic_league', tier: 1, country: 'Spain' },
  IT1: { type: 'domestic_league', tier: 1, country: 'Italy' },
  FR1: { type: 'domestic_league', tier: 1, country: 'France' },
  L1:  { type: 'domestic_league', tier: 1, country: 'Germany' },
  CL:  { type: 'continental', tier: 1, confederation: 'UEFA' },
}

const seasonLabel = (y) => `${y}/${String(y + 1).slice(2)}`
const editionId = (compId, y) => `${compId}_${y}`

function main() {
  const histories = Object.fromEntries(COMPS.map(c => [c, JSON.parse(readFileSync(HIST(c), 'utf8'))]))
  const meta = { schemaVersion: SCHEMA_VERSION, source: 'transfermarkt history (derived dimensions)', generatedAt: new Date().toISOString().slice(0, 10) }

  // ── Competition + per-competition season span ──────────────────────────
  const competitions = []
  const spans = {} // compId → { first, last }
  for (const c of COMPS) {
    const cm = histories[c].meta.competition
    const years = (histories[c].meta.seasons || '').match(/\d{4}/g)?.map(Number) || [cm.first]
    const first = cm.first ?? Math.min(...years)
    const last = Math.max(...years)
    spans[c] = { first, last }
    competitions.push({ id: cm.id, name: cm.name, slug: cm.slug, firstSeason: String(first), ...COMP_INFO[c] })
  }

  // ── Season (global time dimension) — union of all competition spans ─────
  const minY = Math.min(...Object.values(spans).map(s => s.first))
  const maxY = Math.max(...Object.values(spans).map(s => s.last))
  const seasons = []
  for (let y = minY; y <= maxY; y++) seasons.push({ id: String(y), label: seasonLabel(y), startYear: y, endYear: y + 1 })
  const seasonIds = new Set(seasons.map(s => s.id))

  // ── Team (club) — merged across competitions by club id ────────────────
  const teamMap = new Map()
  for (const c of COMPS) {
    for (const [id, club] of Object.entries(histories[c].clubs || {})) {
      const t = teamMap.get(id)
      if (!t) teamMap.set(id, { id, kind: 'club', name: club.name, norm: club.norm, country: null, competitions: [c], last: club.last || 0 })
      else {
        if (!t.competitions.includes(c)) t.competitions.push(c)
        if ((club.last || 0) > t.last) { t.last = club.last; t.name = club.name; t.norm = club.norm } // freshest label wins
      }
    }
  }
  const teams = [...teamMap.values()].sort((a, b) => Number(a.id) - Number(b.id))
  const teamIds = new Set(teams.map(t => t.id))

  // ── CompetitionEdition (skeleton, one per competition-season) ───────────
  const editions = []
  for (const c of COMPS) {
    for (let y = spans[c].first; y <= spans[c].last; y++) {
      editions.push({ id: editionId(c, y), competitionId: c, seasonId: String(y), champion: null, runnerUp: null, topScorer: null, participants: null })
    }
  }

  // ── Referential integrity: every fact-referenced id must resolve ───────
  const compIds = new Set(competitions.map(c => c.id))
  const problems = []
  for (const c of COMPS) {
    if (!compIds.has(c)) problems.push(`competition ${c} missing`)
    if (!seasonIds.has(String(spans[c].first)) || !seasonIds.has(String(spans[c].last))) problems.push(`season span ${c} not covered`)
    for (const p of histories[c].players) {
      for (const [clubId] of Object.entries(p.comps?.[c]?.clubs || {})) {
        if (!teamIds.has(clubId)) problems.push(`club ${clubId} (${c}, player ${p.id}) not in teams`)
      }
    }
  }
  if (problems.length) {
    console.error(`✗ referential integrity failed:\n  ${[...new Set(problems)].slice(0, 20).join('\n  ')}`)
    process.exit(1)
  }

  const write = (name, arr, extra) => writeFileSync(path.join(CANON, name), JSON.stringify({ meta: { ...meta, ...extra }, [name.split('.')[0]]: arr }, null, 1) + '\n')
  write('competitions.generated.json', competitions, { count: competitions.length })
  write('seasons.generated.json', seasons, { count: seasons.length, span: `${minY}–${maxY}` })
  write('teams.generated.json', teams, { count: teams.length, kind: 'club' })
  write('editions.generated.json', editions, { count: editions.length, outcomes: 'skeleton (null — C11)' })

  console.error(`✓ canonical dimensions: ${competitions.length} competitions, ${seasons.length} seasons, ${teams.length} teams (club), ${editions.length} editions`)
}

main()
