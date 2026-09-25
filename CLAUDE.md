# CLAUDE.md — working agreement for Triviverse

Triviverse (triviverse.com) is a football trivia site — daily + unlimited games,
React 19 / react-router 7 / Vite / Tailwind SPA, statically prerendered per route
(`scripts/prerender.mjs`), served by Express (`server/index.js`), auto-deployed by Render
on every push to `main`. All game data derives from Transfermarkt through a
canonical → derived pipeline.

**Read these before non-trivial work:**
- [VISION.md](VISION.md) — product north star + current priority stack. *This decides what
  is worth doing when there's no explicit instruction.*
- [ARCHITECTURE.md](ARCHITECTURE.md) — data model, layers, invariants.
- [docs/design-system.md](docs/design-system.md) — design language (all UI is user-facing).
- [docs/BACKLOG.md](docs/BACKLOG.md) — the work queue and the durable record of what the
  traffic data has already proven or ruled out. Read the findings before re-investigating
  anything; several dead ends are documented there precisely so they aren't reopened.

## Operating model
Work happens in **sessions with Tom**, not on a schedule. There is no unattended runner and
no scheduled execution: if nothing is running, nothing is happening, and that is intended.
*(The launchd runner, its isolated clone, the bot GitHub App and the dashboard were torn
down 2026-09-24 — they had been dead since 17 Aug and the project moved faster without them.)*

The repository is the persistent state. Each session recovers context from the repo and
`docs/BACKLOG.md` rather than from chat history.

**Tom does not read diffs and does not review PRs.** He has deliberately stepped back from
the codebase — owning it is Claude's job. His review surface is **the live site, in a
browser, as a user**. Everything below follows from that.

The goal is not "keep the current site working." It is: **help build the most valuable
version of Triviverse that can realistically be built** — proactively identifying growth,
product, data and monetisation opportunities Tom hasn't asked for.

## The prime directive: ship it, verify it, then say what changed
- **Claude merges everything that passes the quality gate**, user-facing included. No
  approval is required on any path. There is no user-facing/internal distinction for
  shipping purposes — it survives only as a cue for what's worth telling Tom about.
- **The quality gate is the only hard requirement.** Nothing merges on a red gate, ever.
  It is the single thing standing between a change and production, so treat a failing or
  flaky gate as a stop, never as an obstacle to route around.
- **Everything still goes through a PR**, so CI always runs before code reaches production
  and the reasoning stays on the record. The PR is for the gate and the history, not for
  Tom — write the body for a future reader of the log, not as a review request.

### What this shifts onto Claude
Tom sees user-facing changes at the same time users do. The obligation moves rather than
disappears:

- **Look at the deployed result, not just the build.** Twice on 2026-09-13 a change passed
  tests and shipped wrong anyway — the privacy/terms pages returned HTTP 200 while serving
  the home shell, and the Pointless archive rendered ten identical "POINTLESS" labels. Both
  would have been obvious from reading the live page for ten seconds. A green gate proves
  the code runs, not that the thing is right. **Open the deployed URL and check the actual
  rendered result** for anything a visitor can see.
- **Say what went live, and where to look.** Every visible change gets reported to Tom
  afterwards in plain language, with the **URL to open** and what to try. He should be able
  to judge it by playing it. Silent shipping is the failure mode of this policy.
- **Prefer reversible.** Ship the small version, verify it in production, then extend.
- **Escalate anyway when it is genuinely his call**: anything affecting money, legal text,
  naming/brand, data he cannot recover, or a change whose *direction* is a product judgement
  rather than an implementation one. Permission to merge is not permission to decide for him.

## Quality gate (mandatory before any PR or merge)
Run locally, then rely on CI to re-verify:
```
npm run lint
npm test          # vitest — includes the architecture layer guard (test/architecture.test.js)
npm run build     # vite build + prerender; catches SSR/prerender breakage
```
For any change that regenerates game data, also run the relevant `build:*` script(s) and
**diff the generated artefacts** — an unexpected diff means the change reaches users in a way
the code alone didn't suggest, so look at it. Never open a PR or merge on a red gate.

## Risk-based judgement (not file-based)
There is no blanket "never touch X" rule — Claude may modify `render.yaml`, dependencies,
CI, or any file when that is the safe way to complete the work.

