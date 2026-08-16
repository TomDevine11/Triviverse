# LOOP.md — autonomous operating protocol

How a single autonomous Triviverse session operates. Governed by [../../VISION.md](../../VISION.md)
(what's worth doing) and [../../CLAUDE.md](../../CLAUDE.md) (the rules). The **repository +
backlog are the persistent state** — a session recovers everything it needs from them, never
from chat history. Scheduling/runner concerns (session limits, concurrency, cron) live in
[RUNNER.md](RUNNER.md).

## Per-session procedure

1. **Recover state.** `git fetch origin`; ensure `main` is up to date. Regenerate the product
   digest [REVIEW_QUEUE.md](REVIEW_QUEUE.md) ("Triviverse needs your attention") from
   `gh pr list --state open` filtered to **user-facing** PRs; compute each open PR's touched
   files via `gh pr diff --name-only <pr>` for collision avoidance (not stored in the digest).
   Read VISION.md, CLAUDE.md, this file, and [BACKLOG.md](BACKLOG.md).
2. **Inspect repo health.** Working tree clean? Any red on `main`'s last CI run? Any
   dependency/security alerts? Note anything that becomes a P0.
3. **Inspect analytics when relevant.** For growth/product/measurement work, pull GA4 +
   Search Console (`npm run analytics-report`, `npm run search-console-report`,
   `npm run seo-report`). Compare recent windows (last 28d vs prior 28d) for **trend**, not
   the 90-day average. Feed findings into backlog priorities (VISION §18, §20).
4. **Unblock review first.** For any open PR that is `changes-requested` or has failing CI:
   fixing it is top priority (that progresses Tom's review — it is *not* "waiting"). For
   merged/closed PRs: remove the worktree/branch, set the backlog item `done`, drop it from
   the review queue.
5. **Select work — think, don't just tick boxes.** First ask *"what is the single highest-value
   thing I could do for Triviverse right now?"* — not *"what's the next unchecked box?"*. The
   backlog is memory, not a deterministic checklist: freely **create, reprioritise, abandon
   stale, challenge past assumptions, and propose entirely new** work when the evidence warrants.
   Sanity-check the pick against *"is this something that could actually make Triviverse more
   valuable (product/traffic/engagement/retention/data/revenue), or just easy technical polish?"*
   Then take the highest-value `todo` item (BACKLOG scoring) whose likely files do **not**
   overlap files touched by an open user-facing PR. If the backlog is thin or stale, run **discovery**
   (BACKLOG "Discovery sources"): scan tests/lint/layer-guard, GA4/GSC, perf, security, deps,
   data-quality, product/growth/retention/monetisation ideas — append items, then reselect.
   Respect the VISION §20a beachhead rule (no second-mode game-building pre-milestone).
6. **Isolate.** Create a git worktree + `auto/<class>/<slug>` branch off fresh `main`
   (see RUNNER.md for worktree mechanics). Mark the item `in-progress:<branch>`.
7. **Work deeply — prototype-first for anything big.** Do one coherent unit of work well.
   For a **large or strategically significant user-facing change, do NOT invest in a finished
   build first.** Build a lightweight MVP/prototype — or 2–3 variants when the direction is
   genuinely open — and ship *that* as a `prototype (direction check)` review item so Tom can
   play it and steer before Claude commits to the full implementation (VISION §14). Only build
   the finished version once the direction is approved. Small, obvious user-facing changes can
   go straight to a finished item.
8. **Quality gate.** `npm run lint && npm test && npm run build`; run relevant `build:*` +
   artefact diff if data is regenerated (diff ≠ ∅ ⇒ user-facing). Self-review with the
   `triviverse-reviewer` subagent where useful. Red gate ⇒ fix; if unfixable this session,
   abandon the branch and set the item back to `todo` with a blocker note. **Never PR/merge
   on a red gate.**
9. **Ship.**
   - **Internal & safe** → open PR, enable auto-merge, let CI merge. Set item `done`. This
     work is **invisible to Tom** — it never enters the review digest (it may appear in the
     digest's "shipped autonomously (FYI)" list only for awareness).
   - **User-facing** → open a PR whose body **is a product Review Brief**
     ([template](../autonomy/reports/REVIEW_BRIEF_TEMPLATE.md)): what changed, why,
     evidence/hypothesis, expected impact, risks, what was tested, recommendation, exactly what
     to look at, and **how to try it** (a preview URL if enabled, else the exact
     `git checkout … && npm run dev` command + route + action; list any variants). **Make it
     runnable, not readable** — Tom experiences it on localhost/preview, never reads the diff.
     Then add it to the [product digest](REVIEW_QUEUE.md), set the item `in-review:#<pr>`, and
     move on. Never merge it.
   - **Research-and-propose / risky** (VISION §21) → do **not** implement; write a proposal
     (backlog note or a `docs/proposals/*.md`) surfacing the opportunity and its legal/ToS risk.
10. **Record & learn.** Update BACKLOG.md and regenerate the [product digest](REVIEW_QUEUE.md)
    so all pending user-facing items are consolidated into one read for Tom (committed via an
    internal PR). Capture learnings for the weekly report. On the weekly cadence, produce the
    **State of Triviverse** report from [reports/TEMPLATE.md](reports/TEMPLATE.md). The digest
    (and, weekly, the report) is what Tom reads — he should never need to watch GitHub.
11. **Do not wait.** Return to step 5 and select the next item.
12. **Stop** only at a natural stopping point: no worthwhile autonomous work remains, a
    session limit is reached (RUNNER.md), or a genuine blocker needs Tom. Leave the repo/
    backlog in a clean, resumable state so the next session continues without being told to.

## Invariants
- One concern per branch/PR; never batch unrelated changes.
- Never touch files listed under an open REVIEW_QUEUE PR; pick the next-best item instead.
- Honour the CLAUDE.md risk tiers: user-facing ⇒ PR-only; material legal/ToS risk ⇒
  propose-only; secrets/destructive-prod ⇒ never.
- If two consecutive sessions fail the same item the same way, stop selecting it, mark it
  `todo` with a blocker note, and surface it for Tom.
- Favour impact (growth/product/retention/data/revenue) over easy low-value polish.
