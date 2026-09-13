// WINNER STAYS ON — a stat-duel streak. The champion stays; each challenger is chosen to engineer
// escalating difficulty (early clear gaps → late nail-biters, with natural "famous name is actually
// lower" surprises). Data: PER-PLAYER registry stats (winnerCategories) — hundreds of recognisable
// players per category, so duels pair mid-tier names too (Ramsey vs Crouch), not just the top scorers.
import { winnerCategories, fame } from '../lib/data.mjs'
import { makeSpec } from '../lib/spec.mjs'
import { engagementFor } from '../lib/engagement.mjs'
import { lerp } from '../lib/brand.mjs'
const ACCENT = '#f97316'

// One streak run: escalating closeness via a target value-gap that shrinks each round.
// startFrac varies the opening champion so different runs in a category diverge (not duplicates).
function buildRun(cat, N, startFrac = 0.35) {
  const entries = Object.entries(cat.players).map(([name, value]) => ({ name, value, fame: (cat.reco && cat.reco[name]) ?? fame(name) }))
    .filter(e => e.fame >= 45 && String(e.name).toUpperCase().length <= 22).sort((a, b) => b.value - a.value)
  if (entries.length < N + 2) return null
  let champ = entries[Math.min(entries.length - 2, Math.floor(entries.length * startFrac))]
  const used = new Set([champ.name]), rounds = []
  for (let k = 0; k < N; k++) {
    const frac = lerp(0.55, 0.06, k / Math.max(1, N - 1)) // desired |gap|/champ.value: wide → tight
    let best = null, bestScore = Infinity
    for (const e of entries) {
      if (used.has(e.name)) continue
      const gap = Math.abs(e.value - champ.value) / Math.max(1, champ.value)
      const score = Math.abs(gap - frac) * 3 + (100 - e.fame) / 100
      if (score < bestScore) { bestScore = score; best = e }
    }
    if (!best) break
    const winner = best.value >= champ.value ? best : champ
    rounds.push({ a: champ.name, b: best.name, aVal: champ.value, bVal: best.value, winner: winner.name })
    used.add(best.name); champ = winner
  }
  return rounds.length >= 3 ? rounds : null
}

export function generate(count, opts = {}, history) {
  const cats = winnerCategories()
  const catIds = opts.category ? [opts.category] : Object.keys(cats)
  const N = Math.min(6, Math.max(3, opts.rounds || 5))
  const fracs = [0.25, 0.4, 0.15, 0.5, 0.32, 0.6, 0.1, 0.45, 0.55, 0.2]
  const out = [], seen = new Set()
  for (let i = 0; i < fracs.length * catIds.length && out.length < count; i++) {
    const id = catIds[i % catIds.length]
    const frac = fracs[Math.floor(i / catIds.length) % fracs.length]
    const cat = cats[id]; if (!cat) continue
    const run = buildRun(cat, N, frac)
    if (!run) continue
    const catLabel = cat.statLabel
    const firstPair = `${id}|${run[0].a}|${run[0].b}`
    if (seen.has(firstPair)) continue; seen.add(firstPair)
    {
      out.push(makeSpec({
        format: 'winner-stays-on', version: 'winner-stays-on-v1', difficulty: opts.difficulty || 'medium', accent: ACCENT,
        entities: [id, run[0].a, run[0].b, ...new Set(run.flatMap(r => [r.a, r.b]))], answer: run[run.length - 1].winner,
        question: `Winner stays on: ${catLabel}`,
        render: { category: id, catLabel, rounds: run, streak: run.length, accent: ACCENT },
        metadata: { suggestedTitle: `Winner Stays On: ${catLabel} 🔥 how long is your streak?`, suggestedDescription: `Pick the player with more ${catLabel} and keep the streak alive. How far did you get? Play free football trivia at triviverse.com`, hashtags: ['#football', '#footballquiz', '#higherorlower', '#winnerstayson', '#triviverse'] },
        engagement: engagementFor('winner-stays-on', firstPair),
      }))
    }
  }
  return out.slice(0, count)
}
