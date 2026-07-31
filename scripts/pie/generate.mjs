// ─────────────────────────────────────────────────────────────────────────
// Shared candidate builder — one place that turns a (population, projection)
// spec into a fully-evaluated candidate. Used by compile.mjs (explorer) and
// pool.mjs (workbench pool) so both speak the same candidate shape.
// ─────────────────────────────────────────────────────────────────────────

import { COMPS, POSITIONS, buildPopulation, natDisplay } from './population.mjs'
import { STATS, project } from './projection.mjs'
import { eraPopulation, recordSignings } from './seeds.mjs'
import { evaluate } from './metrics.mjs'
import { gateCheck, scoreProfile, explain } from './rank.mjs'

export const COMPILER_VERSION = '0.2.0'   // + Era, Trajectory seeds

const decadeLabel = (from) => `${from}s`

// Build the population + a title for a given SEED. Everything after this (metrics,
// gates, score) is seed-agnostic — that is the whole point of the abstraction.
function buildForSeed({ seed, club, clubId, competition, statKey, filters, era, base }) {
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

function dimensions({ seed, competition, statKey, filters, populationType, era }) {
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
  }
}

export function makeCandidate({ seed = 'attribute', club = null, clubId = null, competition = null, statKey, filters = {}, era = null, base = null, curated = new Set() }) {
  const built = buildForSeed({ seed, club, clubId, competition, statKey, filters, era, base })
  if (!built.players || built.players.length < 1) return null
  const board = project(built.players, built.valueStat)
  if (board.length < 1) return null

  const profile = evaluate(board)
  profile.filterCount = (filters.position ? 1 : 0) + (filters.nationality ? 1 : 0) // measured, unweighted
  const gatesFailed = gateCheck(profile)
  const { score, breakdown } = scoreProfile(profile)

  const populationType = seed === 'recordSignings' ? 'trajectory' : (clubId ? 'club' : 'competition')
  const filterKey = [filters.position && `pos:${filters.position}`, filters.nationality && `nat:${filters.nationality}`].filter(Boolean).join('|') || 'all'
  const id = `${seed}:${clubId || club || competition || 'x'}|${competition || 'ALL'}|${era ? era.from : ''}|${built.valueStat}|${filterKey}`

  return {
    id, title: built.title,
    population: { type: populationType, seed, club: club || null, competition: competition ? COMPS[competition] : (seed === 'recordSignings' ? null : 'All competitions'), decade: era ? decadeLabel(era.from) : null, ...filters },
    projection: { stat: built.valueStat, statLabel: STATS[built.valueStat].label },
    dimensions: dimensions({ seed, competition, statKey: built.valueStat, filters, populationType, era }),
    profile, gatesFailed, defaultScore: score, breakdown, explanation: explain(profile, breakdown, gatesFailed),
    curated: curated.has(`${competition}|${statKey}|${filterKey}`),
    board: board.slice(0, 20).map((b) => ({ n: b.name, v: b.value, f: b.fame })),
  }
}

export const STAT_KEYS = Object.keys(STATS)
export const POS_KEYS = Object.keys(POSITIONS)
export { COMPS }
