import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// RFC-001 inv. #7 / backlog C5: canonical Performance exists at grain
// Player × Team × CompetitionEdition (a season within a competition), and the
// retained history.* career-rollup equals a rollup of Performance row-for-row.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const COMPS = ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']
const PERF = (c) => J(`src/data/football501/performance.${c}.generated.json`)
const HIST = (c) => J(`src/data/football501/history.${c}.generated.json`)

describe('canonical Performance (C5)', () => {
  it('every competition has a Performance artefact at the right grain', () => {
    for (const c of COMPS) {
      const p = PERF(c)
      expect(p.meta.schemaVersion, c).toBe(1)
      expect(p.meta.grain, c).toBe('player×team×season')
      expect(p.meta.columns, c).toEqual(['playerId', 'teamId', 'seasonId', 'apps', 'goals'])
      expect(p.performance.length, c).toBeGreaterThan(1000)
      expect(p.performance.length, c).toBe(p.meta.rows)
    }
  })

  it('rows are well-formed and distinct at (player, team, season)', () => {
    for (const c of COMPS) {
      const rows = PERF(c).performance
      const seen = new Set()
      for (const [pid, tid, sid, a, g] of rows) {
        expect(typeof pid === 'string' && typeof tid === 'string' && typeof sid === 'string').toBe(true)
        expect(Number.isInteger(a) && Number.isInteger(g) && a > 0).toBe(true)
        const k = `${pid}|${tid}|${sid}`
        expect(seen.has(k), `${c} duplicate cell ${k}`).toBe(false)
        seen.add(k)
      }
    }
  })

  it('rollup(performance) equals history.* career totals row-for-row', () => {
    for (const c of COMPS) {
      const totals = new Map(), clubTotals = new Map()
      for (const [pid, tid, , a, g] of PERF(c).performance) {
        const t = totals.get(pid) || { apps: 0, goals: 0 }; t.apps += a; t.goals += g; totals.set(pid, t)
        const ck = `${pid}|${tid}`, cc = clubTotals.get(ck) || { apps: 0, goals: 0 }; cc.apps += a; cc.goals += g; clubTotals.set(ck, cc)
      }
      const players = HIST(c).players
      expect(totals.size, `${c} player count`).toBe(players.length)
      for (const p of players) {
        const t = totals.get(p.id)
        expect(t, `${c} missing ${p.id}`).toBeTruthy()
        expect(t.apps, `${c}/${p.id} apps`).toBe(p.comps[c].apps)
        expect(t.goals, `${c}/${p.id} goals`).toBe(p.comps[c].goals)
        for (const [tid, cv] of Object.entries(p.comps[c].clubs)) {
          expect(clubTotals.get(`${p.id}|${tid}`)).toEqual({ apps: cv.apps, goals: cv.goals })
        }
      }
    }
  })
})
