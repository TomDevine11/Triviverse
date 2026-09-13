// CAREER PATH — "Whose career is this?" from chronological careers (careers.generated.json).
// Each club row carries its crest; the answer is revealed as a generated name-jersey + nationality flag.
import { careers, fame, playerFacts } from '../lib/data.mjs'
import { makeSpec } from '../lib/spec.mjs'
import { engagementFor } from '../lib/engagement.mjs'
const ACCENT = '#06b6d4'
const diff = (r) => r >= 75 ? 'easy' : r >= 60 ? 'medium' : r >= 50 ? 'hard' : 'impossible'

export function generate(count, opts = {}, history) {
  const pool = careers().map(p => ({ ...p, reco: fame(p.name) })).filter(p => p.reco >= 45).sort((a, b) => b.reco - a.reco)
  const out = []
  for (const p of pool) {
    if (out.length >= count) break
    if (history && (history.answerCount.get(p.name) || 0) > 0) continue
    if (opts.difficulty && diff(p.reco) !== opts.difficulty) continue
    const clubs = p.clubs.map(c => c.name).filter(Boolean)
    if (clubs.length < 4) continue
    const shown = clubs.slice(0, Math.min(6, clubs.length))
    if (shown.some(c => c.toUpperCase().length > 22)) continue
    const nat = playerFacts(p.name)?.nationality || null
    const rows = shown.map(c => ({ text: c, tone: 'ink', crest: c }))
    const assets = [...shown.map(c => ({ type: 'crest', name: c })), { type: 'jersey', name: ACCENT }, ...(nat ? [{ type: 'flag', name: nat }] : [])]
    out.push(makeSpec({
      format: 'career-path', version: 'career-path-v1', difficulty: diff(p.reco), accent: ACCENT,
      entities: [...shown, p.name], answer: p.name,
      question: `Whose career is this? ${shown.join(' → ')}`,
      render: { overline: 'Whose career is this?', rows, answer: p.name, reveal: { kind: 'jersey', name: p.name, flag: nat }, assets, accent: ACCENT },
      metadata: { suggestedTitle: `Whose career is this? ⚽ ${shown.slice(0, 3).join(' → ')}…`, suggestedDescription: `Answer: ${p.name}. Can you name the player from their clubs? Play free football trivia at triviverse.com`, hashtags: ['#football', '#footballquiz', '#careerpath', '#guesstheplayer', '#triviverse'] },
      engagement: engagementFor('career-path', p.name),
    }))
  }
  return out
}
