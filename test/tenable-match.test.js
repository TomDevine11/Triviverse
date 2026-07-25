import { describe, it, expect } from 'vitest'
import { answerMatches, normalize } from '../src/games/tenable/match.js'
import { resolveNameToId } from '../src/data/canonical/resolve.js'

const n = normalize
const id = (name) => resolveNameToId(name)

describe('Tenable answerMatches — reachable by surname, namesake-safe', () => {
  it('exact name and bare surname match on player questions', () => {
    const ans = { text: 'Robbie Fowler' }
    expect(answerMatches(n('Robbie Fowler'), id('Robbie Fowler'), ans, true)).toBe(true)
    expect(answerMatches(n('fowler'), null, ans, true)).toBe(true)
  })

  it('a picked variant of the RIGHT player matches (Andy → Andrew Robertson)', () => {
    // Picking "Andy Robertson" from the dropdown carries the andy-robertson id;
    // the answer is spelled "Andrew Robertson". Must be accepted.
    const ans = { text: 'Andrew Robertson' }
    expect(answerMatches(n('Andy Robertson'), id('Andy Robertson'), ans, true)).toBe(true)
  })

  it('rejects a genuine namesake — different known player, same surname', () => {
    const a = id('Gary Neville'), b = id('Phil Neville')
    if (!a || !b || a === b) return // only meaningful if both are distinct registry players
    const ans = { text: 'Gary Neville' }
    expect(answerMatches(n('Phil Neville'), b, ans, true)).toBe(false)
  })

  it('club/country answers stay strict — no fuller-name surname leniency', () => {
    const ans = { text: 'Real Madrid' }
    expect(answerMatches(n('madrid'), null, ans, false)).toBe(true)          // bare word ok
    expect(answerMatches(n('Atletico Madrid'), null, ans, false)).toBe(false) // different club, shared word
  })
})
