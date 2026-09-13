// Football Tenable — daily "name the top 10" trivia questions.
// Each question has exactly 10 distinct ranked answers. `aliases` cover
// common spellings/nicknames so the fuzzy guess-matcher can accept them.
//
// These are precomputed CLOSED answer sets shipped with the question — the
// "GOOD" pattern from the architecture review (validate against the stored
// set, never query at runtime). AS_OF records when the rankings were last
// verified; the validator test enforces the answer-set shape in CI.

import generated from './tenable.generated.json'
import dailyAllow from './tenable.daily.generated.json'

export const TENABLE_AS_OF = '2026-06-30'

// All Tenable questions are generated from daily-scraped Transfermarkt data
// (leagues + international) and fun-gated for a recognisable top-10 — no
// hand-typed answer sets, which go stale. Regenerate with `npm run build:tenable`.

// The curated classics lead (nice, recognisable early rotation), followed by
// the auto-generated bounded lists (club- and nationality-scoped top-10s built
// from the same Transfermarkt data as Football 501). Regenerate with
// `npm run build:tenable` whenever the fact tables refresh — no JSON by hand.
export const TENABLE_QUESTIONS = generated.questions

// Daily rotation only serves recognisable questions: every curated classic plus
// the generated lists that cleared the build-time recognisability gate
// (`daily`). This keeps Daily fair — no "name the exact top 10 obscure players"
// — while Unlimited still draws from the full catalogue below.
// Daily rotation is driven by tenable-daily-questions.txt (via the generated
// allowlist): remove a line there + re-run scripts/build-tenable-daily.mjs and
// that question stops appearing. Falls back to the built-in `daily` flag if the
// allowlist is ever empty.
const DAILY_ALLOW = new Set(dailyAllow.titles || [])
export const TENABLE_DAILY_QUESTIONS = DAILY_ALLOW.size
  ? TENABLE_QUESTIONS.filter(q => DAILY_ALLOW.has(q.title))
  : TENABLE_QUESTIONS.filter(q => q.daily !== false)

export function getTenableQuestionForDay(dayIndex) {
  const n = TENABLE_DAILY_QUESTIONS.length
  return TENABLE_DAILY_QUESTIONS[((dayIndex % n) + n) % n]
}

// Deterministic "question of the day" — changes at local midnight,
// cycles through the daily-eligible list (repeats once exhausted).
export function getDailyTenableQuestion() {
  const now = new Date()
  const dayIndex = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000)
  return getTenableQuestionForDay(dayIndex)
}

// A random question for Unlimited/practice mode (never affects daily stats) —
// draws from the FULL catalogue, including the tougher obscure lists.
export function getRandomTenableQuestion() {
  return TENABLE_QUESTIONS[Math.floor(Math.random() * TENABLE_QUESTIONS.length)]
}
