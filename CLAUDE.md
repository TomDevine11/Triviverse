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
- [docs/autonomy/LOOP.md](docs/autonomy/LOOP.md) — how an autonomous session operates.
- [docs/autonomy/BACKLOG.md](docs/autonomy/BACKLOG.md) · [REVIEW_QUEUE.md](docs/autonomy/REVIEW_QUEUE.md)
  — persistent work + review state.
- [docs/autonomy/RUNNER.md](docs/autonomy/RUNNER.md) — scheduled/unattended execution config
  (**not active until Tom approves**).

## Operating model
This repo is worked **autonomously**: each session recovers state from the repo (not from
any chat history), picks the highest-value available work per VISION.md, does it, and
continues across sessions. The **repository and the backlog are the persistent state.**
There is no human in the loop per task — so the classification rule and the quality gate
below are the safety mechanism, not optional.

The goal is not "keep the current site working." It is: **help build the most valuable
version of Triviverse that can realistically be built** — proactively identifying growth,
product, data and monetisation opportunities Tom hasn't asked for.

## The prime directive: ship vs propose
- **User-facing changes are proposed via PR and NEVER merged by Claude.** Tom reviews and
  merges (which is what triggers the production deploy).
- **Internal changes may be self-merged** — only after the quality gate passes in CI.

### What counts as user-facing (classify conservatively)
User-facing = anything that could change what a visitor sees, experiences, plays, searches
for, or receives. Non-exhaustively: UI; UX; game mechanics/behaviour; question selection or
difficulty; **generated game data whose output changes the user experience**; copy;
SEO-facing content; significant information-architecture changes; user-facing
performance/behaviour; new games; new modes.

**A data-pipeline change is user-facing if its regenerated output changes what users see,
even when the code change itself looks internal.** A dependency/infra change is user-facing
if it could alter user-visible output. **If in doubt, treat it as user-facing.**

Internal (self-mergeable after CI): tests, internal refactors, developer tooling, CI,
security hardening, performance work with no behavioural change, observability,
documentation, dependency maintenance, internal scripts, and data-pipeline improvements
that **demonstrably do not alter user-facing output** (prove it by regenerating artefacts
and diffing — a non-empty diff reclassifies the work as user-facing).

## Quality gate (mandatory before any PR or merge)
Run locally, then rely on CI to re-verify:
```
npm run lint
npm test          # vitest — includes the architecture layer guard (test/architecture.test.js)
npm run build     # vite build + prerender; catches SSR/prerender breakage
```
For any change that regenerates game data, also run the relevant `build:*` script(s) and
**diff the generated artefacts** — a non-empty diff means user-facing. Never open a PR or
merge on a red gate.

## Risk-based autonomy (not file-based)
Autonomy is governed by **risk and user impact, not filenames**. There is no blanket "never
touch X" rule — Claude may modify `render.yaml`, dependencies, CI, or any file when it is
the safe way to complete an autonomous task.

- **Autonomous (self-merge after CI):** internal work as defined above, including safe
  infrastructure, dependency, security and deployment fixes that don't change user-visible
  output.
- **Autonomous but PR-only (never merge):** everything user-facing, including new features,
  new modes and creative improvements. Proposing net-new ideas is explicitly wanted.
- **Research-and-propose only (never execute):** anything with material legal, regulatory,
  copyright, privacy or platform-ToS risk — e.g. redistributing/selling third-party-sourced
  (Transfermarkt) data. Investigate and surface the risk in a proposal; do not act. (VISION §21)
- **Never, under any circumstances:** expose, invent, commit or otherwise mishandle
  secrets/credentials; make destructive or irreversible production changes (deleting prod
  data, rewriting `main` history, force-pushing `main`, tearing down/redirecting the live
  deploy, rotating live secrets); spend money; publish outward beyond opening a PR. Surface
  these as a backlog item / proposal instead of acting.

**Initial enforcement is deliberately stricter than this classification.** `.github/CODEOWNERS`
currently owns all of `/src/`, so today *any* change to application code — even one you'd
classify as internal (an output-neutral refactor or perf tweak) — requires Tom's review and
cannot auto-merge. Autonomous self-merge therefore currently applies only to work touching **no
owned path**: tests (`/test`), docs, most build/tooling scripts, dependency bumps
(`package.json`), root config, and `.claude`. This conservative start loosens once the system
has proven safe. When in doubt, this is the binding rule.

## Git, PR & worktree protocol
- `main` is **protected production**. **No direct pushes to `main`.** Never force-push it.
- Work on a branch **off fresh `main`**, in its own **git worktree** for isolation. Naming:
  `auto/<class>/<slug>`, class ∈ {fix, feat, refactor, test, docs, chore, perf, sec, ci}.
  One concern per branch.
- Commits end with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Every change goes through a PR so CI is always the gate. End PR bodies with:
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- **Internal PR (fully autonomous — Tom never reviews it):** enable auto-merge; it merges when
  CI is green. Tom's review is **product** review, not code review — internal engineering with
  no user-visible effect must not require or request his attention. It may appear only as an
  FYI line in the digest.
- **User-facing PR (product review — Tom experiences it, never reads the diff):** the PR body
  **is a plain-English product Review Brief**
  ([template](docs/autonomy/reports/REVIEW_BRIEF_TEMPLATE.md)) — what changed, why,
  evidence/hypothesis, expected impact, risks, what was tested, recommendation, exactly what to
  look at, and **how to try it** (a preview URL if enabled, else the exact
  `git checkout … && npm run dev` command + route + action). **Make it runnable, not readable.**
  For large/strategic changes, ship a **prototype or 2–3 variants first** (VISION §14) so Tom
  steers direction before you build the finished version. Then add it to the
  **[review digest](docs/autonomy/REVIEW_QUEUE.md)**, mark the backlog item in-review, and
  **move on — never wait.** Tom's single surface is the digest; he should never have to watch GitHub.
- Do not start work that overlaps files touched by an open user-facing PR (collision avoidance).

## Choosing work & never stopping
Pull the highest-value unblocked item from [BACKLOG.md](docs/autonomy/BACKLOG.md), ranked by
the VISION §19 priority stack and expected impact (scoring in BACKLOG.md). Prefer meaningful
product/growth/revenue/data impact over easy low-value technical polish. When a task enters
review, record it and proceed to the next item — **a task awaiting Tom's review must never
halt the loop.** Continuously generate backlog items from the discovery sources in BACKLOG.md.

## Measurement
Inspect GA4 + Search Console where relevant (`npm run analytics-report`,
`npm run search-console-report`, `npm run seo-report`) and let the evidence re-prioritise the
backlog. Produce the weekly **State of Triviverse** report (VISION §20;
template in `docs/autonomy/reports/`). Tag every claim as observed fact / reasonable inference
/ uncertain. Never claim something "worked" without enough data.

**SEO is a means, not the goal — actual growth is.** Don't rank-chase or pile up technical-SEO
tweaks because they're easy to measure. When the data shows a gap (e.g. 501 at #36 while Tenable
is #10), think creatively about *why* and what could **materially** change the outcome, and
propose unconventional growth experiments — not just incremental meta edits. (User-facing/
search-facing changes still go through review.)

## Design work
All UI/UX is user-facing → PR. Follow [docs/design-system.md](docs/design-system.md) and
[docs/design-tokens.md](docs/design-tokens.md): premium, game-like, token-driven, no generic
Tailwind, consistency enforced. Use the internal design-review subagent
(`.claude/agents/triviverse-reviewer.md`) before opening UI PRs where useful.
