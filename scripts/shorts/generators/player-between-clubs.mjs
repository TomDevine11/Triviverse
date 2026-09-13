// PLAYER BETWEEN CLUBS — "name every player who played for BOTH clubs". Uses the already
// quality-gated relations pages (src/data/seo/relations.generated.json), which list every shared
// player per club pair with a recognisability star. We show them all in the dense grid, tinted
// famous→rare via the disambiguated registry reco, both club crests in the header.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { playerFacts } from '../lib/data.mjs'
import { makeSpec } from '../lib/spec.mjs'
import { engagementFor } from '../lib/engagement.mjs'

const ACCENT = '#7c3aed'
const REL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'src', 'data', 'seo', 'relations.generated.json')
const CAP = 60, MIN_BOARD = 10
const MIN_TOTAL = 15, MAX_TOTAL = 35 // keep the shared-player list short enough to show ALL of it

export function generate(count, opts = {}, history) {
  const { pages = [] } = JSON.parse(readFileSync(REL, 'utf8'))
  const out = []
  for (const p of [...pages].sort((a, b) => b.famous - a.famous)) {
    if (out.length >= count) break
    if (p.total < MIN_TOTAL || p.total > MAX_TOTAL) continue // only "name them ALL" sized pairs
    const scored = [...new Map(p.players.map(x => [x.n, x])).values()]
      .map(x => ({ name: x.n, score: playerFacts(x.n)?.reco ?? (x.s ? 50 : 6), star: !!x.s }))
      .filter(x => x.name.length <= 22)
      .sort((a, b) => b.score - a.score)
    if (scored.length < MIN_BOARD || scored[0].score < 55) continue
    const stars = scored.filter(x => x.star)
    const rarest = (stars.length ? stars[stars.length - 1] : scored[scored.length - 1]).name
    const board = scored.length <= CAP ? scored : scored.slice(0, CAP)
    const hd = { kind: 'clubs', overline: 'Name every player who played for both', aName: p.aName, bName: p.bName, joiner: '&', assets: [{ type: 'crest', name: p.aName }, { type: 'crest', name: p.bName }] }
    out.push(makeSpec({
      format: 'player-between-clubs', version: 'player-between-clubs-v2', difficulty: p.famous >= 10 ? 'easy' : p.famous >= 7 ? 'medium' : 'hard', accent: ACCENT,
      entities: [p.aName, p.bName, ...board.slice(0, 6).map(b => b.name)], answer: rarest,
      question: `Name every player who played for both ${p.aName} and ${p.bName}`,
      render: { header: hd, board, count: scored.length, rarest, accent: ACCENT, assets: hd.assets, footerLabel: 'Between Clubs' },
      metadata: { suggestedTitle: `Name EVERY player who played for both ${p.aName} & ${p.bName} 🔗 how many can you get?`, suggestedDescription: `${scored.length} players have played for both ${p.aName} and ${p.bName}. How many can you name? Play free football trivia at triviverse.com`, hashtags: ['#football', '#footballquiz', '#transfers', '#footballtrivia', '#triviverse'] },
      engagement: engagementFor('player-between-clubs', p.aName + p.bName),
    }))
  }
  return out
}
