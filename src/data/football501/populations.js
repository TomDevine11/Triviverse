// ─────────────────────────────────────────────────────────────────────────
// BUILD-YOUR-OWN — POPULATION REGISTRY (plugin-based)
//
// The Question Builder knows NO football. It asks this registry:
//   getPopulationKinds(ctx)              which populations exist
//   getPopulationParams(kind)            what to ask to complete a population
//   getPopulationOptions(kind,param,sel) the options for a param
//   getRankingOptions(kind,sel)          how it can be ranked
//   getScopes(kind,sel)                  where it applies (competition)
//   getRefinements(kind,sel)             optional extra filters
//   resolveQuestion(sel)                 → a playable challenge + preview
//
// Every population is a PROVIDER object implementing a common interface and
// registered via register(). There is no switch(kind); the registry aggregates
// providers. Adding "Record signings" later = write a provider + register it.
// No UI changes. Providers funnel through the runtime engine's single roster
// projector (resolveRoster) and single validator (checkoutCombos).
// ─────────────────────────────────────────────────────────────────────────

import { loadFact, wrapRoster, COMPETITIONS, POSITIONS } from './game.js'
import { resolveRoster, evalStat, breakdownOf, statLabel } from './spec.js'
import { checkoutCombos, SOLO_MIN_COMBOS, maxDisjoint } from './checkout.js'
import { normalize, surnameKeys } from '../canonical/normalize.js'

// ── the registry ───────────────────────────────────────────────────────────
const REGISTRY = new Map()
export function register(provider) { REGISTRY.set(provider.id, provider) }
const provider = (kind) => REGISTRY.get(kind)

export function getPopulationKinds(ctx = {}) {
  return [...REGISTRY.values()]
    .filter(p => (p.supports ? p.supports(ctx) : true))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(p => ({ id: p.id, label: p.label, example: p.example }))
}
export const getPopulationParams  = (kind) => provider(kind)?.params || []
export const getPopulationOptions = (kind, paramId, sel) => provider(kind).options(paramId, sel)
export const getRankingOptions    = (kind, sel) => provider(kind).rankings(sel)
export const getScopes            = (kind, sel) => provider(kind).scopes(sel)
export const getRefinements       = (kind, sel) => provider(kind).refinements(sel)
export const resolveQuestion      = (sel) => provider(sel.kind).resolve(sel)

// ── shared engine plumbing (every provider funnels through this) ─────────────
export const RANKINGS = [
  { id: 'goals', stat: 'goals', label: 'Goals', word: 'goals' },
  { id: 'apps', stat: 'apps', label: 'Appearances', word: 'appearances' },
  { id: 'apps+goals', stat: { a: 'apps', op: '+', b: 'goals' }, label: 'Appearances + Goals', word: 'appearances + goals' },
  { id: 'apps-goals', stat: { a: 'apps', op: '-', b: 'goals' }, label: 'Appearances − Goals', word: 'appearances − goals' },
]
const statOf = (sel) => (RANKINGS.find(r => r.id === sel.stat) || RANKINGS[0]).stat
const compName = (id) => COMPETITIONS.find(c => c.id === id)?.name || id
const comps = () => COMPETITIONS.map(c => ({ value: c.id, label: c.name }))

// narrative tokens: em(x) = emphasised value, tx(x) = plain text; a line = tokens[]
const em = (t) => ({ t, em: true })
const tx = (t) => ({ t })

