// WINNER STAYS ON renderer — plays the streak round by round (duel → quick countdown → winner stays),
// then a STREAK outro. Distinct "duel" layout vs the list formats.
import { root, header, duel, reveal, cta, footer } from '../lib/components.mjs'
import { C, h } from '../lib/brand.mjs'

import { WINNER_COUNTDOWN } from '../lib/timing.mjs'
// Within a round: names settle (~CD_IN), a reading beat, a full countdown (CD_LEN), then reveal +
// "STAYS ON" holds ~1.1s before the next round.
const FPS = 30, INTRO = 0.9, OUTRO = 3.4
const CD_IN = 1.4, CD_LEN = WINNER_COUNTDOWN
const RD = CD_IN + CD_LEN + 1.1
const total = (spec) => INTRO + spec.render.rounds.length * RD

export default {
  id: 'winner-stays-on-v1', fps: FPS,
  duration: (spec) => total(spec) + OUTRO,
  cues: (spec) => spec.render.rounds.flatMap((_, k) => {
    const rs = INTRO + k * RD, rev = rs + CD_IN + CD_LEN
    const cues = [{ at: +(rs + 0.35).toFixed(2), sound: 'whoosh' }, { at: +(rs + 0.75).toFixed(2), sound: 'whoosh' }] // two names slide in
    for (let s = Math.ceil(CD_LEN); s >= 1; s--) cues.push({ at: +(rev - s).toFixed(2), sound: s === 1 ? 'tick-final' : 'tick' }) // per-second countdown
    cues.push({ at: +rev.toFixed(2), sound: 'reveal' })
    return cues
  }),
  scene(spec, t) {
    const r = spec.render, a = r.accent, rounds = r.rounds
    const foot = footer(t, { format: 'Winner Stays On', difficulty: spec.difficulty, accent: a })
    if (t < INTRO) {
      return root(a, [header(t, { overline: 'Winner stays on', titleLines: [r.catLabel], accent: a, at: 0.05 }), foot])
    }
    const k = Math.floor((t - INTRO) / RD)
    if (k >= 0 && k < rounds.length) {
      const rs = INTRO + k * RD, rd = rounds[k], rev = rs + CD_IN + CD_LEN
      return root(a, [...duel(t, { a: rd.a, b: rd.b, aVal: rd.aVal, bVal: rd.bVal, accent: a, catLabel: r.catLabel, at: rs + 0.05, cdStart: rs + CD_IN, cdEnd: rev, revealAt: rev, winnerName: rd.winner, streak: k + 1 }), foot])
    }
    // outro — STREAK n + CTA
    const oAt = total(spec)
    return root(a, [
      header(t, { overline: 'Final score', titleLines: [], accent: a, at: oAt + 0.05 }),
      reveal(t, { at: oAt + 0.1, text: `Streak ${rounds.length}`, accent: a, tag: 'How far did you get?', tagColor: C.muted, top: 720 }),
      cta(t, { at: oAt + 0.6, headline: spec.engagement.comment.replace(/ 👇| 🔥| 🤯/g, ''), sub: 'PLAY FREE · TRIVIVERSE.COM', accent: a, top: 1140 }),
      foot,
    ])
  },
}
