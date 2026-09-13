#!/usr/bin/env node
// A/B the audio profiles on ONE existing video, without re-rendering frames. Reads the video's
// *.silent.mp4 master + cue list and produces <slug>.__<profile>.mp4 for each profile.
//   node scripts/shorts/audio-test.mjs <slug>            (all profiles)
//   node scripts/shorts/audio-test.mjs <slug> sfx,pulse  (a subset)
import { readdirSync, readFileSync, renameSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { muxAudio, PROFILES } from './lib/audio.mjs'

const SHORTS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'output', 'shorts')
const slug = process.argv[2]
const want = (process.argv[3] || Object.keys(PROFILES).join(',')).split(',').map((s) => s.trim()).filter(Boolean)
if (!slug) { console.error('usage: node scripts/shorts/audio-test.mjs <slug> [profile,profile]'); process.exit(1) }

// locate the silent master + metadata for the slug
let master, metaPath
for (const d of readdirSync(SHORTS, { withFileTypes: true }).filter((x) => x.isDirectory())) {
  const p = path.join(SHORTS, d.name, `${slug}.silent.mp4`)
  if (existsSync(p)) { master = p; metaPath = path.join(SHORTS, d.name, `${slug}.json`); break }
}
if (!master || !existsSync(metaPath)) { console.error(`No silent master found for "${slug}". Render it first (with the current pipeline).`); process.exit(1) }

const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
const cues = meta.audio?.list || []
console.log(`\nAudio A/B for ${slug}  (${cues.length} cues, format ${meta.format})\n`)
for (const key of want) {
  const prof = PROFILES[key]
  if (!prof) { console.log(`  ? unknown profile: ${key}`); continue }
  const out = master.replace(/\.silent\.mp4$/, `.__${key}.mp4`)
  const mux = muxAudio(master, cues, { format: meta.format, bed: prof.bed })
  if (mux.audio) { renameSync(mux.path, out); console.log(`  ✓ ${key.padEnd(6)} ${prof.label.padEnd(24)} → ${path.basename(out)}`) }
  else console.log(`  ✗ ${key} failed`)
}
console.log(`\nOpen them with QuickTime, e.g.:  open "${path.dirname(master)}"/${slug}.__*.mp4\n`)