// Refinements (position + origin) are common to every attribute-style population.
function commonRefinements(sel) {
  const originOpts = [{ value: '', label: 'Anywhere' },
    ...CONTINENTS.map(c => ({ value: `cont:${c}`, label: c })),
    ...(sel._nations || []).map(n => ({ value: `nat:${n.key}`, label: n.display }))]
  return [
    { id: 'position', label: 'Position', options: [{ value: '', label: 'Any position' }, ...POSITIONS.map(p => ({ value: p.code, label: p.label }))] },
    { id: 'origin', label: 'Where they’re from', options: originOpts },
  ]
}
// Turn a refinement selection into resolveRoster filter facets + narrative lines.
function refineFacets(sel) {
  const f = {}, lines = []
  const pos = sel.refine?.position
  if (pos) { f.position = pos; lines.push([tx('Filter to '), em(POS_PLURAL[pos]), tx('.')]) }
  const origin = sel.refine?.origin
  if (origin?.startsWith('nat:')) { const k = origin.slice(4); f.nationality = k; const disp = sel._nations?.find(n => n.key === k)?.display || NAT_DISPLAY[k] || k; lines.push([tx('Only '), em(disp), tx(' players.')]) }
  else if (origin?.startsWith('cont:')) { const c = origin.slice(5); f.nationality = CONTINENT_KEYS[c] || []; lines.push([tx('Only '), em(c), tx(' players.')]) }
  return { f, lines }
}

// Finalize: given a competition + a resolved roster (or a filter to resolve),
// produce the playable challenge + everything the preview needs. ONE place that
// touches wrapRoster + checkoutCombos, so validation can never diverge.
async function finalize({ comp, filter, roster, values, stat, title, popLine }) {
  const fact = await loadFact(comp)
  if (!roster) { const r = resolveRoster({ comp, filter, stat }, fact.players); roster = r.players; values = r.values }
  const challenge = wrapRoster({ comp, title, statLabel: statLabel(stat), roster, values, fact })
  const solvable = checkoutCombos(values) >= SOLO_MIN_COMBOS
  const rk = RANKINGS.find(r => sameStat(r.stat, stat)) || RANKINGS[0]
  const narrative = [popLine, [tx('Rank them by '), em(`${compName(comp)} ${rk.word}`), tx('.')]]
  return { challenge, title, statLabel: statLabel(stat), answers: values.length, empty: values.length === 0,
    solvable, maxPlayers: maxDisjoint(values), board: challenge.answersList().slice(0, 10), narrative }
}
const sameStat = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Attach the competition's nation list to sel so refinements can offer real
// nationalities (used by the builder before calling getRefinements).
export async function withScopeMeta(sel) {
  const fact = await loadFact(sel.scope?.comp || 'GB1')
  return { ...sel, _nations: fact.__d.nations }
}

// ══════════════════════════ PROVIDERS ══════════════════════════
const attributeRankings = () => RANKINGS.map(r => ({ id: r.id, label: r.label }))

// 1 · Played for a club ------------------------------------------------------
register({
  id: 'club', order: 10, label: 'Played for a club', example: 'Most goals for Liverpool',
  params: [{ id: 'club', label: 'Which club?' }],
  async options(_p, sel) { const fact = await loadFact(sel.scope?.comp || 'GB1'); return fact.__d.clubs.map(c => ({ value: c.id, label: c.name })) },
  rankings: attributeRankings, scopes: comps, refinements: commonRefinements,
  async resolve(sel) {
    const comp = sel.scope?.comp || 'GB1', clubId = sel.params?.club
    const fact = await loadFact(comp)
    const { f, lines } = refineFacets(sel)
    const clubName = fact.clubs[clubId]?.name?.replace(/ FC$/, '') || 'that club'
    const r = await finalize({ comp, filter: { club: clubId, ...f }, stat: statOf(sel),
      title: `${compName(comp)} · ${statLabel(statOf(sel))} · ${clubName}`,
      popLine: [tx('Show me players who played for '), em(clubName), tx('.')] })
    r.narrative.push(...lines); return r
  },
})