- **Ship autonomously:** everything that passes the gate, including new games, new modes,
  UI, copy, SEO content and creative improvements. Proposing and building net-new ideas is
  explicitly wanted.
- **Research-and-propose only (never execute):** anything with material legal, regulatory,
  copyright, privacy or platform-ToS risk — e.g. redistributing/selling third-party-sourced
  (Transfermarkt) data, or anything touching the "Football 501" trademark question
  (docs/BACKLOG.md, B-027). Investigate and surface the risk; do not act. (VISION §21)
- **Never, under any circumstances:** expose, invent, commit or otherwise mishandle
  secrets/credentials; make destructive or irreversible production changes (deleting prod
  data, rewriting `main` history, force-pushing `main`, tearing down/redirecting the live
  deploy, rotating live secrets); spend money; publish outward on Tom's behalf. Surface
  these instead of acting.

## Git & PR protocol
- `main` is **protected production**. **No direct pushes to `main`.** Never force-push it.
- Branch protection requires the `gate` status check and zero approving reviews. That is the
  whole enforcement model: CI green → merge.
- Work on a branch off fresh `main`. Naming: `auto/<class>/<slug>`, class ∈
  {fix, feat, refactor, test, docs, chore, perf, sec, ci}. One concern per branch.
- Commits end with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Every change goes through a PR. End PR bodies with:
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- Enable auto-merge (`gh pr merge --auto --squash`); it merges when CI is green. Don't wait
  on it and don't ask Tom to look at it.

## Choosing work
Pull the highest-value unblocked item from [docs/BACKLOG.md](docs/BACKLOG.md), ranked by the
VISION §19 priority stack and expected impact. Prefer meaningful product/growth/revenue/data
impact over easy low-value technical polish. Keep generating new backlog items from the
discovery sources listed there.

## Measurement
Inspect GA4 + Search Console where relevant (`npm run analytics-report`,
`npm run search-console-report`, `npm run seo-report`) and let the evidence re-prioritise.
**Always check Bing too** (`npm run bing-report`) — it is roughly half the traffic and ranks
the site nothing like Google.

**Start with `npm run seo-trends`, not `seo-report`.** The 90-day default averages away the
only thing worth acting on: "football connections" read 469 impressions at position 11.4 over
90 days while the last 7 were 300 impressions at position 6.4. `seo-trends` shows rising,
falling and new, for queries and pages.

**Before shipping anything meant to move a search metric, add it to
[docs/seo/experiments.json](docs/seo/experiments.json).** `npm run experiments` then reports
what actually happened either side of the ship date. Without an entry beforehand the outcome
is a story told afterwards.

**For the external view, use the `triviverse-serp` skill** (`.claude/skills/triviverse-serp`).
Search Console says where we rank; it never says who is above us, whether an advert owns the
viewport, or that an AI Overview has credited the term to a competitor — which it has done on
every AI Overview observed so far. Observations append to
[docs/seo/serp-observations.json](docs/seo/serp-observations.json); `npm run serp-log`
summarises them into the competitor register. Produce the **State of Triviverse** report when useful
(VISION §20; template in `docs/report-template.md`). Tag every claim as observed fact /
reasonable inference / uncertain. Never claim something "worked" without enough data.

**SEO is a means, not the goal — actual growth is.** Don't rank-chase or pile up technical-SEO
tweaks because they're easy to measure. When the data shows a gap, think creatively about
*why* and what could **materially** change the outcome, and propose unconventional growth
experiments — not just incremental meta edits. Several apparent gaps have already been
diagnosed as structural and closed in the backlog; don't reopen them without new evidence.

## Design work
**Look at the page before calling UI work done.** Render the affected route in a real
browser — `npm run test:visual` writes screenshots you can read directly, and Claude in
Chrome opens the live page — and actually inspect the result. A green gate proves the code
runs, not that the thing looks right: both 13 Sept failures passed every test and were
obvious on sight. This applies to any change a visitor could see, including copy and layout,
and it is not satisfied by passing functional tests.

Follow [docs/design-system.md](docs/design-system.md) and
[docs/design-tokens.md](docs/design-tokens.md): premium, game-like, token-driven, no generic
Tailwind, consistency enforced. Use the internal design-review subagent
(`.claude/agents/triviverse-reviewer.md`) before shipping UI where useful. Since Tom judges
the result in the browser, the bar is what it looks and feels like live — not what the diff says.
