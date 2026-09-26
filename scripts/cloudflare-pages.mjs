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
//   - 404.html for anything not prerendered (also covers retired player-pair
//     slugs, which get a 410 on Render; a 404 deindexes them the same way).
//   - _redirects for renamed player-pair slugs (from relations-manifest.json).
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

// ── Renamed player-pair slugs → 301 ──
const manifest = JSON.parse(readFileSync(path.join(DIST, 'relations-manifest.json'), 'utf8'))
const redirects = Object.entries(manifest.redirects || {}).flatMap(([from, to]) =>
  ['', '/es'].map(prefix => `${prefix}${manifest.base}/${from} ${prefix}${manifest.base}/${to} 301`))
writeFileSync(path.join(DIST, '_redirects'), redirects.join('\n') + '\n')

// ── Cache headers — hashed build assets never change ──
writeFileSync(path.join(DIST, '_headers'),
  `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`)

// ── TikTok domain verification (served inline by server/index.js) ──
writeFileSync(path.join(DIST, 'tiktokhmgsxlUzrsvwFQlM52w8rZC5rjCTdoDF.txt'),
  'tiktok-developers-site-verification=hmgsxlUzrsvwFQlM52w8rZC5rjCTdoDF')

console.log(`Cloudflare Pages: flattened ${flattened} routes, ${redirects.length} redirects, 404.html, _headers`)
