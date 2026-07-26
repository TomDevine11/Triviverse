// ─────────────────────────────────────────────────────────────────────────
// LAYER MANIFEST  (RFC-001 §5–§6 — the canonical/derived boundary, in code)
//
// RFC-001 defines four layers with one-directional flow:
//   Raw source → Canonical football model → Derived football datasets → Games
// and requires (inv. #4) that GAME code consumes DERIVED data only — never the
// canonical model, never raw source.
//
// RFC-001 §0 states filenames/folders are non-normative, so this manifest — not
// the directory layout — is the physical source of truth for which artefact
// belongs to which layer. Classification is by ARTEFACT IDENTITY (a path
// fragment that uniquely names the artefact), so it stays correct even while
// files are still physically co-located during the C1–C14 migration.
//
// `test/architecture.test.js` reads this manifest to enforce the boundary and
// to ratchet it: no NEW game→canonical/raw import may land; existing ones are
// tracked exceptions tied to the backlog task that removes them.
//
// META CONVENTION (RFC-001): every generated artefact carries a `meta` block.
// Target shape is { schemaVersion, source, generatedAt, ...coverage }. `source`
// and a date are already present repo-wide; `schemaVersion` is added to each
// artefact by its own migration PR when that PR already regenerates it (avoids
// re-running producers — several need the scrape cache — purely to stamp meta).
// ─────────────────────────────────────────────────────────────────────────

// RAW: external-provider capture. Games and derived builders must never import
// from these locations. (Matched as path fragments against import specifiers.)
export const RAW_MARKERS = ['/scripts/', '/data/pl-history/']

// CANONICAL: football FACTS (single authoritative owners). Games must not import
// these directly — they reach facts only through derived datasets / adapters.
// Identified by unique filename fragments (folder-independent by design).
export const CANONICAL_FACTS = [
  'canonical/players.registry.json',
  'canonical/players.crosswalk.json',
  'canonical/players.positions.generated.json',
  'canonical/wikidata.generated.json',
  'canonical/wikidata-positions.generated.json',
  'canonical/competitions.generated.json', // dimension entities (C4)
  'canonical/seasons.generated.json',
  'canonical/teams.generated.json',
  'canonical/editions.generated.json',
  'football501/performance.', // canonical Performance, player×team×season (C5)
]

// DERIVED but INTERNAL: not a game-facing dataset — a career-totals rollup of
// canonical Performance that other build-time derivations consume (leaderboards,
// catalog, tenable). Proven equal to rollup(performance.*) in build-facts (C5),
// so it is not an independent source. Games must not import it directly either;
// they read the game-facing derived datasets. (C6)
export const DERIVED_INTERNAL = [
  'football501/history.', // career-rollup of performance.* (stats + player identity)
]

// DERIVED: reshaped projections of the canonical model — what games consume.
export const DERIVED = [
  'canonical/stats.generated.json',
  'tenable.generated.json',
  'tenable.daily.generated.json',
  'football501/catalog.generated.json',
  'football501/daily.curated.generated.json',
  'careers.generated.json',
  'teammates.generated.json',
  'wcsquads.generated.json',
  'crests.generated.json',
  'categoryIcons.generated.json',
  'canonical/nameFixes.generated',
]

// Tracked, sanctioned exceptions: game→canonical imports that exist TODAY and
// are removed by a specific later backlog task. The guard allows exactly these
// and fails on any other game→canonical/raw import. Each entry MUST name the
// backlog task that retires it, so the list can only shrink.
export const GAME_IMPORT_EXCEPTIONS = [
  {
    file: 'src/games/football501/Football501.jsx',
    imports: 'canonical/players.positions.generated.json',
    retiredBy: 'C13', // positions move to a Transfermarkt-derived source
  },
]
