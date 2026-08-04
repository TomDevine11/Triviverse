// ─────────────────────────────────────────────────────────────────────────
// BUILD-YOUR-OWN — FACET COMPOSER
//
// A question = one STAT + any stack of LAYERS. The builder knows no football; it
// asks this module what stats and layers exist, their options, and calls
// resolveQuestion(sel). Layers (competition · club/group · played-with · nationality
// · era · position · trophy) all filter the SAME per-season performance rows, so
// they combine freely ("appearances for Man City players in the 2010s"). Two stats
// are contextual: Transfer fee needs a club; Games together needs a player.
//
// Shared engine primitives (checkoutCombos validation, wrapRoster challenge,
// evalStat projection) are reused, never duplicated.
// ─────────────────────────────────────────────────────────────────────────

import { COMPETITIONS, wrapRoster } from './game.js'
import { evalStat, breakdownOf, demonym } from './spec.js'
import { checkoutCombos, SOLO_MIN_COMBOS, maxDisjoint } from './checkout.js'
import { normalize } from '../canonical/normalize.js'

// ── stats ────────────────────────────────────────────────────────────────
const STATS = [
  { id: 'goals', label: 'Goals', word: 'goals', kind: 'attr', stat: 'goals' },
  { id: 'apps', label: 'Appearances', word: 'appearances', kind: 'attr', stat: 'apps' },
  { id: 'apps+goals', label: 'Appearances + Goals', word: 'appearances + goals', kind: 'attr', stat: { a: 'apps', op: '+', b: 'goals' } },
  { id: 'apps-goals', label: 'Appearances − Goals', word: 'appearances − goals', kind: 'attr', stat: { a: 'apps', op: '-', b: 'goals' } },
  { id: 'fee', label: 'Transfer fee', word: 'transfer fee', kind: 'fee', needs: 'club' },
  { id: 'together', label: 'Games together', word: 'games', kind: 'together', needs: 'player' },
]
const statDef = (id) => STATS.find(s => s.id === id) || STATS[0]
export const getStats = () => STATS.map(s => ({ id: s.id, label: s.label, needs: s.needs }))

// ── layers ───────────────────────────────────────────────────────────────
export const getLayers = () => [
  { id: 'competition', label: 'Competition', type: 'chips' },
  { id: 'club', label: 'Club', type: 'search', searchPlaceholder: 'Search all clubs…' },
  { id: 'player', label: 'Played with', type: 'search', searchPlaceholder: 'Search for a player…' },
  { id: 'nationality', label: 'Nationality', type: 'search', searchPlaceholder: 'Search countries…' },
  { id: 'era', label: 'Era', type: 'chips' },
  { id: 'position', label: 'Position', type: 'chips' },
  { id: 'trophy', label: 'Trophy', type: 'chips' },
]

const compName = (id) => COMPETITIONS.find(c => c.id === id)?.name || id
const comps = () => [{ value: 'ALL', label: 'All competitions' }, ...COMPETITIONS.map(c => ({ value: c.id, label: c.name }))]
const POS = [{ value: 'GK', label: 'Goalkeepers' }, { value: 'DEF', label: 'Defenders' }, { value: 'MID', label: 'Midfielders' }, { value: 'FWD', label: 'Forwards' }]
const POS_PLURAL = { GK: 'goalkeepers', DEF: 'defenders', MID: 'midfielders', FWD: 'forwards' }
const ERA = { '1990s': 1990, '2000s': 2000, '2010s': 2010, '2020s': 2020 }
const GROUPS = [
  { id: 'big-six', label: 'the Big Six', clubs: ['arsenal', 'chelsea', 'liverpool', 'manchester city', 'manchester united', 'tottenham'] },
  { id: 'manchester', label: 'a Manchester club', clubs: ['manchester city', 'manchester united'] },
  { id: 'london', label: 'a London club', clubs: ['arsenal', 'chelsea', 'tottenham', 'west ham', 'crystal palace', 'fulham'] },
]
const TROPHIES = [
  { key: 'UEFA Champions League winner', label: 'Champions League' }, { key: 'Europa League winner', label: 'Europa League' },
  { key: 'FIFA Club World Cup winner', label: 'Club World Cup' }, { key: 'English Champion', label: 'English league title' },
  { key: 'Spanish champion', label: 'Spanish league title' }, { key: 'Italian champion', label: 'Italian league title' },
  { key: 'German Champion', label: 'German league title' }, { key: 'French champion', label: 'French league title' },
  { key: 'English FA Cup winner', label: 'FA Cup' }, { key: 'Spanish cup winner', label: 'Copa del Rey' },
  { key: 'Italian cup winner', label: 'Coppa Italia' },
]