// 2 · Played for a famous group ---------------------------------------------
const GROUPS = { // matched to the chosen competition's clubs by name
  GB1: [
    { id: 'big-six', label: 'the Big Six', clubs: ['arsenal', 'chelsea', 'liverpool', 'manchester city', 'manchester united', 'tottenham'] },
    { id: 'manchester', label: 'a Manchester club', clubs: ['manchester city', 'manchester united'] },
    { id: 'london', label: 'a London club', clubs: ['arsenal', 'chelsea', 'tottenham', 'west ham', 'crystal palace', 'fulham'] },
  ],
}
register({
  id: 'group', order: 20, label: 'Played for a famous group', example: 'Most appearances for the Big Six',
  supports: () => true,
  params: [{ id: 'group', label: 'Which group?' }],
  options(_p, sel) { return (GROUPS[sel.scope?.comp || 'GB1'] || []).map(g => ({ value: g.id, label: g.label })) },
  rankings: attributeRankings, scopes: comps, refinements: commonRefinements,
  async resolve(sel) {
    const comp = sel.scope?.comp || 'GB1'
    const group = (GROUPS[comp] || []).find(g => g.id === sel.params?.group) || (GROUPS[comp] || [])[0]
    const fact = await loadFact(comp)
    const wants = new Set(group.clubs)
    const ids = Object.entries(fact.clubs).filter(([, c]) => [...wants].some(w => normalize(c.name).includes(w))).map(([id]) => id)
    const { f, lines } = refineFacets(sel)
    const r = await finalize({ comp, filter: { club: ids, ...f }, stat: statOf(sel),
      title: `${compName(comp)} · ${statLabel(statOf(sel))} · ${group.label}`,
      popLine: [tx('Show me players who played for '), em(group.label), tx('.')] })
    r.narrative.push(...lines); return r
  },
})

// 3 · Played with a player (teammates) --------------------------------------
let _teammates
const loadTeammates = async () => (_teammates ??= (await import('../teammates.generated.json')).default)
const ANCHORS = ['Steven Gerrard', 'Frank Lampard', 'Wayne Rooney', 'Thierry Henry', 'Dennis Bergkamp', 'Paul Scholes',
  'Ryan Giggs', 'John Terry', 'Didier Drogba', 'David Silva', 'Sergio Agüero', 'Vincent Kompany', 'Mohamed Salah',
  'Virgil van Dijk', 'Harry Kane', 'Cristiano Ronaldo', 'Lionel Messi', 'Xavi', 'Andrés Iniesta', 'Sergio Ramos',
  'Karim Benzema', 'Luka Modrić', 'Francesco Totti', 'Paolo Maldini', 'Andrea Pirlo', 'Gianluigi Buffon',
  'Zlatan Ibrahimović', 'Robert Lewandowski', 'Thomas Müller', 'Kevin De Bruyne', 'Neymar', 'Luis Suárez']
function nameIndex(players) {
  const full = new Map(), sur = new Map()
  const add = (m, k, id) => { if (!k) return; (m.get(k) || m.set(k, new Set()).get(k)).add(id) }
  for (const p of players) { add(full, normalize(p.name), p.id); for (const k of surnameKeys(p.name)) add(sur, k, p.id) }
  return (name) => { const q = normalize(name); return full.get(q) || sur.get(surnameKeys(name)[0]) || null }
}
register({
  id: 'teammates', order: 30, label: 'Played with a player', example: 'Most games played with Steven Gerrard',
  params: [{ id: 'anchor', label: 'Alongside which player?' }],
  options() { return ANCHORS.map(a => ({ value: a, label: a })) },
  rankings: attributeRankings, scopes: comps, refinements: commonRefinements,
  async resolve(sel) {
    const comp = sel.scope?.comp || 'GB1', anchor = sel.params?.anchor || ANCHORS[0]
    const [tm, fact] = await Promise.all([loadTeammates(), loadFact(comp)])
    const entry = tm.players.find(p => normalize(p.name) === normalize(anchor))
    const idx = nameIndex(fact.players)
    const ids = new Set()
    for (const mate of entry?.teammates || []) { const hit = idx(mate.name); if (hit) for (const id of hit) ids.add(id) }
    const { f, lines } = refineFacets(sel)
    const r = await finalize({ comp, filter: { ids, ...f }, stat: statOf(sel),
      title: `${compName(comp)} · ${statLabel(statOf(sel))} · teammates of ${anchor}`,
      popLine: [tx('Show me players who played alongside '), em(anchor), tx('.')] })
    r.narrative.push(...lines); return r
  },
})

