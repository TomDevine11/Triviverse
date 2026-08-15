// Club/league badge URLs, derived from Transfermarkt ids (see
// scripts/build-badges.mjs). Every club we hold carries a TM id, and TM serves a
// crest for that id at a deterministic URL — so a badge is a pure function of the
// id, ~100% coverage, same source as our stats. Callers pass the club NAME they
// display; we normalise it to the TM id via badges.generated.json. Missing ids
// 404 → the <Crest>/<CategoryIcon> onError handler shows a monogram.
import badges from './badges.generated.json'

const CLUBS = badges.clubs || {}
const TM = 'https://tmssl.akamaized.net/images'

// MUST match scripts/build-badges.mjs clubKey exactly (build + runtime agree).
export const clubKey = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[.'’]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(fc|afc|cf|ac|ssc|as|cd|sc|sl|cp|ud|sd|sk|fk|club|de)\b/g, ' ')
  .replace(/\s+/g, ' ').trim()

export function clubBadgeUrl(name) {
  const id = CLUBS[clubKey(name)]
  return id ? `${TM}/wappen/head/${id}.png` : null
}

// League display name → TM competition code → competition logo.
const LEAGUE_CODES = {
  'Premier League': 'GB1', 'La Liga': 'ES1', 'Serie A': 'IT1',
  'Bundesliga': 'L1', 'Ligue 1': 'FR1',
  'Champions League': 'CL', 'UEFA Champions League': 'CL',
}
export function leagueLogoUrl(league) {
  const code = LEAGUE_CODES[league]
  return code ? `${TM}/logo/header/${code.toLowerCase()}.png` : null
}

export const BADGES_AS_OF = badges.meta?.generatedAt || ''
