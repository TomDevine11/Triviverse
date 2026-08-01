// ─────────────────────────────────────────────────────────────────────────
// Shared candidate builder — one place that turns a (population, projection)
// spec into a fully-evaluated candidate. Used by compile.mjs (explorer) and
// pool.mjs (workbench pool) so both speak the same candidate shape.
// ─────────────────────────────────────────────────────────────────────────

import { COMPS, POSITIONS, buildPopulation, natDisplay } from './population.mjs'
import { STATS, project } from './projection.mjs'
import { eraPopulation, recordSignings, teammatesOf } from './seeds.mjs'
import { evaluate } from './metrics.mjs'
import { gateCheck, scoreProfile, explain } from './rank.mjs'

export const COMPILER_VERSION = '0.2.0'   // + Era, Trajectory seeds

const decadeLabel = (from) => `${from}s`

// Stat "charisma" — goals feel glamorous, appearances worthy, the fee novel. Measured
// (unweighted) so the workbench can test whether you actually prefer high-charisma stats.
const CHARISMA = { goals: 1.0, fee: 0.9, apps_plus_goals: 0.7, apps_minus_goals: 0.5, apps: 0.4 }

// Build the population + a title for a given SEED. Everything after this (metrics,
// gates, score) is seed-agnostic — that is the whole point of the abstraction.
function buildForSeed({ seed, club, clubId, competition, statKey, filters, era, anchor, base }) {
  if (seed === 'teammates') {
    const players = teammatesOf({ anchor, ...filters })
    return { players, valueStat: 'co_apps', title: `Most games played alongside ${anchor}` }
  }
  if (seed === 'era') {
    const players = eraPopulation({ competition, from: era.from, to: era.to, ...filters })
    const scope = filters.position ? POSITIONS[filters.position] : filters.nationality ? `(${natDisplay(players, filters.nationality)})` : 'all players'
    return { players, valueStat: statKey, title: `${COMPS[competition]} · ${STATS[statKey].label} · ${scope} · ${decadeLabel(era.from)}` }
  }
  if (seed === 'recordSignings') {
    const players = recordSignings({ club, ...filters })
    const scope = filters.position ? ` ${POSITIONS[filters.position]}` : filters.nationality ? ` (${natDisplay(players, filters.nationality)})` : ''
    return { players, valueStat: 'fee', title: `${club.replace(/ FC$/, '')} · record signings${scope} (by fee)` }
  }
  // attribute (the original grammar)
  const players = buildPopulation({ clubId, competition, ...filters })
  const compName = competition ? COMPS[competition] : 'All competitions'
  const scope = filters.position ? POSITIONS[filters.position] : filters.nationality ? `(${natDisplay(base || players, filters.nationality)})` : (clubId ? 'players' : 'all players')
  const subject = clubId ? club.replace(/ FC$/, '') : ''
  return { players, valueStat: statKey, title: `${compName} · ${STATS[statKey].label} · ${[subject, scope].filter(Boolean).join(' ')}`.replace(/  +/g, ' ') }
}

function dimensions({ seed, competition, statKey, filters, populationType, era, club, anchor }) {
  return {
    seed,                                            // 'attribute' | 'era' | 'recordSignings'
    stat: statKey,
    populationType,                                  // 'club' | 'competition' | 'trajectory'
    competition: competition || 'ALL',
    europe: competition === 'CL',
    decade: era ? decadeLabel(era.from) : null,
    hasPosition: !!filters.position,
    hasNationality: !!filters.nationality,
    position: filters.position || null,
    nationality: filters.nationality || null,        // surfaces a national bias (e.g. England)
    club: club ? club.replace(/ FC$/, '') : null,    // surfaces a club bias (e.g. Man City)
    anchor: anchor || null,
  }
}

export function makeCandidate({ seed = 'attribute', club = null, clubId = null, competition = null, statKey, filters = {}, era = null, anchor = null, base = null, curated = new Set() }) {
  const built = buildForSeed({ seed, club, clubId, competition, statKey, filters, era, anchor, base })
  if (!built.players || built.players.length < 1) return null
  const board = project(built.players, built.valueStat)
  if (board.length < 1) return null

  const profile = evaluate(board)
  profile.filterCount = (filters.position ? 1 : 0) + (filters.nationality ? 1 : 0) // measured, unweighted
  profile.statCharisma = CHARISMA[built.valueStat] ?? 0.5
  profile.isGoalkeeper = filters.position === 'GK' ? 1 : 0
  profile.nationalityFilter = filters.nationality ? 1 : 0 // nationality filters hurt (position filters don't)
  // clauseCount — how many "parts" the question has (your "past 3–4 I reject" hypothesis).
  profile.clauseCount = (competition ? 1 : 0) + (club ? 1 : 0) + (filters.position ? 1 : 0) + (filters.nationality ? 1 : 0) + (era ? 1 : 0) + (anchor ? 1 : 0)
  const gatesFailed = gateCheck(profile)
  const { score, breakdown } = scoreProfile(profile)

  const populationType = seed === 'teammates' ? 'relation' : seed === 'recordSignings' ? 'trajectory' : (clubId ? 'club' : 'competition')
  const filterKey = [filters.position && `pos:${filters.position}`, filters.nationality && `nat:${filters.nationality}`].filter(Boolean).join('|') || 'all'
  const id = `${seed}:${clubId || club || anchor || competition || 'x'}|${competition || 'ALL'}|${era ? era.from : ''}|${built.valueStat}|${filterKey}`

  return {
    id, title: built.title,
    population: { type: populationType, seed, club: club || null, anchor: anchor || null, competition: competition ? COMPS[competition] : (seed === 'recordSignings' || seed === 'teammates' ? null : 'All competitions'), decade: era ? decadeLabel(era.from) : null, ...filters },
    projection: { stat: built.valueStat, statLabel: STATS[built.valueStat].label },
    dimensions: dimensions({ seed, competition, statKey: built.valueStat, filters, populationType, era, club, anchor }),
    profile, gatesFailed, defaultScore: score, breakdown, explanation: explain(profile, breakdown, gatesFailed),
    curated: curated.has(`${competition}|${statKey}|${filterKey}`),
    board: board.slice(0, 20).map((b) => ({ n: b.name, v: b.value, f: b.fame })),
  }
}

export const STAT_KEYS = Object.keys(STATS)
export const POS_KEYS = Object.keys(POSITIONS)
export { COMPS }
