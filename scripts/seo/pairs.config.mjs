// Curated launch allowlist for the "players who played for both X and Y" engine.
//
// Adding pair #11/#20/#30 is a DATA operation: add a club to CLUBS (with its exact
// canonical Transfermarkt id) and a line to PAIRS. No engine code changes required.
//
// Why exact ids and not name matching: name matching previously pulled in the wrong
// entity (e.g. "…Barcelona" also matches RCD Espanyol Barcelona; a bare "Real Madrid"
// name can pull Real Madrid Castilla). The id is the single source of truth for club
// identity, so the qualifying set is exactly the two first teams we mean.
//
// `name`/`slug` are authored here (not derived) so the canonical URL and on-page copy
// are stable and human-checked — e.g. we say "Inter" and "AC Milan", not "Inter Milan".

export const CLUBS = {
  arsenal:   { id: '11',  name: 'Arsenal',            slug: 'arsenal' },
  chelsea:   { id: '631', name: 'Chelsea',            slug: 'chelsea' },
  liverpool: { id: '31',  name: 'Liverpool',          slug: 'liverpool' },
  manUtd:    { id: '985', name: 'Manchester United',  slug: 'manchester-united' },
  manCity:   { id: '281', name: 'Manchester City',    slug: 'manchester-city' },
  tottenham: { id: '148', name: 'Tottenham',          slug: 'tottenham' },
  barcelona: { id: '131', name: 'Barcelona',          slug: 'barcelona' },
  realMadrid:{ id: '418', name: 'Real Madrid',        slug: 'real-madrid' },
  inter:     { id: '46',  name: 'Inter',              slug: 'inter' },
  acMilan:   { id: '5',   name: 'AC Milan',           slug: 'ac-milan' },
  bayern:    { id: '27',  name: 'Bayern Munich',      slug: 'bayern-munich' },
  dortmund:  { id: '16',  name: 'Borussia Dortmund',  slug: 'borussia-dortmund' },
}

// tier drives on-page framing + the QC gate strength (rich/scarcity are cross-checked
// externally before launch; see scripts/seo/pairs-qc — D2). `externalVerified` is set
// to true only once that cross-check has actually been performed (D6); until then the
// build's QC gate treats an unverified rich/scarcity pair as a blocker.
export const PAIRS = [
  { a: 'barcelona', b: 'realMadrid', tier: 'rich' },
  { a: 'inter',     b: 'acMilan',    tier: 'rich' },
  { a: 'arsenal',   b: 'chelsea',    tier: 'rich' },
  { a: 'chelsea',   b: 'manCity',    tier: 'rich' },
  { a: 'bayern',    b: 'dortmund',   tier: 'rich' },
  { a: 'chelsea',   b: 'realMadrid', tier: 'rich' },
  { a: 'manUtd',    b: 'realMadrid', tier: 'medium' },
  { a: 'liverpool', b: 'manUtd',     tier: 'scarcity' },
  { a: 'manCity',   b: 'manUtd',     tier: 'scarcity' },
  { a: 'arsenal',   b: 'tottenham',  tier: 'scarcity' },
]

// Extra answer aliases keyed by canonical player id. Accent-stripping and
// surname-only matching are handled automatically by the matcher, so this is only for
// nicknames / alternate spellings that those rules don't cover. Seeded minimally for
// v1; curated further during per-pair QC (D6).
export const PLAYER_ALIASES = {
  // '<canonical id>': ['nickname', 'alt spelling'],
  // Eto'o — the only apostrophe name in the launch sets; "eto'o" already matches via
  // surname ("eto o"), but the apostrophe-collapsed "etoo" spelling needs an alias.
  '4257': ['etoo', 'samuel etoo'],
}

// Our fixed, honest inclusion definition — surfaced verbatim in the coverage note so
// the page never implies it covers every competition or level of football.
// Era-accurate: our English (Premier League) and Champions League data starts in 1992;
// La Liga/Serie A run from 1929, Ligue 1 from 1932, Bundesliga from 1963. So the honest
// scope is "the Premier League / Champions League era and the continental top flights",
// NOT all-time English top-flight history. This wording is what makes pre-1992 First
// Division players (e.g. Pat Jennings) a transparent scope difference, not a hidden gap.
export const COVERAGE_NOTE =
  'Counted from appearances in the Premier League (from 1992), La Liga, Serie A, Bundesliga ' +
  'or Ligue 1, plus Champions League appearances from 1992. Pre-1992 English First Division ' +
  'and European Cup appearances aren’t included, so all-time totals published elsewhere can be higher.'
