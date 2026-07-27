#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD RECOGNISABILITY  →  src/data/recognisability.generated.json   (RFC-001)
//
// A DERIVED, zero-maintenance estimate of how likely today's average football
// fan is to recognise a player — NOT a measure of greatness. Replaces the
// Wikidata "fame" (Wikipedia language-count) signal used by teammates, tic-tac-
// toe, connections, tenable, 501 and autocomplete.
//
// Computed entirely from canonical facts (history.<comp> + intl.generated), so
// it is deterministic, reproducible, requires no manual "famous players" list,
// and improves automatically as canonical data grows (add honours / transfers /
// market-value terms to `footprint` when those facts land — C10/C11/later).
//
//   score = round(100 · min(1, footprint · recency / SCALE))
//   footprint = apps + 4·goals + 2.5·CL_apps + 2·caps + 5·intl_goals + active_bonus
//   recency   = max(FLOOR, exp(−(CUR − lastSeason) / TAU))   ← recency is first-class
//
// Recency is a MULTIPLIER (not a small weight): a current player keeps ~100% of
// their footprint, a 1980s legend ~4%, so contemporary players intentionally
// outrank historical greats (Yamal/Vardy > Müller/Platini).
//
//   node scripts/build-recognisability.mjs   (offline)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalize } from '../src/data/canonical/normalize.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const OUT = path.join(ROOT, 'src', 'data', 'recognisability.generated.json')
const COMPS = ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']
const SCHEMA_VERSION = 1

// tunables (see header). Kept in meta for transparency/reproducibility.
const W = { apps: 1, goals: 4, cl: 2.5, caps: 2, intlGoals: 5 }
const TAU = 8, FLOOR = 0.04, SCALE = 800, ACTIVE_BONUS = 180, ACTIVE_WINDOW = 1

// ── aggregate canonical facts per player ────────────────────────────────────
const P = new Map() // id → { name, apps, goals, cl, caps, ig, last }
for (const c of COMPS) for (const p of J(`src/data/football501/history.${c}.generated.json`).players) {
  const e = P.get(p.id) || { name: p.name, apps: 0, goals: 0, cl: 0, caps: 0, ig: 0, last: 0 }
  const cc = p.comps?.[c]
  if (cc) { if (c === 'CL') e.cl += cc.apps || 0; else { e.apps += cc.apps || 0; e.goals += cc.goals || 0 } }
  e.last = Math.max(e.last, p.last || 0)
  if ((p.name || '').length > e.name.length) e.name = p.name
  P.set(p.id, e)
}
try { for (const [pid, , caps, goals] of J('src/data/football501/intl.generated.json').intl) { const e = P.get(pid); if (e) { e.caps = caps; e.ig = goals } } }
catch { console.error('  (no intl.generated.json yet — caps/goals term omitted)') }

const CUR = Math.max(...[...P.values()].map(e => e.last || 0))

function scoreOf(e) {
  const active = e.last >= CUR - ACTIVE_WINDOW ? ACTIVE_BONUS : 0
  const footprint = W.apps * e.apps + W.goals * e.goals + W.cl * e.cl + W.caps * e.caps + W.intlGoals * e.ig + active
  const recency = Math.max(FLOOR, Math.exp(-(CUR - (e.last || CUR)) / TAU))
  return Math.round(100 * Math.min(1, footprint * recency / SCALE))
}

// ── emit: byId (canonical) + byName (normName → max score, for name lookups) ─
const byId = {}, byName = {}
for (const [id, e] of P) {
  const s = scoreOf(e)
  if (s <= 0) continue
  byId[id] = s
  const n = normalize(e.name)
  if (s > (byName[n] || 0)) byName[n] = s
}

const meta = {
  schemaVersion: SCHEMA_VERSION, source: 'derived from canonical facts (history + intl)',
  definition: 'contemporary fan recognisability (0-100), not greatness; recency is a first-class multiplier',
  formula: { weights: W, tau: TAU, floor: FLOOR, scale: SCALE, activeBonus: ACTIVE_BONUS, activeWindow: ACTIVE_WINDOW, currentSeason: CUR },
  players: Object.keys(byId).length, generatedAt: new Date().toISOString().slice(0, 10),
}
writeFileSync(OUT, JSON.stringify({ meta, byId, byName }) + '\n')
console.error(`✓ recognisability: ${Object.keys(byId).length} players scored (CUR=${CUR}). ` +
  `>=45: ${Object.values(byId).filter(s => s >= 45).length}, >=55: ${Object.values(byId).filter(s => s >= 55).length}`)
