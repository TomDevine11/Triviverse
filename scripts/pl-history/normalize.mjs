// ─────────────────────────────────────────────────────────────────────────
// SCRAPE NORMALISATION HELPERS
//
// Reuses the game's exact name normalisation (canonical/normalize.js) so
// built keys line up with in-game guess resolution, plus a small country-name
// map to reconcile Transfermarkt's citizenship strings with the flag/
// nationality vocabulary the app already uses.
//
// (Relocated from the retired Kaggle pipeline in backlog C3; it is a shared
// scrape util, not Kaggle-specific, and is consumed by build-facts.mjs.)
// ─────────────────────────────────────────────────────────────────────────

import { normalize, surnameKeys } from '../../src/data/canonical/normalize.js'

export { normalize, surnameKeys }

// Transfermarkt citizenship strings that don't lowercase cleanly into the
// app's FLAGS vocabulary (src/utils/flags.js keys on lowercase country names).
// Extend as odd values surface during a build. Default: pass the raw value
// through (most — "Spain", "Brazil", "England" — already match).
const COUNTRY_OVERRIDES = {
  'korea, south': 'south korea',
  'korea, north': 'north korea',
  'cote d ivoire': 'ivory coast',   // note: normalize() already strips the apostrophe
  'cote divoire': 'ivory coast',
  'congo, dr': 'dr congo',
  'the gambia': 'gambia',
  'chinese taipei': 'taiwan',
  'usa': 'united states',
  'united states of america': 'united states',
}

// → { raw, display, key } where key is the normalised nationality used both as
// a filter dimension and (lowercased) as a FLAGS lookup.
export function normalizeCountry(raw) {
  const display = (raw || '').trim()
  let key = normalize(display)
  if (COUNTRY_OVERRIDES[key]) key = COUNTRY_OVERRIDES[key]
  return { raw: display, display, key }
}