// ── lazy data ──────────────────────────────────────────────────────────────
let _perfLoaders, _perfAll, _pindex, _meta, _nations, _clubs, _honours, _signings
const perfLoaders = () => (_perfLoaders ??= import.meta.glob('./performance.*.generated.json'))
const loadPerf = async (comp) => { const l = perfLoaders()[`./performance.${comp}.generated.json`]; return l ? (await l()).default.performance : [] }
const loadPerfAll = async () => (_perfAll ??= (await Promise.all(COMPETITIONS.map(async (c) => (await loadPerf(c.id)).map((r) => [r[0], r[1], r[2], r[3], r[4], c.id])))).flat())
const perfRows = (comp) => comp === 'ALL' ? loadPerfAll() : loadPerf(comp)
const loadPlayerIndex = async () => (_pindex ??= (await import('./players.index.generated.json')).default.players) // [[id,name,pos,nat],…]
const metaMap = async () => (_meta ??= new Map((await loadPlayerIndex()).map(([id, name, pos, nat]) => [id, { name, pos, natKey: nat }])))
const loadClubsIndex = async () => (_clubs ??= (await import('./clubs.index.generated.json')).default.clubs)
const loadHonours = async () => (_honours ??= (await import('./honours.generated.json')).default)
const loadSignings = async () => (_signings ??= (await import('./signings.generated.json')).default)
let _reco
const loadReco = async () => (_reco ??= (await import('../recognisability.generated.json')).default.byId)
// Difficulty = how many ways you can finish 501 using ONLY recognisable players
// (fame ≥ 40). Lots of routes → a fan can win it easily; none → only obscure finishers.
const DIFF = (recoCk) => recoCk >= 120 ? { level: 1, label: 'Easy' } : recoCk >= 30 ? { level: 2, label: 'Moderate' }
  : recoCk >= 6 ? { level: 3, label: 'Tricky' } : recoCk >= 1 ? { level: 4, label: 'Hard' } : { level: 5, label: 'Very hard' }
async function nationsList() {
  if (_nations) return _nations
  const count = {}, disp = {}
  for (const [, , , nat] of await loadPlayerIndex()) if (nat) { count[nat] = (count[nat] || 0) + 1; disp[nat] ||= demonym(nat, nat).replace(/^\w/, c => c.toUpperCase()) }
  return (_nations = Object.keys(count).filter(k => count[k] >= 15).sort((a, b) => count[b] - count[a]).map(k => ({ value: `nat:${k}`, label: capNat(k) })))
}
const capNat = (k) => k.replace(/\b\w/g, c => c.toUpperCase())

