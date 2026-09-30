// Share images + share pages, rendered at the edge on triviverse.com itself
// (replaces the separate og-service on its own subdomain — one origin, no DNS
// record to lose). Satori layout → resvg PNG via @cf-wasm/og.
//
//   /s/<game>?c=…    game challenge  → og:image /og/g.png?c=…, humans → /<route>?c=…
//   /s/day?c=…       day challenge   → og:image /og/d.png?c=…, humans → /?c=…
//   /s/league/<CODE> league invite   → og:image /og/l/<CODE>.png, humans → /leagues/<CODE>
//
// Tokens mirror tailwind.config.js / src/design/accents.js.

import { ImageResponse, cache } from '@cf-wasm/og/workerd'

export const SITE = 'https://triviverse.com'

const C = {
  canvas: '#0b0a14', canvasHigh: '#151024', primary: '#ecebf2', secondary: '#b9b8c6', muted: '#8c89a3',
  faint: '#57536e', brand: '#7c3aed', brandBright: '#a78bfa', surface: '#16151f', borderStrong: '#2c2947',
  success: '#22c55e', danger: '#ef4444', warn: '#fbbf24',
}
const TILE = { h: '#22c55e', n: '#fbbf24', m: '#26243a', 1: '#a3e635', 2: '#22d3ee', 3: '#eab308', 4: '#a78bfa' }
const ACCENT = {
  tenable: '#facc15', wordle: '#60a5fa', tictactoe: '#818cf8', teammates: '#f472b6', careers: '#22d3ee',
  connections: '#bef264', higherlower: '#fb923c', 501: '#f87171', pointless: '#38bdf8', bingo: '#2dd4bf', contexto: '#e879f9',
}
export const ROUTES = {
  tenable: '/tenable', wordle: '/wordle', tictactoe: '/tictactoe', teammates: '/teammates', careers: '/career-path',
  connections: '/connections', higherlower: '/higher-or-lower', 501: '/501', pointless: '/football-pointless',
  bingo: '/football-bingo', contexto: '/football-contexto',
}
const TITLES = {
  tenable: 'Football Tenable', wordle: 'Football Wordle', tictactoe: 'Football Tic Tac Toe', teammates: 'Teammates',
  careers: 'Career Path', connections: 'Football Connections', higherlower: 'Higher or Lower', 501: 'Football 501',
  pointless: 'Football Pointless', bingo: 'Football Bingo', contexto: 'Football Contexto',
}
const UNITS = { pts: 'pts', mistakes: 'mistakes', guesses: 'guesses', players: 'players', streak: 'in a row' }

// ── payload decoding (mirror of src/social/challenge.js) ─────────────────────
function decode(code) {
  try {
    const s = String(code || '')
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch { return null }
}
const unpack = (a) => Array.isArray(a) ? { w: !!a[0], v: a[1], of: a[2] || 0, low: !!a[3], u: a[4] || '' } : null
function label(r) {
  if (!r) return ''
  if (r.of) return r.low && !r.w ? `X/${r.of}` : `${r.v ?? 0}/${r.of}`
  if (r.v == null) return r.w ? 'WON' : 'LOST'
  if (r.u === 'mistakes' && r.w && r.v === 0) return 'FLAWLESS'
  return `${r.v} ${UNITS[r.u] || ''}`.trim()
}
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s }
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── tiny element builder (satori takes React-shaped objects; no JSX needed) ──
const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter(c => c != null && c !== false) } })
const text = (style, str) => h('div', style, String(str))

function frame(accent, ...body) {
  return h('div', {
    width: 1200, height: 630, flexDirection: 'column', padding: 56, backgroundColor: C.canvas, color: C.primary, fontFamily: 'Inter',
    backgroundImage: `radial-gradient(circle at 85% 8%, ${accent}33 0%, transparent 45%), linear-gradient(155deg, ${C.canvasHigh}, ${C.canvas} 55%)`,
  }, ...body)
}

