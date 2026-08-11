// "Career Path" — data loader + matching.
//
// Each target carries their senior club career in chronological order (from
// Wikidata P54 club spells — see scripts/wikidata/import-careers.mjs). The game
// reveals one club at a time; the player guesses who played for them all.

import data from './careers.generated.json'
import { isSeniorTeam } from './teamFilter.js'
import { resolveNameToId } from './canonical/resolve.js'
import { fixName } from './canonical/nameFixes.js'

export { matchesTarget } from './guessMatch.js'

export const CAREERS_AS_OF = data.meta?.fetchedAt || ''
// Players must have at least this many senior clubs to be a target — but the
// game then reveals their ENTIRE career, however long, one club at a time.
export const MIN_CLUBS = 5

function years(c) {
  if (!c.from) return ''
  return c.to ? `${c.from}–${c.to}` : `${c.from}–`
}

// A player's real senior clubs in order. Drop reserve / 'B' / youth sides; fall
// back to the full list if filtering would leave nothing.
function seniorClubs(p) {
  const senior = p.clubs.filter(c => isSeniorTeam(c.name))
  return senior.length ? senior : p.clubs
}

// Only players with a long enough senior career qualify as mystery targets.
const ELIGIBLE = data.players.filter(p => seniorClubs(p).length >= MIN_CLUBS)
export const TARGET_COUNT = ELIGIBLE.length

function toRound(p) {
  const clubs = seniorClubs(p).map(c => ({ club: c.name, years: years(c) }))
  const name = fixName(p.name)
  // Phase 3: carry the stable player id (null when the name is ambiguous/unknown,
  // in which case the game keeps name-based matching).
  return { name, id: resolveNameToId(name), clues: clubs }
}

// Build a game round from any career player ({ name, clubs }). Used by themed
// quizzes (e.g. the England pool) so they share Career Path's exact clue shape.
export function roundFor(p) { return toRound(p) }

export function getRandomTarget() {
  return toRound(ELIGIBLE[Math.floor(Math.random() * ELIGIBLE.length)])
}

// Deterministic mystery player for a given day (Daily mode → stats/streaks).
export function getTargetForDay(dayIndex) {
  const n = ELIGIBLE.length
  return toRound(ELIGIBLE[((dayIndex % n) + n) % n])
}

export function getDailyTarget() {
  const now = new Date()
  const dayIndex = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000)
  return getTargetForDay(dayIndex)
}
