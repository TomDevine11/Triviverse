#!/usr/bin/env node
// Re-apply audio to already-rendered videos WITHOUT re-rendering frames. Reads each *.silent.mp4
// master + its .json (cue list + format) and re-muxes the current audio library into the final mp4.
// Use after tweaking beds/SFX or the mix in lib/audio.mjs.  node scripts/shorts/remux.mjs [--format X]
import { readdirSync, readFileSync, writeFileSync, renameSync, copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { muxAudio } from './lib/audio.mjs'

const SHORTS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'output', 'shorts')
const only = (() => { const i = process.argv.indexOf('--format'); return i >= 0 ? process.argv[i + 1] : null })()

let done = 0, fail = 0
for (const dir of readdirSync(SHORTS, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  if (only && dir.name !== only) continue
  const dp = path.join(SHORTS, dir.name)
  for (const f of readdirSync(dp).filter((f) => f.endsWith('.silent.mp4'))) {
    const slug = f.replace(/\.silent\.mp4$/, '')
    const metaPath = path.join(dp, `${slug}.json`)
    if (!existsSync(metaPath)) continue
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    const silent = path.join(dp, f), mp4 = path.join(dp, `${slug}.mp4`)
    const mux = muxAudio(silent, meta.audio?.list || [], { format: meta.format, seed: slug })
    if (mux.audio) { renameSync(mux.path, mp4); meta.audio = { ...meta.audio, applied: true, bed: mux.bed }; writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n'); done++ }
    else { copyFileSync(silent, mp4); fail++ }
    process.stdout.write(`  ${mux.audio ? '✓' : '·'} ${slug}${mux.bed ? ` [${mux.bed}]` : ''}\n`)
  }
}
console.log(`\nremux: ${done} with audio${fail ? `, ${fail} left silent` : ''}`)
