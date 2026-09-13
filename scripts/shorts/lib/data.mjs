// Cached data-access layer for the content engine. All facts come from the existing
// canonical/derived artefacts + the qgen registry — no new data model, no fabrication.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { loadRegistry, COMP_NAME } from '../../qgen/registry.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const j = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'))
const memo = (fn) => { let v; return () => (v === undefined ? (v = fn()) : v) }

export const recog = memo(() => j('src/data/recognisability.generated.json'))
// byName keys are lowercased in the source; every other dataset uses proper case.
export const fame = (name) => recog().byName?.[String(name).toLowerCase()] ?? 0

export const careers = memo(() => j('src/data/careers.generated.json').players)
export const teammateHubs = memo(() => j('src/data/teammates.generated.json').players)
export const pointlessQs = memo(() => j('src/data/pointless/questions.generated.json').questions)
export const statCategories = memo(() => j('src/data/canonical/stats.generated.json').challenges)

// Registry assembled once; expose per-player facts by NAME for Who Am I.
const reg = memo(() => {
  const r = loadRegistry()
  const byName = new Map()
  for (const p of r.players.values()) if (p.name && !byName.has(p.name)) byName.set(p.name, p)
  return { r, byName }
})

// Proper-cased players sorted by recognisability (from the registry, whose reco is populated).
export function topByReco(min = 45) {
  const { r } = reg()
  return [...r.players.values()].filter(p => p.name && (p.reco || 0) >= min).map(p => ({ name: p.name, reco: p.reco || 0 })).sort((a, b) => b.reco - a.reco)
}

// Winner Stays On categories, built from PER-PLAYER registry stats (not the small top-N leaderboards)
// so duels can pair any two recognisable players — hundreds per category, mid-tier included.
export const winnerCategories = memo(() => {
  const { r } = reg()
  const all = [...r.players.values()].filter(p => p.name && (p.reco || 0) >= 45)
  const capsG = (p) => { let g = 0; if (p.caps instanceof Map) for (const c of p.caps.values()) g += c.goals || 0; return g }
  const capsN = (p) => { let n = 0; if (p.caps instanceof Map) for (const c of p.caps.values()) n += c.caps || 0; return n }
  const cg = (p, code) => p.comps?.[code]?.goals || 0
  const defs = [
    ['ucl-goals', 'Champions League goals', (p) => cg(p, 'CL')],
    ['prem-goals', 'Premier League goals', (p) => cg(p, 'GB1')],
    ['laliga-goals', 'La Liga goals', (p) => cg(p, 'ES1')],
    ['seriea-goals', 'Serie A goals', (p) => cg(p, 'IT1')],
    ['bundesliga-goals', 'Bundesliga goals', (p) => cg(p, 'L1')],
    ['ligue1-goals', 'Ligue 1 goals', (p) => cg(p, 'FR1')],
    ['intl-goals', 'international goals', capsG],
    ['intl-caps', 'international caps', capsN],
  ]
  const out = {}
  for (const [id, statLabel, get] of defs) {
    const players = {}, reco = {}
    for (const p of all) { const v = get(p); if (v > 0) { players[p.name] = v; reco[p.name] = p.reco || 0 } }
    out[id] = { statLabel, players, reco }
  }
  return out
})

export function playerFacts(name) {
  const { r, byName } = reg()
  const p = byName.get(name)
  if (!p) return null
  const clubs = [...p.clubApps.entries()].sort((a, b) => (b[1].apps || 0) - (a[1].apps || 0))
    .map(([cid]) => r.clubName.get(cid)).filter(Boolean)
  let caps = 0, intlGoals = 0
  for (const c of p.caps.values()) { caps += c.caps || 0; intlGoals += c.goals || 0 }
  return {
    name: p.name,
    nationality: [...p.nats][0] || null,
    position: p.pos || null,
    era: p.last ? `${Math.floor(p.last / 10) * 10}s` : null,
    lastYear: p.last || 0,
    leagues: [...p.leagues].map(c => COMP_NAME[c]).filter(Boolean),
    clubs,
    trophies: [...p.trophies.keys()],
    caps, intlGoals,
    reco: p.reco || fame(name),
  }
}
