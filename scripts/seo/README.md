# SEO & Growth Intelligence Layer

A permanent capability for answering growth questions with data instead of
guesswork: *How do I get more traffic? What should I work on next? Why did
traffic change? Should I rename this game? Is there demand for this?*

It combines **your website** (code), **your analytics** (GA4), **your search
performance** (Search Console + Bing), **behaviour** (Clarity), and **market
demand** (Google Autosuggest + keyword volume) into one analysis.

## How it's used

Run a report; read the snapshot; act.

```
npm run seo-report              # orchestrator: everything available → console + snapshot
npm run search-console-report   # queries, pages, striking-distance (rank 5–20), low-CTR, cannibalisation
npm run analytics-report        # landing pages, engagement, channels, devices, retention
npm run seo-suggest -- "phrase" # deep autosuggest demand (omit the phrase to sweep all games)
```

Every run writes `scripts/seo/reports/<name>-latest.json`. **That snapshot is the
handoff**: a future chat session (or you) reads the latest JSON and gets fresh,
structured data without rebuilding anything — the whole point of this layer.

## Design

- **Graceful degradation.** No source is required. Zero credentials still gives
  the site model + live demand. Each connected source enriches the analysis.
  `capabilities()` reports what's live and every report prints it, so you always
  know what an answer is based on.
- **One auth for Google.** GA4 Data API and Search Console share a single
  service account (see `SETUP.md`). No OAuth dance, no browser flow.
- **Analysis, not dashboards.** The convenience queries are chosen to answer
  decisions: `striking` (rank 5–20 = quickest wins), `lowCtr` (rewrite title),
  `cannibalisation` (which pages fight each other), name↔football-intent checks
  (should I rename this game?).
- **Tooling, not app.** Everything here is dev-only Node ESM; the Google client
  libraries are `devDependencies` and never enter the shipped bundle.

## Files

```
scripts/seo/
  report.mjs      → npm run seo-report          (orchestrator)
  gsc.mjs         → npm run search-console-report
  ga4.mjs         → npm run analytics-report
  suggest.mjs     → npm run seo-suggest
  lib/
    config.mjs    capability detection + credential resolution
    env.mjs       dependency-free .env.seo.local loader
    site.mjs      site model from src/seo/seoConfig.js (routes, cannibalisation, hygiene)
    google.mjs    GA4 + Search Console clients (shared service-account auth)
    demand.mjs    Google Autosuggest (free) — "what do people actually type?"
    keywords.mjs  DataForSEO search volume (optional)
    bing.mjs      Bing Webmaster Tools (optional)
    clarity.mjs   Microsoft Clarity export (optional)
    format.mjs    console tables + snapshot writer
  reports/        generated snapshots (gitignored)
  .secrets/       service-account.json (gitignored)
```

Setup / credentials: **`SETUP.md`**.
