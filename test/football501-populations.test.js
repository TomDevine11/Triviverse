// Build-Your-Own facet composer — functional QA / regression suite.
// Drives the REAL resolver: stats × freely-combining layers, contextual stats,
// natural-language phrasing, and the cross-competition co-appearance fix.
import { describe, it, expect } from 'vitest'
import * as P from '../src/data/football501/populations.js'

const q = (stat, layers = {}) => P.resolveQuestion({ stat, layers })
const clubId = async (name) => (await P.getLayerOptions('club', {})).find(o => o.label === name)?.value
const playerId = async (name) => (await P.getLayerOptions('player', {})).find(o => o.label === name)?.value
const trophyId = async (label) => (await P.getLayerOptions('trophy', {})).find(o => o.label === label)?.value
const playable = (r) => {
  expect(r.empty).toBe(false)
  expect(r.solvable).toBe(true)
  expect(r.challenge.validate(r.board[0].name).status).toBe('valid')
  expect(r.challenge.validate('Zzqx Nobody').status).toBe('not-eligible')
}

describe('stats & layers surface', () => {
  it('six stats; fee needs a club, together needs a player', () => {
    const s = P.getStats()
    expect(s.map(x => x.id)).toEqual(['goals', 'apps', 'apps+goals', 'apps-goals', 'fee', 'together'])
    expect(s.find(x => x.id === 'fee').needs).toBe('club')
    expect(s.find(x => x.id === 'together').needs).toBe('player')
  })
  it('seven layers; competition leads with All competitions', async () => {
    expect(P.getLayers().map(l => l.id)).toEqual(['competition', 'club', 'player', 'nationality', 'era', 'position', 'trophy'])
    expect((await P.getLayerOptions('competition', {}))[0].value).toBe('ALL')
  })
})

describe('layers combine freely (the whole point)', () => {
  it('club + era — the combination the old model could not express', async () => {
    const r = await q('apps', { club: await clubId('Manchester City'), era: '2010s' })
    playable(r)
    expect(r.question).toBe('Appearances for Manchester City in the 2010s')
  })
  it('scoped club goals', async () => {
    const r = await q('goals', { competition: 'GB1', club: await clubId('Liverpool') })
    playable(r)
    expect(r.question).toBe('Premier League goals for Liverpool')
  })
  it('nationality on its own (operator stat)', async () => {
    const r = await q('apps-goals', { competition: 'GB1', nationality: 'nat:spain' })
    expect(r.question).toBe('Premier League appearances − goals for Spanish players')
  })
  it('continent + position + era all at once', async () => {
    const r = await q('goals', { competition: 'GB1', nationality: 'cont:Africa', position: 'FWD', era: '2010s' })
    expect(typeof r.question).toBe('string')
    expect(r.question).toBe('Premier League goals for African forwards in the 2010s')
  })
  it('trophy as a layer', async () => {
    const r = await q('goals', { competition: 'GB1', trophy: await trophyId('Champions League') })
    playable(r)
    expect(r.question).toBe('Premier League goals for players who won the Champions League')
  })
  it('played-with as a plain filter (their own goals)', async () => {
    const r = await q('goals', { competition: 'GB1', player: await playerId('Steven Gerrard') })
    expect(r.question).toBe('Premier League goals for players who played with Steven Gerrard')
  })
})

describe('contextual stats', () => {
  it('transfer fee (needs a club)', async () => {
    const r = await q('fee', { club: await clubId('Manchester City') })
    playable(r)
    expect(r.question.startsWith('Transfer fee for players signed by Manchester City')).toBe(true)
    expect(r.statLabel).toBe('Transfer fee (€m)')
  })
  it('transfer fee works for a club group (union of the members)', async () => {
    const bigSix = (await P.getLayerOptions('club', {})).find(o => o.label === 'the Big Six').value
    const r = await q('fee', { club: bigSix })
    expect(r.empty).toBe(false)
    expect(r.solvable).toBe(true)
    expect(r.question.startsWith('Transfer fee for players signed by the Big Six')).toBe(true)
  })
  it('games together = co-appearances, and cross-competition ids do not collide', async () => {
    const r = await q('together', { player: await playerId('Lionel Messi') }) // all competitions
    const busquets = r.board.find(b => b.name === 'Sergio Busquets')
    expect(busquets.value).toBeGreaterThan(400) // ~523 (La Liga + CL), not the collided ~241
    expect(r.question).toBe('Games alongside Lionel Messi')
    expect(r.statLabel).toBe('Games together')
  })
  it('games together scoped to a competition', async () => {
    const r = await q('together', { competition: 'GB1', player: await playerId('Steven Gerrard') })
    expect(r.question).toBe('Premier League games alongside Steven Gerrard')
    expect(r.empty).toBe(false)
  })
})

describe('difficulty score', () => {
  it('a famous pool scores easier than an obscure cross-cut', async () => {
    const liv = (await P.getLayerOptions('club', {})).find(o => o.label === 'Liverpool').value
    const easy = await q('goals', { competition: 'GB1', club: liv })
    const hard = await q('goals', { competition: 'GB1', nationality: 'cont:Africa', position: 'GK' })
    expect(['Easy', 'Moderate', 'Tricky', 'Hard', 'Very hard']).toContain(easy.difficulty.label)
    expect(easy.difficulty.level).toBeLessThanOrEqual(hard.difficulty.level)
  })
})

describe('Tenable — same layers, top 10 instead of a checkout', () => {
  it('produces a ranked top-10 with detail strings + title', async () => {
    const liv = (await P.getLayerOptions('club', {})).find(o => o.label === 'Liverpool').value
    const r = await P.resolveTenable({ stat: 'goals', layers: { competition: 'GB1', club: liv } })
    expect(r.title).toBe('Premier League goals for Liverpool')
    expect(r.answers).toHaveLength(10)
    expect(r.answers[0].rank).toBe(1)
    expect(r.answers[0].detail).toMatch(/^\d+ goals$/)
    expect(r.answers[0].value ?? Infinity)
    expect(r.valid).toBe(true) // > 10 answers → a real "make the cut"
    expect(r.total).toBeGreaterThan(10)
    expect(r.difficulty.level).toBeGreaterThanOrEqual(1)
  })
  it('carries across every stat (games together, transfer fee)', async () => {
    const messi = (await P.getLayerOptions('player', {})).find(o => o.label === 'Lionel Messi').value
    const t = await P.resolveTenable({ stat: 'together', layers: { player: messi } })
    expect(t.title).toBe('Games alongside Lionel Messi')
    expect(t.answers[0].detail).toMatch(/^\d+ games$/)
    const city = (await P.getLayerOptions('club', {})).find(o => o.label === 'Manchester City').value
    const f = await P.resolveTenable({ stat: 'fee', layers: { club: city } })
    expect(f.answers[0].detail).toMatch(/^€\d+m$/)
  })
})

describe('player search is the whole database', () => {
  it('every player selectable, incl. non-marquee accented names', async () => {
    const opts = await P.getLayerOptions('player', {})
    expect(opts.length).toBeGreaterThan(1000)
    expect(opts.some(o => /Aubameyang/.test(o.label))).toBe(true)
  })
})
