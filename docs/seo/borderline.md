# Borderline: SEO, positioning and measurement

**Canonical URL:** `https://triviverse.com/geography/borderline`. It is not to be renamed or moved (see §3).
**Scorecard:** `npm run seo-borderline` (any geography game: `node scripts/seo/geo-scorecard.mjs <id>`).
**Experiment entry:** `EXP-007` in [experiments.json](experiments.json).
**Owner files:** `src/geography/seo.js` (metadata), `src/geography/guides.js` (visible copy and FAQ), `src/geography/analytics.js` (events), `scripts/geography/og-images.mjs` (share card).

## Change summary (2026-10-18)

For a future session that doesn't want to redo the research:

1. **Title and positioning.** The title now leads with the phrase searchers use, "Guess the Country by Its Shape", followed by "Daily & Unlimited", then the brand. The H1, description and OG tags were rewritten to match. The visible name stays **Borderline**.
2. **Worldle.** It is mentioned in one FAQ answer only. That answer says Borderline is independent and not affiliated. Worldle is never used in the title, description or H1 (a test enforces this).
3. **Social card.** `og:image` is a 1200×630 card at `public/og/geography-borderline.png`, with `summary_large_image`. Before this change the page had no image at all.
4. **Performance.** Geography routes are now lazy-loaded. Borderline used to download the whole suite's data (photos, voices, milestones, stats and so on) in one chunk: 1.28 MB, 437 KB gzipped. It now loads about 218 KB gzipped of geography JavaScript, mostly the country silhouettes it actually needs.
5. **IndexNow.** Geography URLs are now submitted. Before this, only football routes were pinged, so Bing had never been notified of any geography page.
6. **Analytics.** Borderline now sends gameplay events. Before this, geography sent page views and nothing else (§6).
7. **Structured data.** `applicationCategory` was corrected to `GameApplication`. `isAccessibleForFree`, `inLanguage`, `publisher` and `image` were added. No ratings or reviews (§5).

## 1. Baseline (measured 2026-10-18, two days after launch)

| Source | Value |
|---|---|
| Google URL Inspection | **Discovered – currently not indexed** (2 of 3 API calls; one said "URL is unknown to Google"). Its only referring URL is `/geography/outrank`, which *is* indexed (crawled 2026-10-17). `/geography` is also not indexed. |
| GSC, 28 days | 0 impressions, 0 clicks for every `/geography` URL |
| Bing page stats | 0 impressions, 0 clicks |
| GA4, 7 days | 5 page views; 1 organic landing session (google); no game events, because none existed yet |

Any result after 2026-10-18 measures **indexing and first impressions**, not before-versus-after on an established page.

## 2. Keyword research

### Sources and their limits
- **Demand:** Bing Webmaster `GetKeywordStats`, which gives real Bing impressions, weekly, for about the last 6 months, in GB and US. This is **Bing only**. Google volumes are not available: Google Trends returned HTTP 429 and no DataForSEO key is configured. Nothing below is a Google volume.
- **Intent and phrasing:** Google Autosuggest (GB and US), via `scripts/seo/lib/demand.mjs`.
- **SERPs:** the web search tool (US-only) plus direct fetches of competitor pages. Scraping Bing results with curl returned bot-degraded results, so it was discarded. **No UK Google SERP was inspected by hand.** Use the `triviverse-serp` skill for that.

### Bing demand (impressions over about 6 months)

| Query | GB | US | Notes |
|---|---:|---:|---|
| worldle | 23,991 | 6,835 | Navigational. Teuteuf's Worldle owns it. |
| guess the country | 12,011 | 16,588 | Mixed intent: flags, maps, emoji, songs |
| geography quiz | 9,214 | 19,900 | Quiz intent, hub-level |
| worldle unlimited | 5,463 | 8,876 | Exactly Borderline's Unlimited mode, but names a competitor |
| geography games | 4,770 | 16,123 | Hub (`/geography`), not Borderline |
| country guesser | 3,812 | 7,237 | Game intent, generic |
| guess the country game | 1,138 | 2,159 | Game intent |
| country guessing game | 592 | 2,149 | Game intent; autosuggest adds "by shape", "daily", "like wordle" |
| country wordle | 577 | 1,665 | "Wordle" is the NYT's mark; descriptive use only |
| geography wordle | 528 | 1,476 | Same |
| guess the country quiz | 427 | 464 | |
| guess the country by shape | 112 | 128 | Exact mechanic; small but precise |
| geography guessing game | 70 | 468 | |
| country outline quiz | 64 | 79 | Quiz intent (Sporcle, JetPunk) |
| daily geography games | 32 | 119 | Hub |
| country shape quiz / game, country silhouette quiz / game | 0–39 | 0–39 | Below Bing's reporting floor. Autosuggest shows they exist. |
| borderline game | 11 | 11 | Brand. Contested (§3). |

