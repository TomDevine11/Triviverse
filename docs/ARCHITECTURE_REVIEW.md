# Football Trivia Platform — Forensic Architecture Review

> ⚠ **HISTORICAL — SUPERSEDED. This is not the current architecture.**
> This is the *original* forensic review (early 2026) that motivated the canonical
> migration. It describes the pre-migration world — Football 501 scraping StatMuse
> at guess time, a runtime `/api`, hand-typed member lists — **all of which no
> longer exist.** The migration it recommended is complete. For the current
> architecture read [`../ARCHITECTURE.md`](../ARCHITECTURE.md); for the review that
> declared it complete see [`architecture-review-2026-07.md`](./architecture-review-2026-07.md).
> Kept for context: it explains *why* the architecture is shaped the way it is.

> Scope: full read of `server/index.js`, `src/data/{modes,tenable,wordle,tictactoe,players,famousPlayers}.js`,
> and `src/games/**`. Reviewed as principal architect / QA / data-systems. Verdict-driven, not cosmetic.

---

## 1. Executive Summary

The platform contains **four modes built on three fundamentally different correctness models**, and the
diagnosis in the brief ("validate against APIs at runtime") is only true for **one** of them.

| Mode | Where answers come from | Correctness model | Verdict |
|------|------------------------|-------------------|---------|
| **Football 501** | Live scrape of StatMuse meta-tags + TheSportsDB + Wikipedia **at guess time** | Runtime statistical interpretation across 3 disagreeing sources | **REPLACE** |
| **TicTacToe** | Hand-curated `*_MEMBERS` name lists, intersected per cell | Precomputed answer set, but **manually maintained and non-exhaustive** | **REFACTOR** |
| **Tenable** | Static `answers[]` of exactly 10, with aliases | Precomputed closed answer set (✅ correct model) | **REPAIR** |
| **Wordle** | Daily pick from curated `famousPlayers`, letter-matched | Self-contained, single source (✅ correct model) | **REPAIR** |

**The core insight:** You do not have one architecture problem. You have **two correct modes and two
broken modes, broken for opposite reasons.** 501 is broken because it has **no precomputed answer set at
all** — it invents the answer the moment the user guesses. TicTacToe is broken because it **does** precompute
an answer set, but builds it from **hand-typed lists that are structurally guaranteed to have holes**
(this is exactly why you spent a whole session patching Julián Álvarez, Fàbregas, Saliba, Cruyff, Platini).

**The fix is not eleven different fixes. It is one canonical facts dataset, built offline, from which all
four modes derive both their questions and their answer sets.** Validation everywhere collapses to
`answer ∈ precomputed_set`. Zero external calls at runtime. That is precisely the GOOD pattern in the brief —
and Tenable/Wordle already prove it works in this codebase.

**Headline recommendation:** Keep the *concept* of every mode. Replace the *data substrate* of all four with
a single build-time-generated `facts.json`. Delete `server/index.js`'s entire scraping stack.

---

## 2. Root Cause Analysis

### RC-1 (PRIMARY): Football 501 has no answer set — it interprets prose at runtime

`server/index.js` is, in effect, an AI-reasoning-at-runtime system without an LLM. It does this for **every
guess**:

1. Build a slug from the player's name: `toStatMuseSlug(name)` → `cristiano-ronaldo-premier-league-goals`
   (`server/index.js:138`, `:161`).
2. Fetch `https://www.statmuse.com/fc/ask/<slug>` and **regex the `<meta name="description">` prose**
   (`:167`).
3. Decide if the prose is even about the right player via `descriptionMatchesPlayer()` — a heuristic that
   parses the *grammatical subject* of an English sentence (`:150-158`).
4. Extract the stat with `desc.match(/\b(\d+)\b/)` — **the first integer in the sentence** (`:175`).

Every one of those four steps is a probabilistic interpretation of generated natural language. Concretely:

- **First-integer extraction is unsafe.** If StatMuse renders "In the 2022-23 Premier League season, Haaland
  scored 36 goals," `/\b(\d+)\b/` returns **2022**, not 36. The code has no guard that the number it grabbed
  is the stat and not a year, an age, or a rank.
