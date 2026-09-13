#!/usr/bin/env node
/**
 * Triviverse Publishing Studio — the local admin UI for posting our own trivia
 * shorts to TikTok.
 *
 * This is the surface TikTok's app review sees: a real interface with real
 * interactions (Connect → choose a video → review the caption → Post), rather
 * than a terminal transcript. It runs on 127.0.0.1:8787, which is the redirect
 * URI already registered on the app's Desktop platform, so no portal changes
 * and no client secret ever leaves this machine.
 *
 *   npm run studio
 */
import express from 'express'
import { randomBytes } from 'node:crypto'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { execFile } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './env.mjs'
import {
  pkce, buildAuthorizeUrl, exchangeCode, getAccessToken, creatorInfoQuery,
  initDirectPost, uploadWholeFile, fetchStatus, SCOPES,
} from './tiktok.mjs'
import { buildCaption } from './caption.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
loadEnv()

const clientKey = process.env.TIKTOK_CLIENT_KEY
const clientSecret = process.env.TIKTOK_CLIENT_SECRET
const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'http://127.0.0.1:8787/callback'
if (!clientKey || !clientSecret) {
  console.error('\nMissing TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET in scripts/publish/.env.publish.local\n')
  process.exit(1)
}

const app = express()
app.use(express.json())

// ── video catalogue ──────────────────────────────────────────────
// Reads the same prepared trial queue the automated publisher uses, so the UI
// and the unattended pipeline always agree on what is postable.
function catalogue(limit = 12) {
  const queuePath = path.join(ROOT, 'output/shorts/_trial-queue.json')
  if (!existsSync(queuePath)) return []
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'))
  return queue.items.slice(0, limit).map((item) => {
    const mp4 = path.join(ROOT, item.file)
    const metaPath = mp4.replace(/\.mp4$/, '.json')
    if (!existsSync(mp4) || !existsSync(metaPath)) return null
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    const { title } = buildCaption(meta)
    return {
      slug: meta.slug,
      format: meta.format,
      question: meta.question,
      answer: meta.answer,
      durationSec: meta.durationSec,
      caption: title,
    }
  }).filter(Boolean)
}
const bySlug = (slug) => catalogue(500).find((v) => v.slug === slug)
const fileFor = (slug) => {
  const queue = JSON.parse(readFileSync(path.join(ROOT, 'output/shorts/_trial-queue.json'), 'utf8'))
  const item = queue.items.find((i) => path.basename(i.file, '.mp4') === slug)
  return item ? path.join(ROOT, item.file) : null
}

// ── auth ─────────────────────────────────────────────────────────
let pending = null   // { verifier, state } for the in-flight consent round-trip

app.get('/api/state', async (_req, res) => {
  try {
    const token = await getAccessToken()
    const info = await creatorInfoQuery(token)
    res.json({
      connected: true,
      account: info.creator_nickname || info.creator_username,
      privacyOptions: info.privacy_level_options || [],
      scopes: SCOPES,
    })
  } catch {
    res.json({ connected: false, scopes: SCOPES })
  }
})

app.get('/auth/start', (req, res) => {
  const { verifier, challenge } = pkce()
  const state = randomBytes(8).toString('hex')
  pending = { verifier, state, demo: req.query.demo === '1' }
  res.redirect(buildAuthorizeUrl({ clientKey, redirectUri, state, challenge, scopes: SCOPES }))
})

app.get('/callback', async (req, res) => {
  try {
    if (req.query.error) throw new Error(String(req.query.error))
    if (!pending || req.query.state !== pending.state) throw new Error('state mismatch')
    await exchangeCode({ clientKey, clientSecret, code: String(req.query.code), redirectUri, verifier: pending.verifier })
    const { demo } = pending
    pending = null
    res.redirect(demo ? '/?demo=1&connected=1' : '/?connected=1')
  } catch (e) {
    res.redirect('/?error=' + encodeURIComponent(e.message))
  }
})

