# Launch & Growth Checklist — Football Trivia Games

Practical steps to get the site found, indexed, and gaining traffic. Read the
"expectations" section first so the numbers don't worry you.

---

## 0. Expectations (read this first)

- **A brand-new domain takes weeks-to-months to gain search traffic.** Zero
  clicks/impressions in the first days/weeks is **normal**, not a bug.
- **Indexed ≠ ranking.** Pages can be in Google's index and still get 0
  impressions because they rank on page 5–10 (where nobody looks) until the
  site earns trust.
- **Technical SEO is done** (unique titles, structured data, prerendered pages,
  sitemap). That makes you *eligible* to rank. What makes you *actually* rank is
  **authority = links + real visitors + time.** That's the work below.

---

## 1. Keep the site awake (CRITICAL — this was blocking Google entirely)

Render's free tier sleeps after ~15 min idle. **While the service is suspended,
Render serves a default `User-agent: * / Disallow: /` robots.txt that blocks the
entire site from Google.** When the app is awake it serves our real Allow-all
robots.txt. So if the site sleeps, Googlebot sees "Disallow" and won't crawl —
this is almost certainly the main reason for the early zero impressions.

Verified: warm → robots.txt is `Allow: /` (ours); asleep → `Disallow: /`
(Render's). The only fix is to never let it sleep.

- ✅ **GitHub Action** (`.github/workflows/keepalive.yml`) pings every ~5 min.
  Trigger it once now: repo → Actions → "Keep alive" → "Run workflow".
- ⬜ **REQUIRED: external monitor** — GitHub's scheduler lags and isn't enough on
  its own. Add one (free, 2-min signup):
  - **UptimeRobot** (https://uptimerobot.com) → Add Monitor → HTTP(s) →
    `https://footballtriviagames.onrender.com` → interval **5 minutes**, or
  - **cron-job.org** (https://cron-job.org) → same URL, every 5 minutes.
  - Note: monitor the **onrender URL** (it always wakes the service). Once
    `https://triviverse.com` is live you can switch the monitor to it.
- 💡 **Bulletproof option:** Render's paid tier (~$7/mo) never sleeps, so robots
  is always correct. Worth it once the site has traffic.

After it has been continuously awake for ~24h, Google re-fetches robots.txt
(it caches it up to a day), sees Allow, and the block clears. Then re-submit the
sitemap and re-request indexing.

---

## 2. Google Search Console

1. **Submit the sitemap:** GSC → Sitemaps → enter `sitemap.xml` → Submit.
   (If it still says "couldn't fetch" immediately after, wait a day with the
   keep-alive running, then hit Refresh.)
2. **Don't spam "Request indexing".** It's a ~10/day manual recrawl tool and does
   NOT control how many pages get indexed — the sitemap is the real channel. Use
   it once on the homepage at most. For "Crawled – currently not indexed," asking
   again does nothing; only backlinks + time + a trusted domain move it.
3. **Check coverage** over the following weeks: GSC → Pages. You want each game
   URL listed as indexed.

---

## 3. Get traffic & links (the real growth lever)

Google ranks sites that people visit and link to. For a new site this is the
single biggest unlock — more than any code change. Aim for a steady trickle.

- **Reddit** — post the daily puzzles where football fans are: r/soccer (read
  their self-promo rules — usually post in daily threads), r/FantasyPL,
  r/footballmanagergames, country/club subs. Share a *specific* puzzle, not just
  "check out my site".
- **Discord / WhatsApp** — football group chats love daily guessing games;
  Wordle/Connections/Career Path are very shareable.
- **X/Twitter & Threads** — post the day's Connections or "Guess the World Cup"
  with the link; tag football-quiz accounts.
- **Football forums** — BigSoccer, RedCafe, r/soccer-adjacent communities.
- **Friends first** — even 20–50 real visitors + a couple of shares is a strong
  early signal to Google that the site is real and used.

Tip: a **share button** that copies a result grid (like Wordle's) dramatically
increases organic spread — worth adding next.

---

## 4. Custom domain — triviverse.com (DONE in code)

The site now uses **https://triviverse.com** (`SITE_URL` in `src/seo/seoConfig.js`).
An `onrender.com` subdomain is a shared domain you don't fully own — less trust,
and harder to build authority — so we moved off it early, before building links.

**After triviverse.com is confirmed live on Render (200 + valid SSL):**
- Set env var `REDIRECT_TO_CANONICAL=1` in the Render dashboard so the old
  onrender URL and `www` 301-redirect to `triviverse.com` (consolidates SEO).
  (Leave it OFF until the domain is live, or the old URL would redirect to a
  not-yet-working domain.)
- Add `triviverse.com` as a new GSC property, verify it, and submit `sitemap.xml`.
- The IndexNow workflow auto-pings the new URLs on the next deploy.

**Steps (you):**
1. Buy the domain (e.g. Namecheap/Cloudflare/Porkbun).
2. Render dashboard → your service → Settings → Custom Domains → add it; follow
   Render's DNS instructions (a CNAME/ANAME at your registrar).
3. In Google Search Console, **add the new domain as a property and verify it**
   (a new domain = a new verification token — see step 4 below).

**Steps (code — it's centralised):**
1. `src/seo/seoConfig.js` → change `SITE_URL` to the new `https://...` (no
   trailing slash). This cascades to **every** canonical tag, Open Graph/Twitter
   URL, the sitemap, robots.txt and the OG images.
2. `.github/workflows/keepalive.yml` → change `SITE:` to the new domain.
3. Regenerate OG images: `node scripts/og-images.mjs` (the footer URL updates).
4. `index.html` → replace the `google-site-verification` meta with the token GSC
   gives you for the new domain property.
5. Commit, push (Render rebuilds), then in GSC submit the sitemap on the new
   property and request indexing for the new URLs.

That's the whole switch — one real line (`SITE_URL`) drives the SEO; the rest is
verification/hosting plumbing.

---

## 5. Monetisation (later — not now)

Ads pay ~$1–$5 per 1,000 pageviews for this niche, so they're only worth it once
you have steady traffic (a few thousand pageviews/month), and adding them early
hurts page speed (an SEO factor) and gets AdSense applications rejected for "site
not ready." So hold off — but the wiring is already in place.

**Ad slots are reserved and render NOTHING** until switched on
(`src/ads/adsConfig.js` → `ADS_ENABLED = false`). Placements: a footer slot on
every game page and one on the home page. Zero performance/SEO impact while off.

**Before ads can legally run: a consent platform.**

71% of sessions are UK/EEA (2,338 of 3,271 over 90 days). Google requires a
**certified Consent Management Platform** to serve ads to those users — without
one, AdSense restricts serving to them, so you would be monetising only the ~29%
that isn't the core audience, and serving anyway would breach both Google policy
and GDPR. Google's own **Privacy & Messaging** is certified and free; it is
configured in the AdSense console and loaded by `src/ads/adsInit.js`, which
deliberately injects the consent script *before* the ad script.

The privacy policy must also disclose third-party advertising cookies and how
consent is obtained (`public/privacy/index.html`) — this is an AdSense approval
requirement as well as a legal one.

Capture a **pre-ads baseline** first (`docs/baselines/`). Ads trade engagement for
revenue and that trade cannot be judged after the fact — the state before they
existed is unrecoverable once the switch flips.

**To turn ads on when ready:**
1. Get a Google AdSense account → note your publisher id (`ca-pub-…`).
2. Add the AdSense script to `index.html` `<head>`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
   ```
3. In AdSense, create ad units → copy their slot ids.
4. In `src/ads/adsConfig.js`: set `ADSENSE_CLIENT`, fill in `AD_SLOTS`, and set
   `ADS_ENABLED = true`. Commit + push.

That's it — the `<AdSlot>` components light up automatically. Better-paying
networks (Ezoic, then Mediavine/AdThrive) become options as traffic grows.

## 6. Realistic timeline

| When | What to expect |
|------|----------------|
| Week 1 | Indexed but ~0 impressions. Normal. Keep-alive + sharing. |
| Weeks 2–6 | First trickle of impressions on long-tail terms; a few clicks. |
| Months 2–4 | Meaningful impressions if you've earned some links/shares. |
| Ongoing | Rankings climb with backlinks, fresh daily content, and a custom domain. |

SEO for a new site is a slow burn, not a switch. The daily games are a real
advantage here — they give people a reason to come back, which is exactly the
engagement signal Google rewards over time.
