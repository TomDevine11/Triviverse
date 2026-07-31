// ─────────────────────────────────────────────────────────────────────────
// PROJECTION — Football 501 leaderboard.
//
// Turns a population into the game's playable form: each player valued by a stat
// (the "darts value"), sorted descending, positive values only. This is 501's
// projection; other games would project the same population differently.
// ─────────────────────────────────────────────────────────────────────────

export const STATS = {
  goals:            { label: 'Goals',                 f: (p) => p.goals },
  apps:             { label: 'Appearances',           f: (p) => p.apps },
  apps_plus_goals:  { label: 'Appearances + Goals',   f: (p) => p.apps + p.goals },
  apps_minus_goals: { label: 'Appearances − Goals',   f: (p) => p.apps - p.goals },
  fee:              { label: 'Transfer fee (€m)',      f: (p) => p.fee },   // Trajectory · record signings
}

export function project(players, statKey) {
  const f = STATS[statKey].f
  return players
    .map((p) => ({ id: p.id, name: p.name, fame: p.fame, pos: p.pos, nat: p.nat, value: Math.round(f(p)) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
}
