// GUESS THE CLUB — show a career with one interior club hidden; reveal the missing club.
import { careers, fame } from '../lib/data.mjs'
import { makeSpec } from '../lib/spec.mjs'
import { engagementFor } from '../lib/engagement.mjs'
const ACCENT = '#f59e0b'
const diff = (r) => r >= 75 ? 'easy' : r >= 60 ? 'medium' : r >= 50 ? 'hard' : 'impossible'
const H = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }

export function generate(count, opts = {}, history) {
  const pool = careers().map(p => ({ ...p, reco: fame(p.name) })).filter(p => p.reco >= 50).sort((a, b) => b.reco - a.reco)
  const out = []
  for (const p of pool) {
    if (out.length >= count) break
    if (history && (history.answerCount.get(p.name) || 0) > 0) continue
    if (opts.difficulty && diff(p.reco) !== opts.difficulty) continue
    const clubs = p.clubs.map(c => c.name).filter(Boolean).slice(0, 6)
    if (clubs.length < 4 || clubs.some(c => c.toUpperCase().length > 22)) continue
    // hide one INTERIOR club (index 1..n-2) chosen deterministically; missing club is the answer.
    const idx = 1 + (H(p.name) % (clubs.length - 2))
    const missing = clubs[idx]
    if (missing.toUpperCase().length > 22) continue
    const rows = clubs.map((c, i) => i === idx ? { text: '???', tone: 'accent', gap: true } : { text: c, tone: 'ink', crest: c })
    const assets = [...clubs.filter((_, i) => i !== idx).map(c => ({ type: 'crest', name: c })), { type: 'crest', name: missing }]
    out.push(makeSpec({
      format: 'guess-the-club', version: 'guess-the-club-v1', difficulty: diff(p.reco), accent: ACCENT,
      entities: [p.name, missing, ...clubs.filter((_, i) => i !== idx)], answer: missing,
      question: `Which club is missing from ${p.name}'s career?`,
      render: { overline: 'Which club is missing from', titleLines: [`${p.name}'s career`], rows, answer: missing, reveal: { kind: 'club', crest: missing, tag: `${p.name} played here` }, assets, accent: ACCENT },
      metadata: { suggestedTitle: `Which club is missing from ${p.name}'s career? 🤔`, suggestedDescription: `The missing club: ${missing}. Can you complete ${p.name}'s career? Play free football trivia at triviverse.com`, hashtags: ['#football', '#footballquiz', '#guesstheclub', '#careerpath', '#triviverse'] },
      engagement: engagementFor('guess-the-club', p.name),
    }))
  }
  return out
}
