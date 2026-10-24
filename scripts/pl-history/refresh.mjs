#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// FOOTBALL DATA REFRESH — the whole scrape → build chain in one command.
//
// Run LOCALLY at the start of a season and after each transfer window
// (Transfermarkt blocks datacentre IPs, so this can't run in CI):
//
//   npm run refresh:football
//
// 1. this season's league pages + club names, rebuilt per competition
// 2. transfers / international caps / honours for every ACTIVE player whose
//    cache is over a week old (--refresh, config.mjs staleActive), plus anyone new
// 3. the full derived chain (build:pl-catalog) and the identity registry
//
// Every step is resumable: Ctrl-C and re-run, and finished work is skipped.
// Afterwards: `npm test && npm run build`, then commit src/data in a PR.
// ─────────────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process'
import { COMPETITIONS, currentSeason, ROOT } from './config.mjs'

const season = String(currentSeason())
const step = (label, cmd, args, env = {}) => {
  console.error(`\n━━ ${label}`)
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } })
}

console.error(`Refreshing football data for the ${season}/${Number(season.slice(2)) + 1} season`)
for (const comp of Object.keys(COMPETITIONS)) {
  const env = { COMP: comp, PL_SEASONS: season }
  step(`${comp}: league pages`, 'node', ['scripts/pl-history/scrape.mjs'], env)
  step(`${comp}: club names`, 'node', ['scripts/pl-history/clubnames.mjs'], env)
  step(`${comp}: facts`, 'node', ['scripts/pl-history/build-facts.mjs'], env)
}
step('Transfers (active players)', 'node', ['scripts/pl-history/scrape-transfers.mjs', '--refresh'])
step('International caps (active players)', 'node', ['scripts/pl-history/scrape-intl.mjs', '--refresh'])
step('Honours (active players)', 'node', ['scripts/pl-history/scrape-honours.mjs', '--refresh'])
step('Derived datasets', 'npm', ['run', 'build:pl-catalog'])
step('Identity registry', 'node', ['scripts/build-identity.mjs'])
console.error('\n✓ Refreshed. Next: npm test && npm run build, then commit src/data in a PR.')
