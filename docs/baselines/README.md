# Baselines

Point-in-time snapshots of metrics that a change makes unrecoverable.

These live here rather than in `scripts/seo/reports/` because that directory is
gitignored — generated reports are disposable, these are not. A baseline is only
worth capturing *before* the thing it measures, and there is no way to go back
and take it later.

## pre-ads-2026-09-13.json

Captured immediately before advertising was considered, while `ADS_ENABLED` was
still `false`. 28-day window.

Ads trade engagement for revenue. The trade can only be judged against the state
before they existed, and Triviverse's engagement is unusually strong — 84.0% on
the homepage, 94.4% on Wordle — so it is the thing most at risk and the thing
hardest to notice slipping.

Headline numbers at capture:

| Metric | Value |
|---|---|
| Pageviews (28d) | 10,626 |
| Games completed (28d) | 1,714 |
| Returning share of sessions | 38.4% |
| Homepage engagement rate | 84.0% |
| /tenable engagement rate | 69.7% |
| /501 engagement rate | 67.1% |

After ads have run for a full 28 days, compare the same window. A drop in
engagement rate or returning share that exceeds the revenue gained is a reason to
pull them, not a cost of doing business.
