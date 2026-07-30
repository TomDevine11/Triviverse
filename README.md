# Triviverse

A hub of daily football trivia games — Football Wordle, Tenable, Tic-Tac-Toe,
Connections, Teammates, Career Path, Higher or Lower, and Football 501 (a
darts-style countdown). Built with React + Vite; prerendered to static,
SEO-complete HTML per route and locale (English + Spanish).

Every game is **self-contained**: guesses are validated against a precomputed
answer set built offline from a single data source (Transfermarkt). There is no
runtime database and no runtime scraping.

## Run it

```bash
npm install
npm run dev          # local dev server (Vite)
npm run build        # production build: vite build + static prerender → dist/
npm run server       # serve the built dist/ (what production runs)
npm test             # vitest
npm run lint         # eslint
```

## Data

All football data ships as committed, pre-generated JSON — **you do not need to
build data to run the app.** Regenerate it only when refreshing from source.

The pipeline is offline and manual: **scrape → build**. Scrapers run locally
(Transfermarkt blocks datacentre IPs), are resumable/idempotent, and cache to the
git-ignored `data/pl-history/cache/`. Never run a scrape from automation.

```bash
# scrape (local, one-off, per source)
npm run scrape:pl-history        # league performance (COMP=ES1|IT1|FR1|L1|CL)
npm run scrape:intl              # international caps/goals
npm run scrape:transfers
npm run scrape:honours

# build the committed artefacts from the caches (offline)
npm run build:pl-history         # cache → history.* + performance.*
npm run build:pl-catalog         # the full derived dataset chain
node scripts/build-identity.mjs  # rebuild the player identity registry
```

Some inputs are **intentionally hand-authored** (not scraped): the Wordle answer
pool (`src/data/famousPlayers.js`) and the daily 501/Tenable question sets. See the
architecture doc for why.

## Architecture

**Read [`ARCHITECTURE.md`](./ARCHITECTURE.md) before making structural changes.**
It is the design authority: the single-source-of-truth rule, the
`Raw → Canonical → Derived → Application` data flow and its enforced boundary, the
player identity system, the generated artefacts, and the architectural invariants
that must not be violated. The `docs/` folder holds design/UI docs and historical
migration records.

Deployment: Render, per `render.yaml` (`npm install && npm run build`, then
`npm run server`).
