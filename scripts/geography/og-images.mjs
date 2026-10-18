#!/usr/bin/env node
// Triviverse Geography social-share cards: one 1200×630 PNG per game that has an
// `image` in src/geography/seo.js. Rasterised with sharp into public/og/geography-<id>.png.
// Run locally and commit the PNGs (no production dependency):
//   node scripts/geography/og-images.mjs
import sharp from 'sharp'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = path.join(ROOT, 'public', 'og')
mkdirSync(OUT, { recursive: true })
const { countries, meta } = JSON.parse(readFileSync(path.join(ROOT, 'src/geography/data/countries.generated.json'), 'utf8'))

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The silhouette must never be a possible daily answer, or the card would spoil a
// future puzzle. The Falkland Islands can be guessed but are not in the answer pool.
const SHAPE = countries.find(c => c.code === 'FK')
if (!SHAPE || SHAPE.answer) throw new Error('og: the card silhouette must be a non-answer country')

const CARDS = {
  borderline: {
    title: 'Borderline',
    lines: ['Guess the country', 'by its shape'],
    sub: 'Six guesses · distance & direction clues · daily + unlimited',
    accent: '#d9a066',
  },
}

function svg({ title, lines, sub, accent }) {
  const s = 420 / meta.box // fit the 1000-box silhouette into a 420px square
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <radialGradient id="bg" cx="0.78" cy="0.45" r="0.75">
        <stop offset="0" stop-color="#241a46"/><stop offset="1" stop-color="#0b0a14"/>
      </radialGradient>
      <linearGradient id="land" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9bdf5"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect x="0" y="0" width="1200" height="10" fill="${accent}"/>
    <text x="80" y="128" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="5" fill="#a78bfa">TRIVIVERSE GEOGRAPHY</text>
    <text x="80" y="232" font-family="Helvetica, Arial, sans-serif" font-size="92" font-weight="800" fill="${accent}">${esc(title)}</text>
    ${lines.map((l, i) => `<text x="80" y="${318 + i * 66}" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">${esc(l)}</text>`).join('')}
    <text x="80" y="520" font-family="Helvetica, Arial, sans-serif" font-size="27" fill="#c9c6d6">${esc(sub)}</text>
    <text x="80" y="574" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#8c89a3">triviverse.com/geography</text>
    <circle cx="930" cy="320" r="235" fill="none" stroke="#a78bfa" stroke-opacity="0.18" stroke-width="2"/>
    <g transform="translate(720 110) scale(${s})">
      <path d="${SHAPE.d}" fill="url(#land)" stroke="url(#land)" stroke-width="3" fill-rule="evenodd" stroke-linejoin="round"/>
    </g>
  </svg>`)
}

for (const [id, card] of Object.entries(CARDS)) {
  await sharp(svg(card)).png({ compressionLevel: 9 }).toFile(path.join(OUT, `geography-${id}.png`))
  console.error(`  ✓ og/geography-${id}.png`)
}
