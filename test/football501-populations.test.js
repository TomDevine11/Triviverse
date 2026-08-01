// Build-Your-Own population registry — functional QA / regression suite.
// Drives the REAL providers through the generic registry API and asserts every
// valid combination yields a playable challenge, and impossible ones are flagged.
import { describe, it, expect } from 'vitest'
import * as P from '../src/data/football501/populations.js'

const sel = (o) => ({ params: {}, stat: 'goals', scope: { comp: 'GB1' }, refine: {}, ...o })
const clubValue = async (rx = /Liverpool/) => {
  const opts = await P.getPopulationOptions('club', 'club', sel({ kind: 'club' }))
  return opts.find(o => rx.test(o.label))?.value
}
const assertPlayable = (r) => {
  expect(r.empty).toBe(false)
  expect(r.solvable).toBe(true)
  expect(r.board.length).toBeGreaterThan(0)
  expect(r.challenge.validate(r.board[0].name).status).toBe('valid')
  expect(r.challenge.validate('Zzqx Not A Player').status).toBe('not-eligible')
  expect(Array.isArray(r.narrative)).toBe(true)
  for (const line of r.narrative) for (const tok of line) expect(tok).toHaveProperty('t')
}

describe('registry surface', () => {
  it('exposes the six Phase-1 kinds, popular→niche', () => {
    const kinds = P.getPopulationKinds()
    expect(kinds.map(k => k.id)).toEqual(['club', 'group', 'teammates', 'trophy', 'era', 'anyone'])
    for (const k of kinds) { expect(k.label).toBeTruthy(); expect(k.example).toBeTruthy() }
  })
  it('rankings lead with Goals; scopes lead with the Premier League', () => {
    expect(P.getRankingOptions('anyone', sel())[0].id).toBe('goals')
    expect(P.getScopes('anyone', sel())[0].value).toBe('GB1')
    expect(P.getRankingOptions('anyone', sel()).map(r => r.id)).toEqual(['goals', 'apps', 'apps+goals', 'apps-goals'])
  })
  it('refinements are position + origin, each with an "any" default first', () => {
    const rf = P.getRefinements('anyone', sel())
    expect(rf.map(r => r.id)).toEqual(['position', 'origin'])
    for (const r of rf) expect(r.options[0].value).toBe('')
  })
})

describe('every population resolves playable (valid combos)', () => {
  it('club', async () => assertPlayable(await P.resolveQuestion(sel({ kind: 'club', params: { club: await clubValue() } }))))
  it('group', async () => {
    const opts = P.getPopulationOptions('group', 'group', sel({ kind: 'group' }))
    assertPlayable(await P.resolveQuestion(sel({ kind: 'group', stat: 'apps', params: { group: opts[0].value } })))
  })
  it('teammates', async () => {
    const opts = P.getPopulationOptions('teammates', 'anchor', sel({ kind: 'teammates' }))
    assertPlayable(await P.resolveQuestion(sel({ kind: 'teammates', params: { anchor: opts[0].value } })))
  })
  it('trophy', async () => {
    const opts = await P.getPopulationOptions('trophy', 'trophy', sel({ kind: 'trophy' }))
    expect(opts[0].label).toBe('Champions League')
    assertPlayable(await P.resolveQuestion(sel({ kind: 'trophy', params: { trophy: opts[0].value } })))
  })
  it('era', async () => {
    const opts = P.getPopulationOptions('era', 'decade', sel({ kind: 'era' }))
    assertPlayable(await P.resolveQuestion(sel({ kind: 'era', params: { decade: '2010s' } })))
    expect(opts.map(o => o.value)).toEqual(['1990s', '2000s', '2010s', '2020s'])
  })
  it('anyone', async () => assertPlayable(await P.resolveQuestion(sel({ kind: 'anyone', stat: 'apps' }))))
})

describe('every ranking works on a big club', () => {
  it('goals / apps / apps+goals / apps−goals', async () => {
    const club = await clubValue()
    for (const rk of P.getRankingOptions('club', sel({ kind: 'club' }))) {
      const r = await P.resolveQuestion(sel({ kind: 'club', params: { club }, stat: rk.id }))
      expect(r.empty).toBe(false)
      expect(r.statLabel).toBe(rk.label)
    }
  })
})

describe('every competition scope resolves', () => {
  it('anyone · appearances in each competition', async () => {
    for (const s of P.getScopes('anyone', sel({ kind: 'anyone' }))) {
      const r = await P.resolveQuestion(sel({ kind: 'anyone', stat: 'apps', scope: { comp: s.value } }))
      expect(r.solvable).toBe(true)
    }
  })
})

describe('every refinement resolves', () => {
  it('each position', async () => {
    for (const pos of ['GK', 'DEF', 'MID', 'FWD']) {
      const r = await P.resolveQuestion(sel({ kind: 'anyone', stat: 'apps', refine: { position: pos } }))
      expect(r.empty).toBe(false)
    }
  })
  it('each continent (resolves without throwing)', async () => {
    for (const c of P.CONTINENTS) {
      const r = await P.resolveQuestion(sel({ kind: 'anyone', stat: 'apps', refine: { origin: `cont:${c}` } }))
      expect(r).toBeTruthy()
    }
  })
})

describe('invalid combinations give the right guidance', () => {
  it('goalkeepers by goals cannot reach 501', async () => {
    const r = await P.resolveQuestion(sel({ kind: 'anyone', stat: 'goals', refine: { position: 'GK' } }))
    expect(r.solvable).toBe(false) // real "cannot be completed"
  })
  it('a vanishingly thin cross-cut is not solvable', async () => {
    // South-American goalkeepers, by goals, in the Premier League → basically nobody
    const r = await P.resolveQuestion(sel({ kind: 'anyone', stat: 'goals', refine: { position: 'GK', origin: 'cont:South America' } }))
    expect(r.solvable).toBe(false)
  })
})

describe('edge cases / cannot break state', () => {
  it('resolves with default (unset) params without throwing', async () => {
    for (const kind of ['teammates', 'trophy', 'era', 'anyone']) {
      const r = await P.resolveQuestion(sel({ kind }))
      expect(r).toBeTruthy()
    }
  })
  it('rapid ranking swaps are each independently valid', async () => {
    const club = await clubValue()
    const ids = ['goals', 'apps', 'apps-goals', 'goals', 'apps+goals']
    for (const stat of ids) {
      const r = await P.resolveQuestion(sel({ kind: 'club', params: { club }, stat }))
      expect(r.empty).toBe(false)
    }
  })
})
