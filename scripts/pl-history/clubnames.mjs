#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// CLUB NAMES — English display names per competition.
//
// Transfermarkt's URL slugs are German for some clubs (ac-mailand), but the
// competition pages carry the English name in each club link's `title`. This
// enumeration-only pass (no per-club fetches) walks every season and collects
// id → English name into data/pl-history/clubnames.<COMP>.json. Resumable.
//
//   COMP=IT1 npm run build:pl-clubnames   (or npm run clubnames:all)
//   PL_SEASONS=2026 …                      (only those seasons — a new season's promoted clubs)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { DIR, FIRST_SEASON, currentSeason, COMPETITION, DELAY_MS } from './config.mjs'
import { fetchHtml, parseCompetitionClubs, competitionUrl } from './lib.mjs'

const OUT = path.join(DIR.root, `clubnames.${COMPETITION.id}.json`)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function run() {
  const names = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
  const seasons = process.env.PL_SEASONS
    ? process.env.PL_SEASONS.split(',').map(s => parseInt(s.trim(), 10))
    : Array.from({ length: currentSeason() - FIRST_SEASON + 1 }, (_, i) => FIRST_SEASON + i)
  console.error(`Club names for ${COMPETITION.name} (${seasons[0]}–${seasons[seasons.length - 1]})`)
  for (const s of seasons) {
    let added = 0
    for (const c of parseCompetitionClubs(fetchHtml(competitionUrl(s)))) {
      if (c.name && !names[c.id]) { names[c.id] = c.name; added++ }
    }
    if (added) writeFileSync(OUT, JSON.stringify(names))
    await sleep(DELAY_MS)
  }
  writeFileSync(OUT, JSON.stringify(names))
  console.error(`✓ ${Object.keys(names).length} club names → ${path.relative(process.cwd(), OUT)}`)
}
run().catch(e => { console.error(`✗ ${e.message}`); process.exit(1) })