// 4 · Won a trophy -----------------------------------------------------------
let _honours
const loadHonours = async () => (_honours ??= (await import('./honours.generated.json')).default)
// Curated, friendly-labelled whitelist mapped to real Transfermarkt "Erfolge" keys —
// ordered popular→niche. (The raw trophy table also holds non-trophies like
// "Transfermarkt Videos" / "All titles", which we deliberately never surface.)
const TROPHIES = [
  { key: 'UEFA Champions League winner', label: 'Champions League' },
  { key: 'Europa League winner', label: 'Europa League' },
  { key: 'FIFA Club World Cup winner', label: 'Club World Cup' },
  { key: 'Uefa Supercup winner', label: 'UEFA Super Cup' },
  { key: 'English Champion', label: 'English league title' },
  { key: 'Spanish champion', label: 'Spanish league title' },
  { key: 'Italian champion', label: 'Italian league title' },
  { key: 'German Champion', label: 'German league title' },
  { key: 'French champion', label: 'French league title' },
  { key: 'English FA Cup winner', label: 'FA Cup' },
  { key: 'English League Cup winner', label: 'League Cup' },
  { key: 'Spanish cup winner', label: 'Copa del Rey' },
  { key: 'Italian cup winner', label: 'Coppa Italia' },
  { key: 'German cup winner', label: 'DFB-Pokal' },
]
register({
  id: 'trophy', order: 40, label: 'Won a trophy', example: 'Most goals among Champions League winners',
  params: [{ id: 'trophy', label: 'Which trophy?' }],
  async options() {
    const h = await loadHonours()
    return TROPHIES.filter(t => (h.trophies[t.key] || []).length >= 20).map(t => ({ value: t.key, label: t.label }))
  },
  rankings: attributeRankings, scopes: comps, refinements: commonRefinements,
  async resolve(sel) {
    const comp = sel.scope?.comp || 'GB1', key = sel.params?.trophy || TROPHIES[0].key
    const label = TROPHIES.find(t => t.key === key)?.label || key
    const h = await loadHonours()
    const ids = new Set(h.trophies[key] || [])
    const { f, lines } = refineFacets(sel)
    const r = await finalize({ comp, filter: { ids, ...f }, stat: statOf(sel),
      title: `${compName(comp)} · ${statLabel(statOf(sel))} · ${label} winners`,
      popLine: [tx('Show me players who won the '), em(label), tx('.')] })
    r.narrative.push(...lines); return r
  },
})

// 5 · A golden era -----------------------------------------------------------
let _perfLoaders
const perfLoaders = () => (_perfLoaders ??= import.meta.glob('./performance.*.generated.json'))
const loadPerf = async (comp) => { const l = perfLoaders()[`./performance.${comp}.generated.json`]; return l ? (await l()).default.performance : [] }
const DECADES = [{ id: '1990s', from: 1990 }, { id: '2000s', from: 2000 }, { id: '2010s', from: 2010 }, { id: '2020s', from: 2020 }]
register({
  id: 'era', order: 50, label: 'A golden era', example: 'Top scorers of the Premier League in the 2000s',
  params: [{ id: 'decade', label: 'Which decade?' }],
  options() { return DECADES.map(d => ({ value: d.id, label: d.id })) },
  rankings: attributeRankings, scopes: comps, refinements: commonRefinements,
  async resolve(sel) {
    const comp = sel.scope?.comp || 'GB1'
    const dec = DECADES.find(d => d.id === sel.params?.decade) || DECADES[2]
    const [rows, fact] = await Promise.all([loadPerf(comp), loadFact(comp)])
    const meta = new Map(fact.players.map(p => [p.id, p]))
    const sums = new Map() // playerId → { apps, goals } over the decade
    for (const [pid, , season, apps, goals] of rows) {
      const y = +season; if (y < dec.from || y > dec.from + 9) continue
      const s = sums.get(String(pid)) || { apps: 0, goals: 0 }; s.apps += apps || 0; s.goals += goals || 0; sums.set(String(pid), s)
    }
    const stat = statOf(sel), { f, lines } = refineFacets(sel)
    const posOk = (p) => !f.position || p.pos === f.position
    const natOk = (p) => !f.nationality || (Array.isArray(f.nationality) ? f.nationality.includes(p.natKey) : p.natKey === f.nationality)
    const roster = {}, values = []
    for (const [pid, rec] of sums) {
      const p = meta.get(pid); if (!p || !posOk(p) || !natOk(p)) continue
      const value = evalStat(rec, stat); if (value < 1) continue
      roster[pid] = { name: p.name, value, breakdown: breakdownOf(rec, stat) }; values.push(value)
    }
    const r = await finalize({ comp, roster, values, stat,
      title: `${compName(comp)} · ${statLabel(stat)} · ${dec.id}`,
      popLine: [tx('Show me players from the '), em(dec.id), tx('.')] })
    r.narrative.push(...lines); return r
  },
})

