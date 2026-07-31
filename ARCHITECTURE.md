# Triviverse — Architecture

> **Status: the data architecture is complete and frozen.** This document is the
> design authority. If you are about to add a second data source, scrape at
> runtime, or "fix" one of the intentional editorial datasets described below —
> stop and read [Architectural invariants](#architectural-invariants) first.
> Most instincts to "clean this up" have already been evaluated; see
> `docs/architecture-review-2026-07.md` (the review that produced this state) and
> the historical note at the end.

Triviverse is a hub of daily football trivia games (Wordle, Tenable, Tic-Tac-Toe,
Connections, Teammates, Career Path, Higher or Lower, Football 501). All games are
**self-contained**: a game validates a guess against a precomputed answer set, not
a live lookup. There is no runtime database and no runtime scraping.

---

## 1. Architectural philosophy

Three ideas drive everything:

1. **One source of truth, computed offline.** Every football fact the games use is
   derived — offline, deterministically, ahead of time — from a single external
   source (Transfermarkt). The result is committed to the repo as JSON. At runtime
   the app only reads static data it already shipped with.

2. **A one-directional data flow with an enforced boundary.** Data moves
   `Raw → Canonical → Derived → Application` and never backwards. Game code may
   only read the Derived layer. This is not a convention — it is enforced by a
   test (`test/architecture.test.js`) that reads a manifest (`src/data/layers.js`)
   and fails the build if any game imports canonical or raw data.

3. **Stable, source-independent identity.** Every player has one deterministic
   internal id. The domain model is kept separate from the data source, so the
   source could change without rewriting the games.

Why this shape? The project began by interpreting scraped prose *at guess time*
across three disagreeing web sources — unreliable and unmaintainable. The whole
architecture is a deliberate move to the opposite pattern:
**`answer ∈ precomputed_set`, zero external calls at runtime.** Tenable and Wordle
always worked this way; everything else was migrated to match.

---

## 2. Transfermarkt is the single source of truth

**All football facts originate from Transfermarkt and nowhere else.** Appearances,
goals, squads, transfers, international caps, honours — one source, so there is
never disagreement to reconcile at runtime.

This was reached by retiring, in turn:

- **StatMuse / TheSportsDB runtime scraping** — replaced by precomputed canonical
  data (the old server stack is gone; see [Deployment](#deployment)).
- **Kaggle** datasets — replaced by scraped Transfermarkt performance data.
- **Wikipedia** — previously supplied international goals and World Cup squads;
  both now come from Transfermarkt (or the feature was removed).
- **Wikidata** — previously supplied "fame", player positions, and category
  membership; all replaced by canonical-derived signals.

**Single-source is an invariant, not a preference.** Do not add a second data
source. The two deliberate exceptions are small, hand-authored *editorial* inputs
(§7) — not alternative fact sources.

One pragmatic caveat: player-name **autocomplete** in some games still calls
TheSportsDB at runtime for suggestion breadth. This never affects correctness
(validation is always against canonical data) — it only widens the dropdown. It is
a UX helper, not a fact source, and is a candidate for removal, not an accepted
second source.

---

## 3. The data flow (four layers)

```
   Transfermarkt
        │  scrape (manual, local, rate-limited)
        ▼
  ┌──────────┐   RAW      per-entity HTML/JSON cache
  │   Raw    │            data/pl-history/cache/**   (git-ignored)
  └──────────┘            scripts/pl-history/scrape*.mjs
        │  aggregate + canonicalise (offline build scripts)
        ▼
  ┌──────────┐   CANONICAL   authoritative football facts, one owner each
  │Canonical │              Player / Team / Competition / Edition / Season /
  └──────────┘              SquadMembership / Transfer / Honour / Performance
        │  reshape/project (offline build scripts)
        ▼
  ┌──────────┐   DERIVED     game-facing datasets (one per game/feature)
  │ Derived  │              catalog, tenable, teammates, careers, categories,
  └──────────┘              recognisability, leaderboards, crests, …
        │  import
        ▼
  ┌──────────┐   APPLICATION  React games — read Derived only
  │   Games  │
  └──────────┘
```

**The manifest and the guard.** `src/data/layers.js` classifies every artefact as
`RAW`, `CANONICAL_FACTS`, `DERIVED_INTERNAL`, or `DERIVED` by a unique path
fragment (folder-independent by design — filenames were never normative during the
migration). `test/architecture.test.js` reads this manifest and fails if a file
under `src/games/**` imports anything that is not Derived.

`GAME_IMPORT_EXCEPTIONS` is the ratchet: during the migration it listed the
temporary game→canonical imports still to be removed, each tagged with the task
that would retire it. **It is now empty** — no game reaches past the Derived layer.
Keep it that way: a new game→canonical import should be fixed, not excepted.

A note on layer *location*: some canonical build-inputs (`history.*`,
`performance.*`, `squads.*`) physically live under `src/data/` but are imported by
**no** application code — only by build scripts. They are committed so data can be
rebuilt without re-scraping. Vite tree-shakes them out of the client bundle. Layer
membership is defined by the manifest, not the directory.

---

## 4. Player identity

Every player has one **deterministic, namespaced internal id**:

- `tm:<transfermarktId>` — for any player on Transfermarkt (the vast majority).
- `p:<slug>` — for a player not on Transfermarkt (rare; derived from the name).

Because the id is a pure function of the Transfermarkt id, identity is
**reproducible** and needs no reconciliation step. Crucially, the id is treated by
game code as an **opaque comparison token** — never parsed, never derived from a
display name at runtime. This is what keeps the domain model independent of the
source: display names can change, spellings can differ across datasets, but the id
is stable.

The identity artefacts (all produced by `scripts/build-identity.mjs`, see §6):

| Artefact | Role |
|---|---|
| `players.registry.json` | The **total** registry — one record per identity (~44k), over the entire Transfermarkt universe, with display name, `refs` (source ids like `tm`), nationalities, positions, recognisability. |
| `players.crosswalk.json` | Full name/ref → id crosswalk. Used by **build scripts and the dev Identity Inspector only** — not shipped to the client. |
| `players.aliases.generated.json` | The **lean** client index: normalized name → id, restricted to recognisable players. This is what the app bundles for name resolution (the full crosswalk would be dead weight). |
| `players.recognisable.generated.json` | The recognisable-player subset that seeds the runtime facts universe. |
| `players.positions.generated.json` | id → GK/DEF/MID/FWD, for the autocomplete badge. |

Name → id resolution at runtime goes through `src/data/canonical/resolve.js`
(shared, pure normalisation + the lean alias index). Ambiguity (e.g. "Ronaldo",
duplicate surnames) is **surfaced, never silently guessed**.

---

## 5. Generated artefacts

Everything ending in `*.generated.json` is produced by a build script and should
never be hand-edited. Grouped by layer:

**Canonical facts** (`src/data/canonical/`, `src/data/football501/`)
| Artefact | Grain / contents | Producer |
|---|---|---|
| `performance.<comp>.generated.json` | Player × Team × Edition appearances/goals | `build-facts.mjs` |
| `history.<comp>.generated.json` | career rollup of Performance (internal derived) | `build-facts.mjs` |
| `intl.generated.json` | Player × NationalTeam caps/goals | `build-intl.mjs` |
| `squads.<comp>.generated.json` | SquadMembership (Player × Team × season) | `build-squads.mjs` |
| `transfers.generated.json` | Transfer facts | `build-transfers.mjs` |
| `honours.generated.json` | Honour facts (Ballon d'Or, World Cup, …) | `build-honours.mjs` |
| `competitions/seasons/teams/editions.generated.json` | dimension entities | `build-canonical.mjs` |
| `players.*` (identity) | see §4 | `build-identity.mjs` |

**Derived game datasets** (`src/data/`)
| Artefact | Consumed by | Producer |
|---|---|---|
| `football501/catalog.generated.json` + `daily.curated.generated.json` | Football 501 | `build-catalog.mjs`, `build-501-daily.mjs` |
| `tenable.generated.json` + `tenable.daily.generated.json` | Tenable | `build-tenable.mjs`, `build-tenable-daily.mjs` |
| `teammates.generated.json` | Teammates | `build-teammates.mjs` |
| `careers.generated.json` | Career Path | `build-transfers.mjs` |
| `categories.generated.json` | Tic-Tac-Toe, Connections | `build-categories.mjs` |
| `recognisability.generated.json` | fame ranking across games | `build-recognisability.mjs` |
| `canonical/stats.generated.json` | leaderboards / tenable | `build-leaderboards.mjs` |
| `crests.generated.json`, `categoryIcons.generated.json` | UI | `build-crests.mjs`, `build-category-icons.mjs` |

**Recognisability** deserves a specific warning. It is a derived 0–100 score for
*contemporary* fan recognisability, and **recency is a first-class multiplier by
design** — a current player keeps ~100% of their footprint, a 1980s legend ~4%.
That is correct for its job: generating daily grids that should feature current
stars (it is why Yamal outranks Müller). Do **not** repurpose it as a measure of
all-time fame or greatness — it is deliberately not that (see §8).

---

## 6. The scrape / build pipeline

The pipeline is **offline and manual**. Deployment does *not* run it — the app
ships pre-generated, committed JSON (see [Deployment](#deployment)). You only run
it when refreshing the data.

**Scraping** (local only — Transfermarkt blocks datacentre IPs; runs are resumable
and idempotent, caching per entity under the git-ignored `data/pl-history/cache/`):

```bash
# league performance, per competition (GB1 default; ES1/IT1/FR1/L1/CL via COMP=)
npm run scrape:pl-history        # then: npm run build:pl-history
npm run scrape:all               # convenience: the other five leagues end-to-end

npm run scrape:intl              # international caps/goals
npm run scrape:transfers         # transfer histories
npm run scrape:honours           # honours
```

Scrapers are designed to be handed a command and run by a human, then stopped —
**never invoke a network scrape from automation.**

**Building** (offline; reads the caches + prior artefacts, writes `*.generated.json`):

```bash
npm run build:pl-history         # cache → history.* + performance.* (per comp)
npm run build:pl-catalog         # the full derived chain (intl → canonical →
                                 # honours → squads → transfers → recognisability
                                 # → categories → teammates → catalog →
                                 # leaderboards → tenable)
node scripts/build-identity.mjs  # rebuild the identity registry (run after the
                                 # derived datasets change; not an npm script)
```

Individual steps also have their own `build:*` scripts (see `package.json`).

**Editorial / daily inputs** are hand-authored, not scraped:
`src/data/famousPlayers.js`, `501_updated_questions.txt`,
`tenable-daily-questions.txt` (see §7).

---

## 7. Canonical data vs. intentional editorial datasets

Most data is **canonical** — derived mechanically from Transfermarkt, regenerable,
never hand-edited. A *small, deliberate* set of inputs is **editorial**:
hand-authored, owned by a human, and intentionally *not* auto-derived. Editorial
data is **not technical debt** and **not an unfinished migration** — it exists
because no mechanical derivation produces acceptable quality for that specific job.

| Editorial input | Why it is hand-authored |
|---|---|
| `src/data/famousPlayers.js` | The Football Wordle answer pool. Needs **cross-era, casual-fan** recognisability, which no match-derived metric captures (see §8). |
| `501_updated_questions.txt`, `tenable-daily-questions.txt` | Curated daily question sets for 501 / Tenable — editorial choices about what makes a good daily puzzle. |
| `src/data/canonical/membership.js` | Curated club/nationality/trophy/manager member lists — a **GENERATION whitelist only** (which recognisable players feature in daily grids). It is **not** validation truth (see §7a). A curated name force-features a player in puzzles *iff* they are already a canonical member; a name absent from canonical is ignored, so it can never make a category incomplete. Managers live here but aren't a playable category (no canonical manager data). |
| Small alias maps: `ALIAS_FIXES` (resolve.js), `PLAYER_ALIASES`/`CLUB_ALIASES` (facts.js), `MANUAL_FIXES` (nameFixes.js) | Hand-verified same-person / same-club name corrections the automatic identity build cannot infer safely. Every entry must be a confirmed human match, not a surname guess. |

## 7a. Validation vs. generation (category games)

For the category games (Tic-Tac-Toe, Connections) the single most important
distinction is between two questions about a category:

- **Validation** — "is this football fact objectively true?" (did player X play for
  Chelsea / win the Champions League). This must be **complete and canonical**:
  pruned by nothing — no recognisability floor, no editorial pruning. It is what
  accepts or rejects a guess. In `facts.js` this is `membersOf(category)` (the
  *broad* set), sourced entirely from `categories.generated.json` (complete, bare
  ids) plus the nationality attribute.
- **Generation** — "does this make a good puzzle?" Optimises for playability, so it
  *is* recognisability-filtered and editorially curated. In `facts.js` this is
  `notableMembersOf(category)` (the *notable* set).

**Generation is a deterministic projection of validation, not a second dataset:**
`notable = broad ∩ (fame ≥ NOTABLE_FAME ∪ curated-whitelist)`, computed at load in
`facts.js`. It is therefore always a **subset** of validation (a revealed answer can
never be rejected) and can never drift from it. `membership.js` is the curated
whitelist that feeds *generation only*.

Two rules protect this and are enforced by `test/category-completeness.test.js`:
a category is **offered only if it has canonical validation members** (so no
curated-only stub — this is why the Euros and managers aren't offered), and
validation must contain **every resolvable canonical member** (so no false
negatives). This separation is what fixed the Chelsea × Champions League bug, where
a 74-name curated "famous winners" list had been doing validation's job and
rejecting real winners like Bertrand and Ramires (the canonical honour has 345).

The recognisability warning in §5 is exactly why this split matters: recency-first
fame is right for *generation* and wrong for *validation* — so it must never touch
the validation set.

---

## 8. Why `famousPlayers.js` intentionally stays manual

This is the most likely thing a future contributor will try to "fix", so it is
worth being explicit.

In July 2026 we evaluated replacing `famousPlayers.js` with a pool derived from the
canonical `recognisability` score. **It was rejected on evidence.** Size-matched,
the derived pool was **99% players from the 2020s** — it dropped Maradona, Cruyff,
Beckenbauer and Romário and added active journeymen (Darmian, Milner, Widmer)
scoring at the ceiling. The cause is structural: recognisability's recency
multiplier is *supposed* to favour current players (that is right for grid
generation), which makes it exactly wrong for a Wordle pool that wants timeless,
cross-era names. No threshold recovers the legends.

So `famousPlayers.js` is kept as an intentional editorial dataset. **Do not
auto-derive it, and do not re-tune `recognisability` to try to serve it** — that
would degrade the five grid games recognisability was built for. If zero
hand-maintained data ever becomes a hard requirement, the correct path is a *new*,
purpose-built, **honours-weighted, recency-neutral** "cross-era fame" signal — not
a bending of the existing metric. Full evidence is in the file's header comment.

---

## Architectural invariants

Future contributors should not violate these without a deliberate design decision
and evidence (the C14/famousPlayers episode is the model: *measure, then decide*).

1. **One external data source: Transfermarkt.** No new fact source. No runtime
   scraping. The editorial inputs in §7 are the only sanctioned non-derived data.
2. **Games read the Derived layer only.** Never import canonical or raw data into
   `src/games/**`. Enforced by `test/architecture.test.js`; keep
   `GAME_IMPORT_EXCEPTIONS` empty.
3. **All football data is precomputed offline and committed.** The runtime reads
   static JSON; it does not compute facts. Deployment never runs the pipeline.
4. **Player ids are deterministic and opaque.** `tm:<id>` / `p:<slug>`; compare by
   id, never re-derive identity from display names at runtime.
5. **Recognisability is recency-first by design.** It measures *contemporary*
   recognisability for grid generation — not all-time greatness. Don't repurpose it.
6. **Editorial datasets are intentional.** Before "deriving away" any file in §7,
   produce evidence that the derived replacement is at least as good. Absent that,
   keep the manual data — evidence beats ideology.
7. **Validation is complete & canonical; generation is a projection of it** (§7a).
   Never floor or editorially prune the validation set; a category is offered only
   with canonical backing; generation ⊆ validation. Enforced by
   `test/category-completeness.test.js`.

---

## Deployment

Render, configured by `render.yaml`: `npm install && npm run build`, then
`npm run server`. `npm run build` runs `vite build` and then `scripts/prerender.mjs`,
which emits one static, SEO-complete HTML file per route × locale (plus
`sitemap.xml` and `robots.txt`). `server/index.js` is a **minimal static file
server**: it serves `dist/`, prefers each route's prerendered `index.html`, and has
a fallback for hashed chunks from prior deploys. It does **not** compute or fetch
football data. (Historically this server also ran a StatMuse scraping API; that
stack was dead once data moved offline and has been removed.)

---

## Historical documents

These describe *earlier* states and are kept for context, **not** as current
architecture:

- `docs/ARCHITECTURE_REVIEW.md` — the original forensic review that motivated the
  migration (describes the pre-canonical StatMuse-at-runtime world). **Historical.**
- `docs/player-identity-refactor.md` / `docs/player-identity-audit.md` — the
  identity system's design and Phase-0 audit. Reflects the design; the system is
  now live.
- `docs/architecture-review-2026-07.md` — the final review that declared the
  migration complete and produced this document.
