#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD LEADERBOARDS  →  src/data/canonical/stats.generated.json
//
// Build-time refresh of the all-time top-scorer leaderboards that power Higher
// or Lower. Output schema is UNCHANGED (five01.js consumes it as-is).
//
// Sources (Phase 1):
//   • The four CLUB-competition boards (Premier League, La Liga, Bundesliga,
//     Champions League) are derived OFFLINE from the canonical Performance
//     career-rollup (history.<comp>.generated.json — proven == rollup of the
//     canonical performance.<comp>.generated.json in build-facts, RFC-001 C5/C6)
//     — the SAME data Football 501 uses. So one football-data refresh now keeps
//     Higher or Lower in sync (no more Wikipedia drift).
//   • intl-goals is a TEMPORARY EXCEPTION: international goals are not in the
//     Transfermarkt club data, so this board is carried through unchanged from
//     the existing file. Pass REFRESH_INTL=1 to re-fetch it from Wikipedia
//     (needs network). Migrating intl to a canonical source is Phase 2+ work.
//
// Safety guard (unchanged): loads the EXISTING stats file first and only
// replaces a board if the fresh build looks sane (>= MIN_ROWS, not a big shrink
// vs existing). A missing history file or bad parse keeps that board's last-good
// values. Exits non-zero only on a real failure.
//
// Run:  node scripts/build-leaderboards.mjs                 (offline; club boards + carry intl)
//       REFRESH_INTL=1 node scripts/build-leaderboards.mjs  (also re-fetch intl from Wikipedia)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import * as cheerio from 'cheerio'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'src', 'data', 'canonical', 'stats.generated.json')

const WIKI_UA = { 'User-Agent': 'Football501Game/1.0 (educational; tom.devine.tpd02@gmail.com)' }

// challengeId → source + display meta (output schema must match what five01.js
// expects). `comp` = derive OFFLINE from that Transfermarkt history table;
// `page` = fetch from Wikipedia (intl only, via REFRESH_INTL).
const LEADERBOARDS = {
  'intl-goals':       { page: "List_of_men's_footballers_with_50_or_more_international_goals", tableIndex: 1, competition: 'International',    statLabel: 'international goals' },
  'ucl-goals':        { comp: 'CL',  competition: 'Champions League', statLabel: 'Champions League goals' },
  'prem-goals':       { comp: 'GB1', competition: 'Premier League',   statLabel: 'Premier League goals' },
  'laliga-goals':     { comp: 'ES1', competition: 'La Liga',          statLabel: 'La Liga goals' },
  'bundesliga-goals': { comp: 'L1',  competition: 'Bundesliga',       statLabel: 'Bundesliga goals' },
}

const HISTORY = (comp) => path.join(__dirname, '..', 'src', 'data', 'football501', `history.${comp}.generated.json`)
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

async function fetchWikiHTML(pageTitle) {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'parse')
  url.searchParams.set('page', pageTitle)
  url.searchParams.set('prop', 'text')
  url.searchParams.set('format', 'json')
  url.searchParams.set('formatversion', '2')
  url.searchParams.set('disabletoc', '1')
  const res = await fetch(url, { headers: WIKI_UA })
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error.info)
  return json.parse?.text ?? ''
}

// Strip Wikipedia disambiguation suffixes so display names are clean,
// e.g. "Raúl (footballer)" → "Raúl", "César Rodríguez (footballer, born 1920)"
// → "César Rodríguez". Only removes trailing parentheticals about the person.
function cleanName(name) {
  return name.replace(/\s*\([^)]*\b(?:footballer|football|born|soccer)\b[^)]*\)\s*$/i, '').trim()
}

// Parse a Wikipedia "rank / player / goals" table into { name: goals }.
function parseGoalsTable(html, tableIndex) {
  const $ = cheerio.load(html)
  const tables = $('table.wikitable')
  if (tableIndex >= tables.length) throw new Error(`Table ${tableIndex} out of range (found ${tables.length})`)
  const table = tables.eq(tableIndex)
  const result = {}
  const headerCells = table.find('tr').first().find('th, td')
  let playerCol = -1, goalCol = -1
  headerCells.each((i, cell) => {
    const text = $(cell).text().replace(/\[\d+\]/g, '').trim().toLowerCase()
    if (playerCol === -1 && /^player$|^name$/.test(text)) playerCol = i
    if (goalCol === -1 && /^goals?$/.test(text)) goalCol = i
  })
  if (playerCol === -1 || goalCol === -1) {
    const heads = []; headerCells.each((_, c) => heads.push($(c).text().trim()))
    throw new Error(`No Player/Goals columns. Headers: ${JSON.stringify(heads)}`)
  }
  table.find('tr').each((rowIdx, row) => {
    if (rowIdx === 0) return
    const cells = $(row).find('th, td')
    if (cells.length <= Math.max(playerCol, goalCol)) return
    const playerCell = cells.eq(playerCol)
    const playerLink = playerCell.find('a[title]').filter((_, a) => !$(a).closest('.flagicon,.flag-icon,.mw-flag').length).first()
    const raw = playerLink.attr('title')?.trim() ?? playerCell.text().replace(/\[\d+\]/g, '').trim()
    if (!raw || raw.length < 2 || /^\d/.test(raw)) return
    if (/national\s+(football|soccer)\s+team/i.test(raw)) return
    const name = cleanName(raw)
    const stat = parseInt(cells.eq(goalCol).text().replace(/[^\d]/g, ''), 10)
    if (!isNaN(stat) && stat > 0) result[name] = stat
  })
  return result
}

function loadExisting() {
  try { return JSON.parse(readFileSync(OUT, 'utf8')) } catch { return { meta: {}, challenges: {} } }
}

async function main() {
  const existing = loadExisting()
  const out = {
    meta: { source: 'transfermarkt history (club) + wikipedia (intl)', fetchedAt: new Date().toISOString().slice(0, 10) },
    challenges: {},
  }
  let refreshed = 0, kept = 0

  for (const [id, cfg] of Object.entries(LEADERBOARDS)) {
    const prev = existing.challenges?.[id]
    const prevCount = prev ? Object.keys(prev.players || {}).length : 0
    try {
      let players, source

      if (cfg.comp) {
        // Club board: derive offline from the Transfermarkt history fact table,
        // matching the existing board depth so the pool never shrinks.
        const limit = prevCount || DEFAULT_LIMIT
        const built = buildClubBoard(cfg.comp, limit)
        players = built.players
        source = `transfermarkt:${cfg.comp}`
        process.stderr.write(`  ${id} (${cfg.comp})… ${built.namesakes ? `${built.namesakes} namesake(s) merged; ` : ''}`)
      } else if (process.env.REFRESH_INTL) {
        // intl-goals: opt-in Wikipedia refresh (network).
        process.stderr.write(`  ↓ ${id} (${cfg.page}, Wikipedia)… `)
        const html = await fetchWikiHTML(cfg.page)
        players = parseGoalsTable(html, cfg.tableIndex)
        source = `wikipedia:${cfg.page.replace(/_/g, ' ')}`
        await new Promise(r => setTimeout(r, 600))
      } else if (prev) {
        // intl-goals default: carry through unchanged (offline). Set REFRESH_INTL=1 to refresh.
        out.challenges[id] = prev
        kept++
        process.stderr.write(`  ${id}: carried through — intl exception (REFRESH_INTL=1 to refresh)\n`)
        continue
      } else {
        throw new Error('intl board has no existing data and REFRESH_INTL not set')
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
