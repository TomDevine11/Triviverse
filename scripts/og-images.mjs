#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// OG IMAGE GENERATOR — one 1200×630 social-share PNG per game.
//
// Rasterises a branded SVG per route into public/og/<slug>.png with sharp.
// Run locally and commit the PNGs (no production dependency):
//   node scripts/og-images.mjs
// ─────────────────────────────────────────────────────────────────────────

import sharp from 'sharp'
import { mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { BRAND, SITE_URL } from '../src/seo/seoConfig.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'og')
mkdirSync(OUT, { recursive: true })

const DOMAIN = SITE_URL.replace(/^https?:\/\//, '')

// slug → { title, subtitle, accent }
const CARDS = {
  default:   { title: 'Football Trivia Games', subtitle: 'Free daily football quiz games', accent: '#16a34a' },
  wordle:    { title: 'Football Wordle', subtitle: "Guess the footballer's surname in six tries", accent: '#3b82f6' },
  tictactoe: { title: 'Football Tic-Tac-Toe', subtitle: 'Name a player who fits both categories', accent: '#a855f7' },
  teammates: { title: 'Teammates', subtitle: 'Identify the footballer from their teammates', accent: '#ec4899' },
  'career-path': { title: 'Career Path', subtitle: 'Name the player who played for every club', accent: '#06b6d4' },
  connections: { title: 'Football Connections', subtitle: 'Find the four groups of four', accent: '#14b8a6' },
  'higher-or-lower': { title: 'Higher or Lower', subtitle: 'Pick the more famous player and build a streak', accent: '#f97316' },
  tenable:   { title: 'Football Tenable', subtitle: 'Name as many of the top 10 as you can', accent: '#eab308' },
  '501':     { title: 'Football 501', subtitle: 'Count down from 501 and land the checkout', accent: '#ef4444' },
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function svg({ title, subtitle, accent }) {
  // Wrap very long titles onto a second line.
  const lines = title.length > 17 ? title.split(' ').reduce((a, w) => {
    if (!a.length || (a[a.length - 1] + ' ' + w).length > 17) a.push(w); else a[a.length - 1] += ' ' + w
    return a
  }, []) : [title]
  const titleSvg = lines.map((l, i) => `<text x="80" y="${250 + i * 92}" font-family="sans-serif" font-size="84" font-weight="bold" fill="#ffffff">${esc(l)}</text>`).join('')
  const subY = 250 + lines.length * 92 + 20
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0a0a"/><stop offset="1" stop-color="#111827"/>
    </linearGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <rect x="0" y="0" width="1200" height="12" fill="${accent}"/>
    <rect x="80" y="120" width="90" height="90" rx="18" fill="${accent}"/>
    <text x="125" y="183" font-family="sans-serif" font-size="52" font-weight="bold" fill="#0a0a0a" text-anchor="middle">F</text>
    ${titleSvg}
    <text x="80" y="${subY}" font-family="sans-serif" font-size="38" fill="#9ca3af">${esc(subtitle)}</text>
    <text x="80" y="560" font-family="sans-serif" font-size="28" fill="#6b7280">${esc(DOMAIN)}</text>
  </svg>`)
}

for (const [slug, card] of Object.entries(CARDS)) {
  await sharp(svg(card)).png().toFile(path.join(OUT, `${slug}.png`))
  console.error(`  ✓ og/${slug}.png  (${card.title})`)
}
console.error(`\nGenerated ${Object.keys(CARDS).length} OG images for ${BRAND}.`)
