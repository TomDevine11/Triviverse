# BACKLOG.md — autonomous work queue

The prioritised queue the [loop](LOOP.md) pulls from, and its durable memory across cold
starts. Claude maintains this file: continuously **generating** worthwhile work (not only
what Tom provides) and ranking it by the [VISION.md](../../VISION.md) §19 priority stack and
expected impact. Committed so state survives sessions.

## Columns
- **ID** — `B-###`, monotonic, never reused.
- **Title** — imperative, specific.
- **Class** — `internal` | `user-facing` (classify conservatively; see CLAUDE.md).
- **Value** — one line: the user/engineering/growth benefit, tied to a VISION priority.
- **Source** — how it was found: `bug` · `test-gap` · `arch-invariant` · `layer-exception`
  · `gsc` · `ga4` · `perf` · `sec` · `dep` · `data-quality` · `product` · `growth`
  · `retention` · `monetisation` · `idea` (Claude-originated).
- **Effort** — `S` | `M` | `L`.
- **Priority** — `P0` broken/blocker · `P1` high value · `P2` normal · `P3` nice-to-have.
- **Status** — `todo` · `in-progress:<branch>` · `in-review:#<pr>` · `done` · `dropped`.

## Scoring — pick next = highest
1. **Priority tier** first (P0 → P3).
2. Then **priority-stack rank** of the item's VISION §19 category (growth > data-integrity >
   UX > retention > monetisation > expansion > internal), adjusted by evidence from the
   latest GA4/GSC read.
3. Then **value ÷ effort**.
4. Then age.
Skip any item whose likely files overlap an open PR in [REVIEW_QUEUE.md](REVIEW_QUEUE.md).
Do not spend large capacity on low-value technical polish while meaningful
growth/product/revenue items remain.

## Discovery sources (refresh when the queue is thin)
Observed bugs · test gaps · architecture invariants · layer-guard exceptions
(`src/data/layers.js`) · Search Console (rankings, striking-distance, cannibalisation) · GA4
(traffic, engagement, retention, channels) · performance · security · dependencies · data
quality/coverage · product observations · growth opportunities · retention opportunities ·
monetisation opportunities · Claude-originated ideas. Respect the VISION §20a beachhead rule.

## Lifecycle
Append discovered items as `todo` (dedupe first). `in-progress:<branch>` on start;
`in-review:#<pr>` when a user-facing PR opens (also add to the review queue); `done` on
internal-merge or when Tom merges a user-facing PR; `dropped` (with a one-line reason) if
obsolete. Never delete rows — this is an audit trail.

## Seed items (evidence-based, from the 2026-08-16 baseline — hypotheses to validate)
> These are candidate starting points, not commitments. The loop re-ranks them against fresh
> data. User-facing items ship only via PR for Tom's review.

| ID | Title | Class | Value | Source | Effort | Priority | Status |
|----|-------|-------|-------|--------|--------|----------|--------|
| B-001 | Align CI + existing workflows to Node 22.12 (match Render) | internal | consistent runtime/CI | idea | S | P2 | todo |
| B-002 | Investigate pushing "football tenable" from ~#10 into top-5 (title/schema/content/links) | user-facing | biggest current organic lever | gsc | M | P1 | todo |
| B-003 | Diagnose why 501 under-ranks its engagement; propose ranking plan | user-facing | high-demand page, near-zero visibility | gsc | M | P1 | todo |
| B-004 | Resolve "triviverse" brand-SERP cannibalisation across 7 pages | user-facing | brand clarity (VISION §6) | gsc | M | P2 | todo |
| B-005 | Investigate lifting AI-assistant discoverability (already ~25% of sessions) | user-facing | grow a proven channel | ga4 | M | P1 | todo |
| B-006 | Retention audit: which games drive return visits; propose stickiness bets | user-facing | returning users ~15% | ga4 | M | P2 | todo |
| B-007 | Add nickname/mononym alias layer (close the last name-matching gap) | user-facing | data integrity (VISION §8) | data-quality | M | P2 | todo |
| B-008 | Assess multi-mode architecture readiness (routing/data-model/brand generality) | internal | cheap future modes (VISION §20a) | arch-invariant | L | P3 | todo |
| B-009 | Fix 2 failing seo.test.js cases: `/tenable` desc 166→≤165 chars; add VideoGame+BreadcrumbList JSON-LD to `/wordle/answers` | user-facing | green test baseline; the gate must pass to mean anything | test-gap | S | P0 | todo |
| B-010 | Drive eslint to zero (~24 pre-existing errors, mostly react-hooks/set-state-in-effect), then remove `continue-on-error` in ci.yml to make lint a hard gate | internal | real server-side lint gate | test-gap | M | P1 | todo |
