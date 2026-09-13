#!/usr/bin/env node
// SHORT-FORM CONTENT ENGINE — unified batch generator.
//   node scripts/shorts/generate.mjs --format winner-stays-on --count 30
//   node scripts/shorts/generate.mjs --all --count 60
// Each format: generator → ContentSpec[] → validate (QC) → dedup → render (format template) →
// optional SFX mux → MP4 + JSON metadata. A persistent history de-dupes across batches.
import { mkdirSync, existsSync, writeFileSync, renameSync, copyFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renderVideo } from './lib/render.mjs'
import { validate } from './lib/spec.mjs'
import { loadHistory, seen, record, saveHistory } from './lib/history.mjs'
import { muxAudio } from './lib/audio.mjs'
import { prefetch } from './lib/assets.mjs'

import * as careerPath from './generators/career-path.mjs'
import * as whoAmI from './generators/who-am-i.mjs'
import * as playedAlongside from './generators/played-alongside.mjs'
import * as guessTheClub from './generators/guess-the-club.mjs'
import * as winnerStaysOn from './generators/winner-stays-on.mjs'
import * as footballPointless from './generators/football-pointless.mjs'
import * as playerBetweenClubs from './generators/player-between-clubs.mjs'
import flowTpl from './templates/flow-quiz-v1.mjs'
import winnerTpl from './templates/winner-stays-on-v1.mjs'
import gridTpl from './templates/football-pointless-v1.mjs' // shared "name-everything" grid template
import { withIntro } from './lib/intro.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// Every format opens with a centred "direct question" card (withIntro), then plays its template.
const FORMATS = {
  'winner-stays-on': { gen: winnerStaysOn.generate, tpl: withIntro(winnerTpl, 'winner-stays-on') },
  'career-path': { gen: careerPath.generate, tpl: withIntro(flowTpl, 'career-path') },
  'who-am-i': { gen: whoAmI.generate, tpl: withIntro(flowTpl, 'who-am-i') },
  'played-alongside': { gen: playedAlongside.generate, tpl: withIntro(flowTpl, 'played-alongside') },
  'guess-the-club': { gen: guessTheClub.generate, tpl: withIntro(flowTpl, 'guess-the-club') },
  'football-pointless': { gen: footballPointless.generate, tpl: withIntro(gridTpl, 'football-pointless') },
  'player-between-clubs': { gen: playerBetweenClubs.generate, tpl: withIntro(gridTpl, 'player-between-clubs') },
}

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d }
const flag = (n) => process.argv.includes(`--${n}`)
const COUNT = Math.max(1, +(arg('count', 10)))
const OUTROOT = path.isAbsolute(arg('out', '')) ? arg('out') : path.join(ROOT, arg('out', 'output/shorts'))
const opts = { difficulty: arg('difficulty'), category: arg('category'), chain: arg('chain') && +arg('chain'), rounds: arg('rounds') && +arg('rounds') }
const targets = flag('all') ? Object.keys(FORMATS) : [arg('format', 'career-path')]

mkdirSync(OUTROOT, { recursive: true })
const historyFile = path.join(OUTROOT, '_history.json')
const history = loadHistory(historyFile)
const manifest = []
let totalOk = 0, totalSkip = 0, totalFail = 0

for (const format of targets) {
  const F = FORMATS[format]
  if (!F) { console.log(`unknown format: ${format}`); continue }
  const dir = path.join(OUTROOT, format)
  mkdirSync(dir, { recursive: true })
  const specs = F.gen(COUNT * 3, opts, history) // headroom so QC/dedup skips still reach COUNT
  console.log(`\n▶ ${format} — ${specs.length} candidate specs`)
  let ok = 0, skip = 0, fail = 0; const reasons = {}
  for (const spec of specs) {
    if (ok >= COUNT) break
    const v = validate(spec)
    if (!v.ok) { skip++; reasons[v.reason] = (reasons[v.reason] || 0) + 1; continue }
    if (seen(history, spec)) { skip++; reasons['duplicate'] = (reasons['duplicate'] || 0) + 1; continue }
    const mp4 = path.join(dir, `${spec.slug}.mp4`)
    if (existsSync(mp4) && !flag('force')) { skip++; continue }
    try {
      const t0 = Date.now()
      if (F.tpl.assets) await prefetch(F.tpl.assets(spec)) // warm crest/flag/jersey image cache
      // Render frames to a SILENT master, then mux audio into the final mp4 — keeping the master so
      // audio can be swapped later (remux.mjs) without re-rendering a single frame.
      const silent = mp4.replace(/\.mp4$/, '.silent.mp4')
      await renderVideo({ scene: (t) => F.tpl.scene(spec, t), fps: F.tpl.fps, durationSec: F.tpl.duration(spec), outPath: silent })
      const cues = F.tpl.cues ? F.tpl.cues(spec) : (spec.audioCues || [])
      const mux = muxAudio(silent, cues, { format: spec.format, seed: spec.slug })
      if (mux.audio) renameSync(mux.path, mp4); else copyFileSync(silent, mp4)
      const meta = { slug: spec.slug, format, version: spec.version, difficulty: spec.difficulty, width: 1080, height: 1920, fps: F.tpl.fps, durationSec: +F.tpl.duration(spec).toFixed(2), generatedAt: new Date().toISOString(), question: spec.question, answer: spec.answer, entities: spec.entities, ...spec.metadata, engagement: spec.engagement, audio: { cues: cues.length, list: cues, applied: mux.audio, bed: mux.bed || null } }
      writeFileSync(path.join(dir, `${spec.slug}.json`), JSON.stringify(meta, null, 2) + '\n')
      record(history, spec); manifest.push({ format, slug: spec.slug, answer: spec.answer, difficulty: spec.difficulty })
      ok++; console.log(`  ✓ ${spec.slug}  (${((Date.now() - t0) / 1000).toFixed(1)}s${cues.length ? `, ${cues.length} cues` : ''})`)
    } catch (e) { fail++; console.log(`  ✗ FAIL ${spec.slug} — ${e.message}`) }
  }
  console.log(`  ${format}: ${ok} rendered, ${skip} skipped, ${fail} failed${Object.keys(reasons).length ? ' · reasons: ' + JSON.stringify(reasons) : ''}`)
  totalOk += ok; totalSkip += skip; totalFail += fail
}

saveHistory(historyFile, history)
writeFileSync(path.join(OUTROOT, '_manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), total: totalOk, videos: manifest }, null, 2) + '\n')
console.log(`\n═ TOTAL: ${totalOk} rendered, ${totalSkip} skipped, ${totalFail} failed → ${OUTROOT}`)
