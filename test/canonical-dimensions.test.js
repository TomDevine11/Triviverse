import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// RFC-001 backlog C4: the canonical dimension entities (Competition, Season,
// Team, CompetitionEdition) must exist and every id referenced by the fact
// tables must resolve to one of them (referential integrity of the model).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const CANON = 'src/data/canonical'
const COMPS = ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']

const competitions = J(`${CANON}/competitions.generated.json`).competitions
const seasons = J(`${CANON}/seasons.generated.json`).seasons
const teams = J(`${CANON}/teams.generated.json`).teams
const editions = J(`${CANON}/editions.generated.json`).editions

describe('canonical dimensions (C4)', () => {
  it('every artefact carries a versioned meta block', () => {
    for (const f of ['competitions', 'seasons', 'teams', 'editions']) {
      const meta = J(`${CANON}/${f}.generated.json`).meta
      expect(meta.schemaVersion, f).toBe(1)
      expect(meta.source, f).toMatch(/transfermarkt/)
    }
  })

  it('all six competitions are present with a type', () => {
    const ids = new Set(competitions.map(c => c.id))
    for (const c of COMPS) expect(ids.has(c), c).toBe(true)
    for (const c of competitions) expect(c.type, c.id).toBeTruthy()
  })

  it('teams are club-kind with unique ids', () => {
    expect(teams.length).toBeGreaterThan(100)
    expect(new Set(teams.map(t => t.id)).size).toBe(teams.length)
    for (const t of teams) expect(t.kind).toBe('club')
  })

  it('editions are skeletons (no outcomes yet — C11)', () => {
    for (const e of editions) expect(e.champion).toBeNull()
  })

  it('every club/competition/season referenced by facts resolves to a canonical id', () => {
    const teamIds = new Set(teams.map(t => t.id))
    const compIds = new Set(competitions.map(c => c.id))
    const seasonIds = new Set(seasons.map(s => s.id))
    const missing = []
    for (const c of COMPS) {
      if (!compIds.has(c)) missing.push(`competition ${c}`)
      const h = J(`src/data/football501/history.${c}.generated.json`)
      const years = (h.meta.seasons || '').match(/\d{4}/g) || []
      for (const y of years) if (!seasonIds.has(y)) missing.push(`season ${y} (${c})`)
      for (const p of h.players)
        for (const clubId of Object.keys(p.comps?.[c]?.clubs || {}))
          if (!teamIds.has(clubId)) missing.push(`club ${clubId} (${c})`)
    }
    expect([...new Set(missing)], missing.slice(0, 10).join(', ')).toEqual([])
  })

  it('every edition references a real competition and season', () => {
    const compIds = new Set(competitions.map(c => c.id))
    const seasonIds = new Set(seasons.map(s => s.id))
    for (const e of editions) {
      expect(compIds.has(e.competitionId), e.id).toBe(true)
      expect(seasonIds.has(e.seasonId), e.id).toBe(true)
    }
  })
})
