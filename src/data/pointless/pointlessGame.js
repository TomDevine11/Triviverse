// Football Pointless data: pre-scored question pools (see
// scripts/growth/gen-pointless.mjs). Answers are sorted ascending nameability,
// so the first entries are the most "pointless" (rarest correct answers).
import data from './questions.generated.json'

export const POINTLESS_QUESTIONS = data.questions

export const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

const cache = new Map()
function lookups(q) {
  if (cache.has(q.id)) return cache.get(q.id)
  const byName = new Map()
  const bySurname = new Map()
  for (const a of q.answers) {
    byName.set(a.n, a)
    const surname = a.n.split(' ').slice(-1)[0]
    if (!bySurname.has(surname)) bySurname.set(surname, [])
    bySurname.get(surname).push(a)
  }
  const l = { byName, bySurname }
  cache.set(q.id, l)
  return l
}

// A typed/selected player → its scored answer, or null if not a valid answer.
// Falls back to surname only when it's unambiguous in this question's pool.
export function matchAnswer(q, typed) {
  const n = norm(typed)
  const { byName, bySurname } = lookups(q)
  if (byName.has(n)) return byName.get(n)
  const surname = n.split(' ').slice(-1)[0]
  const cand = bySurname.get(surname)
  if (cand && cand.length === 1) return cand[0]
  return null
}