- **Name → entity is a string slug, not an ID.** There is no player identifier anywhere. "Ronaldo" resolves
  to whatever StatMuse guesses; Cristiano vs Ronaldo Nazário is left to chance + a subject-word heuristic.
- **Multi-stat sums silently undercount.** `fetchMultiStat` (`:183`) fetches "goals" and "assists" as two
  separate scrapes and sums them. If the assists scrape fails, `v ?? 0` makes it 0 but `anyFound` is still
  true from the goals scrape — so the player gets a **valid-looking but wrong** total, and the darts maths is
  silently corrupted.
- **The "question" is an unbounded predicate, not a set.** A 501 challenge is `{competition, statTypes,
  filters}` (`modes.js`). The set of "European midfielders" is open-ended; the app cannot enumerate it, so it
  cannot have known it before the user typed. The hints literally contain `≈`: *"Henry (175+74≈249)"*
  (`modes.js:42`). **The game admits in its own UI copy that it does not know the real numbers.**

This is the textbook BAD pattern from the brief, implemented literally.

### RC-2 (PRIMARY): TicTacToe precomputes the right way but from the wrong substrate

`tictactoe.js` does the right *shape* of thing — cell answer set = `getMembers(rowCat) ∩ getMembers(colCat)`
(`getCandidates`), and a solver proves the grid is fillable before release. **The model is correct.** The
**data** is not: `CLUB_MEMBERS`, `NATIONALITY_MEMBERS`, `MANAGER_MEMBERS`, `TROPHY_MEMBERS` are hand-typed
arrays. Three structural consequences:

- **Every missing `(player, category)` pair is a latent false-negative.** A real Man City + Argentina + World
  Cup winner (Álvarez) is invisible until a human remembers to type his name into three separate lists. You
  already hit this for Álvarez, Fàbregas, Saliba, Mkhitaryan, Cruyff, Platini. These were not bugs — they
  were the **data model working as designed.**
- **League membership is derived from only 12 hardcoded clubs** (`CLUB_LEAGUE`). "Played in the Premier
  League" is the union of 5 clubs' member lists, so any PL player at Spurs/Newcastle/West Ham/Villa/etc. is
  **structurally unrepresentable** (the Saliba/"League One" confusion descends from this).
- **The dropdown deliberately suggests players that are not in the answer set** (to avoid spoilers). This is
  good UX, but it means the UI actively invites users to enter valid-looking answers that the incomplete
  lists then reject — **maximising** the false-negative surface.

Root cause: the lists are an **independently-maintained denormalisation** of facts that should be derived
from one normalised table.

### RC-3: Three disagreeing sources of truth for one fact (501)

`fetchPlayerAttrs` (`server/index.js:434`) takes **nationality + position from TheSportsDB**, **clubs from
Wikipedia career tables**, and **the stat from StatMuse**. Three databases, three editorial conventions, no
reconciliation. So a single guess is adjudicated by a Frankenstein record whose fields come from sources that
define "nationality" and "position" differently. This is the *"different parts of the application use
different interpretations"* symptom — it is literally true at the field level within one record.

### RC-4: Position and nationality are modelled as single-valued; football is not

- `broadenPosition()` collapses to one of four buckets and takes the **first** listed position
  (`server/index.js:322-345`). Players are multi-position and move across the pitch over a career (Henry
  winger→striker, Bale LB→RW, Alli MID/FWD). First-listed-wins guarantees false negatives against a
  position filter.
- `checkFilters` uses **strict equality** on nationality (`:489`, `got !== req`). Dual-nationals and
  birthplace-vs-passport-vs-national-team ambiguity (Diego Costa, Wilfried Zaha, Munir) are coin-flips
  depending on which source answered.
- **The same `broadenPosition` is reimplemented on the client** (`Football501.jsx:25`) with a slightly
  different variant list than the server (`server/index.js:300`). Two copies of the validation primitive that
  can disagree — validation logic divergence, in the most literal sense.

### RC-5: Caching is inconsistent and the "permanent" cache is volatile in prod

- Stats are cached only when `stat > 0` (`server/index.js:820`); a legitimate 0 is **re-fetched on every
  request**, so the same player can flip between "0 (network blip)" and a real value run to run.
