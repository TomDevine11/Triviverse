#!/usr/bin/env node
// Build the 10-day trial queue (and optionally render the finals). Publishes NOTHING.
//   npm run prepare-tiktok-trial                 # plan + queue + table (no render)
//   npm run prepare-tiktok-trial -- --render     # also render the final MP4s (long)
//   npm run prepare-tiktok-trial -- --count 150 --per-day 10 --start 2026-09-01
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { selectTrial, subjectOf } from './select-trial.mjs'
import { DEFAULT_CONFIG, slotTime, saveQueue, QUEUE_FILE } from './queue.mjs'
import { buildCaption } from './caption.mjs'
import { musicTracks } from '../shorts/lib/audio.mjs'
import { renderSpec } from '../shorts/lib/engine.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SHORTS = path.join(ROOT, 'output', 'shorts')
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d }
const flag = (n) => process.argv.includes(`--${n}`)

const count = +arg('count', DEFAULT_CONFIG.count)
const perDay = +arg('per-day', DEFAULT_CONFIG.perDay)
const times = (arg('times') ? arg('times').split(',') : DEFAULT_CONFIG.times).slice(0, perDay)
const start = arg('start') ? new Date(arg('start') + 'T00:00:00') : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d })()
if (times.length < perDay) { console.error(`Need ${perDay} times, have ${times.length}. Pass --times "09:00,11:00,…".`); process.exit(1) }

// Scale the 100-weighting to the requested count.
const scale = count / Object.values(DEFAULT_CONFIG.weights).reduce((a, b) => a + b, 0)
const weights = Object.fromEntries(Object.entries(DEFAULT_CONFIG.weights).map(([k, v]) => [k, Math.round(v * scale)]))

console.log(`\nSelecting ${count} videos (weights: ${Object.entries(weights).map(([k, v]) => `${k} ${v}`).join(', ')})…`)
const { items: specs, report } = selectTrial(weights)
const chosen = specs.slice(0, count)
if (chosen.length < count) console.log(`⚠ only ${chosen.length}/${count} available after quality+variety guards`)
if (Object.keys(report.shortfalls).length) console.log(`⚠ shortfalls: ${JSON.stringify(report.shortfalls)} → substituted: ${JSON.stringify(report.substitutions)}`)

const tracks = musicTracks()
const items = chosen.map((spec, i) => {
  const day = Math.floor(i / perDay), slot = i % perDay
  const cap = buildCaption({ format: spec.format })
  const dir = path.join(SHORTS, spec.format)
  const bed = spec.format === 'football-pointless' ? null : (tracks.length ? tracks[i % tracks.length] : null) // cycle music by publish order
  return {
    id: i + 1,
    scheduledAt: slotTime(start, day, times[slot]).toISOString(),
    day: day + 1, slot: slot + 1,
    format: spec.format, slug: spec.slug,
    subject: subjectOf(spec), answer: spec.answer, entities: spec.entities,
    file: path.relative(ROOT, path.join(dir, `${spec.slug}.mp4`)),
    caption: cap.caption, title: cap.title, hashtags: cap.hashtags,
    bed, status: 'scheduled', publish_id: null, post_id: null, attempts: 0, publishedAt: null, error: null,
    _spec: undefined, // (spec kept only for optional render below, not serialised)
  }
})

const queue = { createdAt: new Date().toISOString(), config: { ...DEFAULT_CONFIG, count, perDay, times, startDate: start.toISOString() }, items }
saveQueue(queue)

// ── table ──
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const LABEL = { 'who-am-i': 'Who Am I?', 'winner-stays-on': 'Winner Stays On', 'career-path': 'Career Path', 'guess-the-club': 'Guess the Club', 'played-alongside': 'Played Alongside', 'football-pointless': 'Football Pointless', 'player-between-clubs': 'Between Clubs' }
console.log(`\n${'DATE'.padEnd(13)}${'TIME'.padEnd(7)}${'FORMAT'.padEnd(18)}${'SUBJECT'.padEnd(34)}STATUS`)
console.log('─'.repeat(84))
let curDay = 0
for (const it of items) {
  if (it.day !== curDay) { if (curDay) console.log(''); curDay = it.day }
  console.log(`${fmtDate(it.scheduledAt).padEnd(13)}${fmtTime(it.scheduledAt).padEnd(7)}${(LABEL[it.format] || it.format).padEnd(18)}${String(it.subject).slice(0, 32).padEnd(34)}${it.status}`)
}
const dist = items.reduce((m, it) => ((m[it.format] = (m[it.format] || 0) + 1), m), {})
console.log(`\n${items.length} videos over ${Math.ceil(items.length / perDay)} days · ${perDay}/day · ${Object.entries(dist).map(([k, v]) => `${LABEL[k] || k} ${v}`).join(' · ')}`)
console.log(`Queue → ${path.relative(ROOT, QUEUE_FILE)}   (nothing published)`)

// ── optional render ──
if (flag('render')) {
  console.log(`\nRendering ${chosen.length} finals (this takes a while)…`)
  let done = 0
  for (let i = 0; i < chosen.length; i++) {
    const spec = chosen[i], dir = path.join(SHORTS, spec.format)
    const mp4 = path.join(dir, `${spec.slug}.mp4`)
    if (existsSync(mp4) && !flag('force')) { done++; continue }
    try { await renderSpec(spec, dir, { bed: items[i].bed || undefined }); done++; if (done % 10 === 0) console.log(`  …${done}/${chosen.length}`) }
    catch (e) { console.log(`  ✗ ${spec.slug} — ${e.message}`) }
  }
  console.log(`Rendered ${done}/${chosen.length}. Finals live next to the queue file paths.`)
} else {
  console.log(`\nInspect the queue above. To render the finals: npm run prepare-tiktok-trial -- --render`)
}
