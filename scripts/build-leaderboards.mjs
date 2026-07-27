#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD LEADERBOARDS  →  src/data/canonical/stats.generated.json
//
// Build-time refresh of the all-time top-scorer leaderboards that power Higher
// or Lower. Output schema is UNCHANGED (five01.js consumes it as-is).
//
// Sources (all Transfermarkt, all offline — RFC-001 C7 retired Wikipedia):
//   • The four CLUB-competition boards (Premier League, La Liga, Bundesliga,
//     Champions League) derive from the canonical Performance career-rollup
//     (history.<comp> — proven == rollup of performance.<comp>, C5/C6).
//   • intl-goals derives from the canonical international facts (intl.generated,
//     player×nationalTeam caps+goals scraped from Transfermarkt, C7).
//   So one football-data refresh keeps Higher or Lower in sync (no external drift).
//
// Safety guard (unchanged): loads the EXISTING stats file first and only
// replaces a board if the fresh build looks sane (>= MIN_ROWS, not a big shrink
// vs existing). A missing source keeps that board's last-good values. Exits
// non-zero only on a real failure.
//
// Run:  node scripts/build-leaderboards.mjs   (offline)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'src', 'data', 'canonical', 'stats.generated.json')

// challengeId → source + display meta (output schema must match what five01.js
// expects). `comp` = derive OFFLINE from that Transfermarkt history table;
// `intl` = derive from the canonical international facts (intl.generated.json).
const LEADERBOARDS = {
  'intl-goals':       { intl: true,  competition: 'International',     statLabel: 'international goals' },
  'ucl-goals':        { comp: 'CL',  competition: 'Champions League', statLabel: 'Champions League goals' },
  'prem-goals':       { comp: 'GB1', competition: 'Premier League',   statLabel: 'Premier League goals' },
  'laliga-goals':     { comp: 'ES1', competition: 'La Liga',          statLabel: 'La Liga goals' },
  'bundesliga-goals': { comp: 'L1',  competition: 'Bundesliga',       statLabel: 'Bundesliga goals' },
}

const HISTORY = (comp) => path.join(__dirname, '..', 'src', 'data', 'football501', `history.${comp}.generated.json`)
const INTL = path.join(__dirname, '..', 'src', 'data', 'football501', 'intl.generated.json')
const DEFAULT_LIMIT = 40     // board depth when there's no existing board to match
const MIN_ROWS = 10          // a sane board must have at least this many players
const SHRINK_FLOOR = 0.8     // reject a refresh that drops below 80% of existing size

// Build a club-competition board from a Transfermarkt history fact table:
// { name: goals } for the top `limit` scorers. Namesakes (two different tm
// players sharing a display name) are merged to the higher tally and counted.
function buildClubBoard(comp, limit) {
  const file = HISTORY(comp)
  if (!existsSync(file)) throw new Error(`missing ${path.basename(file)}`)
  const players = JSON.parse(readFileSync(file, 'utf8')).players || []
  const byName = new Map()
  let namesakes = 0
  for (const p of players) {
    const goals = p.comps?.[comp]?.goals || 0
    if (goals <= 0) continue
    if (byName.has(p.name)) { namesakes++; byName.set(p.name, Math.max(byName.get(p.name), goals)) }
    else byName.set(p.name, goals)
  }
  const top = [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  return { players: Object.fromEntries(top), namesakes }
}

// Build the international goals board from the canonical international facts
// (intl.generated.json), joined with player names from the history tables. Every
// scraped intl player came from the history universe, so names always resolve.
function buildIntlBoard(limit) {
  if (!existsSync(INTL)) throw new Error('missing intl.generated.json (run build:intl)')
  const { intl } = JSON.parse(readFileSync(INTL, 'utf8'))
  const name = new Map()
  for (const c of ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']) {
    if (!existsSync(HISTORY(c))) continue
    for (const p of JSON.parse(readFileSync(HISTORY(c), 'utf8')).players) if (!name.has(p.id)) name.set(p.id, p.name)
  }
  const byName = new Map()
  let namesakes = 0
  for (const [pid, , , goals] of intl) {
    if (goals <= 0) continue
    const nm = name.get(pid); if (!nm) continue
    if (byName.has(nm)) { namesakes++; byName.set(nm, Math.max(byName.get(nm), goals)) }
    else byName.set(nm, goals)
  }
  const top = [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  return { players: Object.fromEntries(top), namesakes }
}

function loadExisting() {
  try { return JSON.parse(readFileSync(OUT, 'utf8')) } catch { return { meta: {}, challenges: {} } }
}

async function main() {
  const existing = loadExisting()
  const out = {
    meta: { source: 'transfermarkt (club history + international)', fetchedAt: new Date().toISOString().slice(0, 10) },
    challenges: {},
  }
  let refreshed = 0, kept = 0

  for (const [id, cfg] of Object.entries(LEADERBOARDS)) {
    const prev = existing.challenges?.[id]
    const prevCount = prev ? Object.keys(prev.players || {}).length : 0
    try {
      let players, source

      const limit = prevCount || DEFAULT_LIMIT
      if (cfg.comp) {
        // Club board: derive offline from the Transfermarkt history fact table,
        // matching the existing board depth so the pool never shrinks.
        const built = buildClubBoard(cfg.comp, limit)
        players = built.players
        source = `transfermarkt:${cfg.comp}`
        process.stderr.write(`  ${id} (${cfg.comp})… ${built.namesakes ? `${built.namesakes} namesake(s) merged; ` : ''}`)
      } else if (cfg.intl) {
        // International board: derive offline from the canonical intl facts.
        const built = buildIntlBoard(limit)
        players = built.players
        source = 'transfermarkt:intl'
        process.stderr.write(`  ${id} (international)… ${built.namesakes ? `${built.namesakes} namesake(s) merged; ` : ''}`)
      } else {
        throw new Error(`unknown board config for ${id}`)
      }

      const count = Object.keys(players).length
      if (count < MIN_ROWS) throw new Error(`only ${count} rows (< ${MIN_ROWS})`)
      if (prevCount && count < prevCount * SHRINK_FLOOR) throw new Error(`suspicious shrink ${prevCount} → ${count}`)
      out.challenges[id] = { competition: cfg.competition, statLabel: cfg.statLabel, source, players }
      refreshed++
      process.stderr.write(`${count} players ✓\n`)
    } catch (err) {
      if (prev) {
        out.challenges[id] = prev // keep last-good data
        kept++
        process.stderr.write(`  ${id}: FAILED (${err.message}) — kept ${prevCount} existing\n`)
      } else {
        process.stderr.write(`  ${id}: FAILED (${err.message}) — no existing data!\n`)
      }
    }
  }

  if (Object.keys(out.challenges).length < Object.keys(LEADERBOARDS).length) {
    console.error(`✗ Missing leaderboards (have ${Object.keys(out.challenges).length}/${Object.keys(LEADERBOARDS).length}) — not writing.`)
    process.exit(1)
  }

  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
  console.error(`\nWrote ${OUT} — ${refreshed} refreshed, ${kept} kept from last-good.`)
}

main().catch(e => { console.error(e); process.exit(1) })
