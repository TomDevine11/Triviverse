# SEO / growth review — state as of 2026-09-24

This document exists so that neither Tom nor a future Claude session has to remember
today's context. It records what shipped, what was observed, what must **not** happen
next, and exactly what to do at the 7-day review.

It is not a roadmap. It is a handoff.

---

## Current state

**Tier 1 shipped in PRs #66–#73** (eight PRs, each independently gated and merged):

| PR | Change |
|---|---|
| #66 | Bing query-label fix — `norm()` spread a string into characters, so every Bing query read `(unknown)` |
| #67 | Spanish content for Football Bingo and Football Contexto (both had been serving duplicate English metadata) |
| #68 | `seo-validate` wired into CI as a gate |
| #69 | Tic-Tac-Toe H1 correction — duplicate `<h1>`, and a prerender/hydration text mismatch |
| #70 | Playwright render tests for every game route |
| #71 | 7/28/90-day trend windows (`npm run seo-trends`) |
| #72 | Experiment ledger (`npm run experiments`) |
| #73 | `triviverse-serp` skill + SERP observation log (`npm run serp-log`) |

**Production smoke passed on all 19 routes** at the time of this review
(`npm run seo-smoke`: sitemap 42 URLs, 1 × 301, 3 × 410, all canonical/H1/answers checks green).

The CI gate is now: lint (advisory) → test → build → `seo-validate` → Playwright e2e.

---

## Important discoveries

**Every figure below is an observation from a specific date and a small sample. None of
it is a proven causal effect, and none of it is a universal SEO rule.**

### Search data

- **"football 501" is a major Bing query**: 1,887 impressions, position 3, 5.1% CTR —
  against **Google position 29.6** on 58 impressions (90-day). The same page, a ~30×
  impression gap between engines. This was invisible until #66.
- **`/501` is the top Bing page**: 189 clicks on 3,228 impressions (5.9% CTR).
- **Connections surged**: last 7 days 300 impressions at position **6.4**, clicks **+600%**,
  against a 90-day position of **11.4**. The 90-day window averaged it into invisibility.
- **`/501` improved ~6.7 Google positions** in the latest trend report (16.9, from a 90-day
  average of 21.2).
- **"footy tenable" lost ~111 impressions** and slipped ~1.2 places.
- **An F1 relation page appeared from nothing**: `f1.triviverse.com/drivers-who-raced-for/mclaren-and-sauber`,
  ~92 impressions at position 2.6, no prior demand.
