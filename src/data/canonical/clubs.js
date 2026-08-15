// Canonical club search for club-type question dropdowns (e.g. Tenable "most
// European Cup titles"). Replaces the old hand-curated data/clubs.js with the
// full set of clubs from our Transfermarkt history (the six leagues + the
// Champions League) — one name universe, same source as the answers.
import index from '../football501/clubs.index.generated.json'
import { normalize } from './normalize.js'

const CLUB_NAMES = Object.values(index.clubs || {}).map((c) => c.name).filter(Boolean)

export function searchClubs(query, limit = 8) {
  const q = normalize(query)
  if (q.length < 2) return []
  return CLUB_NAMES
    .filter((name) => normalize(name).includes(q))
    .sort((a, b) => {
      const na = normalize(a), nb = normalize(b)
      return (nb.startsWith(q) - na.startsWith(q)) || a.localeCompare(b)
    })
    .slice(0, limit)
    .map((name) => ({ name }))
}
