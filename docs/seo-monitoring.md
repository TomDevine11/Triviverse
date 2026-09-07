# SEO & analytics monitoring

Lightweight, deterministic monitoring for the player-pair pilot and the existing games.
The goal is **visibility** — which pages/clusters are actually moving — not blind
optimisation. Nothing here rewrites content or changes the sitemap architecture.

## Commands

| Command | What it does | Needs network? | Needs creds? |
|---|---|---|---|
| `npm run seo-health` | Deterministic health of the **built `dist/`**: sitemap, canonicals, noindex anomalies, player-pair inventory (hub + 10 pairs), title/H1, prerendered answer content, redirect manifest, **analytics-tag presence in the build**. | No | No |
| `npm run seo-health -- --search` | The above **plus** per-target-route Search Console impressions/clicks/CTR/position (28d). Silently skips the search section if GSC creds aren't configured. | Yes | GSC |
| `npm run seo-validate` | Post-build SEO gate (broken links, dup titles/desc, canonical↔sitemap, JSON-LD, **pair inventory**, H1 + answer rows on pair pages). Exits non-zero on failure. | No | No |
| `npm run seo-smoke` | **Production** smoke test against `https://triviverse.com` — 200/canonical/noindex/title/H1/answers on all target routes, sitemap presence, 301 renamed pair, 410 retired pairs. Exits non-zero on regression. Run **after every deploy**. | Yes | No |
| `npm run search-console-report` | Existing GSC report (top queries/pages/striking distance). | Yes | GSC |
| `npm run analytics-report` | Existing GA4 report (channels/sources/pages). | Yes | GA4 |

**Release flow:** `npm run build` → `npm run seo-validate` → deploy → `npm run seo-smoke`.

## A. Sitemap / indexation — automated
`seo-validate` and `seo-health` both assert the exact player-pair inventory:
**`/players-who-played-for` (hub) + 10 canonical pairs**, no missing, no
unexpected/retired URLs, no duplicates. Any drift fails loudly. `seo-smoke` re-checks
the same against live production and confirms retired URLs stay **410** and the one
renamed URL stays **301** (`inter-milan-and-milan` → `ac-milan-and-inter`).

## B. Production smoke — automated
`seo-smoke` is the post-deploy gate. It is deliberately **separate from `npm test`** so
unit tests never depend on the internet. Point it at a preview with
`SEO_SMOKE_BASE=https://<preview-host> npm run seo-smoke`.

## C. Search-performance review — checklist (uses existing GSC integration)
There is an existing authorised GSC integration (`scripts/seo/lib/google.mjs`, run via
`npm run search-console-report` or `npm run seo-health -- --search`). **Do not add a new
provider.** Review roughly weekly, watching movement — not vanity totals:

Track per URL/cluster: **impressions · clicks · CTR · average position · indexed?**

Target routes:
- `/players-who-played-for/*` (the 10 pairs + hub) — the pilot; is it getting indexed and ranking?
- `/tenable` · `/football-pointless` · `/connections` · `/wordle` · `/career-path` · `/tictactoe` · `/higher-or-lower` · `/501`

For each, note week-over-week: are impressions/clicks/position **improving, flat, or
falling**, and for the pair pages, **which specific pairs** and **which queries**
("players who played for X and Y") are surfacing. Escalate a page only when the data
shows a real, persistent gap — not on a single noisy week.

## D. Analytics — player-pair funnel (once GA4 is active)
The six pair events are already implemented (do **not** add more). Each carries a
`pair` parameter so the 10 pairs can be compared. Funnel to monitor in GA4:

1. **page_view** (landing) → 2. **pair_game_start** (first guess) →
3. **pair_answer_correct** (per answer) → 4. **pair_game_complete** (all named) /
   **pair_reveal_all** (gave up) → 5. **pair_share_click** → **pair_internal_click**

Questions the funnel answers: does search traffic land and *start* the game? how far do
they get (answers named / completion rate)? do they give up or share? does the page
drive internal navigation to other pairs/games? Compare rates **across the `pair`
dimension** to see which pairs engage best.

> **Analytics is only recorded when `VITE_ANALYTICS_ID` (the GA4 `G-XXXX` measurement
> id) is set in the production build environment (Render → service `football501`).**
> `seo-health` reports whether the current build actually contains the tag.