- **The Tic-Tac-Toe H1 problem was real and is now fixed** (#69): the page carried two
  `<h1>` elements and swapped its visible wordmark on hydration.

### Spanish — an interesting signal, not a proven opportunity

One Bing query, `tres en ralla adivinando jugadores de fútbol`, returned **6 clicks on 7
impressions (85.7% CTR)**, and `/es` landing pages average ~**949-second** sessions in GA4.

**Treat this as a curiosity worth watching, not evidence of a broad Spanish opportunity.**
The click volume is single digits and the session-duration figure rests on a very small
number of sessions. It is explicitly *not* a mandate to translate more games.

### SERP observations (10 observations, 2026-09-24)

From `docs/seo/serp-observations.json`, summarised by `npm run serp-log`:

- SERPs where Triviverse ranked in the **top six** had **at most one** exact-match domain
  (`football tenable`/Bing #6, `football 501`/Bing #3).
- All **three** observed SERPs where Triviverse was **absent** had **two or more**
  exact-match domains (`football wordle`, `guess the footballer game`,
  `football higher or lower`).
- **AI Overviews credited a competitor in 2 of 2** observed cases (`teneball` →
  playfootball.games; `football career path game` → footballminigames.com, football-iq.app,
  extratime.world).
- Recurring competitors: playfootball.games (8/10), lineup-builder.co.uk (7/10),
  football-iq.app (4/10), futbol-11.com (3/10), footballminigames.com (3/10). 38 distinct
  domains, 30 seen once.

**Sample size is ten.** The exact-match-domain pattern is suggestive and worth testing
against more observations; it is not established.

---

## Known production issue — fixed in this review

Nine routes were reported earlier. **The real number was 20.** The earlier count came from
grepping literal `enOnly` occurrences in `seoConfig.js`; the ten player-pair relation pages
carry the flag programmatically and were missed.

All 20 `/es/<enOnly-route>` paths returned **HTTP 200 serving the English home shell** —
an indexable success response for a page that does not exist, indistinguishable from
`/es/definitely-not-real`. Fixed independently of any growth experiment. Implementation
details at the end of this document.

---

## Deliberate DO-NOT-DO-YET list

For roughly the next week, **do not**:

- install MCPs
- add paid SEO/SERP services
- add external football datasets
- build an industrial SERP scraper
- add another SEO crawler or validator
- add another analytics integration
- build a large keyword-research system
- change the canonical data architecture
- lower canonical recognition thresholds
- mass-create new games or pages
- make broad SEO title/content changes on the strength of a single observation
- optimise around one isolated CTR or impression spike

**Why.** Tier 1 has just materially changed both measurement and QA. Every number above
was taken with tooling that is days old, and several were taken with tooling that was
broken until this week. Adding more machinery now would mean interpreting causal effects
through instruments that have never been observed in a steady state. A clean observation
period is worth more than another tool.

---

## Candidate future capability — Bing keyword data (investigation, not a task)

`scripts/seo/lib/bing.mjs` already exposes two endpoints that nothing calls:

- `bing.keyword(q)` — free impression/volume estimate for a term
- `bing.keywordIdeas(q)` — related keyword ideas for a seed

These are free and already authenticated with the existing Bing Webmaster key.

**After** the observation period, assess whether they add discovery value beyond what we
already have: Search Console, Bing Webmaster query data, the 7/28/90 trend reporting,
Google Trends, autosuggest, and manual SERP observation. **Do not build this integration
before the review** unless a concrete need appears.

---

## 7-day review checklist

When this document is revisited (on or after ~2026-10-01):

1. Read this entire document first.
2. Inspect the experiment ledger: `docs/seo/experiments.json`.
3. Run `npm run seo-trends`.
4. Run `npm run experiments`.
5. Inspect current GSC/Bing data with the existing tooling (`npm run seo-report`, `npm run bing-report`).
6. Compare what you find against the observations recorded above.
7. For each signal, decide which it is: **persisted · strengthened · disappeared · too small or noisy to interpret**. The fourth outcome is a legitimate and common answer.
8. Pay particular attention to:
   - "football 501" and `/501`
   - Connections
   - Spanish Bingo / Contexto (`/es/football-bingo`, `/es/football-contexto`)
   - Tic-Tac-Toe
   - Tenable and "footy tenable"
   - the new F1 relation page
9. Review `docs/seo/serp-observations.json` for new evidence, and re-run `npm run serp-log`.
10. Decide which observations are now strong enough to justify a deliberate experiment.
11. Assess whether `bing.keyword()` / `bing.keywordIdeas()` would materially improve discovery.
12. Recommend the **smallest** number of next experiments.

**The review produces recommendations and evidence. It does not implement growth
experiments. Tom approves the next experiment before any production change is made.**

---

## Current strategic loop

The intended operating model — preserve this:

```
GSC / Bing / Trends
  → emerging query or page signal
  → check whether it is real
  → inspect SERP
  → assess SERP structure / competition
  → check canonical data support
  → identify an existing game/page, or propose a new one
  → HUMAN APPROVAL
  → Claude implements
  → Playwright + seo-validate
  → deploy
  → 7/28/90 measurement
  → experiment ledger
  → learn
```

The goal is **not** to maximise the amount of SEO tooling. It is to make each iteration
more evidence-driven while keeping the system cheap, simple and maintainable.

---

## Implementation record — the soft-404 fix

*(Filled in from actual repository output; see the PR for the full diff.)*

### Affected routes — all 20, derived from `ROUTES.filter(r => r.enOnly)`

```
/es/build-your-own-football-darts
/es/wordle/answers
/es/teammates/answers
/es/career-path/answers
/es/tenable/answers
/es/football-pointless/answers
/es/connections/answers
/es/england-football-quiz
/es/football-pointless
/es/players-who-played-for
/es/players-who-played-for/barcelona-and-real-madrid
/es/players-who-played-for/ac-milan-and-inter
/es/players-who-played-for/arsenal-and-chelsea
/es/players-who-played-for/chelsea-and-manchester-city
/es/players-who-played-for/bayern-munich-and-borussia-dortmund
/es/players-who-played-for/chelsea-and-real-madrid
/es/players-who-played-for/manchester-united-and-real-madrid
/es/players-who-played-for/liverpool-and-manchester-united
/es/players-who-played-for/manchester-city-and-manchester-united
/es/players-who-played-for/arsenal-and-tottenham
```

Before the fix: **20 of 20 returned 200 + the English home shell.**

### The change

`server/index.js` only. In the SPA fallback, after the prerendered-file lookup fails, a
path under the `/es` prefix now returns a real 404 instead of the English home shell.

The rule is derived from the build rather than a hard-coded list: `scripts/prerender.mjs`
emits an `/es` page for every indexable route that is not `enOnly`, so **"prerendered" is
an exact definition of "this locale/route combination exists"**. Adding a Spanish
translation makes the route valid automatically; marking a game `enOnly` removes it
automatically. The `enOnly` convention itself is unchanged.

The English fallback is deliberately untouched — an unknown English path still resolves to
the shell with a 200, and there is a test asserting exactly that so the fix cannot quietly
widen.

### Caveats discovered

- **The route count was 9 in the earlier report and is actually 20.** Anything that counts
  `enOnly` by grepping `seoConfig.js` will undercount, because the relation pages are
  generated.
- `playwright.config.js` sets `reuseExistingServer: !process.env.CI`, so a **local** run can
  reuse an already-running server and silently test stale code. Verifying that a test
  catches a regression locally requires `CI=1` (or killing the server first). This bit
  during verification of this very change.
- These 20 URLs will now be dropped from Google's index rather than kept as duplicate
  English content. That is the intended outcome, but it is a real deindexing event —
  expect the affected URLs to disappear from coverage reports over the coming weeks.