// 6 · Anyone -----------------------------------------------------------------
register({
  id: 'anyone', order: 60, label: 'Anyone at all', example: 'Most Premier League appearances ever',
  params: [],
  options() { return [] },
  rankings: attributeRankings, scopes: comps, refinements: commonRefinements,
  async resolve(sel) {
    const comp = sel.scope?.comp || 'GB1'
    const { f, lines } = refineFacets(sel)
    const r = await finalize({ comp, filter: { ...f }, stat: statOf(sel),
      title: `${compName(comp)} · ${statLabel(statOf(sel))}`,
      popLine: [tx('Show me '), em('every player'), tx('.')] })
    r.narrative.push(...lines); return r
  },
})

// ── static reference data (small; not shipped from canonical dumps) ─────────
const POS_PLURAL = { GK: 'goalkeepers', DEF: 'defenders', MID: 'midfielders', FWD: 'forwards' }
export const CONTINENTS = ['Africa', 'South America', 'Europe', 'Asia', 'North America']
const NAT2CONT = {
  england: 'Europe', scotland: 'Europe', wales: 'Europe', ireland: 'Europe', 'northern ireland': 'Europe',
  france: 'Europe', spain: 'Europe', portugal: 'Europe', italy: 'Europe', germany: 'Europe', netherlands: 'Europe',
  belgium: 'Europe', croatia: 'Europe', serbia: 'Europe', switzerland: 'Europe', austria: 'Europe', poland: 'Europe',
  denmark: 'Europe', sweden: 'Europe', norway: 'Europe', finland: 'Europe', iceland: 'Europe', 'czech republic': 'Europe',
  greece: 'Europe', turkey: 'Europe', ukraine: 'Europe', russia: 'Europe', romania: 'Europe', hungary: 'Europe',
  slovakia: 'Europe', slovenia: 'Europe',
  brazil: 'South America', argentina: 'South America', uruguay: 'South America', colombia: 'South America',
  chile: 'South America', peru: 'South America', ecuador: 'South America', paraguay: 'South America', venezuela: 'South America',
  egypt: 'Africa', morocco: 'Africa', algeria: 'Africa', tunisia: 'Africa', senegal: 'Africa', 'ivory coast': 'Africa',
  ghana: 'Africa', nigeria: 'Africa', cameroon: 'Africa', 'south africa': 'Africa', mali: 'Africa', togo: 'Africa',
  gabon: 'Africa', 'dr congo': 'Africa', 'burkina faso': 'Africa', guinea: 'Africa', zambia: 'Africa',
  japan: 'Asia', 'south korea': 'Asia', 'korea south': 'Asia', australia: 'Asia', iran: 'Asia', 'saudi arabia': 'Asia',
  qatar: 'Asia', 'united states': 'North America', mexico: 'North America', canada: 'North America',
  'costa rica': 'North America', jamaica: 'North America', honduras: 'North America',
}
const CONTINENT_KEYS = {}
for (const [nat, cont] of Object.entries(NAT2CONT)) (CONTINENT_KEYS[cont] ||= []).push(nat)
const NAT_DISPLAY = {} // filled lazily from fact nations via refineFacets fallbacks; demonym-ish
for (const nat of Object.keys(NAT2CONT)) NAT_DISPLAY[nat] = nat.replace(/\b\w/g, c => c.toUpperCase())
