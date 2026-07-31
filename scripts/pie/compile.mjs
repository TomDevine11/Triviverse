#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// PIE COMPILE — the vertical-slice driver + candidate explorer emitter.
//
// Given a scope (a club), enumerate EVERY legal candidate (competition × stat ×
// {position,nationality} AND-filters), project → evaluate → gate → score →
// explain, mark any that match a hand-authored question, and emit a fully
// self-contained explorer HTML (data + live weight sliders inlined).
//
//   node scripts/pie/compile.mjs --club Chelsea
//
// Output: scripts/pie/out/pie-explorer-<club>.html  (open in a browser)
//         scripts/pie/out/pie-candidates-<club>.json (raw)
//
// Experimental. Reads canonical data only; writes only under scripts/pie/out/.
// Touches NO gameplay.
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COMPS, POSITIONS, resolveClub, buildPopulation, nationalitiesIn, natDisplay } from './population.mjs'
import { STATS, project } from './projection.mjs'
import { evaluate } from './metrics.mjs'
import { gateCheck, scoreProfile, explain } from './rank.mjs'
import { WEIGHTS, GATES, RECOG_MIN } from './config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const OUT = path.join(__dirname, 'out')

const arg = (flag, def) => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : def }
const clubName = arg('--club', 'Chelsea')

// ── comparison: parse hand-authored questions for this club ──────────────────
const COMP_BY_NAME = Object.fromEntries(Object.entries(COMPS).map(([id, n]) => [n, id]))
const STAT_BY_LABEL = Object.fromEntries(Object.entries(STATS).map(([k, s]) => [s.label, k]))
const POS_BY_WORD = { goalkeepers: 'GK', defenders: 'DEF', midfielders: 'MID', forwards: 'FWD' }
function curatedKeys(club) {
  const keys = new Set()
  try {
    const txt = readFileSync(path.join(ROOT, '501_updated_questions.txt'), 'utf8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*\d+\.\s*(.+?)\s*·\s*(.+?)\s*·\s*(.+?)\s*$/)
      if (!m) continue
      const comp = COMP_BY_NAME[m[1].trim()]; const stat = STAT_BY_LABEL[m[2].trim()]; const scope = m[3].trim()
      if (!comp || !stat) continue
      if (!scope.toLowerCase().startsWith(club.name.toLowerCase().replace(/ fc$/i, '')) && !scope.toLowerCase().includes(club.name.toLowerCase().split(' ')[0])) continue
      const posWord = Object.keys(POS_BY_WORD).find((w) => scope.toLowerCase().endsWith(w))
      const fk = posWord ? `pos:${POS_BY_WORD[posWord]}` : (/players$/i.test(scope) ? 'all' : 'all')
      keys.add(`${comp}|${stat}|${fk}`)
    }
  } catch { /* no curated file */ }
  return keys
}

// ── enumerate ────────────────────────────────────────────────────────────────
function filterKey(fs) {
  const parts = []
  if (fs.position) parts.push(`pos:${fs.position}`)
  if (fs.nationality) parts.push(`nat:${fs.nationality}`)
  return parts.length ? parts.join('|') : 'all'
}
function scopeLabel(fs, base) {
  if (fs.position) return POSITIONS[fs.position]
  if (fs.nationality) return `(${natDisplay(base, fs.nationality)})`
  return 'players'
}

function run() {
  const club = resolveClub(clubName)
  if (!club) { console.error(`Club not found: ${clubName}`); process.exit(1) }
  const curated = curatedKeys(club)
  const scopes = [...club.comps, 'ALL']
  const candidates = []

  for (const scope of scopes) {
    const competition = scope === 'ALL' ? null : scope
    const base = buildPopulation({ clubId: club.id, competition })
    if (base.length < 3) continue
    const nats = nationalitiesIn(base, 3).slice(0, 12)

    const filterSets = [{}]
    for (const p of Object.keys(POSITIONS)) filterSets.push({ position: p })
    for (const n of nats) filterSets.push({ nationality: n })
    for (const p of Object.keys(POSITIONS)) for (const n of nats) {
      if (base.filter((x) => x.pos === p && x.natKey === n).length >= 3) filterSets.push({ position: p, nationality: n })
    }

    for (const fs of filterSets) {
      const players = buildPopulation({ clubId: club.id, competition, ...fs })
      if (players.length < 1) continue
      for (const statKey of Object.keys(STATS)) {
        const board = project(players, statKey)
        if (board.length < 1) continue
        const profile = evaluate(board)
        const gatesFailed = gateCheck(profile)
        const { score, breakdown } = scoreProfile(profile)
        const explanation = explain(profile, breakdown, gatesFailed)
        const compName = competition ? COMPS[competition] : 'All competitions'
        const title = `${compName} · ${STATS[statKey].label} · ${club.name.replace(/ FC$/, '')} ${scopeLabel(fs, base)}`
        const key = `${scope}|${statKey}|${filterKey(fs)}`
        candidates.push({
          id: key, title,
          population: { club: club.name, competition: compName, ...fs },
          projection: { stat: statKey, statLabel: STATS[statKey].label },
          profile, gatesFailed, defaultScore: score, breakdown, explanation,
          curated: curated.has(`${competition}|${statKey}|${filterKey(fs)}`),
          board: board.slice(0, 30).map((b) => ({ n: b.name, v: b.value, f: b.fame })),
        })
      }
    }
  }

  candidates.sort((a, b) => b.defaultScore - a.defaultScore)
  mkdirSync(OUT, { recursive: true })
  const slug = clubName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const payload = { club: club.name, generatedAt: new Date().toISOString(), config: { WEIGHTS, GATES, RECOG_MIN }, candidates }
  writeFileSync(path.join(OUT, `pie-candidates-${slug}.json`), JSON.stringify(payload, null, 1) + '\n')

  // self-contained explorer
  const tpl = readFileSync(path.join(__dirname, 'explorer.template.html'), 'utf8')
  const html = tpl.replace('/*__DATA__*/', JSON.stringify(payload))
  writeFileSync(path.join(OUT, `pie-explorer-${slug}.html`), html)

  const passed = candidates.filter((c) => c.gatesFailed.length === 0).length
  console.error(`✓ ${club.name}: ${candidates.length} legal candidates (${passed} pass gates, ${curated.size} curated matched).`)
  console.error(`  explorer → ${path.relative(process.cwd(), path.join(OUT, `pie-explorer-${slug}.html`))}`)
}

run()
