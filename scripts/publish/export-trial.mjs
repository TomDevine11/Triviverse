#!/usr/bin/env node
// Package the trial videos for MANUAL posting from a phone: copy each queued final into day folders
// with post-order names, and write a POSTING-GUIDE the phone can read (per-day list + captions).
//   node scripts/publish/export-trial.mjs
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadQueue } from './queue.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = path.join(ROOT, 'output', 'trial-export')
const LABEL = { 'who-am-i': 'Who Am I?', 'winner-stays-on': 'Winner Stays On', 'career-path': 'Career Path', 'guess-the-club': 'Guess the Club', 'played-alongside': 'Played Alongside', 'football-pointless': 'Football Pointless', 'player-between-clubs': 'Between Clubs' }
const slugish = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28)

const q = loadQueue()
if (!q) { console.error('No queue. Run: npm run prepare-tiktok-trial'); process.exit(1) }

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const time = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const date = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
const byDay = {}
let copied = 0, missing = 0
for (const it of q.items) (byDay[it.day] ||= []).push(it)

let guide = `TRIVIVERSE — 10-DAY TIKTOK POSTING GUIDE\n${q.items.length} videos · ${q.config.perDay}/day\n\nHOW TO POST (phone): open the day's folder → for each clip, share/upload to TikTok → paste the caption below → post.\nCaptions are short and repeat per format, so you can also just keep this guide open.\n`

for (const day of Object.keys(byDay).map(Number).sort((a, b) => a - b)) {
  const items = byDay[day]
  const dir = path.join(OUT, `Day-${String(day).padStart(2, '0')}`)
  mkdirSync(dir, { recursive: true })
  guide += `\n\n══════════ DAY ${day} — ${date(items[0].scheduledAt)} ══════════\n`
  items.forEach((it, i) => {
    const src = path.join(ROOT, it.file)
    const name = `${String(i + 1).padStart(2, '0')}_${time(it.scheduledAt).replace(':', '')}_${it.format}_${slugish(it.subject)}.mp4`
    if (existsSync(src)) { copyFileSync(src, path.join(dir, name)); copied++ } else { missing++ }
    guide += `\n[${i + 1}]  ~${time(it.scheduledAt)}  ${LABEL[it.format] || it.format} — ${it.subject}\n     file: Day-${String(day).padStart(2, '0')}/${name}\n     caption:\n       ${it.caption.replace(/\n/g, '\n       ')}\n       ${it.hashtags.join(' ')}\n`
  })
}
writeFileSync(path.join(OUT, 'POSTING-GUIDE.txt'), guide)

// A compact CSV (date, time, format, subject, caption, file) for fast work through the scheduler.
const csvCell = (s) => `"${String(s).replace(/"/g, '""').replace(/\n/g, ' ')}"`
let csv = 'day,date,time,format,subject,caption,file\n'
for (const day of Object.keys(byDay).map(Number).sort((a, b) => a - b)) {
  byDay[day].forEach((it, i) => {
    const name = `${String(i + 1).padStart(2, '0')}_${time(it.scheduledAt).replace(':', '')}_${it.format}_${slugish(it.subject)}.mp4`
    csv += [day, date(it.scheduledAt), time(it.scheduledAt), LABEL[it.format] || it.format, it.subject, `${it.caption}\n${it.hashtags.join(' ')}`, `Day-${String(day).padStart(2, '0')}/${name}`].map(csvCell).join(',') + '\n'
  })
}
writeFileSync(path.join(OUT, 'schedule.csv'), csv)

console.log(`Exported ${copied} videos to ${path.relative(ROOT, OUT)} (${missing} not yet rendered).`)
console.log(`Guide → POSTING-GUIDE.txt   Sheet → schedule.csv`)
