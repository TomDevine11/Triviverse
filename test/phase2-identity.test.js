// Phase 2 invariant: facts.js now resolves ids through the identity crosswalk,
// so it shares ONE id space with the generated registry (no legacy 'p:' ids),
// and the tap-based games (TicTacToe, Connections) that read facts.js still
// generate valid daily boards.
import { describe, it, expect } from 'vitest'
import { allPlayers } from '../src/data/canonical/facts.js'
import registry from '../src/data/canonical/players.registry.json'
import { getGridForDay } from '../src/data/tictactoe.js'
import { getConnectionsForDay } from '../src/data/connections.js'

describe('phase 2: facts.js shares the crosswalk id space', () => {
  const players = allPlayers()
  const registryIds = new Set(registry.map(r => r.id))

  it('every facts.js id uses the deterministic scheme (tm:<id> or p:<slug>)', () => {
    // RFC-001 Phase A: internal ids are tm:<tmId> (from the Transfermarkt id) or
    // p:<slug> (players not on TM). Legacy bare slugs are gone.
    expect(players.filter(p => p.id).every(p => /^(tm:\d+|p:[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(p.id))).toBe(true)
  })

  it('every facts.js id (non-empty) exists in the generated registry', () => {
    const orphans = players.filter(p => p.id && !registryIds.has(p.id)).map(p => `${p.id} (${p.displayName})`)
    expect(orphans, orphans.slice(0, 10).join(', ')).toHaveLength(0)
  })

  it('the R9 explicit alias stays unified onto one stored id', () => {
    const r9 = players.filter(p => p.displayName === 'Ronaldo Nazario')
    expect(r9.length).toBe(1)
  })
})

describe('phase 2: tap games still generate valid boards on new ids', () => {
  it('TicTacToe grid builds for a fixed day', () => {
    const g = getGridForDay(100)
    expect(g.rowCategories).toHaveLength(3)
    expect(g.colCategories).toHaveLength(3)
    // every cell has at least one valid answer
    for (const row of g.reveal) for (const cell of row) expect(cell.length).toBeGreaterThan(0)
  })

  it('Connections puzzle builds four groups of four for a fixed day', () => {
    const p = getConnectionsForDay(100)
    expect(p.groups).toHaveLength(4)
    for (const grp of p.groups) expect(grp.players).toHaveLength(4)
    expect(p.tiles).toHaveLength(16)
  })
})
