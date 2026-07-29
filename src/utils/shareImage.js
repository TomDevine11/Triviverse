// Renders a game result as a 1080×1080 "Fixture Card" PNG on the device (no
// backend). The card mirrors design/share-card direction A: brand + matchday
// chrome, the game and its challenge, the result line, and the run as clean
// tiles — in the game's accent. Handed to the native share sheet with the link
// alongside (see components/ShareCard.jsx), so recipients get the picture and a
// tappable triviverse.com in one message.

import { GAME_ACCENTS } from '../design/accents'
import { SITE_URL } from './site'

const SIZE = 1080
const PAD = 76

// Triviverse night palette (mirrors tailwind.config.js / index.css tokens).
const C = {
  canvas: '#0b0a14', canvasHigh: '#151024',
  primary: '#ecebf2', secondary: '#b9b8c6', muted: '#8c89a3', faint: '#57536e',
  brandBright: '#a78bfa', surface: '#16151f', borderStrong: '#2c2947',
}
// Result-tile tokens, exported so each game builds its rows from the same set.
export const TILE = { hit: '#22c55e', near: '#fbbf24', miss: '#26243a' }

// gameId → route, so a shared card links straight to that gamemode.
export const GAME_ROUTES = {
  '501': '/501', wordle: '/wordle', tenable: '/tenable', tictactoe: '/tictactoe',
  teammates: '/teammates', connections: '/connections', careers: '/career-path',
  higherlower: '/higher-or-lower',
}

const hostname = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')

// Ensure the app's webfonts are rasterisable before we draw (async @import).
async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return
  try {
    await Promise.all([
      document.fonts.load('700 96px "Bebas Neue"'),
      document.fonts.load('900 30px "Inter"'),
      document.fonts.load('700 46px "Inter"'),
      document.fonts.load('500 30px "Inter"'),
      document.fonts.ready,
    ])
  } catch { /* fall back to system fonts */ }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function setLetterSpacing(ctx, px) {
  try { ctx.letterSpacing = `${px}px` } catch { /* unsupported */ }
}

// Draw a compact lightning-bolt glyph (the brand mark) in `color`.
function drawBolt(ctx, x, y, s, color) {
  const pts = [[0.52, 0], [0.16, 0.56], [0.44, 0.56], [0.32, 1], [0.86, 0.4], [0.56, 0.4], [0.66, 0]]
  ctx.save(); ctx.fillStyle = color; ctx.beginPath()
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)))
  ctx.closePath(); ctx.fill(); ctx.restore()
}

// Word-wrap `text` to at most `maxLines`, shrinking the font until it fits.
function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w }
    else line = test
    if (lines.length === maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  return lines
}

/**
 * @param {object} card
 * @param {string} card.gameId    accent key, e.g. '501'
 * @param {string} card.title     display title, e.g. 'Football 501'
 * @param {string} [card.challenge] optional subtitle line
 * @param {string} card.result    headline, e.g. 'Checked out on −1 in 6 darts'
 * @param {string[][]} card.rows  rows of tile colours (hex)
 * @param {number} card.matchday  matchday number
 * @returns {Promise<Blob>} PNG blob
 */
