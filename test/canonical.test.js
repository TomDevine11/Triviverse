import { describe, it, expect } from 'vitest'
import { allPlayers, FACTS, membersOf, notableMembersOf, getPlayer, CLUB_LEAGUE } from '../src/data/canonical/facts.js'

describe('canonical data integrity', () => {
  it('every fact references a registered player', () => {
    for (const f of FACTS) expect(getPlayer(f.playerId), f.playerId).not.toBeNull()
  })

  it('every fact carries provenance (source + asOfDate)', () => {
    for (const f of FACTS) {
      expect(f.source).toBeTruthy()
      expect(f.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('every club referenced in a played_for_club fact has a league', () => {
    for (const f of FACTS) {
      if (f.type === 'played_for_club') expect(CLUB_LEAGUE[f.value], f.value).toBeTruthy()
    }
  })

  it('no duplicate (playerId, type, value) facts', () => {
    const seen = new Set()
    for (const f of FACTS) {
      const key = `${f.playerId}|${f.type}|${f.value}`
      expect(seen.has(key), `duplicate fact ${key}`).toBe(false)
      seen.add(key)
    }
  })

  it('player ids are unique per display name', () => {
    const byId = new Map()
    for (const p of allPlayers()) {
      if (byId.has(p.id)) expect(byId.get(p.id)).toBe(p.displayName)
      byId.set(p.id, p.displayName)
    }
  })
})

describe('derived league membership (Saliba/Álvarez class)', () => {
  it('a club member is automatically a member of that club’s league', () => {
    // Pick a club + its league and assert the derived league set is a superset.
    for (const [club, league] of Object.entries(CLUB_LEAGUE)) {
      const clubSet = membersOf({ type: 'club', value: club })
      const leagueSet = membersOf({ type: 'league', value: league })
      for (const id of clubSet) {
        expect(leagueSet.has(id), `${getPlayer(id).displayName} in ${club} but not derived ${league}`).toBe(true)
      }
    }
  })

  it('William Saliba is a Premier League member via Arsenal (regression)', () => {
    const pl = membersOf({ type: 'league', value: 'Premier League' })
    const saliba = [...pl].map(id => getPlayer(id).displayName).find(n => n === 'William Saliba')
    expect(saliba).toBe('William Saliba')
  })

  it('Julian Alvarez satisfies PL ∩ World Cup (regression)', () => {
    const pl = membersOf({ type: 'league', value: 'Premier League' })
    const wc = membersOf({ type: 'trophy', value: 'FIFA World Cup' })
    const both = [...pl].filter(id => wc.has(id)).map(id => getPlayer(id).displayName)
    expect(both).toContain('Julian Alvarez')
  })
})

describe('Wikidata club-roster merge (Option A)', () => {
  it('club rosters are now sourced-exhaustive (far larger than the hand lists)', () => {
    // Hand-curated Real Madrid was ~39; the merged roster should be in the hundreds.
    const rm = membersOf({ type: 'club', value: 'Real Madrid' })
    expect(rm.size).toBeGreaterThan(100)
  })

  it('facts carry provenance from BOTH curated and wikidata sources', () => {
    const sources = new Set(FACTS.map(f => f.source))
    expect(sources.has('curated')).toBe(true)
    expect(sources.has('wikidata')).toBe(true)
  })

  it('curated ASCII display name wins over Wikidata diacritic form (same id)', () => {
    // "Julian Alvarez" (curated) and "Julián Alvarez" (Wikidata) unify to one id;
    // the curated spelling is kept for display.
    // Phase 2: ids are the stable crosswalk slugs (no legacy 'p:' prefix).
    const p = allPlayers().find(x => x.displayName === 'Julian Alvarez')
    expect(p).not.toBeNull()
    expect(p.displayName).toBe('Julian Alvarez')
    expect(p.clubs).toContain('Manchester City')
  })

  it('no duplicate facts after merging the two sources', () => {
    const seen = new Set()
    for (const f of FACTS) {
      const k = `${f.playerId}|${f.type}|${f.value}`
      expect(seen.has(k), `dup ${k}`).toBe(false)
      seen.add(k)
    }
  })
})

describe('sourced trophies + nationality + notable/broad split', () => {
  it('World Cup winners are sourced exhaustively (Wikipedia, ~471)', () => {
    expect(membersOf({ type: 'trophy', value: 'FIFA World Cup' }).size).toBeGreaterThan(400)
  })

  it("Ballon d'Or winners are sourced (Wikidata P166)", () => {
    expect(membersOf({ type: 'trophy', value: "Ballon d'Or" }).size).toBeGreaterThan(30)
  })

  it('nationality is sourced from national-team rosters (Argentina > 100)', () => {
    expect(membersOf({ type: 'nationality', value: 'Argentina' }).size).toBeGreaterThan(100)
  })

  it('the notable set is a strict subset of the broad set', () => {
    for (const c of [{ type: 'club', value: 'Real Madrid' }, { type: 'nationality', value: 'Brazil' }]) {
      const broad = membersOf(c), notable = notableMembersOf(c)
      expect(notable.size).toBeLessThanOrEqual(broad.size)
      for (const id of notable) expect(broad.has(id)).toBe(true)
    }
  })

  it('every fact source is one of the declared provenances', () => {
    const allowed = new Set(['curated', 'wikidata', 'wikipedia'])
    for (const f of FACTS) expect(allowed.has(f.source), f.source).toBe(true)
  })
})

describe('cross-consistency gap detection (non-fatal report)', () => {
  // A trophy/nationality member with NO club fact can never satisfy a club or
  // league cell — surface these as data gaps so they can be filled. This is a
  // warning, not a hard failure (some entries are legitimately international-
  // or trophy-only), so we just assert the report is computable and log it.
  it('reports players with category facts but no club fact', () => {
    const noClub = allPlayers().filter(p => p.clubs.length === 0)
    const names = noClub.map(p => p.displayName).sort()
    // Informational: keep the count visible in test output.
    expect(Array.isArray(names)).toBe(true)
    if (names.length) console.log(`  [gap] ${names.length} players have no club fact:`, names.join(', '))
  })
})
