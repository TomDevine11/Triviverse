import { describe, it, expect } from 'vitest'
import { TENABLE_QUESTIONS, searchExtraNames } from '../src/data/tenable.js'
import careers from '../src/data/careers.generated.json'

// B-035 / B-037 — regressions the 2026-10-09 data fix closed.
describe('national record lists cover the whole history', () => {
  const q = (t) => TENABLE_QUESTIONS.find(x => x.title === t)
  it('England most capped includes pre-1992 players', () => {
    const names = q('England — Most Capped Players').answers.map(a => a.text)
    for (const n of ['Peter Shilton', 'Bobby Moore', 'Bobby Charlton', 'Billy Wright']) expect(names).toContain(n)
  })
  it('suggests players who are not in the league registry', () => {
    expect(searchExtraNames('shil').map(s => s.name)).toContain('Peter Shilton')
    expect(searchExtraNames('moore').map(s => s.name)).toContain('Bobby Moore')
  })
})

describe('career path timelines are senior careers of the right player', () => {
  it('has one entry per name and at least five clubs each', () => {
    const names = careers.players.map(p => p.name)
    expect(new Set(names).size).toBe(names.length)
    for (const p of careers.players) expect(p.clubs.length, p.name).toBeGreaterThanOrEqual(5)
  })
  it('contains no youth, reserve or third-team sides', () => {
    const youth = /(Jgd\.?|\sYou|\sYout|\sY\.|\sAca|Castilla|Mestalla|Madrileño|\sU\d{2}|\sC|\sB|\sII|\sRes\.|\sAtl\.)$/
    const bad = careers.players.flatMap(p => p.clubs.filter(c => youth.test(c.name)).map(c => `${p.name}: ${c.name}`))
    expect(bad).toEqual([])
  })
  it('starts Ibrahimović at Malmö, not his boyhood clubs', () => {
    expect(careers.players.find(p => p.name === 'Zlatan Ibrahimović').clubs[0].name).toBe('Malmö')
  })
})