export async function renderShareCard(card) {
  await ensureFonts()
  const accent = GAME_ACCENTS[card.gameId]?.bright || C.brandBright
  const canvas = document.createElement('canvas')
  canvas.width = SIZE; canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // Background: night gradient + a soft accent glow top-right.
  const bg = ctx.createLinearGradient(0, 0, SIZE * 0.4, SIZE)
  bg.addColorStop(0, C.canvasHigh); bg.addColorStop(0.62, C.canvas); bg.addColorStop(1, C.canvas)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, SIZE, SIZE)
  const glow = ctx.createRadialGradient(SIZE * 0.86, SIZE * 0.1, 0, SIZE * 0.86, SIZE * 0.1, SIZE * 0.62)
  glow.addColorStop(0, `${accent}26`); glow.addColorStop(1, '#00000000')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.textBaseline = 'alphabetic'

  // ── Chrome: brand wordmark (left) + matchday (right) ──────────────
  const chromeY = PAD + 30
  drawBolt(ctx, PAD, chromeY - 26, 30, accent)
  ctx.font = '900 30px Inter, sans-serif'
  setLetterSpacing(ctx, 3)
  ctx.textAlign = 'left'
  ctx.fillStyle = C.primary
  ctx.fillText('TRIVIVERSE', PAD + 46, chromeY)
  const tvW = ctx.measureText('TRIVIVERSE').width
  ctx.fillStyle = accent
  ctx.fillText(' FOOTBALL', PAD + 46 + tvW, chromeY)

  ctx.font = '800 26px Inter, sans-serif'
  setLetterSpacing(ctx, 3)
  ctx.textAlign = 'right'
  ctx.fillStyle = C.faint
  ctx.fillText(`MATCHDAY ${card.matchday}`, SIZE - PAD, chromeY - 2)
  setLetterSpacing(ctx, 0)
  ctx.textAlign = 'left'

  // ── Accent rule ───────────────────────────────────────────────────
  const ruleY = PAD + 66
  const rule = ctx.createLinearGradient(PAD, 0, SIZE - PAD, 0)
  rule.addColorStop(0, accent); rule.addColorStop(0.78, '#00000000')
  ctx.fillStyle = rule; roundRect(ctx, PAD, ruleY, SIZE - PAD * 2, 3, 2); ctx.fill()

  // ── Game title ────────────────────────────────────────────────────
  ctx.font = '700 108px "Bebas Neue", "Arial Black", sans-serif'
  setLetterSpacing(ctx, 1)
  ctx.fillStyle = C.primary
  const titleY = ruleY + 118
  ctx.fillText(card.title.toUpperCase(), PAD, titleY)
  setLetterSpacing(ctx, 0)

  // ── Challenge subtitle (optional, up to 2 lines) ──────────────────
  let cursorY = titleY + 30
  if (card.challenge) {
    ctx.font = '500 30px Inter, sans-serif'
    ctx.fillStyle = C.muted
    const lines = wrapLines(ctx, card.challenge, SIZE - PAD * 2, 2)
    lines.forEach((ln, i) => ctx.fillText(ln, PAD, cursorY + 34 + i * 40))
    cursorY += 34 + lines.length * 40
  }

  // ── Footer (drawn first so the middle can lay out against it) ──────
  const footY = SIZE - PAD - 24
  ctx.font = '800 30px Inter, sans-serif'
  const urlText = hostname
  const urlW = ctx.measureText(urlText).width
  const pillW = urlW + 40 + 26
  const pillH = 60
  const pillX = PAD, pillY = footY - 44
  ctx.fillStyle = C.surface
  roundRect(ctx, pillX, pillY, pillW, pillH, 30); ctx.fill()
  ctx.strokeStyle = C.borderStrong; ctx.lineWidth = 1.5
  roundRect(ctx, pillX, pillY, pillW, pillH, 30); ctx.stroke()
  ctx.fillStyle = accent
  ctx.beginPath(); ctx.arc(pillX + 28, pillY + pillH / 2, 8, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.primary
  ctx.textBaseline = 'middle'
  ctx.fillText(urlText, pillX + 48, pillY + pillH / 2 + 1)
  ctx.textBaseline = 'alphabetic'
  ctx.font = '800 26px Inter, sans-serif'
  setLetterSpacing(ctx, 2)
  ctx.textAlign = 'right'
  ctx.fillStyle = C.faint
  ctx.fillText("PLAY TODAY'S DAILY", SIZE - PAD, pillY + pillH / 2 + 9)
  setLetterSpacing(ctx, 0)
  ctx.textAlign = 'left'

  // ── Result headline + tiles, centred in the band below the challenge ──
  const contentW = SIZE - PAD * 2
  const rows = card.rows || []
  const nRows = rows.length
  const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 1)
  const gap = 14

  ctx.font = '700 48px Inter, sans-serif'
  const resLines = wrapLines(ctx, card.result, contentW, 2)
  const resBlockH = resLines.length * 56
  const gapRG = nRows ? 36 : 0

  const bandTop = cursorY + 24
  const bandBottom = pillY - 44
  const availH = bandBottom - bandTop

  // Size tiles to fit BOTH the content width and the vertical band that's left
  // once the headline is placed — so tall grids (a 6-row Wordle) never overflow
  // into the footer.
  const tileW = (contentW - (maxCols - 1) * gap) / maxCols
  const gridMaxH = availH - resBlockH - gapRG
  const tileH = nRows ? (gridMaxH - (nRows - 1) * gap) / nRows : Infinity
  const tile = Math.floor(Math.max(24, Math.min(96, tileW, tileH)))
  const gridH = nRows ? nRows * tile + (nRows - 1) * gap : 0

  const blockH = resBlockH + gapRG + gridH
  const blockTop = bandTop + Math.max(0, (availH - blockH) / 2)

  ctx.fillStyle = C.secondary
  resLines.forEach((ln, i) => ctx.fillText(ln, PAD, blockTop + 40 + i * 56))

  let gy = blockTop + resBlockH + gapRG
  for (const row of rows) {
    let gx = PAD
    for (const color of row) {
      ctx.fillStyle = color || TILE.miss
      roundRect(ctx, gx, gy, tile, tile, tile * 0.24); ctx.fill()
      gx += tile + gap
    }
    gy += tile + gap
  }

  return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}
