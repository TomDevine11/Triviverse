// The share link. Crawlers (WhatsApp, iMessage, X, Discord, Facebook…) read the
// OG tags and unfurl the result image from /og; humans are redirected into the
// game. noindex so these ephemeral per-result URLs never enter search.

import { GAME_ROUTES, SITE_URL, decodeCard } from '../../../lib/card'

export const runtime = 'edge'

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function GET(request, { params }) {
  const url = new URL(request.url)
  const r = url.searchParams.get('r') || ''
  const isDay = params.game === 'day'

  let gameUrl, ogImage, title, desc
  if (isDay) {
    // "My matchday" recap card → image from /day, link to the hub.
    gameUrl = SITE_URL + '/'
    ogImage = `${url.origin}/day?r=${encodeURIComponent(r)}`
    title = 'My Triviverse Matchday'
    desc = "See how my day of football trivia went — then play today's on Triviverse."
  } else {
    const card = decodeCard(r)
    gameUrl = SITE_URL + (GAME_ROUTES[card?.gameId || params.game] || '')
    ogImage = `${url.origin}/og?r=${encodeURIComponent(r)}`
    title = card?.result ? `${card.title} — ${card.result}` : 'Triviverse Football'
    desc = card?.challenge || "Play today's free daily football trivia on Triviverse — 9 games, no sign-up."
  }

  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Triviverse">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(gameUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="canonical" href="${esc(gameUrl)}">
<meta http-equiv="refresh" content="0; url=${esc(gameUrl)}">
<script>location.replace(${JSON.stringify(gameUrl)})</script>
</head><body style="margin:0;background:#0b0a14;color:#ecebf2;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
<p>Redirecting to <a href="${esc(gameUrl)}" style="color:#a78bfa">Triviverse</a>…</p>
</body></html>`

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
}
