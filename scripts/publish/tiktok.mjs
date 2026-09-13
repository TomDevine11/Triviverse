// Minimal client for the official TikTok Content Posting API (Direct Post) + OAuth v2.
// Docs: developers.tiktok.com/docs/en/content-posting-api-get-started (+ -reference-direct-post).
// No browser automation, no unofficial endpoints — only the documented HTTPS API.
import { createHash, randomBytes } from 'node:crypto'
import { loadEnv, writeEnv } from './env.mjs'

const API = 'https://open.tiktokapis.com'
const AUTHORIZE = 'https://www.tiktok.com/v2/auth/authorize/'
export const SCOPES = ['user.info.basic', 'video.publish']

// ---------- OAuth ----------
export function pkce() {
  // NB: TikTok's S256 is NON-STANDARD — the code_challenge is the HEX digest of SHA-256(verifier),
  // not the RFC-7636 base64url digest. Using base64url here yields "code verifier/challenge invalid".
  const verifier = randomBytes(48).toString('base64url') // 64 chars from [A-Za-z0-9-_] ⊂ allowed set
  const challenge = createHash('sha256').update(verifier).digest('hex')
  return { verifier, challenge }
}

export function buildAuthorizeUrl({ clientKey, redirectUri, state, challenge, scopes = SCOPES }) {
  const q = new URLSearchParams({
    client_key: clientKey, response_type: 'code', scope: scopes.join(','),
    redirect_uri: redirectUri, state, code_challenge: challenge, code_challenge_method: 'S256',
  })
  return `${AUTHORIZE}?${q}`
}

async function tokenRequest(form) {
  const res = await fetch(`${API}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams(form),
  })
  const body = await res.json()
  if (!res.ok || body.error) throw new Error(`OAuth token error: ${body.error || res.status} — ${body.error_description || ''}`)
  return body // { access_token, expires_in, refresh_token, refresh_expires_in, open_id, scope, token_type }
}

// Persist tokens to the gitignored env file (values never logged).
function persist(tok) {
  writeEnv({
    TIKTOK_ACCESS_TOKEN: tok.access_token,
    TIKTOK_REFRESH_TOKEN: tok.refresh_token,
    TIKTOK_TOKEN_EXPIRES: String(Math.floor(Date.now() / 1000) + (tok.expires_in || 0)),
  })
}

export async function exchangeCode({ clientKey, clientSecret, code, redirectUri, verifier }) {
  const tok = await tokenRequest({
    client_key: clientKey, client_secret: clientSecret, grant_type: 'authorization_code',
    code, redirect_uri: redirectUri, code_verifier: verifier,
  })
  persist(tok)
  return tok
}

async function refresh({ clientKey, clientSecret, refreshToken }) {
  const tok = await tokenRequest({
    client_key: clientKey, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken,
  })
  persist(tok)
  return tok
}

// Return a valid access token, refreshing (and persisting) if the stored one is expired/near-expiry.
export async function getAccessToken() {
  loadEnv()
  const { TIKTOK_CLIENT_KEY: clientKey, TIKTOK_CLIENT_SECRET: clientSecret,
    TIKTOK_ACCESS_TOKEN: access, TIKTOK_REFRESH_TOKEN: refreshToken, TIKTOK_TOKEN_EXPIRES } = process.env
  const now = Math.floor(Date.now() / 1000)
  const exp = Number(TIKTOK_TOKEN_EXPIRES || 0)
  if (access && now < exp - 60) return access
  if (refreshToken && clientKey && clientSecret) return (await refresh({ clientKey, clientSecret, refreshToken })).access_token
  if (access) return access // no refresh available; let the API call surface a 401 with guidance
  throw new Error('No TikTok access token. Run `npm run tiktok-auth` first.')
}

// ---------- Content Posting API ----------
async function api(path, token, payload) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(payload ?? {}),
  })
  const body = await res.json().catch(() => ({}))
  const err = body?.error
  if (!res.ok || (err && err.code && err.code !== 'ok')) {
    throw new Error(`TikTok ${path} failed: ${err?.code || res.status} — ${err?.message || ''} (log_id ${err?.log_id || 'n/a'})`)
  }
  return body.data
}

export const creatorInfoQuery = (token) => api('/v2/post/publish/creator_info/query/', token)

export function initDirectPost(token, { title, privacyLevel, disableComment, disableDuet, disableStitch, coverMs = 0, videoSize, chunkSize, totalChunks }) {
  return api('/v2/post/publish/video/init/', token, {
    post_info: {
      title,
      privacy_level: privacyLevel,
      disable_comment: !!disableComment,
      disable_duet: !!disableDuet,
      disable_stitch: !!disableStitch,
      video_cover_timestamp_ms: coverMs,
    },
    source_info: { source: 'FILE_UPLOAD', video_size: videoSize, chunk_size: chunkSize, total_chunk_count: totalChunks },
  }) // → { publish_id, upload_url }
}

// Single-chunk upload (our videos are <5 MB, so the whole file is one chunk).
export async function uploadWholeFile(uploadUrl, buffer) {
  const size = buffer.length
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(size),
      'Content-Range': `bytes 0-${size - 1}/${size}`,
    },
    body: buffer,
  })
  if (!res.ok && res.status !== 201) throw new Error(`Video upload failed: HTTP ${res.status}`)
  return res.status
}

export const fetchStatus = (token, publishId) => api('/v2/post/publish/status/fetch/', token, { publish_id: publishId })

// Poll until PUBLISH_COMPLETE / FAILED / timeout.
export async function pollStatus(token, publishId, { intervalMs = 3000, timeoutMs = 120000, onTick } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const s = await fetchStatus(token, publishId)
    onTick?.(s.status)
    if (s.status === 'PUBLISH_COMPLETE' || s.status === 'FAILED') return s
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`Timed out waiting for publish ${publishId}`)
}
