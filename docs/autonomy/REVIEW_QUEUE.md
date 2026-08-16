# 🔔 Triviverse needs your attention

**This is Tom's single review surface. It is a PRODUCT review interface, not a code-review
queue.** You should never have to read a diff. Each item below is a plain-English brief plus
a way to *actually try the change* — your job is to play it and say **yes / no / change this**,
not to inspect GitHub.

- **Only user-facing changes appear here.** Internal engineering (tests, refactors, tooling,
  CI, perf, security, deps, data-pipeline work with no user-visible effect) is merged
  autonomously after the green gate and **never** appears in this digest. A short "shipped
  autonomously (FYI, no action)" list at the bottom keeps you informed without asking anything.
- **Consolidated.** All pending user-facing items live in this one digest so you review in a
  single sitting, not by watching GitHub. It is regenerated each session from open user-facing
  PRs and can also be delivered to you as a notification.
- **Big/strategic changes come as prototypes or variants first** (see `LOOP.md`) so you judge
  the product direction before Claude invests in a finished build.

Each item follows the [Review Brief template](reports/REVIEW_BRIEF_TEMPLATE.md):
_what changed · why · evidence/hypothesis · expected impact · risks · what was tested ·
Claude's recommendation · exactly what to look at · **how to try it** (localhost/preview)._

---

## Awaiting your call — 1 item

### 1. Publish `llms.txt` — how AI assistants read Triviverse
[PR #28](https://github.com/TomDevine11/Triviverse/pull/28) · `awaiting-you` · ⏱ ~3 min, open one URL

**What changed.** Two new files are published at build time — `/llms.txt` (a one-screen
summary of what Triviverse is, plus every page with its description) and `/llms-full.txt`
(the same, expanded with each game's rules, tips and FAQ). **Nothing on the site itself
changes** — no page, URL, menu or copy. You cannot tell the difference by playing.

**Why.** AI assistants are already **~25% of sessions** — a bigger channel than Direct, second
only to organic search _[observed fact, 90d]_. They find us by *fetching and summarising*
pages rather than ranking them, and right now nothing on the site tells an assistant what
Triviverse is or which games exist — it has to infer that from whichever page it lands on.
`llms.txt` is the emerging convention for exactly this.

**Expected impact — with an honest caveat.** _[uncertain]_ llms.txt is **not** confirmed to be
used by the major AI crawlers; Google have said publicly that they don't read it. There is no
solid evidence yet that it moves traffic. What justifies it is the cost/benefit shape, not
confidence: one build step, no possible downside, real payoff if the convention lands.
**I am not claiming this will grow traffic** — it's a cheap option on a channel that already
works.

**Risks.** Very low, purely additive, no ranking/URL/robots change, reverts by deleting one
line. One judgement call for you: the files describe every game in one place, which makes the
site marginally easier to copy — all of it is already public on the pages, so I judged that
immaterial, but it's your call.

**Tested.** 242 tests pass (up from 235 — 7 new, including one that fails if the files ever
stop tracking the real route list). Build green, no new lint problems.

**Claude's recommendation: ship it** — as a cheap option, not a growth lever. If you'd rather
not publish a single-file description of every game, say so and I'll keep only the short index.

**How to try it.** Vercel preview link on the PR → open **`/llms.txt`**. Or locally:
`git checkout auto/feat/llms-txt-ai-discovery && npm run build` then open `dist/llms.txt`.
**What to look at:** does the summary paragraph at the top describe Triviverse the way you
would? That is the sentence an assistant is most likely to repeat back to a user.

---

## ⛔ Blocked — needs something only you can do

### Analytics are disconnected from the autonomous runner
The runner cannot read **GA4** or **Search Console** (`npm run analytics-report` and
`npm run search-console-report` both report "not configured"; Bing Webmaster and Clarity are
also unconnected). Credentials are not present in the runner environment, and **Claude must
never handle secrets**, so this cannot be fixed autonomously.

**Why it matters.** VISION §18/§20 make measurement part of every cycle — traffic, rankings,
retention and the 10,000-pageview milestone are all supposed to re-rank the backlog each run.
Without them the loop is choosing growth work from a **stale 2026-08-16 baseline and
autosuggest data alone**, which is guesswork rather than evidence.

**What you'd need to do.** Follow `scripts/seo/SETUP.md` → Priority 1 (Google): create a
service account, enable the GA4 Data API + Search Console API, grant it read access, and drop
the JSON key at `scripts/seo/.secrets/service-account.json` (gitignored) on the machine the
runner uses. ~10 minutes, free. Bing Webmaster is a worthwhile follow-up — ChatGPT search
leans on Bing, and AI assistants are already ~25% of sessions.

---

## ✅ Shipped autonomously since last digest (FYI — no action needed)

_(internal, user-invisible work that merged after the green gate — listed only so you have
visibility. Nothing here needs your review.)_

- Autonomy dashboard: journal writer + static generator (#26)
- Runner auth helper: mint a GitHub App installation token (#24)

## ✅ You merged this since the last digest

- **Tenable: "Teneball" / "ten a ball" FAQ (#25)** — live. Watch `"teneball"` (was 333
  impressions at ~#8.4) and the main `"football tenable"` term (~#10.8) over the next few
  weeks; a lift there is the signal that misspelling coverage is worth repeating on other
  games. _Currently unverifiable from the runner — see the blocker below._

---

### For the loop (machine notes — ignore)
Regenerated each session from `gh pr list --state open` filtered to user-facing PRs.
Collision files per item are computed at runtime via `gh pr diff --name-only <pr>` — not
stored here, to keep this digest human-readable. States per item: `awaiting-you`
(ready to try) · `changes-requested` (you asked for changes → loop addresses next run) ·
`prototype` (direction check, not a finished build) · `approved` (you said yes → **you**
merge; Claude never merges user-facing work).
