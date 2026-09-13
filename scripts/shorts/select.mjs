// Question selection for the video factory.
// Source of truth: src/data/seo/relations.generated.json — the ALREADY quality-gated output of
// build:relations (CLUB_MIN_STARS 16, PAIR_MIN_FAMOUS 5, PAIR_MIN_TOTAL 10). Every player carries
// an `s` (star = recognisable) flag from the recognisability model. We pick the most recognisable
// shared player as the answer, so every video passes the existing gates by construction.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const REL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data', 'seo', 'relations.generated.json')

export function selectQuestions(count = 30) {
  const { pages = [] } = JSON.parse(readFileSync(REL, 'utf8'))
  const out = [], usedAnswer = new Set()
  // Best pairs first (most recognisable answers); one video per unique answer for variety.
  for (const p of [...pages].sort((a, b) => b.famous - a.famous)) {
    const star = p.players.find(x => x.s)              // most-famous shared player (players are fame-sorted)
    if (!star) continue
    if (usedAnswer.has(star.n)) continue
    usedAnswer.add(star.n)
    out.push({ clubA: p.aName, clubB: p.bName, answer: star.n, _famous: p.famous, _total: p.total })
    if (out.length >= count) break
  }
  return out
}