// ── layer options (what the UI renders) ────────────────────────────────────
export async function getLayerOptions(layerId, sel) {
  if (layerId === 'competition') return comps()
  if (layerId === 'position') return POS
  if (layerId === 'era') return Object.keys(ERA).map(e => ({ value: e, label: e }))
  if (layerId === 'trophy') { const h = await loadHonours(); return TROPHIES.filter(t => (h.trophies[t.key] || []).length >= 20).map(t => ({ value: t.key, label: t.label })) }
  if (layerId === 'club') {
    const clubs = await loadClubsIndex()
    const comp = sel?.layers?.competition
    const groups = GROUPS.map(g => ({ value: `group:${g.id}`, label: g.label, popular: true }))
    const single = Object.entries(clubs)
      .filter(([, c]) => !comp || comp === 'ALL' || c.comps.includes(comp)) // scope the list to the chosen competition
      .sort((a, b) => b[1].comps.length - a[1].comps.length || a[1].name.localeCompare(b[1].name))
      .map(([id, c]) => ({ value: id, label: c.name.replace(/ FC$/, '') }))
    return [...groups, ...single]
  }
  if (layerId === 'player') {
    const idx = await loadPlayerIndex()
    const pop = new Set(POPULAR.map(normalize))
    const popular = idx.filter(([, name]) => pop.has(normalize(name))).map(([id, name]) => ({ value: id, label: name, popular: true }))
    const rest = idx.filter(([, name]) => !pop.has(normalize(name))).sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => ({ value: id, label: name }))
    return [...popular, ...rest]
  }
  if (layerId === 'nationality') {
    return [...CONTINENTS.map(c => ({ value: `cont:${c}`, label: c, popular: true })), ...(await nationsList())]
  }
  return []
}
const POPULAR = ['Steven Gerrard', 'Frank Lampard', 'Thierry Henry', 'Paul Scholes', 'Ryan Giggs', 'John Terry', 'Didier Drogba',
  'Sergio Agüero', 'Kevin De Bruyne', 'Mohamed Salah', 'Harry Kane', 'Cristiano Ronaldo', 'Lionel Messi', 'Xavi', 'Andrés Iniesta',
  'Sergio Ramos', 'Karim Benzema', 'Francesco Totti', 'Paolo Maldini', 'Zlatan Ibrahimović', 'Wayne Rooney', 'Luis Suárez']

// ── filters derived from layers ────────────────────────────────────────────
async function clubIdsFor(v) {
  if (!v) return null
  const clubs = await loadClubsIndex()
  if (String(v).startsWith('group:')) {
    const g = GROUPS.find(x => x.id === v.slice(6)); if (!g) return null
    return new Set(Object.entries(clubs).filter(([, c]) => g.clubs.some(w => normalize(c.name).includes(w))).map(([id]) => id))
  }
  return new Set([String(v)])
}
function natFilter(v) {
  if (!v) return null
  if (v.startsWith('nat:')) { const k = v.slice(4); return (nk) => nk === k }
  if (v.startsWith('cont:')) { const set = new Set(CONTINENT_KEYS[v.slice(5)] || []); return (nk) => set.has(nk) }
  return null
}
const eraOk = (era) => era ? (season) => { const y = +season; return y >= ERA[era] && y <= ERA[era] + 9 } : null

// ── resolve ────────────────────────────────────────────────────────────────
async function build(sel) {
  const s = statDef(sel.stat)
  if (s.kind === 'fee') return resolveFee(sel, s)
  if (s.kind === 'together') return resolveTogether(sel, s)
  return resolveAttr(sel, s)
}
// One question, two shapes: 501 (roster → checkout) and Tenable (roster → top 10).
// Both funnel through build(), so the layer engine stays the single source of truth.
export async function resolveQuestion(sel) { return finalize(await build(sel)) }
export async function resolveTenable(sel) { return finalizeTenable(await build(sel)) }

async function resolveAttr(sel, s) {
  const L = sel.layers, comp = L.competition || 'ALL'
  const [rows, meta] = await Promise.all([perfRows(comp), metaMap()])
  const clubIds = await clubIdsFor(L.club)
  const inEra = eraOk(L.era)
  const sums = new Map()
  for (const [pid, team, season, apps, goals] of rows) {
    if (clubIds && !clubIds.has(team)) continue
    if (inEra && !inEra(season)) continue
    const m = sums.get(pid) || { apps: 0, goals: 0 }; m.apps += apps || 0; m.goals += goals || 0; sums.set(pid, m)
  }
  const trophy = L.trophy ? new Set((await loadHonours()).trophies[L.trophy] || []) : null
  const mates = L.player ? await coMembers(sel) : null
  const nat = natFilter(L.nationality), pos = L.position
  const roster = {}, values = []
  for (const [pid, sm] of sums) {
    const m = meta.get(pid); if (!m) continue
    if (pos && m.pos !== pos) continue
    if (nat && !nat(m.natKey)) continue
    if (trophy && !trophy.has(pid)) continue
    if (mates && !mates.has(pid)) continue
    const value = evalStat(sm, s.stat); if (value < 1) continue
    roster[pid] = { name: m.name, pos: m.pos, value, breakdown: breakdownOf(sm, s.stat) }; values.push(value)
  }
  return { comp, roster, values, statLabel: s.label, statId: sel.stat, question: compose(sel, s, await labels(sel)) }
}