// ── catalogue + media ────────────────────────────────────────────
app.get('/api/videos', (_req, res) => res.json(catalogue()))
// Poster frames: a bare <video preload="metadata"> paints black until it is played,
// which reads as a broken grid. Extract one real frame per video (cached on disk).
const POSTERS = path.join(ROOT, 'output/tiktok-demo/posters')
app.get('/poster/:slug.jpg', (req, res) => {
  const file = fileFor(req.params.slug)
  if (!file) return res.status(404).end()
  const out = path.join(POSTERS, req.params.slug + '.jpg')
  if (existsSync(out)) return res.sendFile(out)
  mkdirSync(POSTERS, { recursive: true })
  execFile(ffmpegPath, ['-y', '-v', 'error', '-ss', '2', '-i', file,
    '-frames:v', '1', '-vf', 'scale=340:-1', out], (err) => {
    if (err || !existsSync(out)) return res.status(500).end()
    res.sendFile(out)
  })
})

app.get('/media/:slug.mp4', (req, res) => {
  const file = fileFor(req.params.slug)
  if (!file) return res.status(404).end()
  res.sendFile(file)
})

// ── posting ──────────────────────────────────────────────────────
const jobs = new Map()   // publish_id -> { status, failReason }

app.post('/api/post', async (req, res) => {
  const { slug, caption, privacy = 'SELF_ONLY' } = req.body || {}
  const file = fileFor(slug)
  if (!file) return res.status(400).json({ error: 'unknown video' })
  try {
    const token = await getAccessToken()
    const buf = readFileSync(file)
    const { publish_id, upload_url } = await initDirectPost(token, {
      title: caption, privacyLevel: privacy, coverMs: 900,
      videoSize: buf.length, chunkSize: buf.length, totalChunks: 1,
    })
    jobs.set(publish_id, { status: 'UPLOADING' })
    res.json({ publish_id })
    // upload + poll in the background so the UI can show live progress
    ;(async () => {
      try {
        await uploadWholeFile(upload_url, buf)
        jobs.set(publish_id, { status: 'PROCESSING_UPLOAD' })
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 3000))
          const s = await fetchStatus(token, publish_id)
          jobs.set(publish_id, { status: s.status, failReason: s.fail_reason })
          if (s.status === 'PUBLISH_COMPLETE' || String(s.status).includes('FAIL')) break
        }
      } catch (e) {
        jobs.set(publish_id, { status: 'FAILED', failReason: e.message })
      }
    })()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/post/:id', (req, res) => res.json(jobs.get(req.params.id) || { status: 'UNKNOWN' }))

// Latest job, so a recording script can tell when the demo has finished without
// grabbing screen frames (a second capture blocks while a recording holds the device).
app.get('/api/last-job', (_req, res) => {
  const last = [...jobs.entries()].pop()
  res.json(last ? { publish_id: last[0], ...last[1] } : { status: 'NONE' })
})

app.get('/', (_req, res) => res.type('html').send(PAGE))

const PORT = Number(new URL(redirectUri).port || 8787)
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Triviverse Publishing Studio → http://127.0.0.1:${PORT}\n`)
})

