// "Guess the Player from teammates" — data loader + matching.
//
// Each target carries real teammates (players who shared a club-season roster —
// derived from canonical SquadMembership by scripts/build-teammates.mjs). The game
// reveals one teammate at a time; the player guesses who the mystery player is.

import data from './teammates.generated.json'
import { getFlagFromNationality } from '../utils/flags.js'
import { isSeniorTeam } from './teamFilter.js'
import { resolveNameToId } from './canonical/resolve.js'
import { fixName } from './canonical/nameFixes.js'

export { matchesTarget } from './guessMatch.js'

export const TEAMMATES_AS_OF = data.meta?.fetchedAt || ''
export const TARGET_COUNT = data.players.length
export const MAX_CLUES = 5

// Tidy a few messy Wikidata team labels for the end-of-round reveal.
function cleanTeam(label) {
  return label
    .replace(/\bFc\b/g, 'FC')
    .replace(/\s+(Club de Fútbol|Fútbol Club|S\.?K\.?|Calcio\b.*)$/i, '')
    .replace(/\.$/, '')
    .trim()
}

// Build a playable round. Spread the clues across the DIFFERENT teams the
// mystery player turned out for — one (most-famous) teammate from each team in
// turn — so a well-travelled player's clues cover their career rather than
// clustering at one club. Then reveal least-famous first so it gets easier.
function buildClues(teammates) {
  // Drop youth national sides, Olympic selections and reserve teams — they make
  // for poor, confusing clues. Fall back to the raw list only if filtering would
  // leave nothing to work with.
  const seniorOnly = teammates.filter(t => isSeniorTeam(t.team))
  const pool = seniorOnly.length ? seniorOnly : teammates

  const byTeam = new Map() // team -> teammates, most famous first
  for (const t of [...pool].sort((a, b) => b.fame - a.fame)) {
    if (!byTeam.has(t.team)) byTeam.set(t.team, [])
    byTeam.get(t.team).push(t)
  }
  // Teams are iterated in the order their most-famous member appeared, so the
  // biggest teams lead. Round-robin one per team until we have MAX_CLUES.
  const teams = [...byTeam.keys()]
  const picked = []
  for (let round = 0; picked.length < MAX_CLUES; round++) {
    let progressed = false
    for (const team of teams) {
      const list = byTeam.get(team)
      if (round < list.length) {
        picked.push(list[round]); progressed = true
        if (picked.length >= MAX_CLUES) break
      }
    }
    if (!progressed) break
  }
  picked.sort((a, b) => a.fame - b.fame) // hardest (least famous) clue first
  return picked.map(t => ({ name: t.name, team: cleanTeam(t.team), flag: getFlagFromNationality(t.nationality) }))
}

function toRound(p) {
  const name = fixName(p.name)
  // Phase 3: carry the stable player id (null when ambiguous/unknown → name match).
  return { name, id: resolveNameToId(name), clues: buildClues(p.teammates) }
}

export function getRandomTarget() {
  return toRound(data.players[Math.floor(Math.random() * data.players.length)])
}

// Deterministic mystery player for a given day (Daily mode → stats/streaks).
export function getTargetForDay(dayIndex) {
  const n = data.players.length
  return toRound(data.players[((dayIndex % n) + n) % n])
}

export function getDailyTarget() {
  const now = new Date()
  const dayIndex = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000)
  return getTargetForDay(dayIndex)
}
