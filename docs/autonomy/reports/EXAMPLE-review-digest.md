# 🔔 Triviverse needs your attention  ·  EXAMPLE

> Illustrative only — shows what a populated [review digest](../REVIEW_QUEUE.md) looks like.
> This is Tom's whole job here: **play the links, then reply yes / no / change.** No code.

**2 things want your call (~10 min).** 1 is a *direction check* (two prototypes to compare),
1 is a finished tweak. Everything else this week shipped autonomously — see the FYI list.

---

## 1 · Make the 501 daily something you come *back* to  ·  🧪 direction check (2 variants)

**The ask:** play both prototypes and tell me which retention layer feels right for 501 — or
neither. I've built these light, not finished, so you steer before I invest.

**What changed:** 501 currently ends with a result and stops. Each variant adds a reason to
return tomorrow, in a different flavour:
- **Variant A — "Streak & comeback":** a daily streak counter, a "you're on a 4-day streak,
  don't break it" nudge on the result screen, and a streak line on the share card.
- **Variant B — "Daily leaderboard":** after you finish, your checkout is ranked against
  everyone who played today (a percentile + the global average darts-to-finish), with a
  "beat the average tomorrow" hook.

**Why — evidence & hypothesis:** returning users are only ~15% (GA4, last 28d), yet 501 is our
**#2 game by engagement** and our best-loved product. Hypothesis: 501 has the affection but no
*hook* to return. A visible streak (A) or a daily competitive result (B) should lift day-2
return. *[inference — not yet proven; that's what your call + a later A/B would test.]*

**Expected impact:** primary metric = 501 day-2 return rate; secondary = sessions/user. A
plausible early target is returning-user share moving from ~15% toward ~20% on 501, over ~4–6
weeks post-ship. *[uncertain — directional estimate.]*

**Risks & reversibility:** both are additive and fully reversible (feature-flagged, no data
migration). Variant B needs a tiny anonymous daily-score store (no accounts, no PII) — I've
stubbed it locally; a real one is a follow-up if you pick B. Streak nudges (A) risk feeling
naggy — judge the tone. No SEO risk (below the fold, no URL/IA change).

**What was tested:** lint/test/build green; played both on desktop + mobile viewport; checked
the streak resets correctly across a simulated day boundary and the leaderboard handles the
"first player today" empty state. Not tested: real multi-user leaderboard at scale (stubbed).

**My recommendation:** **Variant A (Streak)** for first ship — simpler, no backend, lower risk,
and streaks are a proven daily-habit mechanic. Hold B as a fast-follow once traffic is higher
(a leaderboard is more motivating with more players). But this is exactly the call I want *you*
to make by feel.

**Exactly what to look at (don't judge everything):**
1. Does the streak nudge (A) feel motivating or annoying?
2. On B, is "you beat 68% of players today" satisfying, or pressure-y?
3. Which one makes *you* want to open 501 again tomorrow?

**▶️ Try it (2 min):**
```
git fetch origin && git checkout auto/feat/501-retention-proto && npm ci && npm run dev
```
- **Variant A:** open `/501?proto=streak` — finish a game, watch the result screen + share card.
- **Variant B:** open `/501?proto=leaderboard` — finish a game, see your ranking.
- *(If preview deploys are enabled you'll instead get two click-to-play links here.)*

---

## 2 · Sharper titles on 3 under-clicking pages  ·  ✅ finished — quick yes/no

**The ask:** glance at the before/after wording and approve, or tweak.

**What changed:** rewrote the page `<title>`/meta description on `/wordle`, `/connections`,
`/higher-or-lower` — consolidated into one change so you review once, not three times.
Example: `Football Wordle` → `Football Wordle — Guess the Player in 6 | Triviverse`.

**Why — evidence:** GSC shows these three rank on page 1–2 for their terms but under-click
(CTR below the position-expected benchmark). Clearer, benefit-led titles typically lift CTR
without touching rankings.

**Expected impact:** more organic clicks from existing impressions — pure upside toward the
10k-pageview milestone. *[inference from CTR gap.]*

**Risks & reversibility:** trivial and instantly revertible. Titles are user- and SEO-facing,
so it's here for your ok. Small risk a rewrite slightly *lowers* CTR — I'd watch GSC for 2
weeks and revert any that dip.

**What was tested:** lint/test/build green (incl. the SEO length guard — all ≤ 60/165 chars);
verified the new titles render in the prerendered HTML.

**My recommendation:** ship — low risk, measurable, reversible.

**Exactly what to look at:** just read the 3 new titles/descriptions below and approve the wording.
> `/wordle` → "Football Wordle — Guess the Player in 6 | Triviverse"
> `/connections` → "Football Connections — Find the 4 Groups | Triviverse"
> `/higher-or-lower` → "Higher or Lower: Football — Who's Worth More? | Triviverse"

**▶️ Try it:** no need to run anything — reading the three lines above is the review. (Or
`git checkout auto/chore/seo-titles-batch` and view the pages.)

---

## ✅ Shipped autonomously since last digest (FYI — no action needed)
_Internal, user-invisible; merged after the green gate. Listed only so you have visibility._
- Drove eslint to zero and made lint a hard CI gate (B-010).
- Added regression tests for the name-order resolver (Son Heung-min class).
- Bumped 3 dev dependencies for a security advisory; build + tests green.
- Fixed a data-pipeline edge case in transfer parsing — **artefact diff was empty**, so no
  user-facing effect (had the diff changed a single answer, this would have been a review item, not an FYI).
