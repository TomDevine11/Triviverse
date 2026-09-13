// Shared rendering engine: the FORMATS registry (generator + intro-wrapped template) and a single
// renderSpec() used by both the batch generator and the trial preparer, so a trial video is byte-for-
// byte the same pipeline as a normal one (silent master → audio mux → final mp4 + metadata json).
import { mkdirSync, renameSync, copyFileSync, writeFileSync } from 'fs'
import path from 'path'
import { renderVideo } from './render.mjs'
import { muxAudio } from './audio.mjs'
import { prefetch } from './assets.mjs'
import { withIntro } from './intro.mjs'
import * as careerPath from '../generators/career-path.mjs'
import * as whoAmI from '../generators/who-am-i.mjs'
import * as playedAlongside from '../generators/played-alongside.mjs'
import * as guessTheClub from '../generators/guess-the-club.mjs'
import * as winnerStaysOn from '../generators/winner-stays-on.mjs'
import * as footballPointless from '../generators/football-pointless.mjs'
import * as playerBetweenClubs from '../generators/player-between-clubs.mjs'
import flowTpl from '../templates/flow-quiz-v1.mjs'
import winnerTpl from '../templates/winner-stays-on-v1.mjs'
import gridTpl from '../templates/football-pointless-v1.mjs'

export const FORMATS = {
  'winner-stays-on': { gen: winnerStaysOn.generate, tpl: withIntro(winnerTpl, 'winner-stays-on') },
  'career-path': { gen: careerPath.generate, tpl: withIntro(flowTpl, 'career-path') },
  'who-am-i': { gen: whoAmI.generate, tpl: withIntro(flowTpl, 'who-am-i') },
  'played-alongside': { gen: playedAlongside.generate, tpl: withIntro(flowTpl, 'played-alongside') },
  'guess-the-club': { gen: guessTheClub.generate, tpl: withIntro(flowTpl, 'guess-the-club') },
  'football-pointless': { gen: footballPointless.generate, tpl: withIntro(gridTpl, 'football-pointless') },
  'player-between-clubs': { gen: playerBetweenClubs.generate, tpl: withIntro(gridTpl, 'player-between-clubs') },
}

// Render one spec → <dir>/<slug>.mp4 (+ .silent.mp4 master + .json metadata). `bed` overrides the
// music track (used by the trial to cycle music by publish order so no two in a row share a loop).
export async function renderSpec(spec, dir, { bed } = {}) {
  const F = FORMATS[spec.format]
  mkdirSync(dir, { recursive: true })
  const mp4 = path.join(dir, `${spec.slug}.mp4`)
  const silent = mp4.replace(/\.mp4$/, '.silent.mp4')
  if (F.tpl.assets) await prefetch(F.tpl.assets(spec))
  await renderVideo({ scene: (t) => F.tpl.scene(spec, t), fps: F.tpl.fps, durationSec: F.tpl.duration(spec), outPath: silent })
  const cues = F.tpl.cues ? F.tpl.cues(spec) : (spec.audioCues || [])
  const mux = muxAudio(silent, cues, { format: spec.format, seed: spec.slug, bed })
  if (mux.audio) renameSync(mux.path, mp4); else copyFileSync(silent, mp4)
  const meta = { slug: spec.slug, format: spec.format, version: spec.version, difficulty: spec.difficulty, width: 1080, height: 1920, fps: F.tpl.fps, durationSec: +F.tpl.duration(spec).toFixed(2), generatedAt: new Date().toISOString(), question: spec.question, answer: spec.answer, entities: spec.entities, ...spec.metadata, engagement: spec.engagement, audio: { cues: cues.length, list: cues, applied: mux.audio, bed: mux.bed || null } }
  writeFileSync(path.join(dir, `${spec.slug}.json`), JSON.stringify(meta, null, 2) + '\n')
  return { mp4, meta }
}
