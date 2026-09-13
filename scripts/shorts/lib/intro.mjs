// Opening "direct question" card shown on EVERY video for its first INTRO_CARD seconds — a centred,
// full-screen prompt (format name + what to do), e.g. "WHO AM I? / Name the player from the clues".
// It's also a perfect, spoiler-free thumbnail frame. withIntro() prepends it to any template and
// shifts that template's timeline + audio cues, so no template needs to know about it.
import { root, fit } from './components.mjs'
import { h, C, up, seg, easeOutCubic, easeOutBack, lerp, clamp01 } from './brand.mjs'
import { INTRO_CARD } from './timing.mjs'

// [big line, instruction] per format.
const TXT = {
  'who-am-i': ['Who am I?', 'Name the player from the clues'],
  'career-path': ['Whose career?', 'Name the player from their clubs'],
  'guess-the-club': ['Guess the club', 'Name the missing club'],
  'played-alongside': ['Played alongside', 'Who played with all of them?'],
  'winner-stays-on': ['Winner stays on', 'Pick the higher number — keep the streak'],
  'football-pointless': ['Football Pointless', 'Name the most obscure answer'],
  'player-between-clubs': ['Between clubs', 'Name every player who played for both'],
}

const abs = (props, ...kids) => h('div', { style: { position: 'absolute', display: 'flex', ...props } }, ...kids)

export function titleCard(t, { format, accent }) {
  const [big, sub] = TXT[format] || ['Triviverse', 'Football trivia']
  const op = clamp01(seg(t, 0, 0.35, easeOutCubic))
  const pop = seg(t, 0, 0.5, easeOutBack)
  return abs({ top: 0, left: 60, right: 60, bottom: 0, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: op },
    h('div', { style: { fontFamily: 'Bebas Neue', fontSize: fit(big, 168, 84, 2600), lineHeight: 0.98, color: accent, letterSpacing: 2, textAlign: 'center', transform: `scale(${lerp(0.9, 1, pop)})` } }, up(big)),
    h('div', { style: { display: 'flex', width: 200, height: 10, borderRadius: 6, background: accent, margin: '30px 0' } }),
    h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 46, color: C.secondary, letterSpacing: 1, textAlign: 'center', maxWidth: 860 } }, up(sub)),
    abs({ bottom: 150, left: 0, right: 0, justifyContent: 'center', opacity: seg(t, 0.5, 0.9, easeOutCubic) }, h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 28, letterSpacing: 6, color: C.muted } }, 'TRIVIVERSE')))
}

// Wrap a template so every video opens with the title card, then plays the normal content.
export function withIntro(tpl, format) {
  return {
    id: tpl.id, fps: tpl.fps, assets: tpl.assets,
    duration: (spec) => INTRO_CARD + tpl.duration(spec),
    cues: (spec) => (tpl.cues ? tpl.cues(spec) : []).map((c) => ({ ...c, at: +(c.at + INTRO_CARD).toFixed(2) })),
    scene: (spec, t) => (t < INTRO_CARD
      ? root(spec.render.accent, [titleCard(t, { format, accent: spec.render.accent })])
      : tpl.scene(spec, t - INTRO_CARD)),
  }
}
