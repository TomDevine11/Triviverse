import { describe, it, expect } from 'vitest'
import data from '../src/data/higherlower.generated.json'
import stats from '../src/data/canonical/stats.generated.json'
import {
  STAT_MODES, MIN_POOL, poolFor, isCorrect, pickChallenger, pickStarter,
  getDailyRun, dailyStats, statById, DAILY_LENGTH, RECENT, RATIO_MAX,
} from '../src/data/higherlower.js'

// Deterministic rng for the sampling tests.
function seeded(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646 }
const ratio = (a, b) => Math.max(a, b) / Math.min(a, b)

describe('Higher or Lower catalogue + generated pools', () => {
  it('ships goals and appearances for six competitions plus international goals and caps', () => {
    expect(STAT_MODES.filter(m => m.group === 'career').map(m => m.id).sort()).toEqual([
      'bundesliga-apps', 'bundesliga-goals', 'intl-caps', 'intl-goals', 'laliga-apps', 'laliga-goals',
      'ligue1-apps', 'ligue1-goals', 'prem-apps', 'prem-goals', 'seriea-apps', 'seriea-goals', 'ucl-apps', 'ucl-goals',
    ])
  })

  it('adds single-season bests, a transfer-fee stat and paired club stats', () => {
    expect(STAT_MODES.filter(m => m.group === 'season').map(m => m.id).sort()).toEqual([
      'bundesliga-season', 'laliga-season', 'ligue1-season', 'prem-season', 'seriea-season', 'ucl-season',
    ])
    expect(statById('transfer-fee')).toMatchObject({ group: 'transfer', kind: 'fee' })
    const clubs = STAT_MODES.filter(m => m.group === 'club')
    expect(clubs.length).toBeGreaterThanOrEqual(30)
    for (const m of clubs) {
      expect(m.club && m.base && statById(m.base), m.id).toBeTruthy()
      expect(m.competition).toBe(statById(m.base).competition)
      const twin = m.id.replace(/-(goals|apps)$/, m.kind === 'goals' ? '-apps' : '-goals')
      expect(statById(twin), `${m.id} has its pair`).toBeTruthy()
    }
  })

  it('season bests carry their season and fees their nominal price and year', () => {
    for (const m of STAT_MODES.filter(m => m.group === 'season')) {
      for (const p of poolFor(m.id)) expect(p.extra >= 1929 && p.extra <= 2030, `${m.id} ${p.name}`).toBe(true)
    }
    expect(poolFor('prem-season')[0]).toMatchObject({ name: 'Erling Haaland', value: 36 })
    expect(poolFor('laliga-season')[0]).toMatchObject({ name: 'Lionel Messi', value: 50 })
    const fees = poolFor('transfer-fee')
    for (const p of fees) {
      const [nominal, year] = p.extra
      expect(year >= 1996 && nominal > 0 && p.value >= Math.round(nominal) - 1, p.name).toBe(true) // inflation only ever raises a fee
    }
    expect(fees[0]).toMatchObject({ name: 'Neymar', extra: [222, 2017] })
  })

  it('every generated stat is playable — nothing is silently dropped client-side', () => {
    expect(Object.keys(data.stats).length).toBe(STAT_MODES.length)
    for (const id of Object.keys(data.stats)) expect(poolFor(id).length, id).toBe(data.stats[id].rows.length)
  })

  it('every row is a named player with a positive integer value; pools are value-sorted', () => {
    for (const [id, s] of Object.entries(data.stats)) {
      expect(s.rows.length, id).toBeGreaterThanOrEqual(MIN_POOL)
      let prev = Infinity
      for (const [i, v] of s.rows) {
        const p = data.players[i]
        expect(p, `${id} row → player ${i}`).toBeTruthy()
        expect(typeof p[0] === 'string' && p[0].trim().length > 0, `${id} name`).toBe(true)
        expect(p[1] >= 0 && p[1] <= 100, `${id} fame`).toBe(true)
        expect(Number.isInteger(v) && v > 0, `${id} ${p[0]} value ${v}`).toBe(true)
        expect(v <= prev, `${id} sorted`).toBe(true)
        prev = v
      }
    }
  })

  it('no player (or display name) appears twice in one pool', () => {
    for (const m of STAT_MODES) {
      const pool = poolFor(m.id)
      expect(new Set(pool.map(p => p.id)).size, m.id).toBe(pool.length)
      expect(new Set(pool.map(p => p.name)).size, m.id).toBe(pool.length)
    }
  })

  it('keeps accented names intact and includes the all-time record-holders', () => {
    const top = (id) => poolFor(id)[0]
    expect(top('bundesliga-goals')).toMatchObject({ name: 'Gerd Müller', value: 365 })
    expect(top('prem-goals')).toMatchObject({ name: 'Alan Shearer', value: 260 })
    expect(top('laliga-goals')).toMatchObject({ name: 'Lionel Messi', value: 474 })
    expect(top('seriea-goals')).toMatchObject({ name: 'Silvio Piola' })
    expect(top('ligue1-goals')).toMatchObject({ name: 'Delio Onnis' })
    expect(poolFor('laliga-goals').some(p => p.name === 'Telmo Zarra')).toBe(true) // low fame, kept as a record-holder
  })

  it('agrees with the 501 top-scorer boards wherever the two overlap', () => {
    for (const id of ['prem-goals', 'laliga-goals', 'bundesliga-goals', 'ucl-goals', 'intl-goals']) {
      const board = stats.challenges[id].players
      const byName = new Map(poolFor(id).map(p => [p.name, p.value]))
      let shared = 0
      for (const [name, v] of Object.entries(board)) if (byName.has(name)) { shared++; expect(byName.get(name), `${id} ${name}`).toBe(v) }
      expect(shared, id).toBeGreaterThan(Object.keys(board).length * 0.8)
    }
  })

  it('statById resolves known ids and rejects unknown ones', () => {
    expect(statById('prem-apps').label).toBe('Premier League appearances')
    expect(statById('nope')).toBeNull()
    expect(poolFor('nope')).toEqual([])
  })
})

