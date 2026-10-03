#!/usr/bin/env node
// Hide (or unhide) a player from the public world leaderboard by nickname.
// Hidden players keep playing and keep their private league standings; they
// just never appear on /world. Runs against the production D1 via wrangler.
//
//   npm run world-hide -- "Nickname"            list matches, then hide them
//   npm run world-hide -- "Nickname" --unhide   show them again
//   npm run world-hide -- --list                everyone currently hidden
//   add --local to run against the local dev database instead

import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const flag = (f) => args.includes(f)
const name = args.find(a => !a.startsWith('--'))
const where = flag('--local') ? '--local' : '--remote'

function sql(command) {
  const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'triviverse-social', where, '--json', '--command', command], { encoding: 'utf8' })
  if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1) }
  return JSON.parse(r.stdout).at(-1).results
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`

if (flag('--list')) {
  console.table(sql('SELECT pub, name FROM players WHERE hidden = 1'))
  process.exit(0)
}
if (!name) {
  console.error('Usage: npm run world-hide -- "Nickname" [--unhide] [--local]   |   --list')
  process.exit(1)
}
const matches = sql(`SELECT pub, name, hidden FROM players WHERE name = ${q(name)} COLLATE NOCASE`)
if (!matches.length) { console.log(`No player called "${name}".`); process.exit(0) }
const value = flag('--unhide') ? 0 : 1
sql(`UPDATE players SET hidden = ${value} WHERE name = ${q(name)} COLLATE NOCASE`)
console.log(`${value ? 'Hid' : 'Unhid'} ${matches.length} player(s) named "${name}":`)
console.table(matches.map(m => ({ pub: m.pub, name: m.name })))
