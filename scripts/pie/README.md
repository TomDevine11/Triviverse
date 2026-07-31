# PIE — Puzzle Intelligence Engine (vertical slice)

> **Experimental developer tool.** Proves the RFC-002 compiler for Football 501.
> It is completely separate from the live game — it reads canonical data and writes
> only under `scripts/pie/out/` (git-ignored). The daily system is untouched.

Purpose: answer one question — *can the architecture consistently generate 501
questions as good as or better than the hand-curated list?* — and give a tool to
**calibrate the scoring until it agrees with human judgement.**

## Run it

```bash
node scripts/pie/compile.mjs --club Chelsea
open scripts/pie/out/pie-explorer-chelsea.html   # inspect hundreds of candidates
```

The explorer has **live weight sliders** (drag → the whole list re-ranks instantly),
a filter (all / passing gates / my curated questions), and every candidate expands
to show its **metric profile, leaderboard, and explanation** (why it passed, why it
failed, dominant strengths/weaknesses). Candidates matching a hand-authored question
from `501_updated_questions.txt` are badged **CURATED** so you can see where your
picks rank against the machine.

## The pieces (one file each)

| File | Component |
|---|---|
| `config.mjs` | **The one tunable file** — recognisability threshold, hard gates, metric weights + normalisation. Change this (or the sliders). |
| `population.mjs` | Population compiler — the **Attribute** seed (Club · Competition · Nationality · Position, AND-composed) + shared player metadata. |
| `seeds.mjs` | New population **seeds** (set-constructors, not filters): **Era** (per-season performance → generational recall) and **Trajectory · record signings** (transfers → fee-valued). |
| `projection.mjs` | 501 leaderboard projection — Goals / Appearances / Apps+Goals / Apps−Goals / **Transfer fee (€m)**. |
| `metrics.mjs` | Independent metric passes — raw profile only, no scoring. |
| `rank.mjs` | Gates + a deliberately-simple weighted score + explanation. The explorer inlines the same maths. |
| `compile.mjs` | Driver — enumerate every legal candidate, evaluate, mark curated, emit the explorer. |
| `explorer.template.html` | The self-contained dev UI (data + logic inlined at compile time). |

## Metrics (objective only — subjective ones are deliberately excluded for now)

pool size · recognisable-player count · dominance (top value share) · top-3 share ·
value variance · value spread · checkout feasibility · checkout routes (richness) ·
checkout-with-known-players · completeness · canonical coverage.

## Round-1 findings (what the tool immediately surfaced)

These are calibration signals, not bugs — the tool exists to expose them:

1. **Stat-charisma is missing.** With the current objective-only metrics, the top
   candidates are *Appearances / Apps−Goals · defenders* (smooth spread, many
   checkout routes) — but a human ranks *goalscorers* higher. Goals > apps in
   charisma, and that signal isn't objective, so it isn't scored yet. This is the
   red-team's finding, now visible per-candidate.
2. **Champions League club pools are large** (Chelsea CL ≈ 190 players over 20+
   seasons — faithful to canonical data, 135 with ≥5 apps). The pool-size / dominance
   bands need calibrating, or a minimum-appearances threshold added to the population
   compiler, so a question isn't "name 57 Chelsea CL defenders".
3. **Gates work well** — tiny/unfinishable pools are correctly rejected with reasons.
4. **The checkout metric is a proxy** (subset-sum into [501, 511]); it can later be
   aligned to the game's exact `checkout.js` rules if we want fidelity.

## The Calibration Workbench

The editorial training environment — collects evidence about *where the engine and
your judgement disagree*, so future scoring changes are data-driven, not intuition.
It is a local editorial tool, **not telemetry** (no player data, no game hook) and
never touches the live game.

```bash
node scripts/pie/pool.mjs             # build a diverse cross-dimensional candidate pool
node scripts/pie/workbench-server.mjs # then open http://localhost:4501
```

- **Compare** (P1) — two candidates side by side, *machine scores hidden*. Click
  `← Left wins` / `Skip` / `Right wins →` (or arrow keys). Pairs are sampled to
  often differ on exactly one axis (stat, position, europe…) so each choice is
  informative. Every decision is POSTed and **appended** to
  `scripts/pie/preferences.jsonl` — the durable preference dataset (A, B, winner,
  timestamp, compiler version, and **both full metric profiles**). The compiler
  never writes this file; the server only appends (git-ignored by default — commit
  it when you want to preserve the dataset).
- **Analysis** (P3 + P6) — preference-by-dimension win-rates ("Goals beat
  Appearances 78%, n=23"), the biggest disagreements (you chose the option the
  engine scored *lower*), and mispredictions with the metrics that drove the wrong
  call.
- **Correlation** (P4) — Pearson *r* of each metric's raw difference against your
  chosen winner: which metrics predict your taste, which predict nothing, and how
  well the current weights predict overall.
- **Weight simulator** (P5) — a simple coordinate hill-climb (no ML) that finds
  weights best predicting your decisions. **Recommendation only** — it prints a
  `config.mjs` block to paste if you agree; nothing is applied automatically.

Everything is computed transparently in the browser from the pool + your
preference file, so you can always see *why* the engine believed one question was
better. **Transparency over accuracy at this stage** — the point is to learn, not
to win the prediction game yet.

## Deliberately NOT built (per scope)

scheduler · telemetry · registry · other games' projections · free-form composition ·
machine learning. This slice proves the compiler and builds its calibration
environment only.
