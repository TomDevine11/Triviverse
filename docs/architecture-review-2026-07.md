# Architecture Review — July 2026 (migration complete)

> This is the review that declared the canonical migration **complete** and
> produced [`ARCHITECTURE.md`](../ARCHITECTURE.md). It is a point-in-time record.
> For the current architecture, read `ARCHITECTURE.md`.

## Verdict

The canonical migration is essentially complete and healthy — a **finish line, not
a checkpoint**. Transfermarkt is genuinely the sole external data source (Wikipedia,
Wikidata, Kaggle all retired); the `Raw → Canonical → Derived → Application`
boundary is enforced in code with **zero exceptions**; player identity is unified;
all generated artefacts are consumed (no orphans). The recommendation was to
execute a short punch-list and then **freeze architectural refactoring**.

## Method

Read-only audit of the live repo: top-level layout, `package.json` scripts,
`render.yaml`, all generated artefacts cross-checked against app vs build-script
consumers, `server/index.js` endpoints vs app `fetch` calls, the compatibility
layers in `facts.js` / `resolve.js`, `membership.js`, and every `docs/` file.

## Findings (grouped)

Each item: why it exists · effort · risk · benefit · recommendation.

### 1. Architectural inconsistencies
- **1.1 Runtime TheSportsDB autocomplete dependency.** The typed-input games fetch
  thesportsdb.com to widen the suggestion dropdown, alongside the canonical
  `searchRegistry`. Never affects correctness (validation is canonical). Redundant
  in 501/Tenable (position-less suggestions are filtered out anyway); adds
  lower-league coverage in Tic-Tac-Toe. — M / Med / Med. *Recommend: drop from
  501 & Tenable eventually; keep in Tic-Tac-Toe. Not urgent.*
- **1.2 Canonical build-inputs under `src/data/`.** `history.*`/`performance.*`/
  `squads.*` are committed for reproducible rebuilds but imported by no app code
  (tree-shaken out). Layering smell only. — M / Low / Low. *Recommend: no; note in
  ARCHITECTURE.md.*

### 2. Dead code / obsolete scripts
- **2.1 `server/index.js` scraping stack (~800 of 926 lines dead).** The app makes
  zero `/api` calls; only static file-serving is live. Plus dead `server/cache.json`
  and the `express-rate-limit`/`cheerio`-in-server usage. — M / Med (prod start
  command) / **High**. *Recommend: yes — replace with a minimal static server.*
- **2.2 Stale in-code comments / vestigial manager concept.** e.g. a comment
  crediting positions to "Wikidata ∪ Transfermarkt" (Wikidata positions removed in
  C13). — S / Low / Low. *Recommend: fix opportunistically.*

### 3. Temporary compatibility layers
- **3.1 Name→id shims in `facts.js`** (`PLAYER_ALIASES`, `canonPlayer`,
  `playerId` slug-fallback). Load-bearing only while the curated `membership.js`
  layer feeds names — coupled to 5.1. — S / Low→Med / Med. *Recommend: remove only
  with 5.1.*
- **3.2 Redundant `slug` field on registry records** (`slug === id` for all but 2
  of ~44k). — S / Low / Low. *Recommend: drop next time build-identity is touched.*

### 4. Generated files no longer required
- **4.1 Audited all generated artefacts — none dead.** Every `*.generated.json` is
  consumed by the app or a build script. Only dead generated data is
  `server/cache.json` (goes with 2.1). *A healthy signal; nothing to do.*

### 5. Complexity reducible now migrations are complete
- **5.1 Curated `membership.js` (269 lines) ∪ canonical categories.** Possibly
  redundant now canonical categories are complete; retiring it would also unlock
  3.1 and collapse `facts.js` to one id-keyed path. — M–L / Med / Med–High.
  *Recommend: measure first.*
  **→ MEASURED (2026-07-30): KEEP — not redundant.** Managers, UEFA Champions
  League and the Euros have **no** canonical counterpart (managers unscraped;
  CL/Euro exist only as ~815 ambiguous honour strings needing fresh curation).
  Even where canonical has the category, coverage is only ~84–93% for
  clubs/nationalities and 26% for trophies — the misses are disproportionately
  legends (Maradona, Cruyff, Pelé, Di Stéfano, Ronaldo Nazário), because canonical
  categories apply a recency floor (the same bias that sank the C14/Wordle idea).
  6–21% of curated members fall below the notability threshold, so de-curating
  would drop them from generated grids. Removing it would reduce game quality; the
  coupled name→id shims (3.1) therefore stay. No code change made.
- **5.2 Two OG-image systems** (static `og-images.mjs` + dynamic Next `og-service`).
  Different jobs. — M / Med / Low–Med. *Recommend: no; both purposeful.*

### 6. Migration technical debt
- **6.1 Full `players.crosswalk.json` retained (dev/build only, not shipped).** —
  Keep; legitimate dev artefact.
- **6.2 Editorial `.txt` inputs at repo root.** Tidiness only. — S / Low / Low.
  *Recommend: optional.*

### 7. Inaccurate docs / RFCs
- **7.1 No in-repo architecture doc** (the rules lived in code comments + notes).
  *Recommend: yes — write `ARCHITECTURE.md`.* **(Done.)**
- **7.2 `ARCHITECTURE_REVIEW.md` reads as current** but describes the
  pre-migration StatMuse world. *Recommend: mark historical.* **(Done.)**
- **7.3 Docs reference the removed World Cup Squads game / "nine games".**
  *Recommend: quick fix pass.* **(Done.)**
- **7.4 `README.md` is the default Vite template.** *Recommend: replace.* **(Done.)**
- **7.5 `player-identity-refactor.md` deferred-phase status.** *Recommend: add a
  status note.* **(Done.)**

## Punch-list executed

1. Documentation (7.1–7.5) — this doc, `ARCHITECTURE.md`, `README.md`, historical
   markers.
2. Retire the dead `server/index.js` /api stack (2.1) — minimal static server.
3. Measure whether curated `membership.js` can retire (5.1) — evidence-gated.

Everything else was explicitly deprioritised. Overall conclusion: after the
punch-list, **freeze architectural refactoring** and return to product work.
