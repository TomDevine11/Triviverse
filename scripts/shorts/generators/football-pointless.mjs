// FOOTBALL POINTLESS — open-ended question → reveal valid answers scored by our own recognisability
// signal (a TRIVIVERSE FAME SCORE, lower = rarer). This is NOT survey data and is never labelled as
// such. Data: pointless/questions.generated.json (gated) + recognisability.generated.json.
import { pointlessQs, playerFacts } from '../lib/data.mjs'
import { makeSpec } from '../lib/spec.mjs'
import { engagementFor } from '../lib/engagement.mjs'
const ACCENT = '#14b8a6'

// Score answers from the qgen registry's DISAMBIGUATED reco (per player object) — never the flat
// recognisability name-map, which collapses namesakes onto the most-famous score (e.g. journeyman
// "Koke" → Atlético Koke's 100). Then verify each answer's registry player actually satisfies the
// question, so a famous same-name player can never be surfaced for a constraint they don't meet.
const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norm = (s) => fold(s).toLowerCase().replace(/^the /, '').trim()
const clubKey = (s) => fold(s).toLowerCase().replace(/[^a-z]/g, '')
const clubMatch = (want, have) => have.some(k => k && (k === want || ((k.includes(want) || want.includes(k)) && Math.min(k.length, want.length) >= 6)))
function satisfies(q, f) {
  const fl = new Set(f.leagues.map(norm))
  if (q.family === 'both-leagues') { const m = q.title.match(/^Played in BOTH (?:the )?(.+?) and (?:the )?(.+)$/); return !!m && fl.has(norm(m[1])) && fl.has(norm(m[2])) }
  if (q.family === 'scored-both') { const m = q.title.match(/^Scored in (?:the )?(.+?) AND (?:the )?(.+)$/); return !!m && fl.has(norm(m[1])) && fl.has(norm(m[2])) }
  if (q.family === 'nat-league') { const m = q.title.match(/^(.+?) players who appeared in (?:the )?(.+)$/); return !!m && fl.has(norm(m[2])) && !!f.nationality && norm(f.nationality) === norm(m[1]) }
  if (q.family === 'club' || q.family === 'club-trophy') { const m = q.title.match(/^Played for (.+?)(?: and won .+)?$/); return !!m && clubMatch(clubKey(m[1]), f.clubs.map(clubKey)) }
  return true
}

// "Pointless" band: an answer's recognisability must sit BELOW the "obvious" cutoff (we drop the
// famous names everyone would say) but above a floor (so it's a real, nameable player, not a ghost).
const FAMOUS_CUT = 50, FLOOR = 3, CAP = 60, MIN_POINTLESS = 15

const clean = (s) => s.replace(/^the /i, '').trim()
// Build the captioned-logo header + the assets to prefetch, per question family. Framed as the
// "most obscure player to …" challenge (we only show pointless-tier answers).
function headerFor(q) {
  const t = q.title
  let m
  if ((m = t.match(/^Played in BOTH (?:the )?(.+?) and (?:the )?(.+)$/))) { const a = clean(m[1]), b = clean(m[2]); return { kind: 'leagues', overline: 'The most obscure player to play in both', aName: a, bName: b, joiner: '&', assets: [{ type: 'league', name: a }, { type: 'league', name: b }] } }
  if ((m = t.match(/^Scored in (?:the )?(.+?) AND (?:the )?(.+)$/))) { const a = clean(m[1]), b = clean(m[2]); return { kind: 'leagues', overline: 'The most obscure player to score in both', aName: a, bName: b, joiner: '&', assets: [{ type: 'league', name: a }, { type: 'league', name: b }] } }
  if ((m = t.match(/^(.+?) players who appeared in (?:the )?(.+)$/))) { const lg = clean(m[2]); return { kind: 'leagues', overline: `${m[1]}'s most obscure player to appear in`, aName: lg, bName: null, assets: [{ type: 'league', name: lg }] } }
  if ((m = t.match(/^Played for (.+?) and won (.+)$/))) return { kind: 'club', overline: `The most obscure player to win ${m[2]} at`, aName: m[1], bName: null, assets: [{ type: 'crest', name: m[1] }] }
  if ((m = t.match(/^Played for (.+)$/))) return { kind: 'club', overline: 'The most obscure player to play for', aName: m[1], bName: null, assets: [{ type: 'crest', name: m[1] }] }
  return { kind: 'club', overline: 'The most obscure player', aName: '', bName: null, assets: [] }
}

export function generate(count, opts = {}, history) {
  const out = []
  for (const q of pointlessQs()) {
    if (out.length >= count) break
    if (history && history.slugs.has(`football-pointless-${q.id}`)) continue
    const scored = q.answers.map(a => { const f = playerFacts(a.d); return f && a.d.length <= 22 && satisfies(q, f) ? { name: a.d, score: f.reco || 0 } : null }).filter(Boolean)
    // Keep ONLY the pointless tier (drop the obvious famous names), most-recognisable-of-the-obscure first.
    const obscure = [...new Map(scored.map(x => [x.name, x])).values()].filter(x => x.score >= FLOOR && x.score < FAMOUS_CUT).sort((a, b) => b.score - a.score)
    if (obscure.length < MIN_POINTLESS) continue
    // If there are more than fit, show the 60 MOST recognisable of the pointless answers.
    const board = obscure.slice(0, CAP)
    const rarest = board[board.length - 1] // deepest cut on screen — crowned as the most obscure
    const hd = headerFor(q)
    const subject = hd.bName ? `${hd.aName} & ${hd.bName}` : hd.aName
    out.push(makeSpec({
      format: 'football-pointless', version: 'football-pointless-v1', difficulty: 'hard', accent: ACCENT,
      entities: [q.id, ...board.slice(0, 8).map(b => b.name)], answer: rarest.name,
      question: `${hd.overline} ${subject}`.trim(),
      render: { header: hd, board, count: obscure.length, rarest: rarest.name, obscure: true, accent: ACCENT, assets: hd.assets },
      metadata: { suggestedTitle: `Can you guess the most obscure player to ${q.title.replace(/^Played |^Scored |^Won /, m => m.toLowerCase()).replace(/^(.+?) players who appeared in/, '$1 played in')}? 👀`, suggestedDescription: `${obscure.length} pointless-level players did it — we show the 60 most gettable. Can you name one? Play free football trivia at triviverse.com`, hashtags: ['#football', '#footballquiz', '#pointless', '#footballtrivia', '#triviverse'] },
      engagement: engagementFor('football-pointless', q.id),
    }))
  }
  return out
}
