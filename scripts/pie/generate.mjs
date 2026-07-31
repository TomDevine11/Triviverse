// ─────────────────────────────────────────────────────────────────────────
// Shared candidate builder — one place that turns a (population, projection)
// spec into a fully-evaluated candidate. Used by compile.mjs (explorer) and
// pool.mjs (workbench pool) so both speak the same candidate shape.
// ─────────────────────────────────────────────────────────────────────────

import { COMPS, POSITIONS, buildPopulation, natDisplay } from './population.mjs'
import { STATS, project } from './projection.mjs'
import { evaluate } from './metrics.mjs'
import { gateCheck, scoreProfile, explain } from './rank.mjs'

export const COMPILER_VERSION = '0.1.0'

// dimension tags used by the workbench's pattern analysis (P3/P4).
function dimensions({ competition, statKey, filters, populationType }) {
  return {
    stat: statKey,
    populationType,                                  // 'club' | 'competition'
    competition: competition || 'ALL',
    europe: competition === 'CL',
    hasPosition: !!filters.position,
    hasNationality: !!filters.nationality,
    position: filters.position || null,
  }
}

export function makeCandidate({ club = null, clubId = null, competition, statKey, filters = {}, base = null, curated = new Set() }) {
  const players = buildPopulation({ clubId, competition, ...filters })
  if (players.length < 1) return null
  const board = project(players, statKey)
  if (board.length < 1) return null

  const profile = evaluate(board)
  const gatesFailed = gateCheck(profile)
  const { score, breakdown } = scoreProfile(profile)
  const compName = competition ? COMPS[competition] : 'All competitions'

  const populationType = clubId ? 'club' : 'competition'
  const scopeLabel = filters.position ? POSITIONS[filters.position]
    : filters.nationality ? `(${natDisplay(base || players, filters.nationality)})`
    : (clubId ? 'players' : 'all players')
  const subject = clubId ? club.replace(/ FC$/, '') : ''
  const title = `${compName} · ${STATS[statKey].label} · ${[subject, scopeLabel].filter(Boolean).join(' ')}`.replace(/  +/g, ' ')

  const filterKey = [filters.position && `pos:${filters.position}`, filters.nationality && `nat:${filters.nationality}`].filter(Boolean).join('|') || 'all'
  const id = `${populationType}:${clubId || competition || 'x'}|${competition || 'ALL'}|${statKey}|${filterKey}`

  return {
    id, title,
    population: { type: populationType, club: club || null, competition: compName, ...filters },
    projection: { stat: statKey, statLabel: STATS[statKey].label },
    dimensions: dimensions({ competition, statKey, filters, populationType }),
    profile, gatesFailed, defaultScore: score, breakdown, explanation: explain(profile, breakdown, gatesFailed),
    curated: curated.has(`${competition}|${statKey}|${filterKey}`),
    board: board.slice(0, 20).map((b) => ({ n: b.name, v: b.value, f: b.fame })),
  }
}

export const STAT_KEYS = Object.keys(STATS)
export const POS_KEYS = Object.keys(POSITIONS)
export { COMPS }