// ── UI ───────────────────────────────────────────────────────────
// Single page, no build step — this is an internal tool, and keeping it
// dependency-free means it always runs even when the site's build is mid-change.
const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Triviverse Publishing Studio</title>
<style>
  :root{
    --bg:#0f0b1a; --panel:#181231; --panel-2:#1f1840; --line:#2c2354;
    --ink:#f4f1ff; --muted:#a89fd0; --brand:#8b5cf6; --brand-2:#a78bfa;
    --ok:#34d399; --warn:#fbbf24; --err:#f87171;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}
  header{padding:28px 40px 22px;border-bottom:1px solid var(--line);
    display:flex;align-items:center;gap:14px}
  .mark{width:34px;height:34px;border-radius:9px;flex:none;
    background:linear-gradient(140deg,var(--brand),#6d28d9);
    display:grid;place-items:center;font-size:18px}
  h1{font-size:17px;margin:0;letter-spacing:-.2px}
  .sub{color:var(--muted);font-size:13px;margin-top:2px}
  main{max-width:1180px;margin:0 auto;padding:30px 40px 70px}
  .step{background:var(--panel);border:1px solid var(--line);border-radius:16px;
    padding:24px 26px;margin-bottom:20px}
  .step-h{display:flex;align-items:center;gap:11px;margin-bottom:6px}
  .num{width:24px;height:24px;border-radius:50%;background:var(--panel-2);
    border:1px solid var(--line);display:grid;place-items:center;
    font-size:12px;font-weight:600;color:var(--brand-2);flex:none}
  .step.done .num{background:var(--brand);border-color:var(--brand);color:#fff}
  h2{font-size:15px;margin:0;font-weight:600}
  .hint{color:var(--muted);font-size:13px;margin:0 0 16px 35px}
  .row{display:flex;align-items:center;gap:14px;margin-left:35px}
  a#connect{display:inline-block;text-decoration:none}
  button,a#connect{font:inherit;font-weight:600;border:0;border-radius:10px;padding:11px 20px;
    background:var(--brand);color:#fff;cursor:pointer;transition:.15s}
  button:hover:not(:disabled),a#connect:hover{background:var(--brand-2)}
  button:disabled{opacity:.4;cursor:not-allowed}
  button.ghost{background:var(--panel-2);border:1px solid var(--line);color:var(--ink)}
  .pill{display:inline-flex;align-items:center;gap:7px;background:var(--panel-2);
    border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:13px}
  .dot{width:7px;height:7px;border-radius:50%;background:var(--muted)}
  .dot.on{background:var(--ok);box-shadow:0 0 0 3px rgba(52,211,153,.15)}
  .scopes{margin-left:35px;margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}
  .scope{font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--brand-2);
    background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.3);
    border-radius:6px;padding:6px 9px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));
    gap:15px;margin-left:35px}
  .card{background:var(--panel-2);border:2px solid transparent;border-radius:13px;
    overflow:hidden;cursor:pointer;transition:.15s}
  .card:hover{transform:translateY(-2px)}
  .card.sel{border-color:var(--brand);box-shadow:0 0 0 4px rgba(139,92,246,.16)}
  .card video{width:100%;aspect-ratio:9/16;object-fit:cover;display:block;background:#000}
  .card .meta{padding:10px 11px}
  .card .fmt{font-size:10.5px;text-transform:uppercase;letter-spacing:.7px;
    color:var(--brand-2);font-weight:700}
  .card .ans{font-size:12.5px;color:var(--ink);margin-top:3px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  textarea{width:100%;background:var(--bg);color:var(--ink);border:1px solid var(--line);
    border-radius:11px;padding:13px 15px;font:inherit;min-height:104px;resize:vertical}
  select{background:var(--bg);color:var(--ink);border:1px solid var(--line);
    border-radius:10px;padding:10px 13px;font:inherit}
  .ml{margin-left:35px}
  .log{margin-left:35px;margin-top:16px;background:var(--bg);border:1px solid var(--line);
    border-radius:11px;padding:15px 17px;font:13px/1.85 ui-monospace,SFMono-Regular,Menlo,monospace;
    color:var(--muted);min-height:52px;white-space:pre-wrap}
  .log b{color:var(--ok);font-weight:600}
  .log i{color:var(--err);font-style:normal}
  .muted{color:var(--muted)}
</style></head><body>
<header>
  <div class="mark">⚡</div>
  <div><h1>Triviverse Publishing Studio</h1>
  <div class="sub">Publish our own football-trivia shorts to TikTok · triviverse.com</div></div>
</header>
<main>
  <section class="step" id="s1">
    <div class="step-h"><div class="num">1</div><h2>Connect your TikTok account</h2></div>
    <p class="hint">Authorise the Studio to read your creator profile and publish videos.</p>
    <div class="row">
      <a id="connect" href="/auth/start" onclick="location.assign('/auth/start');return false">Connect with TikTok</a>
      <span class="pill"><span class="dot" id="dot"></span><span id="acct">Not connected</span></span>
    </div>
    <div class="scopes"><span class="scope">user.info.basic</span><span class="scope">video.publish</span></div>
  </section>

  <section class="step" id="s2">
    <div class="step-h"><div class="num">2</div><h2>Choose a video</h2></div>
    <p class="hint">Original trivia shorts generated by Triviverse. Tap one to select it.</p>
    <div class="grid" id="grid"></div>
  </section>

  <section class="step" id="s3">
    <div class="step-h"><div class="num">3</div><h2>Review the caption</h2></div>
    <p class="hint">This is the text that will appear on the post.</p>
    <div class="ml"><textarea id="cap" placeholder="Select a video first…"></textarea>
      <div style="margin-top:13px;display:flex;align-items:center;gap:11px">
        <span class="muted" style="font-size:13px">Who can view</span>
        <select id="privacy"><option value="SELF_ONLY">Only me (private)</option></select>
      </div></div>
  </section>

  <section class="step" id="s4">
    <div class="step-h"><div class="num">4</div><h2>Post to TikTok</h2></div>
    <p class="hint">Uploads the video and publishes it via the Content Posting API.</p>
    <div class="row"><button id="post" disabled>Post to TikTok</button></div>
    <div class="log" id="log">Waiting…</div>
  </section>
</main>
<script>
const $ = (id) => document.getElementById(id)
let videos = [], selected = null, connected = false
const log = (html) => { $('log').innerHTML = html }

async function refresh(){
  const s = await (await fetch('/api/state')).json()
  connected = s.connected
  $('dot').className = 'dot' + (s.connected ? ' on' : '')
  $('acct').textContent = s.connected ? s.account : 'Not connected'
  $('connect').textContent = s.connected ? 'Reconnect' : 'Connect with TikTok'
  $('s1').classList.toggle('done', s.connected)
  sync()
}
function sync(){ $('post').disabled = !(connected && selected) }

async function load(){
  videos = await (await fetch('/api/videos')).json()
  $('grid').innerHTML = videos.map((v,i) => \`
    <div class="card" data-i="\${i}">
      <video src="/media/\${v.slug}.mp4" poster="/poster/\${v.slug}.jpg" muted preload="none"></video>
      <div class="meta"><div class="fmt">\${v.format.replace(/-/g,' ')}</div>
      <div class="ans">\${v.answer}</div></div>
    </div>\`).join('')
  document.querySelectorAll('.card').forEach((el) => {
    const v = videos[el.dataset.i]
    el.onmouseenter = () => el.querySelector('video').play().catch(()=>{})
    el.onmouseleave = () => { const n = el.querySelector('video'); n.pause(); n.currentTime = 0 }
    el.onclick = () => {
      document.querySelectorAll('.card').forEach((c) => c.classList.remove('sel'))
      el.classList.add('sel'); selected = v; $('cap').value = v.caption
      $('s2').classList.add('done'); $('s3').classList.add('done'); sync()
    }
  })
}

$('post').onclick = async () => {
  $('post').disabled = true
  log('Initialising Direct Post…')
  const r = await (await fetch('/api/post', {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ slug: selected.slug, caption: $('cap').value, privacy: $('privacy').value })})).json()
  if (r.error) { log('<i>Failed — ' + r.error + '</i>'); $('post').disabled = false; return }
  log('publish_id: ' + r.publish_id + '\\nUploading video…')
  const tick = setInterval(async () => {
    const s = await (await fetch('/api/post/' + r.publish_id)).json()
    if (s.status === 'PUBLISH_COMPLETE') {
      clearInterval(tick)
      log('publish_id: ' + r.publish_id + '\\nstatus: PUBLISH_COMPLETE\\n<b>✓ Posted to TikTok.</b>')
      $('s4').classList.add('done')
    } else if (String(s.status).includes('FAIL')) {
      clearInterval(tick)
      log('<i>' + s.status + (s.failReason ? ' — ' + s.failReason : '') + '</i>')
      $('post').disabled = false
    } else {
      log('publish_id: ' + r.publish_id + '\\nstatus: ' + s.status + '…')
    }
  }, 2000)
}

// Demo mode drives the real UI through the real flow — real OAuth, real upload, real
// publish — on a timer. Recording it needs no external browser automation, which is
// what kept filming the wrong window.
const DEMO = location.search.includes('demo=1')
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

async function runDemo(){
  await pause(2500)
  if (!connected) {
    $('connect').scrollIntoView({ block:'center', behavior:'smooth' })
    await pause(1800)
    location.assign('/auth/start?demo=1')
    return
  }
  const first = document.querySelector('.card')
  first.scrollIntoView({ block:'center', behavior:'smooth' })
  await pause(1800)
  first.click()
  await pause(2200)
  $('cap').scrollIntoView({ block:'center', behavior:'smooth' })
  await pause(2600)
  $('post').scrollIntoView({ block:'center', behavior:'smooth' })
  await pause(1600)
  $('post').click()
}

if (!DEMO && location.search.includes('connected=1')) history.replaceState({}, '', '/')
;(async () => { await load(); await refresh(); if (DEMO) runDemo() })()
</script></body></html>`
