import { describe, it, expect } from 'vitest'
import { getDailyEntry, getDailyChallenge, getRandomChallenge, CATALOG_SIZE, evaluateSpec, makeCustomChallenge, loadCompetition, COMPETITIONS, POSITIONS, STAT_OPTIONS } from '../src/data/football501/game.js'
import { resolveRoster, titleFor } from '../src/data/football501/spec.js'

describe('501 catalog + generator', () => {
  it('has a large multi-competition catalog', () => {
    expect(CATALOG_SIZE).toBeGreaterThan(5000)
  })

  it('daily question is deterministic', () => {
    expect(getDailyEntry().id).toBe(getDailyEntry().id)
  })

  it('daily challenge resolves (async) with a working validator', async () => {
    const c = await getDailyChallenge()
    expect(c.title).toBeTruthy()
    expect(typeof c.validate).toBe('function')
    expect(c.maxPlayers).toBeGreaterThanOrEqual(1)
    expect(c.validate('zzznotaplayer').status).toBe('not-eligible')
  })

  it('random multiplayer question supports the requested player count', async () => {
    for (let i = 0; i < 5; i++) expect((await getRandomChallenge(3)).maxPlayers).toBeGreaterThanOrEqual(3)
  }, 15000) // loads 5× multi-MB fact tables; needs headroom over the 5s default under parallel load

  it('position badge comes from the challenge’s competition data', async () => {
    const c = await makeCustomChallenge({ comp: 'GB1', stat: 'goals', filter: {} })
    expect(c.badgeFor('Alan Shearer')).toBe('FWD')
    expect(c.badgeFor('Petr Cech')).toBe('GK')
    expect(c.badgeFor('zzznobody')).toBe(null)
  })
})

describe('501 custom builder', () => {
  it('exposes competitions + per-competition option lists', async () => {
    expect(COMPETITIONS.length).toBe(6)
    expect(POSITIONS.length).toBe(4)
    expect(STAT_OPTIONS.length).toBe(4)
    const { clubs, nations } = await loadCompetition('GB1')
    expect(clubs.length).toBeGreaterThan(40)
    expect(nations.length).toBeGreaterThan(20)
  })

  it('evaluates completability live + resolves a real answer', async () => {
    const { fact } = await loadCompetition('GB1')
    const ev = evaluateSpec({ comp: 'GB1', stat: 'goals', filter: {} }, fact)
    expect(ev.answers).toBeGreaterThan(1000)
    expect(ev.maxPlayers).toBe(5)
    expect(ev.solvable).toBe(true)

    const c = await makeCustomChallenge({ comp: 'GB1', stat: 'goals', filter: { nationality: 'france' } })
    expect(c.title).toBe('Premier League · Goals · French players')
    expect(c.validate('Thierry Henry')).toMatchObject({ status: 'valid', value: 175 })
  })

  it('answersList + live insight boxes', async () => {
    const c = await makeCustomChallenge({ comp: 'GB1', stat: 'goals', filter: { nationality: 'france' } })
    expect(c.answersList()[0]).toMatchObject({ name: 'Thierry Henry', value: 175 })
    expect(c.insights(500, new Set()).highest).toBe(175)
    expect(c.insights(175, new Set()).perfect).toBe(1)
    expect(c.insights(500, new Set(['Thierry Henry'])).highest).toBe(125)
  })
})

describe('501 multi-competition', () => {
  it('resolves La Liga against its own fact table', async () => {
    const c = await makeCustomChallenge({ comp: 'ES1', stat: 'goals', filter: {} })
    expect(c.validate('Lionel Messi')).toMatchObject({ status: 'valid', value: 474 })
    expect(c.title.startsWith('La Liga · ')).toBe(true)
  })
})

describe('501 spec resolver (shared by build + game)', () => {
  const fact = [
    { id: '1', name: 'A Keeper',  natKey: 'england', pos: 'GK',  comps: { GB1: { apps: 400, goals: 0,  clubs: { 11: { apps: 400, goals: 0 } } } } },
    { id: '2', name: 'A Striker', natKey: 'france',  pos: 'FWD', comps: { GB1: { apps: 100, goals: 80, clubs: { 11: { apps: 100, goals: 80 } } } } },
  ]

  it('applies stat + player-property filters (competition-scoped)', () => {
    const { players } = resolveRoster({ comp: 'GB1', stat: { a: 'apps', op: '-', b: 'goals' }, filter: { position: 'FWD' } }, fact)
    expect(Object.values(players)).toEqual([{ name: 'A Striker', value: 20, breakdown: { apps: 100, goals: 80 } }])
  })

  it('club filter scopes the value to that club', () => {
    const { players } = resolveRoster({ comp: 'GB1', stat: 'goals', filter: { club: '11' } }, fact)
    expect(players['2'].value).toBe(80)
    expect(players['1']).toBeUndefined()
  })

  it('auto-titles include the competition', () => {
    expect(titleFor({ stat: { a: 'apps', op: '-', b: 'goals' }, filter: { nationality: 'france', position: 'FWD' } }, { compName: 'La Liga' })).toBe('La Liga · Appearances − Goals · French forwards')
  })
})
