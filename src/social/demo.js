// DEV ONLY (imported lazily from the /me DemoSeed button behind import.meta.env.DEV):
// writes ~10 weeks of plausible play history, rivals and badges into this browser.

import { saveJson } from './store'
import { DAILY_GAMES, todayIndex, matchdayOf } from '../data/dailyStats'
import { checkBadges } from './badges'
import { getMe } from './identity'

const SCORE = {
  tenable: (w) => ({ v: w ? 10 : 4 + Math.floor(Math.random() * 5), of: 10 }),
  wordle: (w) => ({ v: w ? 2 + Math.floor(Math.random() * 4) : 7, of: 6, low: true }),
  tictactoe: (w) => ({ v: w ? 9 : 5 + Math.floor(Math.random() * 4), of: 9 }),
  teammates: (w) => ({ v: w ? 1 + Math.floor(Math.random() * 4) : 7, of: 6, low: true }),
  careers: (w) => ({ v: w ? 1 + Math.floor(Math.random() * 5) : 8, of: 7, low: true }),
  connections: (w) => ({ v: w ? Math.floor(Math.random() * 3) : 4, low: true, u: 'mistakes' }),
  higherlower: (w) => ({ v: w ? 10 : Math.floor(Math.random() * 9), u: 'streak' }),
  501: () => ({ v: 4 + Math.floor(Math.random() * 5), low: true, u: 'players' }),
  pointless: (w) => ({ v: w ? 10 + Math.floor(Math.random() * 60) : 120 + Math.floor(Math.random() * 80), low: true, u: 'pts' }),
  bingo: (w) => ({ v: w ? 16 : 8 + Math.floor(Math.random() * 7), of: 16 }),
  contexto: () => ({ v: 8 + Math.floor(Math.random() * 60), low: true, u: 'guesses' }),
}

export function seedDemo() {
  const today = todayIndex()
  const log = [], stats = {}
  for (const g of DAILY_GAMES) stats[g] = { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, best: 0, lastPlayed: null, lastWin: null, results: [] }
  for (let d = today - 70; d < today; d++) {
    if (d > today - 50 && d < today - 46) continue // a real gap
    const n = d === today - 9 ? DAILY_GAMES.length : 1 + Math.floor(Math.random() * 6)
    const games = [...DAILY_GAMES].sort(() => Math.random() - 0.5).slice(0, n)
    for (const g of games) {
      const w = Math.random() < 0.62
      const s = stats[g]
      s.played++; if (w) { s.wins++; s.currentStreak = s.lastWin === d - 1 ? s.currentStreak + 1 : 1; s.maxStreak = Math.max(s.maxStreak, s.currentStreak); s.lastWin = d } else s.currentStreak = 0
      s.lastPlayed = d; s.results = [...s.results, { d, w }].slice(-14)
      log.push({ d, m: matchdayOf(d), g, w, p: w ? 25 : 10, h: 12, ...SCORE[g](w), sent: 1, pc: Math.floor(Math.random() * 100), others: 200 })
    }
    if (n === DAILY_GAMES.length) log.push({ d, m: matchdayOf(d), g: 'perfect', w: true, p: 300 })
  }
  saveJson('ftg-log-v1', log)
  saveJson('ftg-stats-v1', stats)
  saveJson('ftg-streak-v1', { bank: 1, used: [], runStart: null, earned: 0 })
  const m = matchdayOf(today - 1)
  saveJson('ftg-rivals-v1', {
    pubdemodave01: { name: 'Dave', seen: Date.now(), results: { [`${m}:tenable`]: { w: false, v: 6, of: 10 }, [`${m}:wordle`]: { w: true, v: 5, of: 6, low: true }, [`${m - 1}:connections`]: { w: true, v: 2, low: true, u: 'mistakes' } } },
    pubdemopriya: { name: 'Priya', seen: Date.now() - 1000, results: { [`${m}:tenable`]: { w: true, v: 10, of: 10 }, [`${m}:pointless`]: { w: true, v: 12, low: true, u: 'pts' }, [`${matchdayOf(today)}:wordle`]: { w: true, v: 3, of: 6, low: true } } },
  })
  saveJson('ftg-counters-v1', { shares: 6, leaguesCreated: 1 })
  if (!getMe().name) saveJson('ftg-me-v1', { ...getMe(), name: 'Tom' })
  checkBadges()
}
