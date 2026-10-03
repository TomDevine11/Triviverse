// Pasteable result text — the Wordle-style block that travels through Teams,
// WhatsApp, Slack and iMessage whether or not the link unfurls. The link in it
// is a challenge link (challenge.js), so every paste is also an invitation.

import { scoreLabel } from './scoring'

// Tile colour → emoji. Mirrors TILE in utils/shareImage.js plus Connections'
// four group tiers.
const EMOJI = {
  '#22c55e': '🟩', '#16a34a': '🟩', '#fbbf24': '🟨', '#ca8a04': '🟨', '#26243a': '⬛',
  '#a3e635': '🟩', '#22d3ee': '🟦', '#eab308': '🟨', '#a78bfa': '🟪',
}
// Compact tile codes (log.js `t`) → emoji.
const CH_EMOJI = { h: '🟩', n: '🟨', m: '⬛', 1: '🟩', 2: '🟦', 3: '🟨', 4: '🟪' }
const HEX_TO_CH = { '#22c55e': 'h', '#16a34a': 'h', '#fbbf24': 'n', '#ca8a04': 'n', '#26243a': 'm', '#a3e635': '1', '#22d3ee': '2', '#eab308': '3', '#a78bfa': '4' }

const MAX_PER_ROW = 10
const MAX_ROWS = 6

export function rowsToEmoji(rows) {
  if (!rows?.length) return ''
  const lines = []
  for (const row of rows) {
    for (let i = 0; i < row.length; i += MAX_PER_ROW) lines.push(row.slice(i, i + MAX_PER_ROW).map(c => EMOJI[c] || '⬛').join(''))
  }
  return lines.slice(0, MAX_ROWS).join('\n')
}

export const rowsToCodes = (rows) => (rows || []).map(r => r.map(c => HEX_TO_CH[c] || 'm').join('')).join('/')
export const codesToEmoji = (codes) => String(codes || '').split('/').filter(Boolean).map(r => [...r].map(c => CH_EMOJI[c] || '⬛').join('')).slice(0, MAX_ROWS).join('\n')

// A single game's share text.
export function resultText({ title, matchday, result, rows, streak, url, locale = 'en', rival }) {
  const es = locale === 'es'
  const head = `⚽ ${title} · ${es ? 'Jornada' : 'Matchday'} ${matchday}`
  const score = [scoreLabel(result, locale), streak > 1 ? `🔥${streak}` : ''].filter(Boolean).join('  ')
  const grid = rowsToEmoji(rows)
  let cta = es ? '¿Me superas?' : 'Can you beat me?'
  if (rival) cta = rival.outcome > 0
    ? (es ? `Le gané a ${rival.name} 😤 ¿Y tú?` : `Beat ${rival.name} 😤 Your turn`)
    : rival.outcome < 0 ? (es ? `${rival.name} me ganó. Vénganme:` : `${rival.name} got me. Avenge me:`) : (es ? `Empate con ${rival.name}. Desempata:` : `Level with ${rival.name}. Break the tie:`)
  return [head, score, grid, `${cta} ${url}`].filter(Boolean).join('\n')
}

// The whole matchday in one message.
export function dayText({ matchday, results, total, points, streak, url, titleOf, locale = 'en' }) {
  const es = locale === 'es'
  const head = `⚽ Triviverse · ${es ? 'Jornada' : 'Matchday'} ${matchday} — ${results.length}/${total}${results.length === total ? ' ⭐' : ''}`
  const sub = [streak > 0 ? `🔥 ${streak}${es ? ' días' : '-day streak'}` : '', `${points} pts`].filter(Boolean).join(' · ')
  const lines = results.map(r => `${r.w ? '✅' : '❌'} ${titleOf(r.g)} ${scoreLabel(r, locale)}`)
  return [head, sub, '', ...lines, '', `${es ? 'Supera mi jornada' : 'Beat my matchday'} 👉 ${url}`].join('\n')
}
