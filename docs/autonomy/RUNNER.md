# RUNNER.md — unattended execution configuration

> ⚠️ **STATUS: NOT ACTIVE.** This describes *how* the scheduled/unattended loop will run.
> Nothing here runs until Tom explicitly approves activation. No cron/schedule is created and
> no auto-approve permissions are installed as part of the bootstrap. This document is the
> thing to review before that switch is flipped.

The unattended model runs [LOOP.md](LOOP.md) on a schedule without Tom starting a session or
saying "continue." Each run is a **cold start** that recovers state from the repo.

## Scheduling
- **Cadence (proposed): 3–4 spaced runs/day** (≈ every 6h), each doing one substantial item,
  then stopping. Optimised for *useful work per usage budget*, not clock frequency.
- **Back off** when the backlog holds only P3/no items or the last run found nothing worthwhile
  → lengthen toward ~24h until new signal (analytics/PR feedback/new bug) appears.
- **Lean in** when P0/P1 items exist or a PR has `changes-requested`/`ci-failing`.
- **Weekly:** one run also produces the State of Triviverse report.
- Mechanism: a scheduled autonomous trigger (cron) that invokes a fresh Claude session with
  the LOOP.md protocol. *(Configured only on approval.)*

## Session limits (per run)
- **Budget guard:** target ≤ N tool-calls / ≤ M minutes wall-clock per run (values set at
  activation). On approaching the limit: finish the current item to a clean state (or abandon
  its branch), update BACKLOG/REVIEW_QUEUE, stop. Never leave the tree half-edited on a shared
  branch.
- **One primary item per run** (plus quick review-queue unblocking). Depth over breadth.

## Concurrency (prevent conflicting sessions)
- **Single-writer lock.** A run acquires a lock before doing work (a short-lived branch/PR
  `autonomy/lock` or a lightweight lock file with a timestamp + run id). If a fresh lock is
  held, the new run exits immediately. Stale locks (> max run duration) are reclaimable.
- **Worktree isolation** (below) means even overlapping runs never share a working tree.
- **Collision globs**: never start work touching files listed in an open REVIEW_QUEUE PR.

## Worktrees
- Each item gets its **own git worktree** off fresh `main` (`git worktree add`), so multiple
  in-flight branches never collide in one working directory. The worktree is removed when its
  PR merges/closes (LOOP step 4). Abandoned-branch worktrees are pruned at session start.

## State recovery (next session continues without being told to)
Persistent state = **the repository**: `main`, open PRs (`gh pr list`), BACKLOG.md,
REVIEW_QUEUE.md, and committed report files. A cold session reconstructs everything from these
(LOOP step 1). No reliance on chat history.

## Failure handling
- **Red gate / build break:** fix within the run, or abandon the branch and set the item
  `todo` with a blocker note. Never PR/merge red.
- **Repeated failure:** same item failing the same way twice ⇒ stop selecting it, mark blocked,
  surface for Tom.
- **External flakiness** (GA4/GSC/network/CI): retry with backoff; if persistently down, skip
  analytics-dependent work that run and pick other items.
- **Uncaught crash mid-run:** the lock's staleness timeout frees it; the branch/worktree is an
  isolated, unmerged artefact the next run prunes — production is never affected.

## Permissions (proposed — installed only on activation)
Least-privilege, risk-based. The scheduled runner would be granted enough to run the gate and
manage branches/PRs, and **nothing that can reach production or secrets**:
```jsonc
// PROPOSED .claude/settings.json for the scheduled runner (NOT installed yet)
{
  "permissions": {
    "allow": [
      "Bash(git*)", "Bash(gh pr*)", "Bash(gh issue*)",
      "Bash(npm ci)", "Bash(npm run lint)", "Bash(npm test)",
      "Bash(npm run build)", "Bash(npm run build:*)",
      "Bash(npm run *-report)", "Bash(npm run seo-*)",
      "Bash(node scripts/**)"
    ],
    "deny": [
      "Bash(git push * main*)", "Bash(git push origin main*)",
      "Bash(git push --force*)", "Bash(gh pr merge*)",
      "Bash(*render*deploy*)", "Bash(rm -rf*)",
      "Read(./.env*)", "Read(**/.secrets/**)", "Read(**/service-account*.json)"
    ]
  }
}
```
Notes: user-facing PRs are never merged by the runner (no `gh pr merge` on them — internal
auto-merge is done by GitHub via branch auto-merge, not by the runner pushing to main); secrets
are unreadable; `main` cannot be pushed or force-pushed; no deploy commands. Exact allow/deny
finalised with Tom at activation.

## Production safety (what prevents accidental user-facing shipping)
1. **`main` is protected** (branch protection + no direct push in permissions).
2. **Deploy is triggered only by a merge to `main`**, and only Tom merges user-facing PRs.
3. **Conservative user-facing classification** — uncertainty ⇒ user-facing ⇒ PR-only.
4. **CI gate** (`.github/workflows/ci.yml`) must pass before any merge, incl. the architecture
   layer guard.
5. **Artefact-diff rule** reclassifies "internal" data changes that alter output as user-facing.
6. **Risk tiers** (CLAUDE.md): legal/ToS ⇒ propose-only; secrets/destructive-prod ⇒ never.
7. **Worktree + branch isolation** — autonomous work is never in the deployable tree until a
   reviewed merge.

## Activation checklist (Tom approves before go-live)
- [ ] Add the CI workflow to `.github/workflows/ci.yml` (reference copy:
      [ci.workflow.yml](ci.workflow.yml)). Requires a token/UI with GitHub **`workflow`
      scope** — the bootstrap OAuth token lacks it, so the runner's token must include it
      (or CI is committed once via the UI and left in place).
- [ ] Confirm cadence + session budget (N tool-calls / M minutes).
- [ ] Enable GitHub **branch protection on `main`** (require CI, require PR, no force-push).
- [ ] Enable repo **auto-merge** (so green internal PRs merge without a human).
- [ ] Install the finalised runner `.claude/settings.json`.
- [ ] Confirm the runner's GitHub token scope (PRs yes; no admin; cannot bypass protection).
- [ ] Create the schedule (cron) invoking the LOOP session.
- [ ] Dry-run one supervised session end-to-end, then hand over.
