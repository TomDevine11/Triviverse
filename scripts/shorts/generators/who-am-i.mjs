// WHO AM I? — progressive clues (least → most revealing) from the qgen registry facts.
import { topByReco, playerFacts } from '../lib/data.mjs'
import { makeSpec } from '../lib/spec.mjs'
import { engagementFor } from '../lib/engagement.mjs'
const ACCENT = '#3b82f6'
const diff = (r) => r >= 75 ? 'easy' : r >= 60 ? 'medium' : r >= 50 ? 'hard' : 'impossible'

const bigTrophy = (trophies) => {
  const pri = ['World Cup', 'Champions League', 'European Championship', 'Ballon']
  for (const key of pri) { const m = trophies.find(x => x.includes(key)); if (m) return m }
  const leagues = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'English Champion', 'Spanish Champion', 'Italian Champion', 'German Champion']
  for (const key of leagues) { const m = trophies.find(x => x.includes(key)); if (m) return m }
  return null
}
const short = (s) => s.length <= 24 ? s : null

export function generate(count, opts = {}, history) {
  const pool = topByReco(48)
  const out = []
  for (const { name, reco: r } of pool) {
    if (out.length >= count) break
    if (history && (history.answerCount.get(name) || 0) > 0) continue
    if (opts.difficulty && diff(r) !== opts.difficulty) continue
    const f = playerFacts(name)
    if (!f) continue
    const league0 = f.leagues[0] ? f.leagues[0].replace(/^the /, '') : null
    // retired ≈ no top-flight season in the last ~2 years → phrase league/era in the past tense so a
    // clue never implies a retired player is still at that league.
    const retired = f.lastYear && f.lastYear <= new Date().getFullYear() - 2
    const nonClub = [
      f.nationality && { label: 'Nationality', text: f.nationality, flag: f.nationality },
      f.era && { label: retired ? 'Played in the' : 'Era', text: retired ? f.era : 'The ' + f.era },
      f.position && short(f.position) && { label: 'Position', text: f.position },
      league0 && { label: retired ? 'Last league' : 'League', text: league0, league: league0 },
      bigTrophy(f.trophies) && short(bigTrophy(f.trophies)) && { label: 'Won', text: bigTrophy(f.trophies) },
    ].filter(Boolean)
    const club = f.clubs[0] && short(f.clubs[0]) ? { label: 'Signature club', text: f.clubs[0], crest: f.clubs[0] } : null
    if (!club || nonClub.length < 3) continue
    const clues = [...nonClub.slice(0, 4), club]
    const rows = clues.map((c, i) => ({ ...c, tone: i === clues.length - 1 ? 'accent' : 'ink' }))
    const assets = [{ type: 'jersey', name: ACCENT }, ...(f.nationality ? [{ type: 'flag', name: f.nationality }] : []), ...(league0 ? [{ type: 'league', name: league0 }] : []), { type: 'crest', name: club.text }]
    out.push(makeSpec({
      format: 'who-am-i', version: 'who-am-i-v1', difficulty: diff(r), accent: ACCENT,
      entities: [name, ...clues.map(c => c.text)], answer: name,
      question: `Who am I? ${clues.map(c => c.text).join(', ')}`,
      render: { overline: 'Who am I?', rows, answer: name, reveal: { kind: 'jersey', name, flag: f.nationality || null }, assets, accent: ACCENT },
      metadata: { suggestedTitle: `Who am I? ⚽ ${clues.slice(0, 2).map(c => c.text).join(' · ')}…`, suggestedDescription: `Answer: ${name}. Can you name the mystery footballer from the clues? Play free football trivia at triviverse.com`, hashtags: ['#football', '#footballquiz', '#whoami', '#guesstheplayer', '#triviverse'] },
      engagement: engagementFor('who-am-i', name),
    }))
  }
  return out
}