- A *wrong* cached position is kept forever; only a *null* position is retried (`:428`).
- `cache.json` is a debounced file write (`:28`). On Render's ephemeral filesystem it is wiped on every
  deploy/restart, so the "permanent" cache is actually per-instance and short-lived → **the same guess can be
  scored differently after a redeploy** if StatMuse's phrasing shifted. Pure data drift.

### RC-6: No tests exist

There is no test runner, no test file, no CI assertion anywhere in the repo (`package.json` scripts:
`dev/server/build/lint/preview` only). The TicTacToe solvability check is good but is the *only* correctness
guard in the entire platform, and it validates *solvability*, not *answer-set completeness*.

---

## 3. Architecture Review (current state)

```
            ┌─────────────────────────── RUNTIME (per guess) ───────────────────────────┐
 501:  UI ──┤ /api/category-stat ─► TheSportsDB (nat,pos) ─► Wikipedia (clubs,fallback)  │─► darts maths
            │                    └─► StatMuse meta-tag scrape ─► regex first integer      │   (RC-1,3,4,5)
            └────────────────────────────────────────────────────────────────────────────┘

 TTT:  UI ──► getDailyGrid() ─► intersect hand-typed *_MEMBERS lists ─► SDR solver        (RC-2)
 Ten:  UI ──► static answers[10] + aliases ─► fuzzy match                                 (✅, stale risk)
 Wor:  UI ──► daily pick from famousPlayers ─► letter match                               (✅)
```

What's right: Tenable and Wordle never touch the network for adjudication; their answer sets are closed and
shipped with the question. **They are the template.**

What's wrong: 501 adjudicates by interpreting third-party prose; TicTacToe adjudicates against a closed set
that is hand-maintained and therefore incomplete.

---

## 4. Recommended New Architecture

One principle: **the question and its complete answer set are produced together, offline, from one canonical
table, and shipped as static data. Runtime does set membership only.**

```
  data sources (offline, versioned)            BUILD STEP (node script, committed output)
  ─────────────────────────────────            ──────────────────────────────────────────
  curated facts/*.csv  ──┐
  (one row per fact,     ├─► entity resolution ─► canonical facts.json ─► generators ─► public/datasets/
   with provenance)      │   (one player ID,        (single source         per mode      • 501.json
  optional API snapshot ─┘    normalised)            of truth)                            • tictactoe.json
                                                                                          • tenable.json
                                                                                          • wordle.json
                                                                  ▲                              │
  validators (CI) ────────────────────────────────────────────── each dataset carries its       ▼
  • integrity • cross-consistency • solvability                   own precomputed answer sets  RUNTIME
                                                                                              answer ∈ set
```

Key properties:
- **Player identity is an ID, never a string slug.** `p:cristiano-ronaldo-1985` ≠ `p:ronaldo-1976`. All
  facts hang off IDs; display names and aliases are attributes.
- **Facts are normalised rows** `(playerId, type, value, season?, competition?, source, asOfDate)`. Category
  membership and stat tables are *derived* from these by the build, never hand-denormalised.
- **No runtime dependency on StatMuse/TheSportsDB/Wikipedia.** They become *offline ingestion* inputs,
  snapshotted with an `asOfDate`, reviewed by a human, committed. Drift becomes a reviewable diff, not a
  live surprise.
- **501 stops being open-ended.** Each challenge ships with an explicit, bounded roster of eligible players
  *and their exact stat*, pre-filtered to a legal darts range. Guessing becomes lookup.

---

## 5. Database Design

### 5.1 Canonical entities

```jsonc
// players.json  — one record per real human, stable ID
{
  "p:cristiano-ronaldo-1985": {
    "displayName": "Cristiano Ronaldo",
    "aliases": ["cr7", "ronaldo"],            // normalised at build; "ronaldo" is ALSO an alias of p:ronaldo-1976 → flagged ambiguous
    "nationalities": ["Portugal"],            // ARRAY. dual nationals list all
    "positions": ["forward"],                 // ARRAY of broad buckets the player genuinely played
    "birthYear": 1985,
    "source": "manual+wikidata:Q11571",
    "asOfDate": "2026-06-01"
  }
}
```