async function coMembers(sel) {
  const comp = sel.layers.competition || 'ALL', anchorId = String(sel.layers.player)
  const rows = await perfRows(comp)
  const slot = comp === 'ALL' ? (r) => `${r[5]}:${r[1]}|${r[2]}` : (r) => `${r[1]}|${r[2]}`
  const anchorSlots = new Set()
  for (const r of rows) if (String(r[0]) === anchorId) anchorSlots.add(slot(r))
  const ids = new Set()
  for (const r of rows) { const s = String(r[0]); if (s !== anchorId && anchorSlots.has(slot(r))) ids.add(s) }
  return ids
}

async function resolveTogether(sel, s) {
  const L = sel.layers, comp = L.competition || 'ALL', anchorId = String(L.player || '')
  const [rows, meta] = await Promise.all([perfRows(comp), metaMap()])
  const clubIds = await clubIdsFor(L.club), inEra = eraOk(L.era)
  const slot = comp === 'ALL' ? (r) => `${r[5]}:${r[1]}|${r[2]}` : (r) => `${r[1]}|${r[2]}`
  const pass = (r) => (!clubIds || clubIds.has(r[1])) && (!inEra || inEra(r[2]))
  const anchorSlots = new Map()
  for (const r of rows) if (String(r[0]) === anchorId && pass(r)) anchorSlots.set(slot(r), r[3] || 0)
  const together = new Map()
  for (const r of rows) { const id = String(r[0]); if (id === anchorId || !pass(r)) continue; const aa = anchorSlots.get(slot(r)); if (aa == null) continue; together.set(id, (together.get(id) || 0) + Math.min(r[3] || 0, aa)) }
  const trophy = L.trophy ? new Set((await loadHonours()).trophies[L.trophy] || []) : null
  const nat = natFilter(L.nationality), pos = L.position
  const roster = {}, values = []
  for (const [id, co] of together) {
    const m = meta.get(id); if (!m || co < 1) continue
    if (pos && m.pos !== pos) continue
    if (nat && !nat(m.natKey)) continue
    if (trophy && !trophy.has(id)) continue
    roster[id] = { name: m.name, pos: m.pos, value: co, breakdown: { apps: co } }; values.push(co)
  }
  return { comp, roster, values, statLabel: 'Games together', statId: 'together', question: compose(sel, s, await labels(sel)) }
}

async function resolveFee(sel, s) {
  const L = sel.layers
  const [sg, meta] = await Promise.all([loadSignings(), metaMap()])
  // A single club OR a group (Big Six…) → union signings across the member clubs,
  // keeping each player's highest fee (a player can be signed by two clubs in a group).
  const clubIds = await clubIdsFor(L.club)
  const feeById = new Map()
  if (clubIds) for (const cid of clubIds) for (const [pid, feeM] of (sg.byClub[cid] || [])) if ((feeById.get(pid) || 0) < feeM) feeById.set(pid, feeM)
  const trophy = L.trophy ? new Set((await loadHonours()).trophies[L.trophy] || []) : null
  const nat = natFilter(L.nationality), pos = L.position
  const roster = {}, values = []
  for (const [pid, feeM] of feeById) {
    const m = meta.get(pid); if (!m) continue
    if (pos && m.pos !== pos) continue
    if (nat && !nat(m.natKey)) continue
    if (trophy && !trophy.has(pid)) continue
    roster[pid] = { name: m.name, pos: m.pos, value: feeM, breakdown: { fee: feeM } }; values.push(feeM)
  }
  return { comp: 'ALL', roster, values, statLabel: 'Transfer fee (€m)', statId: 'fee', question: compose(sel, s, await labels(sel)) }
}

