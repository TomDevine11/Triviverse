#!/usr/bin/env node
// TikTok publisher.
//   npm run publish-tiktok                       → process DUE items in the trial queue (scheduler calls this)
//   npm run publish-tiktok -- <slug>             → post one specific video now (SELF_ONLY test)
//   npm run publish-tiktok -- --file <path.mp4>  → same, by path
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCaption } from './caption.mjs'
import { getAccessToken, creatorInfoQuery, initDirectPost, uploadWholeFile, pollStatus } from './tiktok.mjs'
import { loadQueue, saveQueue, dueItems } from './queue.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SHORTS = path.join(ROOT, 'output', 'shorts')
const MAX_ATTEMPTS = 4
const SPACING_MS = 15000 // gap between posts within a run (rate limit: 6 posting req/min/user)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Cover on the opening question card (~0.9s), never the reveal.
const coverFor = (durSec) => Math.min(900, Math.round((durSec || 12) * 1000) - 800)

// Init → upload → poll one file. Returns { publish_id, post_id, status, fail_reason }.
async function postOne(token, mp4, title, privacyLevel, info, durSec, onTick) {
  const bytes = statSync(mp4).size
  const { publish_id, upload_url } = await initDirectPost(token, {
    title, privacyLevel,
    disableComment: !!info.comment_disabled, disableDuet: !!info.duet_disabled, disableStitch: !!info.stitch_disabled,
    coverMs: coverFor(durSec), videoSize: bytes, chunkSize: bytes, totalChunks: 1,
  })
  await uploadWholeFile(upload_url, readFileSync(mp4))
  const final = await pollStatus(token, publish_id, { onTick })
  return { publish_id, post_id: final.publicaly_available_post_id?.[0] || null, status: final.status, fail_reason: final.fail_reason || null }
}

// ── Queue mode: publish everything whose scheduled time has arrived ──
async function runQueue() {
  const q = loadQueue()
  if (!q) { console.log('No trial queue found. Build one first: npm run prepare-tiktok-trial'); return }
  const token = await getAccessToken()
  const info = await creatorInfoQuery(token)
  const options = info.privacy_level_options || []
  const want = q.config.privacy
  if (!options.includes(want)) {
    console.error(`\n✗ Configured privacy "${want}" is not available yet (app unaudited). API offers: ${options.join(', ')}.`)
    console.error(`  Nothing posted. Get the app audited for public Direct Post, or set config.privacy to SELF_ONLY for a private dry-run.\n`)
    process.exit(2)
  }
  const due = dueItems(q).filter((it) => it.status === 'scheduled')
  const pubCount = () => q.items.filter((i) => i.status === 'published').length
  if (!due.length) { console.log(`Nothing due at ${new Date().toLocaleString('en-GB')}. Published ${pubCount()}/${q.items.length}.`); return }
  console.log(`${due.length} due — posting ${want}…`)
  for (const item of due) {
    if (item.status !== 'scheduled') continue // guard against a concurrent run
    const mp4 = path.join(ROOT, item.file)
    if (!existsSync(mp4)) { item.error = 'file missing — render the trial first'; saveQueue(q); console.log(`  ✗ ${item.slug} — file missing`); continue }
    const durSec = existsSync(mp4.replace(/\.mp4$/, '.json')) ? JSON.parse(readFileSync(mp4.replace(/\.mp4$/, '.json'), 'utf8')).durationSec : 12
    item.status = 'publishing'; item.attempts++; saveQueue(q)
    try {
      const r = await postOne(token, mp4, item.title, want, info, durSec)
      if (r.status !== 'PUBLISH_COMPLETE') throw new Error(r.status + (r.fail_reason ? ` (${r.fail_reason})` : ''))
      item.status = 'published'; item.publish_id = r.publish_id; item.post_id = r.post_id; item.publishedAt = new Date().toISOString(); item.error = null
      console.log(`  ✓ ${item.slug} → ${r.post_id || r.publish_id}`)
    } catch (e) {
      item.error = e.message
      item.status = item.attempts >= MAX_ATTEMPTS ? 'failed' : 'scheduled' // retry next run unless exhausted
      console.log(`  ✗ ${item.slug} — ${e.message}${item.status === 'scheduled' ? ' (retry next run)' : ' (failed)'}`)
    }
    saveQueue(q)
    await sleep(SPACING_MS)
  }
  console.log(`\nPublished ${pubCount()}/${q.items.length} total.`)
}

// ── Single-post mode (SELF_ONLY test) ──
function resolveVideo(arg) {
  if (arg && (arg.endsWith('.mp4') || arg.includes('/'))) { const p = path.isAbsolute(arg) ? arg : path.join(ROOT, arg); return existsSync(p) ? p : null }
  const all = []
  for (const d of readdirSync(SHORTS, { withFileTypes: true }).filter((x) => x.isDirectory())) for (const f of readdirSync(path.join(SHORTS, d.name))) if (f.endsWith('.mp4') && !f.endsWith('.silent.mp4') && !f.includes('.__')) all.push(path.join(SHORTS, d.name, f))
  return arg ? all.find((p) => path.basename(p, '.mp4') === arg) || null : all[0] || null
}
async function postSingle(arg) {
  const mp4 = resolveVideo(arg)
  if (!mp4) { console.error(`\nNo video found for "${arg || '(default)'}".\n`); process.exit(1) }
  const meta = JSON.parse(readFileSync(mp4.replace(/\.mp4$/, '.json'), 'utf8'))
  const { caption, hashtags, title } = buildCaption(meta)
  console.log(`\nSelected video:\nFormat:    ${meta.format}\nDuration:  ${(meta.durationSec || 0).toFixed(2)}s\nFile size: ${(statSync(mp4).size / 1048576).toFixed(2)} MB\nCaption:   ${caption.replace(/\n/g, ' / ')}\nHashtags:  ${hashtags.join(' ')}\n`)
  const token = await getAccessToken()
  const info = await creatorInfoQuery(token)
  const options = info.privacy_level_options || []
  console.log(`  privacy options: ${options.join(', ')}`)
  if (!options.includes('SELF_ONLY')) { console.error('\nSELF_ONLY not offered — aborting.\n'); process.exit(1) }
  console.log('Posting SELF_ONLY (private test)…')
  const r = await postOne(token, mp4, title, 'SELF_ONLY', info, meta.durationSec, (s) => console.log(`  status: ${s}`))
  console.log('')
  if (r.status === 'PUBLISH_COMPLETE') console.log(`✅ PUBLISH_COMPLETE — publish_id ${r.publish_id}${r.post_id ? `, post_id ${r.post_id}` : ''} (private)\n`)
  else { console.log(`❌ ${r.status}${r.fail_reason ? ` — ${r.fail_reason}` : ''}\n`); process.exit(1) }
}

const args = process.argv.slice(2)
const explicit = args.includes('--file') || (args[0] && !args[0].startsWith('--'))
;(explicit ? postSingle(args.includes('--file') ? args[args.indexOf('--file') + 1] : args[0]) : (loadQueue() ? runQueue() : postSingle()))
  .catch((e) => { console.error(`\n✗ ${e.message}\n`); process.exit(1) })
