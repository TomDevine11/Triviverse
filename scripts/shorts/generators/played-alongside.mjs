// PLAYED ALONGSIDE — "who played with all of them?" from teammate hubs (teammates.generated.json).
// Ambiguity note: we can't fully prove uniqueness from hub lists, so clues span ≥2 of the answer's
// clubs (tighter intersection) and the framing is honest ("name a player who played with all…").
import { teammateHubs, fame, playerFacts } from '../lib/data.mjs'
import { makeSpec } from '../lib/spec.mjs'
import { engagementFor } from '../lib/engagement.mjs'
const ACCENT = '#ec4899'
const diff = (r, span) => (r >= 75 && span < 2) ? 'easy' : r >= 62 ? 'medium' : r >= 52 ? 'hard' : 'impossible'
const up = (s) => String(s).toUpperCase()

export function generate(count, opts = {}, history) {
  const chain = Math.min(6, Math.max(3, opts.chain || 5))
  const hubs = teammateHubs().map(h => ({ ...h, reco: fame(h.name) })).filter(h => h.reco >= 52).sort((a, b) => b.reco - a.reco)
  const out = []
  for (const hub of hubs) {
    if (out.length >= count) break
    if (history && (history.answerCount.get(hub.name) || 0) > 0) continue
    if (opts.difficulty && !['easy', 'medium', 'hard', 'impossible'].includes(opts.difficulty)) { }
    // recognisable teammates (fame floor a touch lower to reach beyond one dominant club)
    const famous = hub.teammates.filter(t => t.fame >= 72 && up(t.name).length <= 22 && t.team)
    if (famous.length < chain) continue
    const byClub = new Map()
    for (const t of famous) { const k = t.team; if (!byClub.has(k)) byClub.set(k, []); byClub.get(k).push(t) }
    // SPREAD: require the clue set to span multiple clubs so no single club gives the answer away.
    // Take one from each club first (most recognisable), only doubling up once every club is used.
    const clubs = [...byClub.keys()], picked = []
    let i = 0
    while (picked.length < chain && clubs.length) {
      const c = clubs[i % clubs.length], arr = byClub.get(c)
      if (arr.length) picked.push(arr.shift()); else clubs.splice(i % clubs.length, 1)
      i++
      if (i > 80) break
    }
    if (picked.length < chain) continue
    const span = new Set(picked.map(p => p.team)).size
    if (span < Math.min(3, chain)) continue // reject one-club clue sets (any club-mate would fit)
    if (opts.difficulty && diff(hub.reco, span) !== opts.difficulty) continue
    const rows = picked.map(p => ({ text: p.name, tone: 'ink', crest: p.team || null }))
    const nat = playerFacts(hub.name)?.nationality || null
    const teams = [...new Set(picked.map(p => p.team).filter(Boolean))]
    const assets = [...teams.map(tm => ({ type: 'crest', name: tm })), { type: 'jersey', name: ACCENT }, ...(nat ? [{ type: 'flag', name: nat }] : [])]
    out.push(makeSpec({
      format: 'played-alongside', version: 'played-alongside-v1', difficulty: diff(hub.reco, span), accent: ACCENT,
      entities: [hub.name, ...picked.map(p => p.name)], answer: hub.name,
      question: `Name a player who played alongside all of: ${picked.map(p => p.name).join(', ')}`,
      render: { overline: `Who played with all ${chain}?`, rows, answer: hub.name, reveal: { kind: 'jersey', name: hub.name, flag: nat }, assets, accent: ACCENT },
      metadata: { suggestedTitle: `Name a player who played with ALL ${chain} of these 🤯`, suggestedDescription: `One answer: ${hub.name}. Can you find the link? (there may be more than one) Play free football trivia at triviverse.com`, hashtags: ['#football', '#footballquiz', '#playedalongside', '#footballtrivia', '#triviverse'] },
      engagement: engagementFor('played-alongside', hub.name),
    }))
  }
  return out
}
