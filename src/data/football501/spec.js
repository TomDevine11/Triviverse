// ─────────────────────────────────────────────────────────────────────────
// FOOTBALL 501 — QUESTION SPEC (shared by the catalog builder AND the game)
//
// A "spec" is one procedurally-generated question:
//   { stat, filter }
//   stat:   'goals' | 'apps'  OR  { a, op, b }   (op '+' | '-')
//   filter: { club?, nationality?, position? }   (1–3 facets)
//
// resolveRoster() turns a spec + the fact table into the eligible answers with
// their darts values — the single implementation both sides use, so the game's
// validation can never disagree with what the catalog was built from.
// ─────────────────────────────────────────────────────────────────────────

const num = (v) => (Number.isFinite(v) ? v : 0)

export const STAT_LABEL = {
  goals: 'Goals', apps: 'Appearances',
}
export function evalStat(rec, stat) {
  if (typeof stat === 'string') return num(rec[stat])
  const a = num(rec[stat.a]), b = num(rec[stat.b])
  return stat.op === '-' ? a - b : a + b
}
export function statLabel(stat) {
  if (typeof stat === 'string') return STAT_LABEL[stat] || stat
  const sym = stat.op === '-' ? '−' : '+'
  return `${STAT_LABEL[stat.a]} ${sym} ${STAT_LABEL[stat.b]}`
}
export function breakdownOf(rec, stat) {
  if (typeof stat === 'string') return { [stat]: num(rec[stat]) }
  return { [stat.a]: num(rec[stat.a]), [stat.b]: num(rec[stat.b]) }
}

// Resolve a spec against a competition's fact-table players →
// { players:{id:{name,value,breakdown}}, values:[] }. `spec.comp` selects the
// competition (each fact table is a single competition; a club filter can only
// name that competition's clubs, so cross-competition mixups are impossible).
// Nationality/position filter WHICH players count (a person property); club
// scopes WHICH apps/goals count. Eligibility: value ≥ 1 (≥180 is a recognised
// bust, still included).
// A filter facet may be a single value OR a set of values (an array / Set) — the
// latter powers club GROUPS (union of clubs) and CONTINENTS (union of nationalities)
// without a second code path. `oneOf` is the single membership test; club sets
// additionally AGGREGATE apps/goals across the player's clubs inside the set.
const asSet = (f) => (f == null ? null : Array.isArray(f) ? f : f instanceof Set ? [...f] : [f])
const oneOf = (val, f) => { const s = asSet(f); return s == null || s.includes(val) }

export function resolveRoster(spec, factPlayers) {
  const f = spec.filter || {}
  const compId = spec.comp || 'GB1'
  const clubSet = f.club != null ? asSet(f.club) : null
  const idSet = f.ids != null ? (f.ids instanceof Set ? f.ids : new Set(f.ids)) : null
  const players = {}
  const values = []
  for (const p of factPlayers) {
    if (idSet && !idSet.has(p.id)) continue          // membership population (trophy winners, teammates…)
    if (f.nationality != null && !oneOf(p.natKey, f.nationality)) continue
    if (f.position != null && !oneOf(p.pos, f.position)) continue
    const compRec = p.comps?.[compId]
    if (!compRec) continue
    let rec
    if (clubSet) {
      if (clubSet.length === 1) { rec = compRec.clubs?.[clubSet[0]]; if (!rec) continue }
      else { // union of clubs → aggregate apps/goals across the ones this player featured for
        let apps = 0, goals = 0, any = false
        for (const cid of clubSet) { const cl = compRec.clubs?.[cid]; if (cl) { any = true; apps += cl.apps || 0; goals += cl.goals || 0 } }
        if (!any) continue
        rec = { apps, goals }
      }
    } else rec = compRec
    const value = evalStat(rec, spec.stat)
    if (value < 1) continue
    players[p.id] = { name: p.name, value, breakdown: breakdownOf(rec, spec.stat) }
    values.push(value)
  }
  return { players, values }
}

// ── Readable auto-title ───────────────────────────────────────────────────
const POS_PLURAL = { GK: 'goalkeepers', DEF: 'defenders', MID: 'midfielders', FWD: 'forwards' }
// nationality key → demonym adjective (common footballing nations; falls back
// to the raw nationality display when unknown).
const DEMONYM = {
  england: 'English', scotland: 'Scottish', wales: 'Welsh', 'northern ireland': 'Northern Irish', ireland: 'Irish',
  france: 'French', spain: 'Spanish', germany: 'German', italy: 'Italian', portugal: 'Portuguese', netherlands: 'Dutch',
  belgium: 'Belgian', brazil: 'Brazilian', argentina: 'Argentine', uruguay: 'Uruguayan', colombia: 'Colombian', chile: 'Chilean',
  denmark: 'Danish', sweden: 'Swedish', norway: 'Norwegian', 'ivory coast': 'Ivorian', senegal: 'Senegalese', ghana: 'Ghanaian',
  nigeria: 'Nigerian', 'united states': 'American', australia: 'Australian', croatia: 'Croatian', serbia: 'Serbian',
  poland: 'Polish', 'czech republic': 'Czech', switzerland: 'Swiss', austria: 'Austrian', greece: 'Greek', turkey: 'Turkish',
  mexico: 'Mexican', japan: 'Japanese', 'south korea': 'South Korean', egypt: 'Egyptian', morocco: 'Moroccan', algeria: 'Algerian',
  cameroon: 'Cameroonian', 'south africa': 'South African', jamaica: 'Jamaican', finland: 'Finnish', iceland: 'Icelandic',
  ukraine: 'Ukrainian', russia: 'Russian', romania: 'Romanian', hungary: 'Hungarian', slovakia: 'Slovak', slovenia: 'Slovenian',
}
export function demonym(natKey, fallbackDisplay) {
  return DEMONYM[natKey] || fallbackDisplay || natKey
}

// Build "La Liga · Appearances − Goals · French midfielders" from a spec.
// ctx: { compName, clubName, natDisplay }
export function titleFor(spec, ctx = {}) {
  const f = spec.filter || {}
  const parts = []
  if (f.nationality) parts.push(demonym(f.nationality, ctx.natDisplay))
  if (f.club) parts.push(ctx.clubName || 'club')
  parts.push(f.position ? POS_PLURAL[f.position] : 'players')
  const base = `${statLabel(spec.stat)} · ${parts.join(' ')}`
  return ctx.compName ? `${ctx.compName} · ${base}` : base
}