// ── finalize (shared: wrapRoster + checkout) ───────────────────────────────
async function finalize({ comp, roster, values, statLabel, question }) {
  question = question.charAt(0).toUpperCase() + question.slice(1)
  const fact = { players: Object.entries(roster).map(([id, r]) => ({ id, name: r.name, pos: r.pos })) }
  const challenge = wrapRoster({ comp, title: question, statLabel, roster, values, fact })
  const reco = await loadReco()
  const recogValues = []
  for (const [id, r] of Object.entries(roster)) if ((reco[id] || 0) >= 40 && r.value >= 1 && r.value <= 180) recogValues.push(r.value)
  return {
    challenge, question, statLabel,
    answers: values.length, empty: values.length === 0,
    solvable: checkoutCombos(values) >= SOLO_MIN_COMBOS,
    maxPlayers: maxDisjoint(values),
    difficulty: DIFF(checkoutCombos(recogValues, 500)),
    board: challenge.answersList().slice(0, 10), // kept for tests; not shown in the builder preview
  }
}

// ── Tenable finalizer: the top 10, each with a stat detail; difficulty = how many
//    of the top 10 a fan would recognise. Needs > 10 answers for a real "cut". ─────
const TEN_UNIT = { goals: (v) => `${v} goals`, apps: (v) => `${v} apps`, fee: (v) => `€${v}m`, together: (v) => `${v} games` }
const DIFF_TENABLE = (recogInTop) => recogInTop >= 8 ? { level: 1, label: 'Easy' } : recogInTop >= 6 ? { level: 2, label: 'Moderate' }
  : recogInTop >= 4 ? { level: 3, label: 'Tricky' } : recogInTop >= 2 ? { level: 4, label: 'Hard' } : { level: 5, label: 'Very hard' }
async function finalizeTenable({ roster, statId, statLabel, question }) {
  const reco = await loadReco()
  const ranked = Object.entries(roster).map(([id, r]) => ({ id, name: r.name, value: r.value })).sort((a, b) => b.value - a.value)
  const unit = TEN_UNIT[statId] || ((v) => `${v}`)
  const title = question.charAt(0).toUpperCase() + question.slice(1)
  const tenth = ranked[9] // players tied with the 10th are all acceptable (Tenable tie-pool)
  const tiePool = tenth ? ranked.slice(10).filter((r) => r.value === tenth.value).map((r) => ({ text: r.name, detail: unit(r.value) })) : []
  return {
    question: title, // shared headline for the builder preview (answers stay hidden there)
    title, description: `Name the 10 highest — ${title.toLowerCase()}.`, statLabel,
    answers: ranked.slice(0, 10).map((r, i) => ({ rank: i + 1, text: r.name, detail: unit(r.value) })),
    tiePool, type: 'player',
    total: ranked.length, empty: ranked.length === 0,
    valid: ranked.length >= 12, // depth beyond the top 10 makes it a real "make the cut" question
    difficulty: DIFF_TENABLE(ranked.slice(0, 10).filter((r) => (reco[r.id] || 0) >= 40).length),
  }
}

