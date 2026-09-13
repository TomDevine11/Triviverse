// FOOTBALL POINTLESS renderer — imperative question (with league/club logos) → generous think
// countdown → dense "every answer we can name" grid that cascades in, tinted famous→rare with the
// rarest highlighted. The score is our own recognisability signal, labelled honestly (never a survey).
import { root, logoHeader, grid, countdown, footer } from '../lib/components.mjs'
import { leagueUri, crestUri } from '../lib/assets.mjs'
import { C, h, up, seg, easeOutCubic } from '../lib/brand.mjs'
import { cuesFor } from '../lib/audio.mjs'
import { POINTLESS_COUNTDOWN } from '../lib/timing.mjs'

const FPS = 30
const cdStart = 1.8, cdEnd = cdStart + POINTLESS_COUNTDOWN, gridStart = cdEnd + 0.2
const T = { cdStart, cdEnd, gridStart, end: gridStart + 5.0 }
const abs = (props, ...kids) => h('div', { style: { position: 'absolute', display: 'flex', ...props } }, ...kids)

export default {
  id: 'football-pointless-v1', fps: FPS,
  duration: () => T.end,
  cues: () => cuesFor({ cdStart: T.cdStart, cdEnd: T.cdEnd, revealAt: T.gridStart }),
  assets: (spec) => spec.render.assets || [],
  scene(spec, t) {
    const r = spec.render, a = r.accent
    const hd = r.header
    const useLeague = hd.kind === 'leagues'
    const aSrc = useLeague ? leagueUri(hd.aName) : crestUri(hd.aName)
    const bSrc = useLeague ? (hd.bName ? leagueUri(hd.bName) : undefined) : (hd.bName ? crestUri(hd.bName) : undefined)
    const showGrid = t >= T.gridStart
    return root(a, [
      logoHeader(t, { overline: hd.overline, aSrc, bSrc, aName: hd.aName, bName: hd.bName, joiner: hd.joiner || '&', accent: a, at: 0.15, top: 110 }),
      // think phase: prompt + countdown
      !showGrid ? abs({ top: 760, left: 60, right: 60, justifyContent: 'center', opacity: seg(t, 0.6, 1.1, easeOutCubic) }, h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 66, color: C.ink, letterSpacing: 1, textAlign: 'center' } }, r.obscure ? 'HOW OBSCURE CAN YOU GO?' : 'HOW MANY CAN YOU NAME?')) : null,
      !showGrid ? countdown(t, { start: T.cdStart, end: T.cdEnd, accent: a, top: 900 }) : null,
      // reveal: count callout + dense grid, tinted famous→rare, rarest highlighted
      showGrid ? abs({ top: 388, left: 0, right: 0, justifyContent: 'center', opacity: seg(t, T.gridStart, T.gridStart + 0.4, easeOutCubic) }, h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 26, letterSpacing: 3, color: C.muted } }, up(r.obscure ? `${r.count} pointless answers · did you get one?` : `${r.count} we can name · rarer = darker`))) : null,
      showGrid ? grid(t, { items: r.board, start: T.gridStart + 0.3, stagger: 0.026, accent: a, top: 440, boxH: 940, cols: 3, rarest: r.rarest, pointless: r.pointless }) : null,
      footer(t, { format: r.footerLabel || 'Pointless', difficulty: spec.difficulty, accent: a }),
    ])
  },
}