function header(accent, right) {
  return h('div', { justifyContent: 'space-between', alignItems: 'center' },
    h('div', { alignItems: 'center' },
      { type: 'svg', props: { width: 24, height: 28, viewBox: '0 0 24 28', style: { marginRight: 14 }, children: [{ type: 'polygon', props: { points: '12.48,0 3.84,15.68 10.56,15.68 7.68,28 20.64,11.2 13.44,11.2 15.84,0', fill: accent } }] } },
      h('div', { fontSize: 26, fontWeight: 800, letterSpacing: 3 }, text({ color: C.primary }, 'TRIVIVERSE'), text({ color: accent, marginLeft: 9 }, 'FOOTBALL'))),
    text({ fontSize: 22, fontWeight: 800, letterSpacing: 3, color: C.faint }, right))
}

const rule = (accent) => h('div', { height: 3, marginTop: 22, borderRadius: 2, backgroundImage: `linear-gradient(90deg, ${accent}, transparent 78%)` })

function footer(accent, cta) {
  return h('div', { justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
    h('div', { alignItems: 'center', height: 56, paddingLeft: 22, paddingRight: 28, borderRadius: 30, backgroundColor: C.surface, border: `1px solid ${C.borderStrong}` },
      h('div', { width: 14, height: 14, borderRadius: 7, backgroundColor: accent, marginRight: 14 }),
      text({ fontSize: 28, fontWeight: 800 }, 'triviverse.com')),
    text({ fontSize: 24, fontWeight: 800, letterSpacing: 2, color: accent }, cta))
}

function tiles(codes, maxH = 150) {
  const rows = String(codes || '').split('/').filter(Boolean).slice(0, 6).map(r => [...r].slice(0, 12))
  if (!rows.length) return null
  const gap = 8
  const cols = Math.max(...rows.map(r => r.length))
  const tile = Math.floor(Math.max(16, Math.min(46, (560 - (cols - 1) * gap) / cols, (maxH - (rows.length - 1) * gap) / rows.length)))
  return h('div', { flexDirection: 'column' },
    rows.map((row, ri) => h('div', { marginTop: ri ? gap : 0 },
      row.map((ch, ci) => h('div', { width: tile, height: tile, marginLeft: ci ? gap : 0, borderRadius: Math.round(tile * 0.24), backgroundColor: TILE[ch] || TILE.m })))))
}

// ── cards ────────────────────────────────────────────────────────────────────
function gameCard(p) {
  const r = unpack(p.r)
  const accent = ACCENT[p.g] || C.brandBright
  const who = clip(p.n, 18).toUpperCase()
  return frame(accent,
    header(accent, `MATCHDAY ${p.m ?? ''}`),
    rule(accent),
    text({ fontSize: 24, fontWeight: 800, letterSpacing: 4, color: accent, marginTop: 26 }, who ? `${who} CHALLENGES YOU` : 'TODAY’S DAILY'),
    text({ fontFamily: 'Bebas Neue', fontSize: 84, lineHeight: 1, marginTop: 8, letterSpacing: 1 }, clip(p.t || TITLES[p.g] || 'Triviverse', 26).toUpperCase()),
    p.c ? text({ fontSize: 26, fontWeight: 500, color: C.muted, marginTop: 8 }, clip(p.c, 64)) : null,
    h('div', { alignItems: 'center', marginTop: 26 },
      h('div', { flexDirection: 'column', marginRight: 48 },
        text({ fontFamily: 'Bebas Neue', fontSize: 120, lineHeight: 0.9, color: r?.w ? C.primary : C.secondary }, label(r)),
        text({ fontSize: 22, fontWeight: 800, letterSpacing: 3, color: r?.w ? C.success : C.danger, marginTop: 6 }, r?.w ? 'WON' : 'LOST')),
      tiles(p.R)),
    footer(accent, 'CAN YOU BEAT IT? →'))
}

function dayCard(p) {
  const accent = C.brandBright
  const games = Object.entries(p.r || {}).map(([g, a]) => ({ g, r: unpack(a) })).filter(x => x.r)
  const who = clip(p.n, 18).toUpperCase()
  const chip = ({ g, r }) => h('div', { alignItems: 'center', width: 344, height: 46, marginRight: 14, marginTop: 12, paddingLeft: 16, paddingRight: 16, borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.borderStrong}` },
    h('div', { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT[g] || accent, marginRight: 12 }),
    text({ fontSize: 22, fontWeight: 800, flexGrow: 1 }, clip(TITLES[g] || g, 20).replace(/^Football /, '')),
    text({ fontSize: 22, fontWeight: 800, color: r.w ? C.success : C.danger }, label(r)))
  return frame(accent,
    header(accent, who ? `${who}’S MATCHDAY` : 'MY MATCHDAY'),
    rule(accent),
    h('div', { alignItems: 'flex-end', marginTop: 22 },
      text({ fontFamily: 'Bebas Neue', fontSize: 110, lineHeight: 0.9 }, `MATCHDAY ${p.m ?? ''}`),
      h('div', { marginLeft: 32, marginBottom: 10 },
        text({ fontSize: 30, fontWeight: 800, color: C.warn, marginRight: 24 }, p.s > 0 ? `${p.s}-DAY STREAK` : ''),
        text({ fontSize: 30, fontWeight: 800, color: accent }, `${p.p || 0} PTS`))),
    h('div', { flexWrap: 'wrap', marginTop: 10, width: 1100 }, games.slice(0, 9).map(chip)),
    text({ fontSize: 22, fontWeight: 800, letterSpacing: 3, color: C.muted, marginTop: 22 },
      `${games.length} OF 11 DAILIES · ${games.filter(x => x.r.w).length} WON${games.length > 9 ? ` · +${games.length - 9} MORE` : ''}`),
    footer(accent, 'BEAT MY MATCHDAY →'))
}

function leagueCard(league) {
  const accent = C.brandBright
  return frame(accent,
    header(accent, 'PRIVATE LEAGUE'),
    rule(accent),
    text({ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: accent, marginTop: 40 }, "YOU'RE INVITED"),
    text({ fontFamily: 'Bebas Neue', fontSize: 132, lineHeight: 0.95, marginTop: 10 }, clip(league.name, 20).toUpperCase()),
    text({ fontSize: 30, fontWeight: 500, color: C.secondary, marginTop: 18 }, `${league.members} ${league.members === 1 ? 'player' : 'players'} · weekly table · daily football trivia`),
    h('div', { alignItems: 'center', marginTop: 28 },
      text({ fontSize: 22, fontWeight: 800, letterSpacing: 3, color: C.muted, marginRight: 16 }, 'CODE'),
      text({ fontFamily: 'Bebas Neue', fontSize: 64, letterSpacing: 8, color: C.primary }, league.code)),
    footer(accent, 'JOIN THE LEAGUE →'))
}

// ── fonts (served from the static assets, cached per isolate) ────────────────
let fontsPromise = null
function fonts(env, origin) {
  if (!fontsPromise) {
    const get = (f) => env.ASSETS.fetch(new Request(`${origin}/og-fonts/${f}`)).then(r => { if (!r.ok) throw new Error(`font ${f}`); return r.arrayBuffer() })
    fontsPromise = Promise.all([get('inter-500.woff'), get('inter-800.woff'), get('bebas-neue.ttf')])
      .then(([i5, i8, b]) => [
        { name: 'Inter', data: i5, weight: 500, style: 'normal' },
        { name: 'Inter', data: i8, weight: 800, style: 'normal' },
        { name: 'Bebas Neue', data: b, weight: 400, style: 'normal' },
      ])
      .catch(err => { fontsPromise = null; throw err })
  }
  return fontsPromise
}

async function png(el, env, url, ctx) {
  cache.setExecutionContext(ctx)
  const res = await ImageResponse.async(el, { width: 1200, height: 630, fonts: await fonts(env, url.origin) })
  const out = new Response(res.body, res)
  out.headers.set('cache-control', 'public, max-age=86400')
  return out
}

export async function handleOg(request, env, ctx, lookupLeague) {
  const url = new URL(request.url)
  const p = url.pathname
  try {
    if (p === '/og/g.png') {
      const payload = decode(url.searchParams.get('c'))
      if (!payload || payload.k !== 'g') return new Response('bad request', { status: 400 })
      return await png(gameCard(payload), env, url, ctx)
    }
    if (p === '/og/d.png') {
      const payload = decode(url.searchParams.get('c'))
      if (!payload || payload.k !== 'd') return new Response('bad request', { status: 400 })
      return await png(dayCard(payload), env, url, ctx)
    }
    const m = p.match(/^\/og\/l\/([A-Z0-9]{4,8})\.png$/)
    if (m) {
      const league = await lookupLeague(m[1])
      if (!league) return new Response('not found', { status: 404 })
      return await png(leagueCard(league), env, url, ctx)
    }
  } catch (err) {
    return new Response(`render error: ${err?.message || err}`, { status: 500 })
  }
  return new Response('not found', { status: 404 })
}

// ── share pages: OG tags for crawlers, instant redirect for humans ───────────
function sharePage({ title, desc, image, target }) {
  return new Response(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="noindex">
<meta property="og:type" content="website"><meta property="og:site_name" content="Triviverse">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(target)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)})</script>
</head><body style="margin:0;background:#0b0a14;color:#ecebf2;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
<p>Opening <a href="${esc(target)}" style="color:#a78bfa">Triviverse</a>…</p></body></html>`, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
}

// Public origin. Locally the Vite dev proxy forwards X-Forwarded-Host so links
// point back at :5173; in production the header is absent and this is the URL's.
export function publicOrigin(request) {
  const url = new URL(request.url)
  const fwd = request.headers.get('x-forwarded-host')
  return fwd && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(fwd) ? `http://${fwd}` : url.origin
}

export async function handleShare(request, env, lookupLeague) {
  const url = new URL(request.url)
  const o = publicOrigin(request)
  const c = url.searchParams.get('c') || ''
  const lm = url.pathname.match(/^\/s\/league\/([A-Za-z0-9]{4,8})\/?$/)
  if (lm) {
    const code = lm[1].toUpperCase()
    const league = await lookupLeague(code)
    const target = `${o}/leagues/${code}`
    if (!league) return Response.redirect(target, 302)
    return sharePage({
      title: `Join ${league.name} on Triviverse`,
      desc: `${league.members} ${league.members === 1 ? 'player' : 'players'} · a private weekly table for daily football trivia. Free, no sign-up.`,
      image: `${o}/og/l/${code}.png`, target,
    })
  }
  const gm = url.pathname.match(/^\/s\/([a-z0-9]+)\/?$/)
  const p = decode(c)
  if (!gm || !p) return Response.redirect(`${o}/`, 302)
  return challengePage(o, gm[1], c, p)
}

// /c/<code> — the short form of /s/…?c=… (payload stored by POST /api/links).
export async function handleShortLink(request, lookupLink) {
  const url = new URL(request.url)
  const o = publicOrigin(request)
  const m = url.pathname.match(/^\/c\/([A-Za-z0-9]{5,12})\/?$/)
  const c = m ? await lookupLink(m[1].toUpperCase()) : null
  const p = c ? decode(c) : null
  if (!p) return Response.redirect(`${o}/`, 302)
  return challengePage(o, p.k === 'd' ? 'day' : p.g, c, p)
}

function challengePage(o, kind, c, p) {
  if (kind === 'day' && p.k === 'd') {
    const who = p.n || 'A mate'
    return sharePage({
      title: `${who}'s Matchday ${p.m} — ${p.p || 0} pts`,
      desc: `${Object.keys(p.r || {}).length} dailies played. Can you beat their matchday? Free daily football trivia.`,
      image: `${o}/og/d.png?c=${encodeURIComponent(c)}`, target: `${o}/?c=${encodeURIComponent(c)}`,
    })
  }
  if (p.k === 'g' && ROUTES[p.g]) {
    const r = unpack(p.r)
    const title = `${p.n ? `${p.n}: ` : ''}${TITLES[p.g]} ${label(r)} — can you beat it?`
    return sharePage({
      title,
      desc: p.c ? `Matchday ${p.m} · ${p.c}` : `Matchday ${p.m} · free daily football trivia on Triviverse.`,
      image: `${o}/og/g.png?c=${encodeURIComponent(c)}`, target: `${o}${ROUTES[p.g]}?c=${encodeURIComponent(c)}`,
    })
  }
  return Response.redirect(`${o}/`, 302)
}
