// TEMPLATE: player-between-clubs-v1
// "Can you name the player who played for BOTH clubs?" → countdown → answer → CTA.
// A 9:16 short driven entirely by { clubA, clubB, answer }. Design is defined in code.
import { h, C, up, seg, enter, inOut, clamp, clamp01, lerp, easeOutCubic, easeOutBack, easeInCubic } from '../lib/brand.mjs'

const FPS = 30
// timeline (seconds)
const T = { hook: 0.2, sub: 0.5, clubA: 0.8, x: 1.2, clubB: 1.5, cdStart: 3.0, cdEnd: 8.0, reveal: 8.3, cta: 11.3, end: 14.5 }

const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
// Bebas is condensed uppercase (~0.40em/char); size text so long names stay on one line.
const fitSize = (str, max, min, budget) => clamp(budget / Math.max(str.length, 1), min, max)

export default {
  id: 'player-between-clubs-v1',
  fps: FPS,
  durationSec: T.end,

  validate(spec) {
    for (const k of ['clubA', 'clubB', 'answer']) if (!spec?.[k] || !String(spec[k]).trim()) return { ok: false, reason: `missing ${k}` }
    if (spec.clubA === spec.clubB) return { ok: false, reason: 'clubs identical' }
    if (up(spec.clubA).length > 22 || up(spec.clubB).length > 22) return { ok: false, reason: 'club name too long for template' }
    if (up(spec.answer).length > 24) return { ok: false, reason: 'answer too long for template' }
    return { ok: true }
  },

  slug: (spec) => `${slugify(spec.clubA)}-${slugify(spec.clubB)}-${slugify(spec.answer)}`,

  metadata(spec) {
    const tags = ['football', 'footballquiz', 'footballtrivia', 'quiz', 'triviverse', slugify(spec.clubA).replace(/-/g, ''), slugify(spec.clubB).replace(/-/g, '')]
    return {
      question: `Name a player who played for both ${spec.clubA} and ${spec.clubB}`,
      answer: spec.answer,
      template: 'player-between-clubs-v1',
      entities: [spec.clubA, spec.clubB, spec.answer],
      suggestedTitle: `Can you name a player who played for BOTH ${spec.clubA} and ${spec.clubB}? 🤔⚽`,
      suggestedDescription: `The answer: ${spec.answer}! How many football transfers can you name? Play free daily football trivia at triviverse.com`,
      hashtags: [...new Set(tags)].map(t => '#' + t),
    }
  },

  scene(spec, t) {
    const clubFs = fitSize(up(spec.clubA).length > up(spec.clubB).length ? up(spec.clubA) : up(spec.clubB), 150, 60, 2200)
    const ansFs = fitSize(up(spec.answer), 168, 66, 2500)

    // ── header: hook + clubs (persist once in) ──
    const hook = h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 40, letterSpacing: 5, color: C.brandBright, textAlign: 'center', ...enter(t, T.hook, 0.5, { dy: 30 }) } }, 'CAN YOU NAME THE PLAYER?')
    const sub = h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 26, letterSpacing: 8, color: C.muted, marginTop: 10, ...enter(t, T.sub, 0.5, { dy: 20 }) } }, 'WHO PLAYED FOR BOTH')
    const club = (name, at, dx) => h('div', { style: { fontFamily: 'Bebas Neue', fontSize: clubFs, lineHeight: 0.98, color: C.ink, textAlign: 'center', ...enter(t, at, 0.55, { dx, pop: true }) } }, up(name))
    const cross = h('div', { style: { fontFamily: 'Bebas Neue', fontSize: clubFs * 0.5, color: C.brandBright, lineHeight: 1, margin: '-4px 0', ...enter(t, T.x, 0.4, { pop: true }) } }, '&')

    // progress bar under the clubs during the countdown
    const cdP = clamp01((t - T.cdStart) / (T.cdEnd - T.cdStart))
    const barOpacity = inOut(t, T.cdStart - 0.2, T.cdStart + 0.2, T.reveal - 0.2, T.reveal)
    const bar = h('div', { style: { width: 620, height: 12, borderRadius: 8, background: 'rgba(255,255,255,0.10)', marginTop: 44, display: 'flex', opacity: barOpacity } },
      h('div', { style: { width: `${(1 - cdP) * 100}%`, height: '100%', borderRadius: 8, background: C.brandBright } }))

    // ── dynamic centre: countdown → answer ──
    let centre
    if (t < T.reveal) {
      const val = Math.max(1, Math.ceil(T.cdEnd - t))
      const intoSec = 1 - (T.cdEnd - t - Math.floor(T.cdEnd - t)) // 0→1 within the second
      const pop = 1 + 0.18 * (1 - easeOutCubic(clamp01(intoSec / 0.4)))
      const preOpacity = inOut(t, T.cdStart - 0.15, T.cdStart + 0.15, T.reveal - 0.15, T.reveal)
      const ready = t < T.cdStart
        ? h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 46, letterSpacing: 6, color: C.secondary, opacity: seg(t, T.x + 0.4, T.cdStart, easeOutCubic) } }, 'GET READY…')
        : h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 340, lineHeight: 1, color: C.brandBright, opacity: preOpacity, transform: `scale(${pop})` } }, String(val))
      centre = ready
    } else {
      const rp = seg(t, T.reveal, T.reveal + 0.5, easeOutBack)
      const name = h('div', { style: { fontFamily: 'Bebas Neue', fontSize: ansFs, lineHeight: 0.98, color: C.ink, textAlign: 'center', opacity: clamp01(rp), transform: `scale(${lerp(0.7, 1, clamp01(rp))})` } }, up(spec.answer))
      const underline = h('div', { style: { display: 'flex', width: Math.round(Math.min(720, up(spec.answer).length * ansFs * 0.34) * seg(t, T.reveal + 0.15, T.reveal + 0.6, easeOutCubic)), height: 18, borderRadius: 9, background: C.brandBright, marginTop: 26 } })
      const chip = h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 30, letterSpacing: 4, color: C.successBright, marginTop: 30, opacity: seg(t, T.reveal + 0.4, T.reveal + 0.9, easeOutCubic) } }, '✓  PLAYED FOR BOTH')
      centre = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } }, name, underline, chip)
    }

    // ── CTA ──
    const ctaOp = seg(t, T.cta, T.cta + 0.6, easeOutCubic)
    const cta = h('div', { style: { position: 'absolute', top: 1380, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: ctaOp, transform: `translateY(${lerp(30, 0, ctaOp)}px)` } },
      h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 76, color: C.ink, letterSpacing: 1 } }, 'HOW MANY CAN YOU GET?'),
      h('div', { style: { display: 'flex', alignItems: 'center', marginTop: 20, padding: '18px 34px', borderRadius: 999, background: C.brand, fontFamily: 'Inter', fontWeight: 800, fontSize: 40, color: '#fff', letterSpacing: 1 } }, 'PLAY FREE  ·  TRIVIVERSE.COM'))

    // ── brand footer ──
    const footer = h('div', { style: { position: 'absolute', bottom: 90, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9 } },
      h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 34, letterSpacing: 6, color: '#fff' } }, 'TRIVIVERSE'))

    return h('div', { style: { width: '100%', height: '100%', display: 'flex', position: 'relative', background: `linear-gradient(160deg, ${C.canvasHigh} 0%, ${C.canvas} 62%)` } },
      // header block
      h('div', { style: { position: 'absolute', top: 150, left: 40, right: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' } }, hook, sub,
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 34 } }, club(spec.clubA, T.clubA, -80), cross, club(spec.clubB, T.clubB, 80)), bar),
      // centre dynamic zone
      h('div', { style: { position: 'absolute', top: 780, left: 40, right: 40, height: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } }, centre),
      t >= T.cta - 0.01 ? cta : null,
      footer,
    )
  },
}
