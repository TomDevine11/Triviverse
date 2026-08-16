# Review Brief — <short product title>

> The product-framed brief for one user-facing change. It **is** the PR body, and it is
> summarised into the [review digest](../REVIEW_QUEUE.md). Written for a product owner, not a
> code reviewer — no diffs, no file lists. Tom's job: try it and say yes / no / change.

**The ask (one line):** <e.g. "Try the new 501 result screen and tell me if it feels better.">
**Type:** `prototype (direction check)` | `finished change` · **Size:** S/M/L · **Branch:** `auto/...` · **PR:** #—

## What changed
Plain English, what a player would notice. 2–4 sentences.

## Why — evidence & hypothesis
The signal that prompted this (GA4/GSC/feedback/idea) and the hypothesis, e.g.
"Returning users are ~15%; 501 has the strongest engagement — hypothesis: a visible
streak + shareable result raises day-2 return."

## Expected impact
Which VISION metric this should move and roughly how much / by when.
(traffic · engagement · returning users · monetisation)

## Risks & reversibility
What could go wrong, who it affects, and how easily it's undone. Note any SEO/ranking risk.

## What was tested
Gate status (lint/test/build), what Claude verified in the browser, edge cases checked,
and what remains uncertain.

## Claude's recommendation
A clear steer: ship / ship variant B / iterate / drop — and why. If variants, say which and why.

## Exactly what to look at
The 2–3 specific things to judge (not everything). e.g. "1) the reveal animation timing;
2) whether the streak counter is motivating or naggy; 3) mobile layout."

## ▶️ How to try it
- **Preview URL:** <link, if per-branch previews are enabled> — click and play.
- **Or locally:**
  ```
  git fetch origin && git checkout <branch> && npm ci && npm run dev
  ```
  then open <route> and do <specific action>.
- **Variants (if any):** A = <route/flag>, B = <route/flag> — compare and pick.