```jsonc
// clubs.json, competitions.json — controlled vocabularies with IDs + aliases
"c:man-city": { "name": "Manchester City", "league": "comp:premier-league", "aliases": ["man city","mcfc"] }
```

### 5.2 Facts (the single source of truth)

```jsonc
// facts.json — normalised, append-only, one row per atomic fact
{ "playerId":"p:julian-alvarez-2000", "type":"played_for_club", "value":"c:man-city", "from":2022, "source":"wikidata", "asOfDate":"2026-06-01" }
{ "playerId":"p:julian-alvarez-2000", "type":"won_trophy",      "value":"trophy:fifa-world-cup", "season":"2022", "source":"manual" }
{ "playerId":"p:julian-alvarez-2000", "type":"stat",            "competition":"comp:premier-league", "metric":"goals", "value":17, "season":"2023-24", "source":"statmuse-snapshot", "asOfDate":"2026-06-01" }
```

**Membership is derived, not authored.** "Played in the Premier League" = every `playerId` with a
`played_for_club` fact whose club's `league === comp:premier-league`. Add Spurs to `clubs.json` once and
every Spurs player is correctly a PL player everywhere — the Saliba class of bug becomes impossible by
construction. This is the structural answer to RC-2.

### 5.3 Provenance is mandatory

Every fact carries `source` + `asOfDate`. The build refuses to emit a dataset containing a stat older than a
configured horizon for active players, turning RC-5 drift into a CI failure.

---

## 6. Question Generation Design

**Rule: a question may only be emitted together with its complete, verified answer set. No predicate-only
questions survive.**

