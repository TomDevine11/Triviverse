#!/usr/bin/env node
// Open one finished example per game mode in QuickTime, to judge audio/volume.
//   npm run open-shorts-samples
import { readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const SHORTS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'output', 'shorts')
const ORDER = ['who-am-i', 'winner-stays-on', 'career-path', 'guess-the-club', 'played-alongside', 'football-pointless', 'player-between-clubs']

const isFinal = (f) => f.endsWith('.mp4') && !f.endsWith('.silent.mp4') && !f.includes('.__')
const dirs = readdirSync(SHORTS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
const ordered = [...ORDER.filter((d) => dirs.includes(d)), ...dirs.filter((d) => !ORDER.includes(d))]

const files = []
for (const fmt of ordered) {
  const dp = path.join(SHORTS, fmt)
  if (!existsSync(dp)) continue
  const f = readdirSync(dp).find(isFinal)
  if (f) files.push({ fmt, path: path.join(dp, f) })
}
if (!files.length) { console.error('No finished videos found. Render some first.'); process.exit(1) }

console.log('\nOpening one example per game mode:')
for (const { fmt, path: p } of files) console.log(`  ${fmt.padEnd(20)} ${path.basename(p)}`)
spawn('open', files.map((f) => f.path), { stdio: 'ignore' })
console.log('')
