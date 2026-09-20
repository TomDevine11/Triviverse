import { describe, it, expect } from 'vitest'
import {
  POOL, POOL_SIZE, TARGET_COUNT, createBoard, getContextoForDay, getRandomContexto,
  similarity, relation, isInPool, getPoolPlayer,
} from '../src/data/contexto.js'

const byName = (n) => POOL.find(p => p.n.toLowerCase() === n.toLowerCase())

describe('Football Contexto — the association ranking', () => {
  it('has a pool and a target set worth playing', () => {
    expect(POOL_SIZE).toBeGreaterThan(3000)
    expect(TARGET_COUNT).toBeGreaterThan(300)
  })

  it('ranks the target itself first, always', () => {
    for (const d of [1, 9, 42, 100, 365]) {
      const { target } = getContextoForDay(d)
      expect(createBoard(target).rankOf(target.i), target.n).toBe(1)
    }
  })

  it('gives every pool player a unique rank', () => {
    const { target } = getContextoForDay(7)
    const board = createBoard(target)
    const seen = new Set(POOL.map(p => board.rankOf(p.i)))
    expect(seen.size).toBe(POOL_SIZE)
    expect(Math.max(...seen)).toBe(POOL_SIZE)
  })

  it('is deterministic per day', () => {
    for (const d of [3, 55, 200]) {
      expect(getContextoForDay(d).target.i).toBe(getContextoForDay(d).target.i)
      const a = createBoard(getContextoForDay(d).target)
      const b = createBoard(getContextoForDay(d).target)
      expect(a.nearest(8).map(p => p.n)).toEqual(b.nearest(8).map(p => p.n))
    }
  })

  // The model is only worth shipping if a real teammate beats a mere contemporary.
  // Fernandinho is the case it was designed against.
  it('puts teammates above contemporaries — the Fernandinho case', () => {
    const target = byName('Fernandinho')
    expect(target, 'Fernandinho must be in the pool').toBeTruthy()
    const board = createBoard(target)
    const rank = (n) => board.rankOf(byName(n)?.i)

    const cityMates = ['Sergio Aguero', 'Kevin De Bruyne', 'David Silva'].map(rank)
    for (const r of cityMates) expect(r).toBeLessThanOrEqual(12)

    // A contemporary with no club connection must be far away.
    expect(rank('Manuel Neuer')).toBeGreaterThan(100)
    // A Premier League contemporary at another club sits between the two.
    expect(rank('John Terry')).toBeGreaterThan(Math.max(...cityMates))
    expect(rank('John Terry')).toBeLessThan(rank('Manuel Neuer'))
  })

  it('scores a teammate above a same-nationality stranger', () => {
    const target = byName('Fernandinho')
    const mate = byName('Kevin De Bruyne')     // teammate, different nationality
    const compatriot = byName('Manuel Neuer')  // neither
    expect(similarity(target, mate)).toBeGreaterThan(similarity(target, compatriot))
  })

  it('explains why a guess ranks where it does', () => {
    const target = byName('Fernandinho')
    expect(relation(target, byName('Kevin De Bruyne')).kind).toBe('teammate')
    expect(relation(target, byName('Manuel Neuer')).kind).not.toBe('teammate')
    expect(['teammate', 'club', 'nationality', 'era', 'none']).toContain(relation(target, POOL[500]).kind)
  })

  it('nearest() returns real neighbours, never the target', () => {
    const { target } = getContextoForDay(11)
    const near = createBoard(target).nearest(10)
    expect(near).toHaveLength(10)
    expect(near.map(p => p.i)).not.toContain(target.i)
    expect(near[0].rank).toBe(2)
    for (let i = 1; i < near.length; i++) expect(near[i].rank).toBeGreaterThan(near[i - 1].rank)
  })

  it('pool membership helpers agree', () => {
    const p = POOL[123]
    expect(isInPool(p.i)).toBe(true)
    expect(getPoolPlayer(p.i).n).toBe(p.n)
    expect(isInPool('p:not-a-real-player')).toBe(false)
  })

  it('random rounds obey the same contract', () => {
    for (let i = 0; i < 5; i++) {
      const { target } = getRandomContexto()
      expect(createBoard(target).rankOf(target.i)).toBe(1)
    }
  })

  it('every target has enough career data to rank against', () => {
    for (const d of Array.from({ length: 40 }, (_, i) => i + 1)) {
      const { target } = getContextoForDay(d)
      expect(target.ts.length, target.n).toBeGreaterThanOrEqual(6)
      expect(target.f, target.n).toBeGreaterThanOrEqual(55)
    }
  })
})