Re-run any of these with `node scripts/seo/geo-scorecard.mjs`, which prints a demand block, or adapt the call in that script.

### Competitors (observed 2026-10-18)
- **worldle.teuteuf.fr**: "Worldle - Guess the Country". This is the original. It owns "worldle", "daily country guessing game" and the head terms. Not beatable on those.
- **mappr.co**: "Guess the Country by Shape — Geography Wordle | Mappr". Same mechanic, with daily and endless modes, on a large reference-site domain.
- **geograck.com**, **geographical.co.uk**, **Sporcle**, **JetPunk**: own the *quiz* intent ("country shape quiz", "country outline quiz").
- Worldle-unlimited clones: geoworldle.com/worldle-unlimited, wordle.global/en/unlimited, wordle.today/worldle.
- **borderlinequiz.com** (Enjoy Software Pty Ltd, Australia): "Borderline: Country Outline Quiz | Guess the Country". **The same name, the same category, live since at least January 2026, running AdSense.** See §3.

### Opportunity table

| Cluster | Intent | Demand (Bing) | Competition | Relevance | Why we might win | Use | Priority |
|---|---|---|---|---|---|---|---|
| **guess the country (game) / by its shape** | Play a shape-guessing game | 1.1k–12k GB (head is mixed intent); 112 exact "by shape" | Worldle, Mappr, quiz sites | Exact | Exact-match title and H1, a full guide, daily + unlimited | **Primary**: title, H1, intro | High impact, medium confidence, done |
| country guessing game / country guesser | Play a country game | 0.6k / 3.8k GB | Mixed generic game sites | High | Description, intro | Secondary: description, intro | High / medium |
| worldle unlimited / unlimited country guessing game | Unlimited Worldle-style play | 5.5k GB | Clone sites with "worldle" in the domain | High mechanically | We really do have Unlimited | "Unlimited" in the title; Worldle in the FAQ only. **Not targeted by name** (§3). | Medium / low (decision for Tom) |
| geography / country wordle | Wordle-style geography | 0.5k–1.7k | Mappr | High | — | Not targeted (Wordle is a mark); possible later as copy | Low |
| country shape / silhouette / outline quiz | Quiz | <100 | Sporcle, JetPunk, Geographical | Medium (we're a game, not a list quiz) | — | Body copy only ("silhouette", "outline") | Low |
| geography games, daily geography games | Browse games | 4.8k / 32 GB | Large | Hub-level | — | `/geography`, **not** Borderline (avoids cannibalising the hub) | n/a |
| worldle, globle, travle | Navigational to other brands | Large | Owned | None | — | **No targeting** | n/a |

## 3. Naming and positioning decisions

| Element | Decision | Value |
|---|---|---|
| Visible name | Keep **Borderline** | Product brand; changing it is Tom's call |
| `<title>` (62 chars) | Descriptive first, brand last | `Guess the Country by Its Shape: Daily & Unlimited \| Borderline` |
| H1 | Brand plus the phrase | `Borderline — guess the country by its shape` |
| Meta description (157) | Mechanic, clues, modes, free | `Free country guessing game: name the country from its silhouette in six guesses, with distance and direction clues. A new country daily, plus unlimited play.` |
| Intro | Opens "Borderline is a free country guessing game: guess the country by its shape." | `guides.js` |
| URL | **Unchanged** | `/geography/borderline`. Two days old, no equity to gain from moving it, and the slug matches the brand |
| Internal anchors | Unchanged ("Borderline" plus its tagline on hub tiles) | |
| OG / Twitter title | Brand first | `Borderline — guess the country by its shape` |

**Why descriptive-first:** "borderline game" has 11 Bing impressions in 6 months, while the mechanic phrases have thousands. Google rewrites titles that don't match the H1 or intent. A second Borderline country-outline game already exists with a title beginning "Borderline:", so a title that leads with the brand would read as theirs on a results page. This breaks the suite's "Name — X | Triviverse Geography" pattern on purpose. The site-name line in results still shows Triviverse.

**Worldle:** The navigational "worldle" query is unwinnable and isn't ours. "Worldle unlimited" is large and mechanically identical to Borderline Unlimited. However, targeting a competitor's name in the title or H1 risks looking like passing off. Whether Worldle is a registered trademark was **not verified**. Worldle therefore appears only in a factual FAQ answer ("independently made… not affiliated"), which is a nominative mention. If Tom wants to go after "worldle unlimited" more directly, that is a brand and legal decision and comes before any change.

**⚠ Name collision (escalated to Tom, not acted on):** borderlinequiz.com operates "Borderline – Guess the Country", a country-outline game on AlternativeTo since 2026-01-07. Triviverse launched its Borderline on 2026-10-16. Risks: (a) brand searches split between two games; (b) possible trademark exposure. Their registration status was **not checked**, so look them up on the UKIPO and IP Australia registers. Same posture as the Football 501 question (B-027): research and propose, never rename unilaterally.

## 4. Crawlability and indexability checks (2026-10-18)

| Check | Result |
|---|---|
| `GET /geography/borderline` | 200, prerendered static HTML (10 KB) with title, canonical, meta, JSON-LD, H1 and the full guide |
| Canonical | Self-referencing, `https://triviverse.com/geography/borderline` |
| Robots | `index, follow` meta; robots.txt `Allow: /` plus a Sitemap line |
| Sitemap | Listed (`changefreq daily`, priority 0.7) |
| `/geography/borderline/`, `/index.html` | 307 to canonical (Cloudflare `auto-trailing-slash`; a 308 would be cleaner, but the canonical covers it) |
| `?mode=…` and other query strings | 200 with the self canonical. The game has no mode URLs, so there is no crawl trap. Daily and Unlimited are in-page state on a single URL. |
| Case variants | 404 |
| `www.triviverse.com` | Does not resolve (no duplicate host) |
| **`http://triviverse.com/…`** | **200, not redirected.** Site-wide. The https canonical limits the damage. Fix: Cloudflare → SSL/TLS → Edge Certificates → **Always Use HTTPS** (one toggle, Tom's dashboard) |
| Preview deployments | Workers Builds PR previews aren't linked anywhere; the canonical points to prod |
| Rendered DOM | After hydration the same H1, intro, guide and FAQ are rendered visibly below the game (`GeoContent`). The prerender holds the guide in an `sr-only` block that mirrors that visible content. |
| Duplicate metadata | Prerender strips the shell's football description and OG tags. One description and one H1 in the static HTML (verified); `npm run seo-validate` passes on all 21 sitemap URLs. |
| Discovery | **No football page links to `/geography`.** It is reachable from `/about` and the sitemap only. Borderline's only referring URL in GSC is Outrank. The football site was out of scope for this change (§9). |

## 5. Structured data

On the page: `VideoGame` (with `GameApplication`, free `Offer`, publisher Triviverse, image), `BreadcrumbList` (Triviverse Geography › Borderline) and `FAQPage`.

- Google has **no rich result for VideoGame**. Its SoftwareApplication rich result needs ratings or reviews, which we don't have and **must not invent**. The markup is descriptive only.
- FAQ rich results have been limited to authoritative government and health sites since 2023, so **no FAQ rich result is expected**. The block is kept because it mirrors the visible FAQ word for word (same source array, enforced in `test/geo-seo.test.js`). It was not added in hope of a rich result.
- `WebSite` / `Organization` site-name markup belongs on the homepage (football scope), not on this page.
- Validate after deploy with the [Rich Results Test](https://search.google.com/test/rich-results?url=https%3A%2F%2Ftriviverse.com%2Fgeography%2Fborderline) and [validator.schema.org](https://validator.schema.org/).

## 6. Analytics

GA4 is the existing site-wide integration (`src/utils/analytics.js`, `VITE_ANALYTICS_ID` at build time, `send_page_view: false` with SPA `page_view`s). It has **not** been duplicated. `src/geography/analytics.js` is a thin wrapper.

**Naming decision:** the brief suggested `borderline_*` names. Instead the events use one name per action with a `game` parameter. This is the same convention as football's existing `game_complete` and `share` (`game: <id>`), so one `game` custom dimension covers all 17 games and event names stay well under GA4's limits. GA4's recommended `level_start` / `level_end` were considered and rejected, because Borderline has no levels and the site already reports `game_complete`. `share` *is* the GA4 recommended event name.

| Event | Trigger | Params | Fires | Answers |
|---|---|---|---|---|
| `game_start` | The **first guess** of a round. Viewing the page is not a start. | `game`, `game_mode` | Once per round: once per day per browser for daily, once per country for unlimited | Do visitors engage, or just look? |
| `guess_submitted` | Every accepted guess | `game`, `game_mode`, `guess_number` (1–6) | Repeatedly (at most 6 per round) | Where do players drop off? |
| `game_complete` | The winning guess, or the 6th guess | `game`, `game_mode`, `outcome` (`won`/`lost`), `won` (bool, matches football), `guesses` (1–6) | **Once per round.** Fired from the guess handler, never from restored state, so a refresh never re-sends it. Also guarded by a per-round ref. | Completion and win rate |
| `share` | Native share sheet resolved, or clipboard write succeeded | `game`, `method` (`native`/`copy`), `game_mode` | Per successful share; cancels and blocked clipboards don't fire | Virality |
| `game_mode_select` | Player switches Daily ↔ Unlimited, or taps "Unlimited Borderline" on the result card | `game`, `game_mode`, `source` (`toggle`/`result_card`) | Per switch. The default mode on load does not fire. | Is Unlimited wanted? |
| `related_game_click` | Click on another geography game in the page links, or "All geography games" on the result card | `game` (from), `to`, `placement` (`page_links`/`result_card`) | Per click | Does Borderline feed the suite? |

**Never sent:** typed text, guessed countries, the answer, nickname or device id. `guess_number` and `guesses` are bounded to 1–6, so cardinality stays low.

**Replays:** the daily locks after it finishes, so it can't be replayed. Each unlimited country is a new round with its own start and completion. Separate daily from unlimited with `game_mode`.

### Verified (2026-10-18, local production build with a dummy GA id, reading `window.dataLayer` in Chrome)
- First daily guess: `game_start{daily}` + `guess_submitted{1}`.
- Reload mid-game: only `page_view`; no second `game_start`.
- Guesses 2–6, then `game_complete{daily, lost, guesses 6}` **once**.
- Share (copy): `share{copy, daily}`. "Unlimited Borderline": `game_mode_select{unlimited, result_card}`, then `game_start{unlimited}` on the next guess.
- Toggle to Daily: `game_mode_select{daily, toggle}`. Reloading the finished daily: only `page_view`.

### How to verify in production (DebugView)
1. Install Google's Tag Assistant or the GA Debugger extension, in a browser **without an ad blocker**.
2. GA4 → Admin → DebugView. Open `/geography/borderline` and play one guess, then finish the round.
3. Expect the sequence above. `game_complete` should appear exactly once per round.
4. Or use Realtime → "Event count by Event name" within about 30 seconds.

### GA4 configuration (manual: the Admin API isn't enabled on the service-account project, and the account is read-only)
In GA4 → Admin → Custom definitions → **Create custom dimension** (scope: Event):

| Dimension name | Event parameter |
|---|---|
| Game | `game` |
| Game mode | `game_mode` |
| Outcome | `outcome` |
| Share method | `method` |
| Mode source | `source` |
| Link target | `to` |

Optionally add a custom metric for `guesses` (Standard unit) to see average guesses. In Admin → Events, mark `game_complete` as a **Key event**. Custom dimensions only apply to data collected *after* they are created. Until then, `npm run seo-borderline` reports events filtered by `pagePath` and says the mode split is unavailable.

### Known limitation
On an in-app navigation, `page_view` is sent before the lazy route sets `document.title`, so `page_title` can carry the previous page's title. Direct landings (prerendered HTML) are correct. Report by **page path**, never by page title. This is site-wide and predates this change; the lazy split doesn't change the landing case.

## 7. Acquisition and conversion: definitions

Search Console counts clicks from Google's results. GA4 counts sessions from consented, JavaScript-enabled browsers. **The two will never agree**: ad blockers, consent, bots and attribution all differ. Read each on its own trend; don't reconcile them.

| Ratio | Numerator | Denominator | Notes |
|---|---|---|---|
| Search CTR | GSC clicks | GSC impressions | Per query and page. Position is an impression-weighted average, not the rank any one user saw. |
| Organic game-start rate | `game_start` events in Organic Search sessions on the page | Organic Search sessions landing on the page | Approximation: unlimited rounds add extra starts. Once the `game_mode` dimension exists, restrict the numerator to `game_mode = daily`. |
| Completion rate | `game_complete` | `game_start` | Same mode on both sides. Daily completion can't exceed 1 (once per day per browser). |
| Win rate | `game_complete` where `outcome = won` | `game_complete` | |
| Share rate | `share` | `game_complete` where `game_mode = daily` | Only the daily result card has Share |
| Unlimited uptake | `game_mode_select` where `game_mode = unlimited` | `game_complete` where daily | |
| Related-game rate | `related_game_click` | Borderline `page_view` | Also: Explore → Path exploration starting at `/geography/borderline` |
| Returning | `newVsReturning` = returning, sessions on the page | All sessions on the page | GA4 identifies browsers, not people; consent, cookie clearing and devices fragment it. A trend signal, not cohort truth. Data thresholds may hide small segments. |

## 8. Scorecard and reporting workflow

**Weekly: `npm run seo-borderline`.** It prints, and saves to `scripts/seo/reports/borderline-scorecard-latest.json` (gitignored):

| Area | What it shows | Source |
|---|---|---|
| Technical health | Live status, canonical, robots, sitemap, og:image, title, H1 | Live fetch |
| Index status | Coverage state, last crawl | GSC URL Inspection |
| Search visibility | Clicks, impressions, CTR, average position, 28 days vs the previous 28 | GSC (page filter) |
| Snippet effectiveness | Top queries; low-CTR (≥50 impressions, <2%); striking distance (positions 5–20) | GSC |
| Wrong-page queries | Intent queries Google answers with another Triviverse URL | GSC query×page |
| Bing | Page clicks and impressions, top queries, **live demand** for the target families | Bing Webmaster |
| Acquisition | Landing sessions by channel and source; organic separated out | GA4 |
| Gameplay and engagement | Event counts; start, completion, share and related-click rates; mode split once registered | GA4 |
| Retention | New vs returning | GA4 |

**In the UIs (no build needed):**
- **Search Console** → Performance → + New → **Page** → exact URL `https://triviverse.com/geography/borderline`. Check the **Queries** tab, then **Countries** and **Devices**. Use **Compare** "last 28 days vs previous period" for trends. For wrong pages, filter Query contains "shape" and look at the Pages tab.
- **GA4** → Explore → Free form. Dimensions: Session default channel group, Landing page, Event name, plus Game mode once registered. Metrics: Sessions, Event count. Filter Landing page exactly matches `/geography/borderline`. Save as "Borderline – organic funnel". Add a second funnel exploration with steps `page_view` (page = Borderline) → `game_start` → `game_complete` → `share`.
- **Bing Webmaster** → Search Performance → Pages → filter the URL. Bing is about half of Triviverse's search traffic and ranks the site independently.

**Review checklist (weekly for the first 6 weeks, then monthly):**
1. `npm run seo-borderline`: index state changed? Any impressions yet?
2. New queries? Any low-CTR or striking-distance rows? (Only rewrite the title on ≥4 weeks of data and several hundred impressions.)
3. Any wrong-page queries (cannibalisation with the `/geography` hub or football `/wordle`)?
4. Start rate and completion rate stable? A sudden drop means a gameplay or tracking regression.
5. Bing demand drifting? (Seasonality is unmeasured; the weekly rows in `GetKeywordStats` will show it over time.)
6. `npm run experiments`: update `EXP-007` when the data settles it.
7. Rich Results Test still clean? Sitemap still lists the URL?

## 9. Open items and dependencies

| Item | Who | Why |
|---|---|---|
| **Link to `/geography` from the football site** (homepage and game-page footers) | Needs Tom's OK: it changes the football site, which this change kept out of scope | The single biggest discovery lever. The geography hub and Borderline sit at "Discovered – not indexed" with one internal referrer. |
| GSC → URL Inspection → **Request indexing** for `/geography` and `/geography/borderline` | Tom (UI only; the API can't request indexing for normal pages) | Speeds the first crawl |
| Cloudflare **Always Use HTTPS** | Tom (dashboard) | `http://` serves 200 site-wide |
| Register the GA4 custom dimensions and the key event (§6) | Tom (GA4 Admin), or enable the Analytics Admin API and grant the service account Editor | Mode split and outcome reporting |
| Borderline name collision (§3) | Tom | Brand and legal decision |
| **Consent: site-wide, pre-existing.** GA4 loads with no consent step; the privacy policy says cookies can be blocked in the browser. Since DUAA 2025 s.112 (in force 5 Feb 2026, per law-firm commentary; check legislation.gov.uk) PECR exempts *statistical* cookies **if** users get clear information and a simple, free way to object. Whether GA4, which sends data to Google, fits that exemption is unsettled. At minimum the site needs an opt-out control and privacy text naming it; the safer route is Google Consent Mode with a CMP. **Not changed here.** This affects every page, and a new banner is a product and legal decision. | Tom | Compliance risk across the whole site |
| A manual UK Google results check for the target queries (`triviverse-serp` skill) | Next session | Only US web-search results and fetched competitor pages were seen |
