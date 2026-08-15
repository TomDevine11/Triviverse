// Football Pointless data: pre-scored question pools (see
// scripts/growth/gen-pointless.mjs). Answers are sorted ascending nameability,
// so the first entries are the most "pointless" (rarest correct answers).
import data from './questions.generated.json'

export const POINTLESS_QUESTIONS = data.questions

export const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

const cache = new Map()
const sortedKey = (n) => n.split(' ').filter(Boolean).sort().join(' ')

function lookups(q) {
  if (cache.has(q.id)) return cache.get(q.id)
  const byName = new Map()
  const bySurname = new Map()
  const bySorted = new Map()
  for (const a of q.answers) {
    byName.set(a.n, a)
    const surname = a.n.split(' ').slice(-1)[0]
    if (!bySurname.has(surname)) bySurname.set(surname, [])
    bySurname.get(surname).push(a)
    const sk = sortedKey(a.n)
    if (sk.includes(' ')) { if (!bySorted.has(sk)) bySorted.set(sk, []); bySorted.get(sk).push(a) }
  }
  const l = { byName, bySurname, bySorted }
  cache.set(q.id, l)
  return l
}

// A typed/selected player → its scored answer, or null if not a valid answer.
// Tries: exact name → same tokens any order (East-Asian name order) → unambiguous
// surname. The order-insensitive/surname fallbacks only fire when unambiguous.
export function matchAnswer(q, typed) {
  const n = norm(typed)
  const { byName, bySurname, bySorted } = lookups(q)
  if (byName.has(n)) return byName.get(n)
  const sk = sortedKey(n)
  if (sk.includes(' ')) { const s = bySorted.get(sk); if (s && s.length === 1) return s[0] }
  const surname = n.split(' ').slice(-1)[0]
  const cand = bySurname.get(surname)
  if (cand && cand.length === 1) return cand[0]
  return null
}
