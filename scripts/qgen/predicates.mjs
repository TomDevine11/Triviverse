// qgen/predicates — the "what is POSSIBLE" layer.
//
// A predicate is a small plain object describing a football relationship. It
// resolves to a COMPLETE set of player ids (the validation truth) via set algebra
// over the registry. Composition (and/or/not/minus) lets a handful of primitives
// express a very large space of questions. Recognisability is NEVER used here —
// membership is complete; the projection to a "notable" subset happens separately
// and only feeds generation/display, never grading.
import { COMP_NAME, LEAGUE_COMPS } from './registry.mjs'

// ── Curated, nameable trophies ─────────────────────────────────────────────
// The honours data has 815 raw "trophies", most of which are Transfermarkt UI
// artefacts ("All titles", "Transfermarkt Videos"), stat rows ("Top goal
// scorer"), youth/second-tier titles, or minor-nation honours nobody could name.
// GENERATION is restricted to this editorial allow-list (label = natural wording);
// VALIDATION still uses the complete honours membership for whichever trophy is
// chosen. This is the trophy analogue of the notable/broad split.
export const TROPHIES = [
  ['UEFA Champions League winner', 'won the Champions League'],
  ['Europa League winner', 'won the Europa League'],
  ['World Cup winner', 'won the World Cup'],
  ['European champion', 'won the European Championship'],
  ['Copa América winner', 'won the Copa América'],
  ['FIFA Club World Cup winner', 'won the Club World Cup'],
  ['English Champion', 'won the English top-flight title'],
  ['English FA Cup winner', 'won the FA Cup'],
  ['English League Cup winner', 'won the League Cup'],
  ['Spanish champion', 'won La Liga'],
  ['Spanish cup winner', 'won the Copa del Rey'],
  ['Italian champion', 'won Serie A'],
  ['Italian cup winner', 'won the Coppa Italia'],
  ['German Champion', 'won the Bundesliga'],
  ['German cup winner', 'won the DFB-Pokal'],
  ['French champion', 'won Ligue 1'],
  ['French cup winner', 'won the Coupe de France'],
]
export const TROPHY_LABEL = new Map(TROPHIES)

// ── Predicate resolution ───────────────────────────────────────────────────
// Returns a Set of player ids. Cached per registry by a stable signature so the
// heavy families (thousands of candidates reusing the same clubs) stay fast.
export function makeResolver(R) {
  const cache = new Map()
  const universe = new Set(R.players.keys())

  function sig(p) {
    switch (p.kind) {
      case 'and': case 'or': return p.kind + '(' + p.of.map(sig).join(',') + ')'
      case 'not': return 'not(' + sig(p.of) + ')'
      case 'minus': return 'minus(' + sig(p.a) + ',' + sig(p.b) + ')'
      default: return JSON.stringify(p)
    }
  }

  function compute(p) {
    switch (p.kind) {
      case 'club': return R.clubMembers.get(p.cid) || new Set()
      case 'league': return filter(pl => pl.leagues.has(p.comp))
      case 'nationality': return R.natIndex.get(p.nat) || new Set()
      case 'trophy': return R.trophyIndex.get(p.name) || new Set()
      case 'position': return filter(pl => pl.pos === p.pos)
      case 'caps': return filter(pl => pl.caps.has(p.tid))
      case 'capsMin': return filter(pl => (pl.caps.get(p.tid)?.caps || 0) >= p.n)
      case 'statMin': return filter(pl => statOf(pl, p.comp, p.stat) >= p.n)
      case 'era': return filter(pl => pl.last >= p.from && pl.last <= p.to)
      case 'and': return intersect(p.of.map(resolve))
      case 'or': return union(p.of.map(resolve))
      case 'not': return diff(universe, resolve(p.of))
      case 'minus': return diff(resolve(p.a), resolve(p.b))
      default: throw new Error('unknown predicate kind: ' + p.kind)
    }
  }
  function filter(fn) { const s = new Set(); for (const pl of R.players.values()) if (fn(pl)) s.add(pl.id); return s }
  function resolve(p) {
    const k = sig(p)
    let v = cache.get(k); if (v) return v
    v = compute(p); cache.set(k, v); return v
  }
  return resolve
}

function intersect(sets) {
  if (!sets.length) return new Set()
  sets.sort((a, b) => a.size - b.size)
  const out = new Set(); const [small, ...rest] = sets
  outer: for (const id of small) { for (const s of rest) if (!s.has(id)) continue outer; out.add(id) }
  return out
}
function union(sets) { const out = new Set(); for (const s of sets) for (const id of s) out.add(id); return out }
function diff(a, b) { const out = new Set(); for (const id of a) if (!b.has(id)) out.add(id); return out }

// Career or per-competition stat for a player (for thresholds + scoring scope).
export function statOf(pl, comp, stat) {
  if (comp === 'career') {
    let v = 0; for (const c of Object.values(pl.comps)) v += (c[stat] || 0); return v
  }
  return pl.comps[comp]?.[stat] || 0
}

// The "relevant" apps/goals for a candidate's SCORING SCOPE — i.e. how nameable
// is this player *for this question*, not globally. A club question scores by that
// club's record; a league question by that league; everything else by career total
// across the six competitions. Mirrors the original Pointless design.
export function relevantStat(pl, scope) {
  if (scope?.type === 'club') { const c = pl.clubApps.get(scope.cid); return c ? { apps: c.apps, goals: c.goals } : null }
  if (scope?.type === 'comp') { const c = pl.comps[scope.comp]; return c && c.apps >= 1 ? { apps: c.apps, goals: c.goals } : null }
  if (scope?.type === 'comps') {
    let apps = 0, goals = 0, any = false
    for (const comp of scope.comps) { const c = pl.comps[comp]; if (c) { apps += c.apps; goals += c.goals; if (c.apps >= 1) any = true } }
    return any ? { apps, goals } : null
  }
  // career
  let apps = 0, goals = 0
  for (const c of Object.values(pl.comps)) { apps += c.apps; goals += c.goals }
  return apps >= 1 ? { apps, goals } : null
}

export { COMP_NAME, LEAGUE_COMPS }
