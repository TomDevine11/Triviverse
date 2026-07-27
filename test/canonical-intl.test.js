import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// RFC-001 backlog C7: canonical international career facts (Player × NationalTeam
// caps + goals) from Transfermarkt, national teams in the Team dimension, and the
// intl-goals board sourced from Transfermarkt (Wikipedia retired).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const intl = J('src/data/football501/intl.generated.json')
const teams = J('src/data/canonical/teams.generated.json').teams
const stats = J('src/data/canonical/stats.generated.json')

describe('canonical international (C7)', () => {
  it('intl facts are well-formed at player×nationalTeam grain', () => {
    expect(intl.meta.schemaVersion).toBe(1)
    expect(intl.meta.columns).toEqual(['playerId', 'teamId', 'caps', 'goals'])
    expect(intl.intl.length).toBeGreaterThan(1000)
    for (const [pid, tid, caps, goals] of intl.intl.slice(0, 500)) {
      expect(typeof pid === 'string' && typeof tid === 'string').toBe(true)
      expect(Number.isInteger(caps) && Number.isInteger(goals)).toBe(true)
      expect(intl.teams[tid], `team ${tid} named`).toBeTruthy()
    }
  })

  it('known caps/goals validate (Ronaldo, Messi, Klose)', () => {
    const by = new Map(intl.intl.map(([pid, tid, caps, goals]) => [pid, { tid, caps, goals }]))
    expect(by.get('8198').goals).toBeGreaterThan(100)   // Cristiano Ronaldo
    expect(intl.teams[by.get('8198').tid]).toBe('Portugal')
    expect(by.get('28003').goals).toBeGreaterThan(90)   // Messi
    expect(by.get('10')).toEqual({ tid: by.get('10').tid, caps: 137, goals: 71 }) // Klose exact
    expect(intl.teams[by.get('10').tid]).toBe('Germany')
  })

  it('national teams are in the Team dimension', () => {
    const national = teams.filter(t => t.kind === 'national')
    expect(national.length).toBeGreaterThan(100)
    const names = new Set(national.map(t => t.name))
    for (const n of ['Germany', 'England', 'Portugal', 'Argentina', 'Brazil']) expect(names.has(n), n).toBe(true)
  })

  it('intl-goals board is Transfermarkt-sourced, not Wikipedia', () => {
    const b = stats.challenges['intl-goals']
    expect(b.source).toMatch(/^transfermarkt:/)
    expect(Object.keys(b.players).length).toBeGreaterThanOrEqual(10)
    expect(b.players['Cristiano Ronaldo']).toBeGreaterThan(100)
  })
})
