// ─────────────────────────────────────────────────────────────────────────
// NAMESAKES — two real players who share a name are two answers, never one.
//
// The Spanish Nico González (tm:466805, Man City) and the Argentine one
// (tm:486031, Fiorentina/Juventus) used to collapse into a single dropdown entry
// with a merged "Argentina/Spain" nationality, and picking either was scored as
// the other. These pin the fix: separate identities with their own nationality,
// separate dropdown entries with a hint, and every typing game validating a
// picked suggestion by its id.
// ─────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { getPlayer } from '../src/data/canonical/facts.js'
import { searchRegistry, refineSuggestions } from '../src/data/canonical/resolve.js'
import { resolvePick } from '../src/data/tictactoe.js'
import { answerMatches, normalize as normalizeForMatch } from '../src/games/tenable/match.js'
import { matchAnswer } from '../src/data/pointless/pointlessGame.js'
import { getTargetForDay, TARGET_COUNT } from '../src/data/careers.js'
import careers from '../src/data/careers.generated.json'

const SPAIN = 'tm:466805'
const ARGENTINA = 'tm:486031'
const seed = JSON.parse(readFileSync('src/data/canonical/players.recognisable.generated.json', 'utf8'))

describe('namesake identities', () => {
  it('each namesake keeps only its own Transfermarkt nationality', () => {
    expect(getPlayer(SPAIN).nationalities).toEqual(['Spain'])
    expect(getPlayer(ARGENTINA).nationalities).toEqual(['Argentina'])
    // Real dual nationals without a namesake are untouched.
    expect(getPlayer('tm:44779').nationalities).toEqual(['Spain', 'Brazil']) // Diego Costa
  })

  it('a dual national leads with the country they were capped for (the dropdown flag)', () => {
    expect(getPlayer('tm:7602').nationalities[0]).toBe('Italy')   // Thiago Motta
    expect(getPlayer('tm:44779').nationalities[0]).toBe('Spain')  // Diego Costa
    const motta = refineSuggestions(searchRegistry('thiago motta')).find(s => s.id === 'tm:7602')
    expect(motta.nationality).toBe('Italy')
  })

  it('every searchable namesake carries a hint to tell them apart', () => {
    const byName = new Map()
    for (const p of seed) {
      const k = p.displayName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      byName.set(k, [...(byName.get(k) || []), p])
    }
    const groups = [...byName.values()].filter(g => g.length > 1)
    expect(groups.length).toBeGreaterThan(100)
    const tmMembers = groups.flat().filter(p => p.id.startsWith('tm:'))
    expect(tmMembers.filter(p => !p.hint).length / tmMembers.length).toBeLessThan(0.02)
  })
})

describe('dropdown', () => {
  it('lists both Nico Gonzálezes as separate entries with ids and hints', () => {
    const list = refineSuggestions(searchRegistry('nico gonzalez'))
    const nicos = list.filter(s => s.id === SPAIN || s.id === ARGENTINA)
    expect(nicos.map(s => s.id).sort()).toEqual([SPAIN, ARGENTINA].sort())
    expect(new Set(nicos.map(s => s.flag)).size).toBe(2)
    for (const s of nicos) expect(s.hint).toBeTruthy()
  })
})

describe('validation by picked id', () => {
  it('Tic-Tac-Toe: only the namesake who fits the cell fills it', () => {
    const grid = {
      rowCategories: [{ type: 'nationality', value: 'Argentina' }, { type: 'nationality', value: 'Spain' }, { type: 'nationality', value: 'Brazil' }],
      colCategories: [{ type: 'club', value: 'Juventus' }, { type: 'club', value: 'Manchester City' }, { type: 'club', value: 'Barcelona' }],
      candidates: Array.from({ length: 9 }, () => ['Nico González']),
    }
    const none = new Set()
    expect(resolvePick(grid, 0, 'Nico González', ARGENTINA, none)).toBe('Nico González') // Argentina × Juventus
    expect(resolvePick(grid, 0, 'Nico González', SPAIN, none)).toBeNull()
    expect(resolvePick(grid, 4, 'Nico González', SPAIN, none)).toBe('Nico González')     // Spain × Man City
    expect(resolvePick(grid, 4, 'Nico González', ARGENTINA, none)).toBeNull()
  })

  it('Tenable: a namesake pick never claims the other player’s answer', () => {
    const answer = { text: 'Nico González', id: ARGENTINA }
    const guess = normalizeForMatch('Nico González')
    expect(answerMatches(guess, ARGENTINA, answer, true)).toBe(true)
    expect(answerMatches(guess, SPAIN, answer, true)).toBe(false)
  })

  it('Tenable: generated player answers carry their ids', () => {
    const t = JSON.parse(readFileSync('src/data/tenable.generated.json', 'utf8'))
    const answers = t.questions.filter(q => q.type === 'player').flatMap(q => q.answers)
    expect(answers.filter(a => a.id).length / answers.length).toBeGreaterThan(0.95)
  })

  it('Pointless: shared-name answers match the picked namesake only', () => {
    const q = { id: 'test-namesakes', answers: [{ d: 'Nico González', p: 12, i: ARGENTINA }, { d: 'Lionel Messi', p: 90 }] }
    expect(matchAnswer(q, 'Nico González', ARGENTINA)?.i).toBe(ARGENTINA)
    expect(matchAnswer(q, 'Nico González', SPAIN)).toBeNull()
    expect(matchAnswer(q, 'Lionel Messi', 'tm:28003')?.d).toBe('Lionel Messi')
  })

  it('Career Path: every target carries its own id', () => {
    expect(careers.players.every(p => p.id && p.id.startsWith('tm:'))).toBe(true)
    for (let d = 0; d < TARGET_COUNT; d += 37) expect(getTargetForDay(d).id).toMatch(/^tm:/)
  })
})
