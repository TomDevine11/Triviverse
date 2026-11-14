// Counts opens of share links (/s/…, /c/…) per UTC day, split into real people
// vs. chat-app link-preview fetchers. Fire-and-forget via ctx.waitUntil, so a
// failed write never slows or breaks the redirect. Schema: migrations/0006.

const PREVIEW_UA = /bot\b|bot\/|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|skypeuri|linkedin|embedly|vkshare|pinterest|redditbot|applebot|headless|python-requests|curl\/|wget/i

export function isPreviewFetch(ua) {
  return !ua || PREVIEW_UA.test(ua)
}

export function shareKind(pathname) {
  if (/^\/s\/league\//.test(pathname)) return 'league'
  if (/^\/s\/[a-z0-9]+\/?$/.test(pathname)) return 'challenge'
  if (/^\/c\/[A-Za-z0-9]{5,12}\/?$/.test(pathname)) return 'short'
  return null
}

export function countShareOpen(request, env, ctx) {
  if (!env.DB || !ctx?.waitUntil || request.method !== 'GET') return
  const kind = shareKind(new URL(request.url).pathname)
  if (!kind) return
  const col = isPreviewFetch(request.headers.get('user-agent') || '') ? 'preview' : 'human'
  const day = new Date().toISOString().slice(0, 10)
  ctx.waitUntil(
    env.DB.prepare(`INSERT INTO share_opens (day, kind, ${col}) VALUES (?, ?, 1)
      ON CONFLICT(day, kind) DO UPDATE SET ${col} = ${col} + 1`).bind(day, kind).run().catch(() => {}),
  )
}
