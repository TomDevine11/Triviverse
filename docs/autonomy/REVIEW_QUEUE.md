# REVIEW_QUEUE.md — PRs awaiting Tom's review

User-facing PRs Claude has opened and must **not** merge. This is how the loop tracks work
that has entered review without stopping to wait for it.

**Source of truth is `gh pr list --state open`.** This file is *reconciled from it at the
start of every session* (LOOP.md step 1) — do not hand-maintain it as authoritative; it is a
human-readable, annotated mirror that also records collision globs.

Its two jobs:
1. Show Tom exactly what is waiting for review, and why.
2. Tell the loop which files are **hands-off** (the collision globs) so no new work conflicts
   with a pending PR.

## States
- `awaiting-review` — open, CI green, needs Tom.
- `changes-requested` — Tom asked for changes ⇒ the loop addresses it **next session** (top priority).
- `ci-failing` — gate red ⇒ the loop fixes it next session.
- `approved` — Tom approved; leave it for **Tom to merge** (never merge user-facing PRs).

When a PR is merged or closed, it is removed on reconcile and its backlog item set to `done`.

## Queue
| PR | Branch | Title | Class | Opened | Collision globs (hands-off) | State |
|----|--------|-------|-------|--------|-----------------------------|-------|
| — | — | _(none yet — populated as the loop opens user-facing PRs)_ | — | — | — | — |
