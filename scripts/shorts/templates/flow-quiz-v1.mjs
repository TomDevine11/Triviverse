// Shared renderer for the four "reveal a vertical list, then the answer" formats:
// career-path, guess-the-club, who-am-i, played-alongside. Each supplies its own accent, overline,
// row style (label/tone/gap/icon) and reveal via spec.render, so they read as related-but-distinct.
// Rows can carry crest/league/flag icons; the answer reveal is a generated jersey (player) or a club
// crest (guess-the-club), falling back to a plain text reveal.
import { root, header, flow, countdown, reveal, clubReveal, jersey, footer } from '../lib/components.mjs'
import { crestUri, leagueUri, flagUri, jerseyUri } from '../lib/assets.mjs'
import { cuesFor } from '../lib/audio.mjs'
import { FLOW_COUNTDOWN } from '../lib/timing.mjs'

const FPS = 30
function timings(spec) {
  const n = spec.render.rows.length
  const rowsStart = 0.9, stagger = 0.8
  const rowsShown = rowsStart + n * stagger
  const cdStart = rowsShown + 0.2, cdEnd = cdStart + FLOW_COUNTDOWN
  const revealAt = cdEnd + 0.15
  const ctaAt = revealAt + 2.2
  return { rowsStart, stagger, cdStart, cdEnd, revealAt, ctaAt, end: ctaAt + 3.2 }
}
// Resolve a row's icon (crest / league logo / flag) to a prefetched image source.
function rowWithIcon(row) {
  if (row.flag) return { ...row, iconSrc: flagUri(row.flag), iconKind: 'flag' }
  if (row.league) return { ...row, iconSrc: leagueUri(row.league), iconKind: 'crest' }
  if (row.crest) return { ...row, iconSrc: crestUri(row.crest), iconKind: 'crest' }
  return row
}

export default {
  id: 'flow-quiz-v1', fps: FPS,
  duration: (spec) => timings(spec).end,
  cues: (spec) => {
    const T = timings(spec)
    const whoosh = spec.render.rows.map((_, i) => ({ at: +(T.rowsStart + i * T.stagger).toFixed(2), sound: 'whoosh' })) // one per row as it slides in
    return cuesFor({ cdStart: T.cdStart, cdEnd: T.cdEnd, revealAt: T.revealAt, extra: whoosh })
  },
  assets: (spec) => spec.render.assets || [],
  scene(spec, t) {
    const r = spec.render, a = r.accent, T = timings(spec)
    const titleLines = r.titleLines || []
    const showList = t < T.revealAt
    const rev = r.reveal || { kind: 'text' }
    const revealEl = () => {
      if (rev.kind === 'jersey') return jersey(t, { name: rev.name, number: rev.number, fullName: rev.name, accent: a, plateSrc: jerseyUri(a), flagSrc: rev.flag ? flagUri(rev.flag) : null, at: T.revealAt, top: 560 })
      if (rev.kind === 'club') return clubReveal(t, { at: T.revealAt, name: r.answer, crestSrc: crestUri(rev.crest), accent: a, tag: rev.tag || 'The missing club', top: 580 })
      return reveal(t, { at: T.revealAt, text: r.answer, accent: a, tag: r.tag, top: 1200 })
    }
    return root(a, [
      header(t, { overline: r.overline, titleLines, accent: a, at: 0.2 }),
      showList ? flow(t, { items: r.rows.map(rowWithIcon), start: T.rowsStart, stagger: T.stagger, accent: a, top: titleLines.length ? 470 : 350 }) : null,
      countdown(t, { start: T.cdStart, end: T.cdEnd, accent: a, top: 1050 }),
      t >= T.revealAt ? revealEl() : null,
      footer(t, { format: FORMAT_LABEL[spec.format] || spec.format, difficulty: spec.difficulty, accent: a }),
    ])
  },
}
const FORMAT_LABEL = { 'career-path': 'Career Path', 'guess-the-club': 'Guess the Club', 'who-am-i': 'Who Am I?', 'played-alongside': 'Played Alongside' }