// ── natural-language composition ───────────────────────────────────────────
async function labels(sel) {
  const L = sel.layers, out = {}
  if (L.club) { const clubs = await loadClubsIndex(); out.club = String(L.club).startsWith('group:') ? (GROUPS.find(g => g.id === L.club.slice(6))?.label || 'a group') : (clubs[L.club]?.name?.replace(/ FC$/, '') || 'that club') }
  if (L.player) { const idx = await loadPlayerIndex(); const f = idx.find(([id]) => id === String(L.player)); out.player = f ? f[1] : 'that player' }
  if (L.trophy) out.trophy = TROPHIES.find(t => t.key === L.trophy)?.label || L.trophy
  return out
}
function subjectPhrase(sel, ctx) {
  const L = sel.layers
  const adj = L.nationality?.startsWith('nat:') ? demonym(L.nationality.slice(4)) : L.nationality?.startsWith('cont:') ? (CONT_ADJ[L.nationality.slice(5)] || L.nationality.slice(5)) : ''
  const posNoun = L.position ? POS_PLURAL[L.position] : ''
  return { adj, posNoun, club: ctx.club }
}
function compose(sel, s, ctx) {
  const L = sel.layers, comp = L.competition
  const { adj, posNoun } = subjectPhrase(sel, ctx)
  const lead = (comp && comp !== 'ALL') ? `${compName(comp)} ${s.word}` : s.word
  const withNoun = (a, p) => [a, p || (a ? 'players' : '')].filter(Boolean).join(' ') // "Spanish players" | "defenders" | ""
  if (s.kind === 'fee') {
    const who = [adj, posNoun || 'players'].filter(Boolean).join(' ')
    return `transfer fee for ${who} signed by ${ctx.club || 'that club'}${tail(sel, ctx, { skipEra: true })}`
  }
  if (s.kind === 'together') {
    const sub = withNoun(adj, posNoun)
    return `${lead}${sub ? ` for ${sub}` : ''} alongside ${ctx.player || 'that player'}${tail(sel, ctx, { skipPlayer: true, at: true })}`
  }
  const core = ctx.club ? [adj, ctx.club, posNoun].filter(Boolean).join(' ') : withNoun(adj, posNoun)
  const subject = core || ((L.player || L.trophy) ? 'players' : '') // a "who…" clause needs a noun to attach to
  return `${lead}${subject ? ` for ${subject}` : ''}${tail(sel, ctx, {})}`
}
// trailing clauses common to the stats: era · trophy · played-with(as filter)
function tail(sel, ctx, { skipEra, skipPlayer, at } = {}) {
  const L = sel.layers, bits = []
  if (L.club && at) bits.push(`at ${ctx.club}`)
  if (L.era && !skipEra) bits.push(`in the ${L.era}`)
  if (L.player && !skipPlayer) bits.push(`who played with ${ctx.player}`)
  if (L.trophy) bits.push(`who won the ${ctx.trophy}`)
  return bits.length ? ' ' + bits.join(' ') : ''
}

// ── static reference (continents) ──────────────────────────────────────────
export const CONTINENTS = ['Africa', 'South America', 'Europe', 'Asia', 'North America']
const CONT_ADJ = { Africa: 'African', 'South America': 'South American', Europe: 'European', Asia: 'Asian', 'North America': 'North American' }
const NAT2CONT = {
  england: 'Europe', scotland: 'Europe', wales: 'Europe', ireland: 'Europe', 'northern ireland': 'Europe', france: 'Europe', spain: 'Europe',
  portugal: 'Europe', italy: 'Europe', germany: 'Europe', netherlands: 'Europe', belgium: 'Europe', croatia: 'Europe', serbia: 'Europe',
  switzerland: 'Europe', austria: 'Europe', poland: 'Europe', denmark: 'Europe', sweden: 'Europe', norway: 'Europe', finland: 'Europe',
  iceland: 'Europe', 'czech republic': 'Europe', greece: 'Europe', turkey: 'Europe', ukraine: 'Europe', russia: 'Europe', romania: 'Europe',
  hungary: 'Europe', slovakia: 'Europe', slovenia: 'Europe',
  brazil: 'South America', argentina: 'South America', uruguay: 'South America', colombia: 'South America', chile: 'South America',
  peru: 'South America', ecuador: 'South America', paraguay: 'South America', venezuela: 'South America',
  egypt: 'Africa', morocco: 'Africa', algeria: 'Africa', tunisia: 'Africa', senegal: 'Africa', 'ivory coast': 'Africa', ghana: 'Africa',
  nigeria: 'Africa', cameroon: 'Africa', 'south africa': 'Africa', mali: 'Africa', togo: 'Africa', gabon: 'Africa', 'dr congo': 'Africa',
  'burkina faso': 'Africa', guinea: 'Africa', zambia: 'Africa',
  japan: 'Asia', 'south korea': 'Asia', 'korea south': 'Asia', australia: 'Asia', iran: 'Asia', 'saudi arabia': 'Asia', qatar: 'Asia',
  'united states': 'North America', mexico: 'North America', canada: 'North America', 'costa rica': 'North America', jamaica: 'North America', honduras: 'North America',
}
const CONTINENT_KEYS = {}
for (const [nat, cont] of Object.entries(NAT2CONT)) (CONTINENT_KEYS[cont] ||= []).push(nat)
