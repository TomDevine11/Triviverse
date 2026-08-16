# Autonomy dashboard

The **live operational view** of the autonomous system — one page that answers, in ~30s:
what is Claude doing, why, what has it done, what needs me, what's next, is anything broken.
(The weekly [State of Triviverse](reports/TEMPLATE.md) is the higher-level strategic view;
this is the live ops view.)

## How it works
- The loop calls **`scripts/autonomy/journal.mjs`** at each stage to record state (session
  start, task selected + *why* + evidence + confidence, stage changes, PR opened, outcomes).
  Journal writes go to a **local** state dir (`$STATE_DIR`, default `~/.triviverse/state/`) so
  per-run journaling never spams the repo.
- **`scripts/autonomy/build-dashboard.mjs`** reads that journal + `BACKLOG.md` + live GitHub PRs
  and writes one **self-contained** HTML file (`$DASHBOARD_OUT`, default `~/.triviverse/dashboard.html`).
  No external calls — safe to open as a local file or publish privately.
- The loop regenerates it at the end of every run, so it's always current as of the last run.

## Sections & states
System · Current work (with *why chosen* + evidence + confidence) · Needs your attention
(bot PRs awaiting you, with the minimum ask + PR/preview links) · Backlog · Autonomously
completed (plain-English outcomes, chronological) · Agent activity (timeline) · Decision
history (concise product-level reasoning — not chain-of-thought).

States: 🟢 shipped · 🟡 working · 🔵 waiting for you · 🔴 blocked/error · ⚪ queued.

## Safety
Read-only. It reflects state; it cannot ship anything. Production stays enforced by GitHub
branch protection + the review guard, never by the dashboard. Controls (pause/resume/run-now)
are a later phase via a `control.json` the loop polls — and even then, production safety
remains GitHub-enforced.
