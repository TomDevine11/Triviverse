import { describe, it, expect } from 'vitest'
import teammates from '../src/data/teammates.generated.json'
import careers from '../src/data/careers.generated.json'
import categories from '../src/data/categories.generated.json'
import stats from '../src/data/canonical/stats.generated.json'

// A name that's just a Wikidata QID (e.g. "Q119562") means a label lookup
// failed during import. resolveQidNames() in the import scripts should prevent
// this; this guard fails the build (and so blocks the monthly auto-refresh from
// committing) if any bare QID ever leaks into the shipped data again.
const isQid = s => /^Q\d+$/.test(s)

function collectNames() {
  const names = []
  for (const p of teammates.players) {
    names.push(p.name)
    for (const m of p.teammates) names.push(m.name)
  }
  for (const p of careers.players) {
    names.push(p.name)
    for (const c of p.clubs) names.push(c.name)
  }
  for (const group of [categories.clubs, categories.nationalities, categories.trophies]) {
    for (const arr of Object.values(group || {})) for (const m of arr) names.push(m.name)
  }
  for (const ch of Object.values(stats.challenges || {})) names.push(...Object.keys(ch.players || {}))
  return names
}

describe('generated data has no leaked Wikidata QIDs', () => {
  it('no club / nationality / trophy / player name is a bare QID', () => {
    const offenders = [...new Set(collectNames().filter(isQid))]
    expect(offenders, `bare QIDs found: ${offenders.join(', ')}`).toEqual([])
  })
})
