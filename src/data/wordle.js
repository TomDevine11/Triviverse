import { famousPlayers } from './famousPlayers'
import { getFlagFromNationality } from '../utils/flags'
import { matchdayIndex } from '../utils/matchday.js'

// The daily answer is drawn from a curated, self-contained pool — no runtime
// lookup. AS_OF records when the pool was last reviewed.
export const WORDLE_AS_OF = '2026-06-13'

// Strip accents/punctuation and uppercase, leaving only A-Z.
export function normalizeLetters(str) {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

// Build a pool of unique surnames (5+ letters) from the curated "famous
// footballers" list, so the daily answer is always someone recognizable.
function buildPool() {
  const seen = new Set()
  const pool = []
  for (const p of famousPlayers) {
    const parts = p.name.trim().split(/\s+/)
    const surnameRaw = parts[parts.length - 1]
    const surname = normalizeLetters(surnameRaw)
    if (surname.length < 5) continue
    if (seen.has(surname)) continue
    seen.add(surname)
    pool.push({
      surname,
      displaySurname: surnameRaw,
      fullName: p.name,
      flag: getFlagFromNationality(p.nationality),
      nationality: p.nationality,
    })
  }
  return pool
}

const POOL = buildPool()

export function getWordlePlayerForDay(dayIndex) {
  return POOL[((dayIndex % POOL.length) + POOL.length) % POOL.length]
}

// Same daily-rotation pattern used by Football Tenable: changes at midnight UK time.
export function getDailyWordlePlayer() {
  const dayIndex = matchdayIndex() // UK-time matchday, the same for every visitor
  return getWordlePlayerForDay(dayIndex)
}

// A random answer for Unlimited/practice mode (never affects daily stats).
export function getRandomWordlePlayer() {
  return POOL[Math.floor(Math.random() * POOL.length)]
}
