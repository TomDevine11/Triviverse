#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// CLOUDFLARE PAGES — adapts the built dist/ for static hosting on Pages.
//
// Runs after `npm run build` (see `npm run build:pages`). It reproduces what
// server/index.js does on Render, but as static files:
//
//   - Flattens dist/<route>/index.html → dist/<route>.html. Pages serves a
//     directory index only at the trailing-slash URL and 308s /tenable →
//     /tenable/, which contradicts our canonical URLs. A flat file is served
//     at /tenable itself.
//   - 404.html for anything not prerendered.
//   - _redirects: 301s for the pages retired on 2026-10-09 (see RETIRED below).
//   - _headers so hashed assets are cached as immutable.
//   - The TikTok domain-verification file.
//
// It mutates dist/ in a way the Express server does not understand, so it is
// only run for the Pages build — never before `npm run server`.
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, renameSync, rmdirSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')

// ── Flatten route index files ──
let flattened = 0
function flatten(dir) {
  for (const name of readdirSync(dir)) {
    const sub = path.join(dir, name)
    if (!statSync(sub).isDirectory() || name === 'assets') continue
    flatten(sub)
    const index = path.join(sub, 'index.html')
    try { statSync(index) } catch { continue }
    renameSync(index, `${sub}.html`)
    flattened++
    if (readdirSync(sub).length === 0) rmdirSync(sub)
  }
}
flatten(DIST)

// ── 404 page — mirrors sendNotFound() in server/index.js ──
writeFileSync(path.join(DIST, '404.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">`
  + `<meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — Triviverse</title></head>`
  + `<body style="font-family:system-ui,sans-serif;background:#0b0a14;color:#e5e7eb;text-align:center;padding:4rem 1.5rem">`
  + `<h1 style="font-size:1.4rem">Page not found</h1>`
  + `<p style="color:#9ca3af">This page does not exist.</p>`
  + `<p><a style="color:#c4b5fd" href="/">Go to Triviverse →</a></p></body></html>`)

// ── Retired pages → 301 to the nearest live game ──
// Cut 2026-10-09 after AdSense rejected the site for "low-value content": thin
// programmatic pages and duplicate translations, not the games, were the bulk of
// the URL count. Each goes to the page a visitor following an old link most
// likely wanted. Specific rules first — Cloudflare applies the first match.
const RETIRED = [
  ['/build-your-own-football-darts', '/501'],
  ['/england-football-quiz', '/career-path'],
  ['/players-who-played-for', '/tictactoe'],
  ['/players-who-played-for/*', '/tictactoe'],
  ...['wordle', 'teammates', 'career-path', 'tenable', 'connections', 'football-pointless']
    .map(g => [`/${g}/answers`, `/${g}`]),
  ['/es', '/'],
  ['/es/build-your-own-football-darts', '/501'],
  ['/es/england-football-quiz', '/career-path'],
  ['/es/players-who-played-for/*', '/tictactoe'],
  ['/es/*', '/:splat'],
]
writeFileSync(path.join(DIST, '_redirects'), RETIRED.map(([from, to]) => `${from} ${to} 301`).join('\n') + '\n')

// ── Cache headers — hashed build assets never change ──
writeFileSync(path.join(DIST, '_headers'),
  `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`)

// ── TikTok domain verification (served inline by server/index.js) ──
writeFileSync(path.join(DIST, 'tiktokhmgsxlUzrsvwFQlM52w8rZC5rjCTdoDF.txt'),
  'tiktok-developers-site-verification=hmgsxlUzrsvwFQlM52w8rZC5rjCTdoDF')

console.log(`Cloudflare Pages: flattened ${flattened} routes, ${RETIRED.length} redirects, 404.html, _headers`)
