// Deterministic answer matching for the player-pair game. No fuzzy/typo tolerance in
// v1 (add later only if usage data shows it's needed). Every accepted guess resolves
// to a specific canonical player id — never a bare string.
//
// Rules, in order:
//   1. normalised full-name exact match  → accept
//   2. explicit alias exact match        → accept
//   3. unique surname match              → accept
//   4. surname/alias mapping to >1 player → ambiguous (ask for the full name)
//   5. otherwise                         → no match
//
// Shared by Node (build-relations.mjs) and the browser (game component) so the
// normalisation that produces the data and the normalisation that reads it can never
// drift apart.

export const normName = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

// Surname key = everything after the first token; single-name players → the name.
export const surnameKey = (name) => {
  const t = normName(name).split(' ')
  return t.length > 1 ? t.slice(1).join(' ') : t[0]
}

// players: [{ id, n, s, a, b, surname, aliases, flags }] as produced by the builder.
// Returns a matcher with resolve(guess) → one of:
//   { status: 'correct',   id, name }
//   { status: 'ambiguous', candidates: [{ id, name }] }   // needs disambiguation
//   { status: 'none' }  |  { status: 'empty' }
export function buildMatcher(players) {
  const full = new Map()     // normalised full name → [player]
  const surname = new Map()  // surname key         → [player]
  const alias = new Map()    // normalised alias    → [player]
  const push = (map, key, p) => { if (!key) return; const a = map.get(key); if (a) a.push(p); else map.set(key, [p]) }

  for (const p of players) {
    push(full, normName(p.n), p)
    push(surname, p.surname || surnameKey(p.n), p)
    for (const al of p.aliases || []) push(alias, al, p)
  }

  const one = (p) => ({ status: 'correct', id: p.id, name: p.n })
  const many = (arr) => ({ status: 'ambiguous', candidates: arr.map((p) => ({ id: p.id, name: p.n })) })

  const resolve = (guess) => {
    const g = normName(guess)
    if (!g) return { status: 'empty' }
    for (const map of [full, alias, surname]) {
      const hit = map.get(g)
      if (hit) return hit.length === 1 ? one(hit[0]) : many(hit)
    }
    return { status: 'none' }
  }

  return { resolve, total: players.length, ids: players.map((p) => p.id) }
}