describe('isCorrect', () => {
  it('judges higher/lower by value', () => {
    expect(isCorrect('higher', { value: 10 }, { value: 20 })).toBe(true)
    expect(isCorrect('lower', { value: 10 }, { value: 20 })).toBe(false)
    expect(isCorrect('lower', { value: 20 }, { value: 10 })).toBe(true)
  })
})

describe('Unlimited — pickChallenger', () => {
  it('never serves a tie, never the same player, never a repeat from the last 20 in real pools', () => {
    for (const m of STAT_MODES) {
      const pool = poolFor(m.id), rng = seeded(7)
      let cur = pickStarter(pool, rng)
      const seen = [cur.id]
      let repeats = 0
      for (let i = 0; i < 400; i++) {
        const next = pickChallenger(pool, cur, seen, rng)
        expect(next.value, m.id).not.toBe(cur.value)
        expect(next.id).not.toBe(cur.id)
        if (seen.slice(-RECENT).includes(next.id)) repeats++
        seen.push(next.id); cur = next
      }
      // Big pools never repeat inside 20; a ~50-player club pool may very rarely
      // have to (the band widens first, memory relaxes last).
      expect(repeats, `${m.id} repeats`).toBeLessThanOrEqual(pool.length >= 150 ? 0 : 3)
    }
  })

  it('keeps pairs within the ratio band when the pool allows it', () => {
    const pool = poolFor('prem-apps'), rng = seeded(3)
    let cur = pool[100], wide = 0
    for (let i = 0; i < 500; i++) { const n = pickChallenger(pool, cur, [], rng); if (ratio(n.value, cur.value) > RATIO_MAX) wide++; cur = n }
    expect(wide).toBe(0)
  })

  it('still finds a lopsided pairing for an outlier (Messi, 474)', () => {
    const pool = poolFor('laliga-goals')
    const messi = pool[0]
    const recent = pool.slice(0, 30).map(p => p.id) // every near neighbour "recently seen"
    const n = pickChallenger(pool, messi, recent, seeded(1))
    expect(n).toBeTruthy()
    expect(n.value).not.toBe(messi.value)
  })

  it('degrades gracefully in tiny or tie-heavy pools', () => {
    const P = (id, value) => ({ id, name: `P${id}`, value, fame: 50, rank: id })
    const tiny = [P(1, 10), P(2, 12), P(3, 50)]
    // everyone is "recent" → memory relaxes rather than failing
    expect(pickChallenger(tiny, tiny[0], [1, 2, 3])).toBeTruthy()
    // only tie candidates → null (no question), never a tie
    expect(pickChallenger([P(1, 10), P(2, 10)], P(1, 10))).toBeNull()
    // the only non-tie is far outside the band → still served
    expect(pickChallenger([P(1, 10), P(2, 10), P(3, 900)], P(1, 10)).id).toBe(3)
  })
})

describe('Daily', () => {
  const DAYS = Array.from({ length: 400 }, (_, i) => 20700 + i)
  const sig = (r) => r.questions.map(q => `${q.stat.id}:${q.a.id}-${q.b.id}`).join('|')

  it('is deterministic for a given day and differs between days', () => {
    expect(sig(getDailyRun(20730))).toBe(sig(getDailyRun(20730)))
    expect(sig(getDailyRun(20730))).not.toBe(sig(getDailyRun(20731)))
  })

  it(`always has ${DAILY_LENGTH} questions: no ties, no reused players, no stat more than twice, no back-to-back competition`, () => {
    for (const d of DAYS) {
      const r = getDailyRun(d)
      expect(r.questions.length, `day ${d}`).toBe(DAILY_LENGTH)
      const ids = new Set(), perStat = {}
      r.questions.forEach((q, i) => {
        expect(q.a.value, `day ${d} q${i}`).not.toBe(q.b.value)
        for (const p of [q.a, q.b]) { expect(ids.has(p.id), `day ${d} reused ${p.name}`).toBe(false); ids.add(p.id) }
        perStat[q.stat.id] = (perStat[q.stat.id] || 0) + 1
        if (i) expect(q.stat.competition, `day ${d} q${i}`).not.toBe(r.questions[i - 1].stat.competition)
      })
      for (const n of Object.values(perStat)) expect(n).toBeLessThanOrEqual(2)
    }
  })

  it('mixes stats widely and does not repeat the same combination on a short cycle', () => {
    const combos = DAYS.slice(0, 60).map(d => dailyStats(d).slice().sort().join(','))
    expect(new Set(combos).size).toBeGreaterThanOrEqual(55)
    for (const d of DAYS.slice(0, 60)) expect(new Set(dailyStats(d)).size).toBeGreaterThanOrEqual(9)
  })

  it('opens gently: early questions use well-known players and clearly different numbers', () => {
    for (const d of DAYS.slice(0, 100)) {
      for (const q of getDailyRun(d).questions.slice(0, 4)) {
        expect(q.stat.group, `${d} q${q.stat.id}`).toBe("career")
        for (const p of [q.a, q.b]) expect(p.fame >= 90 || p.rank <= 10, `${d} ${p.name}`).toBe(true)
        expect(ratio(q.a.value, q.b.value)).toBeGreaterThanOrEqual(1.5)
      }
    }
  })
})