### 6.1 Tenable / Wordle (already close)
- Generated from `facts.json` by ranking: top-N by metric → `answers[]` with `asOfDate` + per-answer source.
- Aliases auto-expanded from the player record + a normalisation pass (so "Andy/Andrew Cole", accents, etc.
  are handled by *rule*, not by remembering to type each variant — RC's alias-coverage class).

### 6.2 TicTacToe (refactor)
- Categories become predicates over `facts.json`. `getCandidates(row,col)` = set intersection of derived
  membership sets. Solver unchanged.
- New gate: a grid is only published if **every cell's intersection is non-empty AND ≥ K** (e.g. K=3) so a
  single contested edge case can't make a cell effectively unanswerable. Store the full candidate set in
  `tictactoe.json` for that day.

### 6.3 501 (replace the substrate)
- For each challenge, the generator enumerates the **bounded eligible roster** (filters applied to
  `facts.json`), looks up each player's exact stat from the stat facts, and **drops anyone outside the legal
  darts range (1–180)**. Output:

```jsonc
// 501.json → challenge "pl-french-fwd-goals-assists"
{ "eligible": {
    "p:thierry-henry-1977":   { "value": 249, "breakdown": {"goals":175,"assists":74} },
    "p:olivier-giroud-1986":  { "value": 129, "breakdown": {"goals":90,"assists":39} }
    /* ...closed list... */
}, "asOfDate":"2026-06-01", "source":"statmuse-snapshot-reviewed" }
```

Now a guess is `roster[resolveEntity(input)]` — O(1), deterministic, and the hint's `≈` becomes an exact
number. A valid player can never be rejected because the roster *is* the definition of validity.

---

## 7. Validation Design

Single shared module, used identically by every mode and by the build's self-test:

```
resolveEntity(rawInput) -> playerId | AMBIGUOUS | UNKNOWN
   1. normalise (NFD strip diacritics, lowercase, collapse, strip punctuation)
   2. exact alias/displayName hit -> playerId
   3. surname-only hit -> playerId IF unique, else AMBIGUOUS (prompt user)
validateAnswer(playerId, question) -> answer ∈ question.answerSet   // pure set membership, no I/O
```

- **One implementation.** Delete the duplicated `broadenPosition` on the client (RC-4). Filtering happens at
  build time only; the client never re-derives position/nationality.
- **Ambiguity is surfaced, not guessed.** "Ronaldo" → AMBIGUOUS → ask which. This is the correct handling of
  the João Félix / Ronaldo / duplicate-name cases, instead of a subject-word heuristic silently picking one.
- **No network, no race, no cache** in the validation path → RC-3/RC-5 cease to exist.

---

## 8. Testing Framework (actual cases, plus generators for the rest)

No tests exist today (RC-6). Proposed suite (vitest). Representative concrete cases below; the *generators*
produce the "hundreds" by iterating the dataset.

### 8.1 Data-integrity (run in CI on `facts.json`)
- `every player has ≥1 nationality and ≥1 position`
- `every club referenced in a fact exists in clubs.json` (no dangling refs)
- `every stat fact for an active player has asOfDate within horizon`
- `no two distinct playerIds share an unqualified alias unless flagged ambiguous`
- Property test: `∀ fact: value matches the schema for its type` (fast-check generators).

### 8.2 Entity-resolution (the brief's named cases — all asserted explicitly)
| Input | Expected |
|-------|----------|
| `Ronaldo` | `AMBIGUOUS {p:cristiano-ronaldo-1985, p:ronaldo-1976}` |
| `Cristiano Ronaldo` | `p:cristiano-ronaldo-1985` |
| `João Félix` / `Joao Felix` | both → `p:joao-felix-1999` |
| `O'Shea` / `OShea` | `p:john-oshea-1981` |
| `Mbappe` / `Mbappé` | `p:kylian-mbappe-1998` |
| `kun aguero` / `Sergio Agüero` | `p:sergio-aguero-1988` |
| surname `Neville` | `AMBIGUOUS {gary, phil}` |
| `xxxxx` | `UNKNOWN` |

### 8.3 Question-generation
- `∀ tenable question: answers.length === 10 and ranks are 1..10 strictly` (catches authoring slips).
- `∀ 501 challenge: every eligible value ∈ [1,180]` (no auto-bust valid answers).
- `∀ tictactoe daily grid for next 365 day-indices: solver succeeds AND every cell candidate count ≥ K`.

### 8.4 Validation / E2E gameplay (per mode, scripted)
- 501: play a full 501→checkout sequence against the static roster; assert deterministic final score across
  two runs (proves no drift).
- Tenable: submit all 10 + aliases + 3 wrong → assert exactly 3 lives lost, board complete.
- TicTacToe: auto-solve the published grid using the stored candidate set → must reach 9/9 with no repeats.

### 8.5 Adversarial / historical / fuzz (generated)
- **Mid-season transfers:** Coutinho 2017-18 split (Liverpool→Barça) — assert his PL stat counts only PL
  facts, La Liga question sees only La Liga facts.
- **Loans:** Saliba loan years — assert loan facts are tagged and included/excluded per the question's intent.
- **Relegated / format changes:** First Division vs Premier League goals are distinct competitions; assert a
  pre-1992 First Division goal is NOT counted toward "Premier League goals."
- **Retired/active boundary:** retired players' stats are frozen (asOfDate ignored); active players' must be
  fresh.
- **Fuzz:** 10k random unicode/whitespace/punctuation inputs into `resolveEntity` → must only ever return a
  valid id, AMBIGUOUS, or UNKNOWN; never throw, never a wrong-but-confident id.
- **Property:** `∀ playerId p, ∀ question q: validateAnswer(p,q) === (p ∈ q.answerSet)` — the invariant that
  there is exactly one notion of correctness.

### 8.6 Production monitoring
- Log every `UNKNOWN`/`AMBIGUOUS`/rejected guess with the raw input. A rejected guess that *should* be valid
  is now a **data gap report**, not a user-facing mystery — review queue feeds back into `facts.json`.
- Daily CI re-runs 8.1–8.3 against the committed datasets so drift/staleness fails the build, not the user.

---

## 9. Migration Plan

1. **Lock Tenable & Wordle (low risk).** Add `asOfDate`/`source` fields and the 8.1/8.3 validators. Ship.
   This proves the static-answer-set pattern under CI without touching the hard modes.
2. **Stand up `facts.json` + entity resolver + validators** with no UI change. Seed it by *snapshotting* the
   current StatMuse/TSDB/Wiki outputs offline (reuse the existing scrapers as **one-time ingestion scripts**,
   human-review the diff). This is where the existing `server/index.js` logic goes to retire usefully.
3. **Refactor TicTacToe** to derive membership from `facts.json`. Delete the hand `*_MEMBERS` lists. Keep the
   solver; add the `≥K` gate. This directly closes the Álvarez/Saliba bug *class*.
4. **Replace 501 validation.** Generate `501.json` rosters; switch the client to local lookup; **delete the
   `/api/category-stat`, `/api/stat`, `/api/position` scraping stack** and the duplicated client
   `broadenPosition`. The server shrinks to a static file host (or disappears — datasets can ship in
   `public/`).
5. **Turn off the network path.** Confirm zero runtime external calls. Wire production monitoring (8.6).

Each step is independently shippable and reversible.

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| `facts.json` is laborious to seed | High | Med | Bootstrap from existing scrapers as one-time ingest; review diffs, not rows |
| Stat snapshots go stale for active players | Med | Med | `asOfDate` horizon enforced in CI (8.1); scheduled re-snapshot job |
| Entity resolution still misses an alias | Med | Low | Now a *reported data gap* (8.6), fixed in one place, not a silent reject |
| Datasets ship larger to client | Low | Low | Per-mode split + only the day's TicTacToe grid; gzip |
| Losing "any player is searchable" feel in 501 | Med | Med | Keep broad search dropdown; resolver returns UNKNOWN gracefully → "not eligible", never a wrong score |

**Net:** every residual risk degrades to a *reviewable data gap with a single fix site* — the opposite of
today, where every gap is a silent, irreproducible, user-facing wrong answer.

## 11. Step-by-Step Implementation Roadmap

- [ ] **0. Add vitest + CI**; port the existing TicTacToe solvability check into it as the first test.
- [ ] **1.** Add `asOfDate`/`source` to `tenable.js`/`wordle.js`; write integrity validators (8.1, 8.3); make CI fail on a malformed answer set.
- [ ] **2.** Define schemas: `players.json`, `clubs.json`, `competitions.json`, `facts.json`. Build `resolveEntity()` + the 8.2 test table.
- [ ] **3.** Write `scripts/ingest/*` that reuse the current StatMuse/TSDB/Wiki scrapers **offline** to seed `facts.json`; commit the reviewed snapshot.
- [ ] **4.** Build generators: `facts.json` → `public/datasets/{tenable,wordle,tictactoe,501}.json`, each with embedded answer sets.
- [ ] **5.** Refactor TicTacToe to consume `tictactoe.json`; delete hand `*_MEMBERS`; add `≥K` gate; run 8.3/8.4.
- [ ] **6.** Replace 501 validation with `501.json` lookup; delete `/api/*` scraping + duplicate `broadenPosition`; run 8.4/8.5.
- [ ] **7.** Wire production monitoring (8.6); confirm zero runtime external calls; schedule the re-snapshot + CI freshness job.

---

### Appendix A — Concrete defects found (file:line)

- `server/index.js:175` — `desc.match(/\b(\d+)\b/)` grabs first integer (year/age/rank hazard).
- `server/index.js:183-197` — multi-stat sum silently undercounts on partial scrape failure.
- `server/index.js:322-345` — first-listed position only; multi-position players misfiltered.
- `server/index.js:489` — strict nationality equality; dual nationals coin-flip.
- `server/index.js:434-487` — nationality/position (TSDB) + clubs (Wiki) + stat (StatMuse): 3 sources, 1 record.
- `server/index.js:820` — stat cached only when `>0`; zeros re-fetched every request (nondeterminism).
- `server/index.js:28` / Render ephemeral FS — "permanent" cache is volatile → cross-deploy drift.
- `Football501.jsx:25` vs `server/index.js:300` — duplicated, divergent `broadenPosition`.
- `modes.js:42` etc. — hints carry `≈` estimates: the app does not know its own answers.
- `tictactoe.js` `CLUB_LEAGUE` (12 clubs) — league membership structurally cannot represent most PL players.
- `tictactoe.js` `*_MEMBERS` — hand-maintained; every missing pair is a latent false-negative (Álvarez class).
- whole repo — zero automated tests.
