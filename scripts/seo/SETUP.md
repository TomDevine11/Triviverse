# SEO Intelligence Layer — Setup

Every source is **optional**. With nothing configured you already get the site
model + live Google Autosuggest demand (`npm run seo-report`). Connect the
sources below to unlock traffic, query and volume data. Do them in priority
order — Google first, it's 80% of the value.

```
cp .env.seo.example .env.seo.local     # then fill in as you go (gitignored)
```

Commands once configured:

| Command | What it does |
|---|---|
| `npm run seo-report` | Orchestrator — runs everything available, writes a snapshot |
| `npm run search-console-report` | Queries, pages, striking-distance, low-CTR, cannibalisation |
| `npm run analytics-report` | Landing pages, engagement, channels, devices, retention |
| `npm run seo-suggest -- "phrase"` | Deep autosuggest demand for a phrase (or all games) |

Snapshots land in `scripts/seo/reports/*-latest.json` — future chat sessions
read those for fresh data instead of re-querying.

---

## Priority 1 — Google (GA4 Data API + Search Console)

**One service account authenticates both.** ~10 minutes, all free.

### A. Create the service account + key
1. Go to <https://console.cloud.google.com> → create (or pick) a project.
2. **APIs & Services → Library** → enable both:
   - **Google Analytics Data API**
   - **Google Search Console API**
3. **APIs & Services → Credentials → Create credentials → Service account**.
   Name it e.g. `seo-intel`. Create. (No roles needed on the project.)
4. Open the service account → **Keys → Add key → Create new key → JSON**.
   A `.json` file downloads. **Copy the `client_email` inside it** — you'll grant
   that address read access below.
5. Save the file to: `scripts/seo/.secrets/service-account.json`
   *(that exact path is what the layer looks for by default; it's gitignored.)*

### B. Grant it read access (this is the step people forget)
- **GA4:** analytics.google.com → **Admin → Property → Property access management
  → + → add the `client_email` as `Viewer`**.
- **Search Console:** search.google.com/search-console → **Settings → Users and
  permissions → Add user → paste `client_email`, permission `Full` (or
  `Restricted`)**.

### C. Tell the layer which property/site
In `.env.seo.local`:
```
GA4_PROPERTY_ID=480123456           # GA4 Admin → Property Settings → "Property ID" (numeric, NOT G-XXXX)
GSC_SITE_URL=sc-domain:triviverse.com   # domain property; OR https://triviverse.com/ for a URL-prefix property
```
> **Which GSC value?** In Search Console, if your property shows as a bare
> domain, use `sc-domain:triviverse.com`. If it shows a full URL, use exactly
> that URL including the trailing slash.

Test: `npm run search-console-report` and `npm run analytics-report`.

---

## Priority 2

### Bing Webmaster Tools
1. <https://www.bing.com/webmasters> → verify `triviverse.com` (you can **import
   from Search Console** in one click).
2. **Settings → API access → API Key** → generate.
3. `.env.seo.local`: `BING_API_KEY=...`

### Microsoft Clarity
1. <https://clarity.microsoft.com> → add the site, install the tag (or skip if
   you'd rather not add another script — Clarity is behavioural, not required).
2. **Settings → Data Export → Generate new API token**.
3. `.env.seo.local`: `CLARITY_API_TOKEN=...`

---

## Priority 3 — Keyword search volume

Autosuggest already tells you *what* people search; a volume API tells you *how
much*. Options, ranked for this project:

- **DataForSEO (recommended).** Pay-as-you-go, ~$0.05/call, real Google Ads
  volume + CPC + competition, no monthly fee. Sign up at
  <https://dataforseo.com>, then `.env.seo.local`:
  ```
  DATAFORSEO_LOGIN=you@example.com
  DATAFORSEO_PASSWORD=...
  ```
- *Alternatives:* Keywords Everywhere (credits, browser-first), or Google Ads
  Keyword Planner API (free but needs an active Ads account + OAuth — heavier).

Once set, volume is attached automatically in `seo-report` and `seo-suggest`.

---

## Notes
- `.env.seo.local`, `scripts/seo/.secrets/`, and `scripts/seo/reports/` are all
  gitignored — no secret or private traffic data is ever committed.
- The Google libraries are **devDependencies** — they are tooling only and never
  enter the app bundle shipped to users.
