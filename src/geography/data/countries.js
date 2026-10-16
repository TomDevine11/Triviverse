// Triviverse Geography's country dataset: names, aliases, centres, silhouettes and
// land-border neighbours, from ./countries.generated.json (Natural Earth 1:10m Admin 0,
// public domain; built by scripts/geography/build-countries.mjs). Shared by every
// geography game, along with the country search and a seeded RNG for daily picks.
import data from './countries.generated.json'

export const BOX = data.meta.box
export const COUNTRIES = data.countries
const BY_CODE = new Map(COUNTRIES.map(c => [c.code, c]))
export const countryByCode = (code) => BY_CODE.get(code) || null

// Deterministic PRNG for daily puzzles (same seed → same sequence everywhere).
export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Search ───────────────────────────────────────────────────────────────────
export const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const INDEX = COUNTRIES.map(c => ({ c, keys: [c.name, ...(c.aliases || [])].map(normalize) }))

// Best matches for a typed query: name prefix, then word prefix, then alias/substring.
export function searchCountries(query, exclude = new Set(), limit = 6) {
  const q = normalize(query)
  if (!q) return []
  const scored = []
  for (const { c, keys } of INDEX) {
    if (exclude.has(c.code)) continue
    let s = 0
    keys.forEach((k, i) => {
      const alias = i > 0 ? 1 : 0
      if (k === q) s = Math.max(s, 100 - alias)
      else if (k.startsWith(q)) s = Math.max(s, 80 - alias * 10)
      else if (k.split(' ').some(w => w.startsWith(q))) s = Math.max(s, 60 - alias * 10)
      else if (q.length > 2 && k.includes(q)) s = Math.max(s, 30 - alias * 10)
    })
    if (s) scored.push([s, c])
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).slice(0, limit).map(([, c]) => c)
}

// Resolve a submitted string to a country (exact name or alias), or null.
export function resolveCountry(text) {
  const q = normalize(text)
  return INDEX.find(({ keys }) => keys.includes(q))?.c || null
}
