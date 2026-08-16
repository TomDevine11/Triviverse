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

## Awaiting your call — 0 items

_(none yet — populated as the loop opens user-facing PRs. See
`reports/EXAMPLE-review-digest.md` for what a populated digest looks like.)_

---

## ✅ Shipped autonomously since last digest (FYI — no action needed)

_(internal, user-invisible work that merged after the green gate — listed only so you have
visibility. Nothing here needs your review.)_

---

### For the loop (machine notes — ignore)
Regenerated each session from `gh pr list --state open` filtered to user-facing PRs.
Collision files per item are computed at runtime via `gh pr diff --name-only <pr>` — not
stored here, to keep this digest human-readable. States per item: `awaiting-you`
(ready to try) · `changes-requested` (you asked for changes → loop addresses next run) ·
`prototype` (direction check, not a finished build) · `approved` (you said yes → **you**
merge; Claude never merges user-facing work).
