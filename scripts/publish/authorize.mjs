#!/usr/bin/env node
// One-time TikTok OAuth (desktop loopback + PKCE). Opens the consent page, catches the redirect on
// 127.0.0.1, exchanges the code, and writes the access/refresh tokens into scripts/publish/.env.publish.local
// (gitignored). Tokens are NEVER printed. Run: npm run tiktok-auth
import http from 'node:http'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { loadEnv, ENV_FILE } from './env.mjs'
import { pkce, buildAuthorizeUrl, exchangeCode, SCOPES } from './tiktok.mjs'

loadEnv()
const clientKey = process.env.TIKTOK_CLIENT_KEY
const clientSecret = process.env.TIKTOK_CLIENT_SECRET
const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'http://127.0.0.1:8787/callback'

if (!clientKey || !clientSecret) {
  console.error(`\nMissing TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET.`)
  console.error(`Add them to ${ENV_FILE} (copy scripts/publish/.env.publish.example), then re-run.\n`)
  process.exit(1)
}

const url = new URL(redirectUri)
const port = Number(url.port || 80)
const callbackPath = url.pathname
const { verifier, challenge } = pkce()
const state = randomBytes(8).toString('hex')
const authorizeUrl = buildAuthorizeUrl({ clientKey, redirectUri, state, challenge, scopes: SCOPES })

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`)
  if (reqUrl.pathname !== callbackPath) { res.writeHead(404); res.end('not found'); return }
  const code = reqUrl.searchParams.get('code')
  const returnedState = reqUrl.searchParams.get('state')
  const authErr = reqUrl.searchParams.get('error')
  const done = (msg) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(`<html><body style="font-family:system-ui;padding:40px"><h2>${msg}</h2><p>You can close this tab and return to the terminal.</p></body></html>`) }
  try {
    if (authErr) throw new Error(`TikTok returned error: ${authErr}`)
    if (!code) throw new Error('No authorization code in redirect')
    if (returnedState !== state) throw new Error('State mismatch (possible CSRF) — aborting')
    await exchangeCode({ clientKey, clientSecret, code, redirectUri, verifier }) // persists tokens silently
    done('✅ TikTok connected. Tokens saved locally.')
    console.log('\n✅ Authorized. Access + refresh tokens written to the local env file (not printed).')
    console.log('   Next: npm run publish-tiktok -- <video-slug>\n')
    setTimeout(() => { server.close(); process.exit(0) }, 300)
  } catch (e) {
    done(`❌ ${e.message}`)
    console.error(`\n❌ Authorization failed: ${e.message}\n`)
    setTimeout(() => { server.close(); process.exit(1) }, 300)
  }
})

server.listen(port, url.hostname, () => {
  console.log(`\nTikTok authorization`)
  console.log(`  Listening for the redirect on ${redirectUri}`)
  console.log(`\n  Opening the consent page in your browser. If it doesn't open, paste this URL:\n`)
  console.log(`  ${authorizeUrl}\n`)
  spawn(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open', [authorizeUrl], { stdio: 'ignore', detached: true }).on('error', () => {})
})
