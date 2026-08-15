// Pure, testable guess-matching for Football Tenable.
//
// The hard problem: a Tenable answer is a plain name that may not match how a
// player is named in the search dropdown (e.g. the answer "Andrew Robertson" vs
// the registry's "Andy Robertson"). We want every answer reachable by surname,
// WITHOUT re-introducing the namesake bug (picking Ronaldo Nazário must not
// satisfy a "Cristiano Ronaldo" answer).
//
// Rule: a surname match counts — UNLESS the guess and the answer are KNOWN to be
// different players (both resolve to registry ids, and the ids differ). Surname
// leniency applies to PLAYER questions only; clubs/countries stay strict.

import { resolveNameToId } from '../../data/canonical/resolve.js'

export function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation → space, so hyphenated names stay
    .replace(/\s+/g, ' ')         // multi-token ("Heung-min" → "heung min"), which
    .trim()                       // keeps surname + id resolution working
}

const surname = (norm) => norm.split(' ').pop()

/**
 * @param {string} guessNorm   normalized guess text
 * @param {string|null} guessId picked suggestion's id, or the resolved id of a
 *                              typed name; null if unknown
 * @param {{text:string, aliases?:string[]}} answer
 * @param {boolean} isPlayer   true for player questions (enables surname leniency)
 */
export function answerMatches(guessNorm, guessId, answer, isPlayer) {
  if (!guessNorm) return false
  // Exact name or a curated alias always matches.
  const candidates = [answer.text, ...(answer.aliases || [])].map(normalize)
  if (candidates.includes(guessNorm)) return true

  const answerSurname = surname(normalize(answer.text))
  // Clubs/countries: only a bare last-word guess (original behaviour) — never a
  // fuller name, so "Atletico Madrid" can't match "Real Madrid".
  if (!isPlayer) return guessNorm === answerSurname

  // Strongest signal: guess and answer resolve to the SAME registry id → same
  // player, accept regardless of name form. This is what makes East-Asian name
  // order work ("Son Heung-min" ↔ "Heung-min Son"), where the "surname" (last
  // word) differs between orders.
  const answerId = resolveNameToId(answer.text)
  if (guessId && answerId && guessId === answerId) return true

  // Otherwise, players match by surname…
  if (surname(guessNorm) !== answerSurname) return false
  // …unless the guess and answer are known to be DIFFERENT players (namesake).
  if (answerId && guessId && answerId !== guessId) return false
  return true
}
