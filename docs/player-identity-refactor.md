# Player Identity Refactor — Technical Design

> **Status update (2026-07-30):** the core of this design **shipped**. Deterministic
> namespaced ids (`tm:<id>` / `p:<slug>`) are live, the registry is total over the
> Transfermarkt universe, and games compare by opaque id. Phases 4–5 (delete dead
> constructs / CI-gate the integrity checks) were **intentionally deferred** — not
> load-bearing. The World Cup Squads row in the per-game table (below) is obsolete;
> that game was removed. For the live design see [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §4.

**Status:** Design — no implementation yet. *(historical — see status update above)*
**Author:** Engineering, 2026-07-14.
**Decision already ratified:** Internal player IDs are the primary identity. External IDs (Transfermarkt, Wikidata QID, TheSportsDB) are references. Aliases are for *input matching only*, never identity. `normalize()` is demoted from "identity" to "matching."

This document is grounded in the current codebase and the reconciliation audit (see "Audit baseline" below). It is specific to this project; it is not a generic pattern write-up.

---

## 0. Audit baseline (the numbers this design is built on)

- **43,137** distinct normalized identities across all datasets.
- **41,755 (97%)** carry a **Transfermarkt player id** (`football501.generated.json`, `history.*`). This is the only pervasive stored identifier.
- **0** carry a Wikidata QID. QIDs are resolved transiently inside `scripts/wikidata/*` and discarded; they are **not** available for linking without re-querying Wikidata (which historically failed ~46% of the time — `careers.generated.json`: 427 tried, 230 resolved).
- **Game-facing (name-keyed) universe: 6,179** distinct identities. This is the migration's true scope — the 37k Transfermarkt tail are stat rows, not identities.
  - 4,806 (78%) link to a TM id by exact normalized name.
  - 1,373 (22%) have no TM counterpart (`qid`/`tm` will be null).
  - **Notable slice actually shown in puzzles: 2,899.**
- **Manual-review queue: ~150–250 records** — dominated by **145 notable mononyms** (Ronaldo, Fred, Jô, Hulk, Kaká…) and a small set of genuine namesakes.
- **~500 diacritic double-spellings** (`Zlatan Ibrahimović`/`Zlatan Ibrahimovic`) — deterministic merges.
- Fuzzy-duplicate candidates are **mostly false positives** (real distinct players: `Ferran Torres` ≠ `Fernando Torres`, `Bernardo Silva` ≠ `Bernardo Fernandes da Silva`) → fuzzy dedup must be **review-gated, never automatic**.

**Scope boundary:** the identity registry covers the ~6.2k name-keyed universe. The 43k Transfermarkt stat pool keeps its TM id as its own key; only the ~4.8k overlap rows get an internal id via the crosswalk.

---

## 1. The canonical player model

Today `facts.js` already builds registry entries of shape
`{ id, displayName, nationalities, clubs, managers, trophies, positions, fame, curated }`,
where `id = playerId(displayName) = 'p:' + slug(displayName)`. The entry shape is close to what we want; the fatal flaw is that `id` is **derived from the mutable display name at every build**, so a spelling change silently changes identity. The refactor stores identity instead of deriving it.

### Canonical record (one per real person)

```jsonc
{
  "id": "ronaldo-nazario",            // REQUIRED — stable internal slug, minted once, never recomputed
  "displayName": "Ronaldo Nazário",   // REQUIRED — canonical spelling shown in UI
  "sortName": "Ronaldo Nazario",      // OPTIONAL — normalized, for deterministic ordering
  "refs": {                           // OPTIONAL — external references, each 0-or-1 per source
    "tm": "3140",                     //   Transfermarkt player id (string; the real spine)
    "qid": "Q11571",                  //   Wikidata QID — best-effort, often null
    "tsdb": null,                     //   TheSportsDB id — populated opportunistically at runtime->build feedback, else null
    "wp": "Ronaldo (Brazilian footballer)" // Wikipedia article title (dedup provenance)
  },
  "aliases": ["Ronaldo", "Ronaldo Nazário", "Ronaldo Rodrigues de Jesus"], // OPTIONAL — INPUT MATCHING ONLY
  "ambiguousTokens": ["ronaldo"],     // OPTIONAL — bare tokens that must PROMPT, not auto-resolve
  "fame": 210,                        // REQUIRED (default 0) — Wikipedia language count; drives notable filter
  "curated": true,                    // REQUIRED (default false) — hand-authored provenance
  "nationalities": ["Brazil"],        // facts (unchanged semantics), now keyed off id
  "positions": ["forward"]
}
```

**Required:** `id`, `displayName`, `fame`, `curated`.
**Optional:** `sortName`, `refs.*`, `aliases`, `ambiguousTokens`, and the fact arrays (`nationalities`, `clubs`, `positions`, `trophies`, `managers`) which stay as today but are attached by id.

### Aliases (input matching only — the load-bearing rule)

`aliases` is the union of every spelling any source has ever used for this person: diacritic variants, mononym forms, Wikipedia disambiguation titles, misspellings we choose to accept. It is consulted **only** when turning typed text into a candidate id. It is **never** an identity. Two people never share an alias unless that shared token is also listed in `ambiguousTokens`.

### Display names

`displayName` is the single canonical UI spelling. Everything else that used to be a "canonical name" in some other dataset (501's bare `Ronaldo`, careers' `Fc Barcelona`-style variants) becomes an alias pointing at this one record. There is exactly one display name per id, platform-wide — this kills the current cross-namespace drift (501 `Ronaldo` vs facts `Ronaldo Nazário`).

### Ambiguity handling

Ambiguity is a **property of the model**, not a per-game behavior. A bare token in `ambiguousTokens` (e.g. `ronaldo`, `neville`, `fred`) resolves to a *set* of candidate ids; the UI must disambiguate (context in games with a closed candidate set, an explicit prompt otherwise). This generalizes the current one-off `AMBIGUOUS_ALIASES = { ronaldo: [...] }` to a data-driven mechanism covering all ~145 notable mononyms and genuine namesakes.

---

## 2. The crosswalk file(s)

### Files and location

```
src/data/canonical/
  players.registry.json     # the canonical records from §1 (generated, committed)
  players.crosswalk.json    # lookup indices (generated, committed, append-only)
```

`players.registry.json` — array of canonical records. Human-diffable, committed.

`players.crosswalk.json` — the stability spine. Three lookup maps, all pointing at internal ids:

```jsonc
{
  "meta": { "generatedAt": "...", "count": 6179, "schema": 1 },
  "byRef": {                          // external id -> internal id (authoritative link)
    "tm:3140": "ronaldo-nazario",
    "qid:Q11571": "ronaldo-nazario"
  },
  "byAlias": {                        // normalized alias -> internal id | [ids] if ambiguous
    "ronaldo nazario": "ronaldo-nazario",
    "ronaldo": ["cristiano-ronaldo", "ronaldo-nazario"]   // ambiguous -> array
  },
  "retired": {                        // old id -> new id, for merges (never delete a key)
    "ronaldo-nazario-old": "ronaldo-nazario"
  }
}
```

- `byRef` is the **primary re-identification key** across rebuilds: an incoming row with a known TM id always maps to the same internal id.
- `byAlias` backs runtime search and name-only reconciliation.
- `retired` guarantees that a merged/renamed id never dangles — old localStorage/share-URL references resolve forward.

### How they are generated & which build step owns them

A **new** build step owns both files:

```
scripts/build-identity.mjs   # NEW — the single owner of players.registry.json + players.crosswalk.json
```

It runs **first** in the build chain, before every other generator, and is the *only* thing permitted to mint ids or write the crosswalk. Every other generator (`build-501-stats`, `build-tenable`, `scripts/wikidata/*`, the Transfermarkt importers) becomes a **consumer**: it resolves its player references through the crosswalk and emits ids, never minting.

Generation algorithm (deterministic, order-independent, idempotent):

1. Load the existing `players.crosswalk.json` (may be empty on first run).
2. Ingest all sources, each yielding `(displayName, refs, fame, curated, positions…)` tuples.
3. For each incoming player, resolve to an existing id by, in order: (a) a matching `byRef` external id; (b) a matching `byAlias` normalized name; (c) else **mint** a new id (§3).
4. Merge facts/refs/aliases onto that id. Add any new spelling to `aliases`.
5. Re-emit `players.registry.json` and update the crosswalk. **Never** change an existing id; a rebuild that would is a hard error (§8).

---

## 3. Internal ID generation

### Slug format

`kebab-case(ascii-fold(displayName))`, apostrophes/punctuation stripped, e.g. `ronaldo-nazario`, `xabi-alonso`, `heung-min-son`. Human-readable (self-documenting in logs and share URLs), which the audit flagged as the reason to prefer slugs over opaque ints or over `Q…` strings.

### Stability guarantees

- **An id is minted exactly once and stored.** It is never recomputed from `displayName`. Deleting the `p:`-prefix-from-name scheme in `facts.js` is the whole point.
- Re-identification on every subsequent build goes through `byRef` first, then `byAlias`. So a display-name change reuses the id (the old spelling becomes an alias); a TM-id-stable player is immovable.

### Collision handling

Two different people whose display names slugify identically (the audit found ~806 name→multi-id cases, e.g. two `Danny Williams`) get a **stable discriminator** appended, drawn from a stable attribute in priority order: primary nationality, then birth year if available, then a monotonic `-2/-3`. Example: `danny-williams-usa`, `danny-williams-eng`. The discriminator is chosen **once at mint time and frozen** in the crosswalk — it never re-derives.

### Rename handling

Display-name change → `id` unchanged, old spelling appended to `aliases`, `displayName` updated. No migration, no dangling references.

### Cross-rebuild stability (the invariant)

> For any player present in a prior build, `build-identity.mjs` MUST return the same `id`. If it cannot (no `byRef` match and no `byAlias` match for a player who previously existed), that is a **build failure**, not a silent re-mint.

The crosswalk is treated as an **append-only committed artifact**. Merges write `retired[old] = new` and keep the old key forever.

---

## 4. Generators — before/after

| Generator | Outputs today | Outputs after refactor | Emits |
|---|---|---|---|
| **`build-identity.mjs`** (NEW) | — | `players.registry.json` + `players.crosswalk.json` | ids (owner) |
| **`facts.js`** (runtime module, not a script) | Builds registry keyed by `playerId(name)`; `membersOf`/`notableMembersOf` return id-sets; converts to names via `getPlayer().displayName` | Loads `players.registry.json` directly; drops `ensurePlayer`/`canonPlayer`/`PLAYER_ALIASES`/`playerId`. Category indices key on stored ids. | **ids** (already id-internally; stops deriving them) |
| **`scripts/wikidata/import-all.mjs`** (facts source) | Emits `wikidata.generated.json` as name-keyed club/nat/trophy lists | Resolves each name→id via crosswalk (using the QID it *already fetches* as the `byRef` key — this is where QIDs finally get persisted); emits **id-keyed** membership | both (id primary, name for display seed) |
| **`build-501-stats.mjs`** → `stats.generated.json` (five01) | Roster maps `{ playerName: value }` (Wikipedia leaderboards) | `{ playerId: { value, displayName } }`; validation indexes by id | **both** (id key, displayName retained) |
| **`careers.generated.json`** (import-careers) | `players: [{ name, clubs:[…] }]` | `players: [{ id, displayName, clubs:[…] }]`; target validated by id | both |
| **`teammates.generated.json`** (import-teammates) | `players:[{ name, teammates:[{name,…}] }]` | ids on both the target and each teammate | both |
| **`wcsquads.generated.json`** (import-wc-squads) | `squads:[{ players:[name] }]` | `squads:[{ players:[{ id, displayName }] }]` | both |
| **`build-tenable.mjs`** → `tenable.generated.json` | `questions:[{ answers:[{ text, aliases }] }]` | answers carry `id`; aliases fold into the registry record | both |
| **Transfermarkt pool** (`football501.generated.json`, `history.*`, `catalog`) | `players:[{ id: <TM id>, name, comps }]` | **unchanged** — stays TM-id-keyed. `build-identity` reads these as the `byRef:tm` source. | TM id (out of identity scope) |
| **`famousPlayers.js` / `wordle.js`** | Curated `{ name, surname, nationality }` pool | Add `id` (best-effort link; Wordle identity is cosmetic) | both |

Principle: **generators emit ids as the key and retain `displayName` for direct rendering**, so no runtime lookup is needed just to draw a name, but identity comparisons always go through the id.

---

## 5. Runtime search flow (typed text → player id)

Today: `merge([...apiPlayers, ...localMatches, ...searchRegistry(input)])` → `refineSuggestions` → dropdown of *names*; the chosen *string* is then re-resolved per game.

After:

1. **User types** → debounced input (unchanged).
2. **Three suggestion sources** produce candidate ids (not strings):
   - `searchRegistry(input)` → searches `byAlias` + display names in the crosswalk → returns `[{ id, displayName, flag }]`.
   - `localMatches` → the current game's candidate id-set, filtered by alias match.
   - **TheSportsDB API** → still returns strings; each is resolved to an id via `byAlias`. Unresolvable API hits (genuinely not in registry) are surfaced as `{ id: null, displayName, external: true }` — never hidden (preserves the "never drop a real answer" rule).
3. **`refineSuggestions`** dedups **by id** (not by fuzzy string key), expands `ambiguousTokens` into their candidate ids, and ranks. The three current hacks (`primaryBare`, spelling-variant fuzzy drop, `AMBIGUOUS_ALIASES`) are replaced by: dedup-by-id + `ambiguousTokens` expansion.
4. **Dropdown renders `displayName` + flag**, but each row **carries its `id`**.
5. **User selects** → the game receives an **id** (or, for an unresolved external suggestion, a raw string that only that game's own fallback can accept).

Net: identity is decided at selection time, once, in one place. Games stop re-resolving strings.

---

## 6. Validation — every path

| Game | Validation today | Validation after |
|---|---|---|
| **TicTacToe** | `resolveAgainst(input, candidateNames, usedNames)` — resolves string via `resolve.js`, checks membership in a name set | Cell candidate set is already an **id-set** (`intersectIds(membersOf, membersOf)`). Compare **selected id ∈ candidate id-set** directly. `resolveAgainst` retired. |
| **Connections** | Tile groups precomputed from `membersOf` id-sets; tile selection matched to group | Unchanged in spirit — already id-based; just reads ids from registry. No string comparison. |
| **Football 501** | `validateGuess(challengeId, rawName)` — five01's own name index over `ROSTERS` | Roster keyed by id; `validateGuess(challengeId, selectedId)` → O(1) id lookup. Own `surnameKeys`/normalize index retired (search layer owns matching). |
| **Higher/Lower** | No text input (binary choice) | Unchanged; pool entries carry ids for consistency. |
| **Career Path** | `guessMatch.js` — self-contained per-target name matcher | Target carries an id; a selected id validates by `id === target.id`. `guessMatch` kept **only** as a typed-fallback for when search yields no id (accepts surname), demoted to matching aid. |
| **Teammates** | `guessMatch.js` against the target | Same as Career Path — id equality primary, `guessMatch` fallback only. |
| **World Cup Squads** | Name-in-squad membership | Squad is an id-array; validate **selected id ∈ squad ids**. |
| **Tenable** | Local `normalize()` vs `answer.text` + `answer.aliases` + surname | Answer carries an id; validate by id when search yields one; keep the alias/ surname path as fallback for free-typed answers. |
| **Wordle** | Letter-by-letter vs `question.surname` | **Unchanged.** Wordle is a word puzzle; identity is cosmetic. Only add `id` for stat/telemetry consistency. |

The through-line: **when the user selected from the dropdown, validation is id equality / id-set membership.** String matching survives only as a *fallback* for free-typed input that never resolved to an id, and only in the games that currently allow free typing (501, Careers, Teammates, Tenable, WCSquads).

---

## 7. Obsolete constructs and their replacements

| Removed | Where | Replaced by |
|---|---|---|
| `PLAYER_ALIASES` + `canonPlayer` | `facts.js:46-51` | Per-record `aliases[]` in the registry; folding happens once in `build-identity.mjs`. |
| `playerId(displayName)` (derive-from-name) | `facts.js:59` | Stored `id` in `players.registry.json`; `getPlayer(id)` unchanged, but ids are read not computed. |
| `ensurePlayer` fragment-merging | `facts.js:70` | Reconciliation moves to build time (`byRef`→`byAlias`→mint). |
| `AMBIGUOUS_ALIASES` | `resolve.js:27` | Data-driven `ambiguousTokens` on records + `byAlias` arrays. |
| `primaryBare` / `asShown` | `resolve.js:121-125` | Gone — there is one `displayName` per id, so no "show the bare form" hack. |
| Fuzzy spelling-variant drop (`fuzzyKey`) | `resolve.js:111-113,185` | Dedup **by id**; variant spellings are aliases of one id, so they collapse naturally. |
| `five01.js` private `surnameKeys` + per-roster index | `five01.js:42-63` | Search/crosswalk owns matching; rosters key by id. |
| Duplicate `normalize`/`surnameKeys`/`PARTICLES` copies | `five01.js`, `guessMatch.js`, `tenable` component | Single `normalize.js` for *matching only*; identity no longer flows through it. |
| Tenable component-local `normalize` | `FootballTenable.jsx:61` | Shared matcher + answer ids. |

`resolve.js` shrinks to: `normalize` (matching), `searchRegistry` (now crosswalk-backed, returns ids), `refineSuggestions` (dedup-by-id + ambiguity expansion). The `OK/AMBIGUOUS/UNKNOWN` state machine remains but returns ids.

---

## 8. Build-time integrity checks (`build-identity.mjs` fails the build if…)

1. **Duplicate ids** — two registry records share an `id`.
2. **One external ref → multiple ids** — any `tm:*`/`qid:*` key would map to >1 internal id (the classic "one Transfermarkt id, two players" corruption). Audit shows this must be caught: ~806 name→multi-TM-id cases need to resolve cleanly.
3. **Conflicting canonical names** — an id resolves to two different `displayName`s across sources without one being declared the canonical and the others aliases.
4. **Alias collision without an ambiguity rule** — a normalized alias maps to >1 id but is *not* listed in any record's `ambiguousTokens`. (This is the guard that forces every mononym through review.)
5. **Unresolved previously-known player** — a player present in the prior crosswalk cannot be re-identified this build (would force a re-mint / id change). Violates §3 invariant.
6. **Retired-id dangling** — a `retired[old]` target id does not exist.
7. **Slug format violation** — an id is not valid kebab-ascii.
8. **Orphan reference** — a generator emits an id not present in the registry.

Checks 1–5 are the ones the user named; 6–8 are cheap additional guards that fall out of the same pass. All run in the build; CI blocks merge on failure.

---

## 9. Phased migration plan

Guiding constraint: **the app builds, passes tests, and behaves identically after every phase.** Each phase is independently shippable and revertible.

### Phase 0 — Introduce identity as an *additive artifact* (no runtime change)
- **Files:** add `scripts/build-identity.mjs`, `players.registry.json`, `players.crosswalk.json`; wire the script into the build ahead of others.
- **Changes:** generate the registry/crosswalk from existing sources (TM id + name-match seed). Emit but **consume nowhere**. Runtime still uses `facts.js` as-is.
- **Risks:** none to runtime (pure addition).
- **Rollback:** delete the script + two JSON files.
- **Verify:** the crosswalk builds; integrity checks pass on the current data; `count === 6179 ± expected`; manual spot-check of the ~200-record review queue (mononyms, namesakes).

### Phase 1 — Seed the manual-review queue and freeze ids
- **Files:** `players.crosswalk.json` (curation), a `docs/identity-review.md` worklog.
- **Changes:** hand-resolve the ~145 notable mononyms and namesakes; assign discriminators; add `ambiguousTokens`. No code.
- **Risks:** human error in merges (mitigated: review-gated, false-positive fuzzy pairs explicitly kept separate).
- **Rollback:** revert the JSON.
- **Verify:** every `ambiguousTokens` case has an array in `byAlias`; check 4 passes; the Ronaldo/Fred/Jô set resolves to distinct ids.

### Phase 2 — `facts.js` reads the registry instead of deriving
- **Files:** `facts.js`, `resolve.js` (`searchRegistry` → crosswalk).
- **Changes:** `facts.js` loads `players.registry.json`; delete `PLAYER_ALIASES`/`canonPlayer`/`playerId`/`ensurePlayer` derivation. `membersOf`/`getPlayer`/`CATEGORY_KEYS` unchanged in signature. TicTacToe & Connections now run on stored ids.
- **Risks:** id-string changes vs the old `p:`+slug scheme could break any place that persisted an id (check localStorage keys, prerender). The old ids were `p:...`; new are bare slugs — **provide a `retired`/prefix-compat shim** for one release.
- **Rollback:** revert `facts.js` to derive-from-name (registry JSON stays, unused).
- **Verify:** `npm run test` (151 baseline), TicTacToe/Connections daily reproduce identical boards for a fixed seed; snapshot the generated grids pre/post.

### Phase 3 — Migrate the free-typing games one at a time
Order: **501 → Careers → Teammates → Tenable → WCSquads** (one PR each).
- **Files:** the game's data generator + component validation path.
- **Changes:** generator emits ids; component validates by id with the string path demoted to fallback.
- **Risks:** a game-specific roster name that never linked to an id (name-only tail) — fallback string path covers it; integrity check 8 guards orphans.
- **Rollback:** per-game revert (each game is independent).
- **Verify:** per game, replay a set of known-valid and known-invalid guesses; confirm the Ronaldo-class cross-namespace cases now validate identically in 501 and TicTacToe.

### Phase 4 — Delete the dead constructs & unify `normalize`
- **Files:** `resolve.js`, `five01.js`, `guessMatch.js`, `FootballTenable.jsx`.
- **Changes:** remove `primaryBare`/`asShown`/`AMBIGUOUS_ALIASES`/fuzzy-drop and the duplicate `surnameKeys`/`normalize` copies (§7).
- **Risks:** a lingering caller of a deleted export → caught by build/lint.
- **Rollback:** revert the deletion commit.
- **Verify:** lint clean (26-error baseline unchanged), full test pass, grep confirms zero references to removed symbols.

### Phase 5 — Turn integrity checks into CI gates & drop the compat shim
- **Files:** CI config, `facts.js` (remove `p:` compat).
- **Changes:** integrity checks 1–8 block merge; remove the one-release id-compat shim once telemetry shows no stale `p:` references.
- **Risks:** none if Phases 2–4 verified.
- **Rollback:** relax the CI gate.
- **Verify:** intentionally inject each of the 8 violations in a throwaway branch; confirm the build fails on each.

---

## 10. Weaknesses, risks, edge cases, and alternatives

### Design weaknesses to accept or mitigate now
1. **The crosswalk is a hand-maintained committed artifact.** Its integrity depends on discipline (append-only, never delete keys). Mitigation: integrity checks 5–6 make violations a build failure, not a silent bug.
2. **Discriminator choice is irreversible.** Once `danny-williams-usa` is minted, changing the scheme is a migration. Mitigation: freeze the scheme in Phase 0; document it; prefer nationality (stable) over birth-year (often missing) over ordinal.
3. **Name-only tail (1,373) has no external anchor.** These players are re-identified only by `byAlias`. If two sources spell such a player differently *and* neither spelling is yet an alias, the build mints a duplicate. Mitigation: check 5 catches a *known* player re-minting, but a *first-time* two-way spelling split won't trip it. Residual risk — accept and sweep via the fuzzy-candidate review (kept manual).
4. **TheSportsDB stays a runtime string source.** The search layer resolves its hits to ids, but genuinely-new API players remain id-less at selection. Acceptable: only the fallback games accept them, and they were never validatable identities anyway.

### Edge cases
- **Mononym ↔ full-name across sources** (Ronaldo bug ×145): handled by `aliases` + `ambiguousTokens`; this is the single most important correctness win and the largest review cost.
- **Diacritic double-storage** (~500): deterministic alias merge; must ship with the id-compat shim so any persisted old spelling still resolves.
- **Two Transfermarkt ids for one person** (TM-internal dup): `byRef` would map two `tm:*` keys to one id — allowed (many refs → one id is fine); the *reverse* (one ref → two ids) is the failure (check 2).
- **Corrupt source rows** (`João Moutinh0`, `(footballer, born 1928)` suffixes, ~36): a cleaning pass in `build-identity` before minting; disambiguation suffixes become aliases, not display names.
- **Persisted ids in localStorage/share URLs:** the `p:`→slug change is the one runtime-visible id change; the compat shim + `retired` map cover it for one release.

### Alternatives considered (and why not)
- **QID as primary key** — rejected earlier and reconfirmed by the audit: zero QIDs stored, ~46% historical resolution failure, third-party churn on your PK. QID stays a best-effort `refs.qid`.
- **Transfermarkt id as primary key** — tempting (97% coverage) but relocates vendor lock-in, excludes the 1,373 TM-less players, and inherits TM's own duplicate entries. Kept as the strongest `refs.tm`, not the identity.
- **Opaque integer ids** — rejected: worse debugging (audit noted a QID at least resolves to a page; a bare int resolves to nothing); slugs are self-documenting and equally stable.
- **Runtime reconciliation (no build-time crosswalk)** — rejected: pushes fuzzy matching into every request, which is exactly today's fragmentation. Reconciliation belongs at build time, once.
- **Big-bang cutover** — rejected: the phased plan keeps every game independently revertible; a single game regression can't hold the refactor hostage.

### The one thing to decide before coding
The name-only-tail duplicate risk (weakness #3) is the only residual correctness gap after automation. Recommendation: **run the fuzzy-candidate review (weakness #3 + §0 fuzzy list) as an explicit Phase 1 task**, treating every fuzzy pair as "distinct unless proven same," so the migration errs toward *splitting* (a recoverable annoyance) rather than *merging* (silently scoring the wrong player, unrecoverable).
