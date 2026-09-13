#!/usr/bin/env node
// TikTok app-review DEMO — ONE self-narrating run for the sandbox demo video.
// Shows both products end-to-end, with big legible terminal output for screen capture:
//   STEP 1  Login Kit / user.info.basic — OAuth consent + reading the creator profile
//   STEP 2  Content Posting API / video.publish — a SELF_ONLY Direct Post
//
// Record your screen (Cmd+Shift+5 → Record Selected/Entire Screen) while running:
//   npm run tiktok-demo
// The connected TikTok account must be set to PRIVATE (sandbox rule: an unaudited
// client can only post to a private account). Only you can do the login when the
// browser opens; everything else runs itself.
import http from 'node:http'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './env.mjs'
import {
  pkce, buildAuthorizeUrl, exchangeCode, getAccessToken, creatorInfoQuery,
  initDirectPost, uploadWholeFile, pollStatus, SCOPES,
} from './tiktok.mjs'
import { buildCaption } from './caption.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
// --no-open: don't shell out to `open`. macOS would raise whichever Chrome window it
// last used — on another Space that yanks the screen recording away mid-demo. Instead
// the URL is published to output/tiktok-demo/ so the driver can navigate a chosen tab.
const NO_OPEN = process.argv.includes('--no-open') || process.env.TIKTOK_DEMO_NO_OPEN === '1'
const URL_SINK = path.join(ROOT, 'output/tiktok-demo')
const publishUrl = (name, url) => {
  if (!NO_OPEN) { spawn('open', [url], { stdio: 'ignore', detached: true }).on('error', () => {}); return }
  mkdirSync(URL_SINK, { recursive: true })
  writeFileSync(path.join(URL_SINK, name), url)
  console.log('  [driver] ' + name.replace(/\.txt$/, '') + ' → ' + url.slice(0, 60) + '…')
}
const rule = (c = '─') => console.log(c.repeat(58))
const banner = (t) => { console.log(''); rule('━'); console.log('  ' + t); rule('━') }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

loadEnv()
const clientKey = process.env.TIKTOK_CLIENT_KEY
const clientSecret = process.env.TIKTOK_CLIENT_SECRET
const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'http://127.0.0.1:8787/callback'
if (!clientKey || !clientSecret) { console.error('\nMissing TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET in scripts/publish/.env.publish.local\n'); process.exit(1) }

// ── Intro ── (opens the live product so the recording shows the triviverse.com domain)
banner('TRIVIVERSE × TIKTOK — Content Posting API demo')
console.log('  Product:  https://triviverse.com  (football trivia web games)')
console.log('  Purpose:  publish our OWN original trivia videos to our TikTok')
console.log('  Scopes:   ' + SCOPES.join(', '))
console.log('\n  Opening the product site for the demo…')
publishUrl('site-url.txt', 'https://triviverse.com')
await sleep(4000)

// ── STEP 1 — Login Kit (OAuth consent) ──
banner('STEP 1 — Connect with TikTok  (Login Kit · user.info.basic)')
const { verifier, challenge } = pkce()
const state = randomBytes(8).toString('hex')
const authorizeUrl = buildAuthorizeUrl({ clientKey, redirectUri, state, challenge, scopes: SCOPES })
const u = new URL(redirectUri)
await new Promise((resolve, reject) => {
  const server = http.createServer(async (req, res) => {
    const q = new URL(req.url, `http://${req.headers.host}`)
    if (q.pathname !== u.pathname) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h2 style="font-family:system-ui;padding:40px">✅ Connected — return to the terminal.</h2>')
    try {
      if (q.searchParams.get('error')) throw new Error('TikTok error: ' + q.searchParams.get('error'))
      if (q.searchParams.get('state') !== state) throw new Error('state mismatch')
      await exchangeCode({ clientKey, clientSecret, code: q.searchParams.get('code'), redirectUri, verifier })
      console.log('  ✅ Authorized — access + refresh tokens stored locally.')
      setTimeout(() => { server.close(); resolve() }, 200)
    } catch (e) { setTimeout(() => { server.close(); reject(e) }, 200) }
  })
  server.listen(Number(u.port || 80), u.hostname, () => {
    console.log('  Opening TikTok’s consent screen…')
    console.log('  → Log in and tap Authorize (this is the only step that needs you).')
    publishUrl('authorize-url.txt', authorizeUrl)
  })
})

// ── user.info.basic demonstration ──
banner('Reading the creator profile  (user.info.basic)')
const token = await getAccessToken()
const info = await creatorInfoQuery(token)
console.log('  Connected account:', info.creator_nickname || info.creator_username || '(account)')
console.log('  Privacy options:  ', (info.privacy_level_options || []).join(', '))
await sleep(3000)

// ── STEP 2 — Content Posting API (Direct Post) ──
banner('STEP 2 — Post a video  (Content Posting API · video.publish · Direct Post)')
const queue = JSON.parse(readFileSync(path.join(ROOT, 'output/shorts/_trial-queue.json'), 'utf8'))
const item = queue.items[0]
const mp4 = path.join(ROOT, item.file)
const meta = JSON.parse(readFileSync(mp4.replace(/\.mp4$/, '.json'), 'utf8'))
const { title } = buildCaption(meta)
console.log('  Video:   ', path.basename(mp4))
console.log('  Caption: ', title.split('\n')[0])
console.log('  Privacy:  SELF_ONLY (private)')
const bytes = statSync(mp4).size
console.log('\n  → init Direct Post…')
let publish_id, upload_url
try {
  ({ publish_id, upload_url } = await initDirectPost(token, { title, privacyLevel: 'SELF_ONLY', coverMs: 900, videoSize: bytes, chunkSize: bytes, totalChunks: 1 }))
} catch (e) {
  banner('❌ init failed — ' + e.message)
  if (/private/.test(e.message)) console.log('  → The account must be set to PRIVATE for a sandbox post. Set it private, then re-run.')
  process.exit(1)
}
console.log('    publish_id:', publish_id)
console.log('  → uploading video…')
await uploadWholeFile(upload_url, readFileSync(mp4))
console.log('  → polling status…')
const final = await pollStatus(token, publish_id, { onTick: (s) => console.log('    status:', s) })
if (final.status === 'PUBLISH_COMPLETE') {
  banner('✅ PUBLISH_COMPLETE — posted to TikTok (private)')
  console.log('  The video is now on the connected account as a private (SELF_ONLY) post.')
  console.log('  End of demo.')
} else {
  banner('❌ ' + final.status + (final.fail_reason ? ` — ${final.fail_reason}` : ''))
  process.exit(1)
}
