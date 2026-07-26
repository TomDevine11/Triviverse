import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// RFC-001 backlog C8 (part 1): canonical SquadMembership at grain
// Player × Team × Season, complete rosters (incl. 0-appearance members), with
// referential integrity to the Team/Season dimensions.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const COMPS = ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']
const SQ = (c) => J(`src/data/football501/squads.${c}.generated.json`)
const teamIds = new Set(J('src/data/canonical/teams.generated.json').teams.map(t => t.id))
const seasonIds = new Set(J('src/data/canonical/seasons.generated.json').seasons.map(s => s.id))

describe('canonical SquadMembership (C8)', () => {
  it('every competition has a squads artefact at the right grain', () => {
    for (const c of COMPS) {
      const s = SQ(c)
      expect(s.meta.schemaVersion, c).toBe(1)
      expect(s.meta.grain, c).toBe('player×team×season')
      expect(s.meta.columns, c).toEqual(['playerId', 'teamId', 'seasonId'])
      expect(s.squads.length, c).toBe(s.meta.rows)
      expect(s.squads.length, c).toBeGreaterThan(1000)
    }
  })

  it('memberships are distinct and reference canonical team + season', () => {
    for (const c of COMPS) {
      const seen = new Set()
      for (const [pid, tid, sid] of SQ(c).squads) {
        const k = `${pid}|${tid}|${sid}`
        expect(seen.has(k), `${c} dup ${k}`).toBe(false); seen.add(k)
        expect(teamIds.has(tid), `${c} team ${tid} not canonical`).toBe(true)
        expect(seasonIds.has(sid), `${c} season ${sid} not canonical`).toBe(true)
      }
    }
  })

  it('every Performance cell (apps>0) is also a SquadMembership (squads ⊇ performance)', () => {
    for (const c of COMPS) {
      const members = new Set(SQ(c).squads.map(([p, t, s]) => `${p}|${t}|${s}`))
      for (const [p, t, s] of J(`src/data/football501/performance.${c}.generated.json`).performance) {
        expect(members.has(`${p}|${t}|${s}`), `${c} perf cell ${p}|${t}|${s} missing from squads`).toBe(true)
      }
    }
  })
})
