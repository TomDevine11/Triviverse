// ─────────────────────────────────────────────────────────────────────────
// NEW POPULATION SEEDS — Era + Trajectory.
//
// These are new SET-CONSTRUCTORS (not filters). They fall out of canonical data
// the old grammar ignored: per-season performance (Era) and transfers (Trajectory).
// Each returns players in the same shape the projection expects; the compiler,
// metrics, scorer and workbench are untouched.
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { metaOf } from './population.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\bfc\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

const _perf = {}
const perf = (cid) => (_perf[cid] ||= J(`src/data/football501/performance.${cid}.generated.json`).performance)
let _tr = null
const transfers = () => (_tr ||= J('src/data/football501/transfers.generated.json'))

const attach = (id, extra, nationality, position) => {
  const m = metaOf(id); if (!m) return null
  if (nationality && m.natKey !== nationality) return null
  if (position && m.pos !== position) return null
  return { id, name: m.name, fame: m.fame, pos: m.pos, nat: m.nat, natKey: m.natKey, ...extra }
}

// ERA — players active in a competition during [from, to], apps/goals summed over
// that window. A genuinely different memory (generational recall) than "ever played".
export function eraPopulation({ competition, from, to, nationality = null, position = null }) {
  const acc = new Map()
  for (const [pid, , season, apps, goals] of perf(competition)) {
    const y = +season; if (y < from || y > to) continue
    const cur = acc.get(pid) || { apps: 0, goals: 0 }; cur.apps += apps || 0; cur.goals += goals || 0; acc.set(pid, cur)
  }
  const out = []
  for (const [id, v] of acc) { if (v.apps <= 0) continue; const p = attach(id, { apps: v.apps, goals: v.goals }, nationality, position); if (p) out.push(p) }
  return out
}

// TRAJECTORY · record signings — the players a club paid the most for. The VALUE is
// the transfer fee (€m) — a natural, novel darts stat unique to this seed.
// club display name → the abbreviated name used in the transfer data.
const TRANSFER_ALIAS = { 'Manchester United': 'Man Utd', 'Manchester City': 'Man City', 'Paris Saint-Germain': 'Paris SG', 'AC Milan': 'Milan', 'Tottenham Hotspur': 'Tottenham' }

export function recordSignings({ club, nationality = null, position = null }) {
  const tr = transfers()
  const key = norm(TRANSFER_ALIAS[club] || club)
  const clubId = Object.entries(tr.clubs || {}).find(([, name]) => norm(typeof name === 'string' ? name : name.name) === key)?.[0]
  if (!clubId) return []
  const best = new Map()
  for (const t of tr.transfers) { const [pid, , toId, , fee] = t; if (String(toId) !== String(clubId) || !fee || fee <= 0) continue; best.set(pid, Math.max(best.get(pid) || 0, fee)) }
  const out = []
  for (const [id, fee] of best) { const p = attach(id, { fee: Math.round(fee / 1e6) }, nationality, position); if (p) out.push(p) }
  return out
}
