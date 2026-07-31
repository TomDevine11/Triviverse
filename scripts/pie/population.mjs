// ─────────────────────────────────────────────────────────────────────────
// POPULATION COMPILER — "who qualifies".
//
// Composable AND-filters over canonical data: Club · Competition · Nationality ·
// Position. Produces the qualifying players with their (apps, goals) scoped to
// the most specific entity in the filter (club-in-competition when a club is
// present; competition total otherwise). Nothing about quality lives here.
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))

export const COMPS = { GB1: 'Premier League', ES1: 'La Liga', IT1: 'Serie A', FR1: 'Ligue 1', L1: 'Bundesliga', CL: 'Champions League' }
export const COMP_IDS = Object.keys(COMPS)
export const POSITIONS = { GK: 'goalkeepers', DEF: 'defenders', MID: 'midfielders', FWD: 'forwards' }

const recog = J('src/data/recognisability.generated.json').byId
const _comp = {}
const comp = (cid) => (_comp[cid] ||= J(`src/data/football501/history.${cid}.generated.json`))
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\bfc\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// club display name → { id, name, comps:[compId…] } (the comps the club plays in)
export function resolveClub(name) {
  const key = norm(name), hits = {}
  for (const cid of COMP_IDS) for (const [id, c] of Object.entries(comp(cid).clubs)) {
    if (norm(c.name) === key) { (hits[id] ||= { id, name: c.name, comps: [] }).comps.push(cid) }
  }
  const arr = Object.values(hits)
  return arr.length ? arr.sort((a, b) => b.comps.length - a.comps.length)[0] : null
}

// Build a population. `competition` null ⇒ aggregate across all covered comps.
// Returns [{ id, name, fame, pos, nat, natKey, apps, goals }] with SCOPED stats.
export function buildPopulation({ clubId = null, competition = null, nationality = null, position = null }) {
  const comps = competition ? [competition] : COMP_IDS
  const acc = new Map()
  for (const cid of comps) {
    for (const p of comp(cid).players) {
      const cc = p.comps?.[cid]; if (!cc) continue
      if (nationality && p.natKey !== nationality) continue
      if (position && p.pos !== position) continue
      let apps = 0, goals = 0
      if (clubId) { const cl = cc.clubs?.[clubId]; if (!cl) continue; apps = cl.apps || 0; goals = cl.goals || 0 }
      else { apps = cc.apps || 0; goals = cc.goals || 0 }
      if (apps <= 0) continue
      const cur = acc.get(p.id) || { id: p.id, name: p.name, fame: recog[p.id] || 0, pos: p.pos, nat: p.nat, natKey: p.natKey, apps: 0, goals: 0 }
      cur.apps += apps; cur.goals += goals; acc.set(p.id, cur)
    }
  }
  return [...acc.values()]
}

// Nationalities present in a base population, with a minimum count (for enumeration).
export function nationalitiesIn(players, min = 2) {
  const c = {}
  for (const p of players) if (p.natKey) c[p.natKey] = (c[p.natKey] || 0) + 1
  return Object.entries(c).filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1]).map(([k]) => k)
}
export const natDisplay = (players, key) => players.find(p => p.natKey === key)?.nat || key
