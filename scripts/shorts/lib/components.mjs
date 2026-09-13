// Shared satori scene components for all short-form formats. Every format composes these, so the
// brand (night canvas, Bebas/Inter, purple + per-format accent, countdown, reveal, CTA, footer) is
// consistent while each format arranges them differently.
import { h, C, up, clamp, clamp01, lerp, seg, enter, inOut, easeOutCubic, easeOutBack } from './brand.mjs'

export const W = 1080, H = 1920
export const fit = (str, max, min, budget) => clamp(budget / Math.max(String(str).length, 1), min, max)
const abs = (props, ...kids) => h('div', { style: { position: 'absolute', display: 'flex', ...props } }, ...kids)

// Full-frame background: night gradient + a faint accent glow from the top.
export function root(accent, kids) {
  return h('div', { style: { width: '100%', height: '100%', display: 'flex', position: 'relative', background: `linear-gradient(165deg, ${C.canvasHigh} 0%, ${C.canvas} 60%)` } },
    abs({ top: 0, left: 0, right: 0, height: 620, background: `radial-gradient(120% 90% at 50% -10%, ${accent}22 0%, transparent 60%)` }),
    ...kids)
}

// Top header: overline + hook title (auto-wrapped lines you pass in).
export function header(t, { overline, titleLines, accent, at = 0.2 }) {
  const budget = 2400
  return abs({ top: 130, left: 40, right: 40, flexDirection: 'column', alignItems: 'center' },
    overline && h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 34, letterSpacing: 6, color: accent, textAlign: 'center', ...enter(t, at, 0.5, { dy: 26 }) } }, up(overline)),
    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 12 } },
      ...titleLines.map((ln, i) => h('div', { style: { fontFamily: 'Bebas Neue', fontSize: fit(titleLines.reduce((a, b) => a.length > b.length ? a : b), 128, 54, budget), lineHeight: 1.0, color: C.ink, textAlign: 'center', ...enter(t, at + 0.25 + i * 0.12, 0.5, { dy: 20 }) } }, up(ln)))))
}

// A small row icon: a crest/league logo on a light puck, or a flag chip. src pre-resolved by caller.
function rowIcon(src, kind) {
  if (!src) return null
  if (kind === 'flag') return flagChip(src, 62)
  return h('div', { style: { display: 'flex', width: 66, height: 66, borderRadius: 15, background: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', padding: 8 } }, img(src, 50, 50))
}

// Vertical "flow": staggered rows with a connector, used for careers/clues/teammates. Each row may
// carry a crest/league/flag icon (iconSrc + iconKind) drawn to its left.
// items: [{ text, label?, tone?:'ink'|'muted'|'accent', gap?:boolean, iconSrc?, iconKind? }]
export function flow(t, { items, start, stagger = 0.85, accent, top = 470, connector = true }) {
  const rows = []
  items.forEach((it, i) => {
    const at = start + i * stagger
    const e = enter(t, at, 0.45, { dy: 26, pop: true })
    const col = it.tone === 'accent' ? accent : it.tone === 'muted' ? C.muted : C.ink
    const bg = it.gap ? `${accent}26` : 'rgba(255,255,255,0.05)'
    const bd = it.gap ? accent : 'rgba(255,255,255,0.10)'
    const icon = rowIcon(it.iconSrc, it.iconKind)
    if (connector && i > 0) rows.push(h('div', { style: { width: 4, height: 24, borderRadius: 2, background: `${accent}aa`, margin: '2px 0', opacity: seg(t, at - 0.15, at + 0.1, easeOutCubic) } }))
    const textCol = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: icon ? 'flex-start' : 'center' } },
      it.label ? h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 20, letterSpacing: 3, color: C.muted, marginBottom: 4 } }, up(it.label)) : null,
      h('div', { style: { fontFamily: 'Bebas Neue', fontSize: fit(it.text, 58, 30, 1400), lineHeight: 1, color: col } }, up(it.text)))
    rows.push(h('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: icon ? 'flex-start' : 'center', gap: icon ? 22 : 0, padding: icon ? '12px 26px' : '14px 30px', borderRadius: 18, background: bg, border: `2px solid ${bd}`, ...e } },
      icon, textCol))
  })
  return abs({ top, left: 60, right: 60, flexDirection: 'column', alignItems: 'center' }, ...rows)
}

// Countdown: big number + shrinking bar. Returns null before/after the window.
export function countdown(t, { start, end, accent, top = 1240 }) {
  if (t < start - 0.2 || t > end + 0.05) return null
  const val = Math.max(1, Math.ceil(end - t))
  const into = 1 - ((end - t) - Math.floor(end - t))
  const pop = 1 + 0.16 * (1 - easeOutCubic(clamp01(into / 0.4)))
  const op = inOut(t, start - 0.15, start + 0.15, end - 0.1, end + 0.05)
  const p = clamp01((t - start) / (end - start))
  return abs({ top, left: 40, right: 40, flexDirection: 'column', alignItems: 'center', opacity: op },
    h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 300, lineHeight: 1, color: accent, transform: `scale(${pop})` } }, String(val)),
    h('div', { style: { width: 560, height: 12, borderRadius: 8, background: 'rgba(255,255,255,0.10)', marginTop: 20, display: 'flex' } },
      h('div', { style: { width: `${(1 - p) * 100}%`, height: '100%', borderRadius: 8, background: accent } })))
}

// Big answer reveal: pop-in name + accent underline + optional tag ("✓ …").
export function reveal(t, { at, text, accent, tag, tagColor = C.successBright, top = 1120 }) {
  const rp = seg(t, at, at + 0.5, easeOutBack)
  return abs({ top, left: 40, right: 40, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    h('div', { style: { fontFamily: 'Bebas Neue', fontSize: fit(text, 168, 60, 2500), lineHeight: 0.98, color: C.ink, textAlign: 'center', opacity: clamp01(rp), transform: `scale(${lerp(0.7, 1, clamp01(rp))})` } }, up(text)),
    h('div', { style: { display: 'flex', width: Math.round(Math.min(760, up(text).length * fit(text, 168, 60, 2500) * 0.34) * seg(t, at + 0.15, at + 0.6, easeOutCubic)), height: 18, borderRadius: 9, background: accent, marginTop: 24 } }),
    tag ? h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 30, letterSpacing: 3, color: tagColor, marginTop: 26, opacity: seg(t, at + 0.4, at + 0.9, easeOutCubic) } }, up(tag)) : null)
}

// Bottom CTA (headline + pill).
export function cta(t, { at, headline, sub, accent, top = 1400 }) {
  const op = seg(t, at, at + 0.6, easeOutCubic)
  return abs({ top, left: 60, right: 60, flexDirection: 'column', alignItems: 'center', opacity: op, transform: `translateY(${lerp(28, 0, op)}px)` },
    h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 68, color: C.ink, letterSpacing: 1, textAlign: 'center' } }, up(headline)),
    h('div', { style: { marginTop: 18, padding: '16px 32px', borderRadius: 999, background: accent, fontFamily: 'Inter', fontWeight: 800, fontSize: 36, color: '#fff', letterSpacing: 1, display: 'flex' } }, up(sub || 'PLAY FREE · TRIVIVERSE.COM')))
}

// Brand footer + a small series badge (format · difficulty).
export function footer(t, { format, difficulty, episode, accent }) {
  return abs({ bottom: 370, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' },
    h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, opacity: 0.9 } },
      h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 22, letterSpacing: 3, color: accent, padding: '6px 14px', borderRadius: 999, border: `2px solid ${accent}` } }, up(format)),
      difficulty ? h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 22, letterSpacing: 3, color: C.muted } }, up(difficulty)) : null),
    h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 32, letterSpacing: 6, color: '#fff' } }, 'TRIVIVERSE'),
    h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 20, letterSpacing: 3, color: C.muted, marginTop: 6 } }, 'PLAY FREE · TRIVIVERSE.COM'))
}
// ── Image primitives (crests / league logos / flags) ──
export const img = (src, w, hh) => h('img', { src, width: w, height: hh ?? w, style: { width: w, height: hh ?? w, objectFit: 'contain', display: 'flex' } })
const monogram = (name) => up(String(name).replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('') || '?')
// A crest on a light "puck" (so dark logos read on our night canvas), else a clean accent monogram
// tile (same footprint) so the tail degrades gracefully.
export function crestOrMono(src, name, size, accent) {
  const r = Math.round(size / 4.5)
  if (src) return h('div', { style: { display: 'flex', width: size, height: size, borderRadius: r, background: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', padding: Math.round(size * 0.12), boxShadow: '0 6px 18px rgba(0,0,0,0.30)' } }, img(src, Math.round(size * 0.76), Math.round(size * 0.76)))
  return h('div', { style: { width: size, height: size, borderRadius: r, background: `${accent}1f`, border: `2px solid ${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', fontSize: Math.round(size * 0.4), color: accent } }, monogram(name))
}
export const flagChip = (src, w = 56) => src ? h('div', { style: { display: 'flex', width: w, height: Math.round(w * 0.75), borderRadius: 5, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.18)' } }, img(src, w, Math.round(w * 0.75))) : null

// ── A generated football shirt (name across the back + squad number). The plate is our own SVG art,
// rasterised in the asset layer (jerseyUri) — no third-party imagery, so reveals get a "kit" with no
// copyright exposure. `plateSrc` is the prefetched PNG for this accent; name/number overlay in text. ──
export function jersey(t, { name, number, accent, plateSrc, at = 0.2, top = 760, flagSrc, fullName }) {
  const e = enter(t, at, 0.5, { dy: 34, pop: true })
  const w = 560, hh = Math.round(w * 132 / 120)
  const surname = up(String(name).split(' ').slice(-1)[0])
  const nameTop = number != null ? 0.23 : 0.34 // centre the name when there is no squad number
  return abs({ top, left: 0, right: 0, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    h('div', { style: { display: 'flex', position: 'relative', width: w, height: hh, alignItems: 'center', justifyContent: 'center', ...e } },
      plateSrc ? img(plateSrc, w, hh) : h('div', { style: { width: w, height: hh, borderRadius: 40, background: `linear-gradient(180deg, ${accent}, ${accent}bb)`, display: 'flex' } }),
      abs({ top: Math.round(hh * nameTop), left: 20, right: 20, justifyContent: 'center' },
        h('div', { style: { fontFamily: 'Bebas Neue', fontSize: fit(surname, number != null ? 84 : 96, 38, 3200), letterSpacing: 2, color: '#fff', lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.35)' } }, surname)),
      number != null ? abs({ top: Math.round(hh * 0.38), left: 0, right: 0, justifyContent: 'center' },
        h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 220, color: '#fff', lineHeight: 1, textShadow: '0 4px 14px rgba(0,0,0,0.4)' } }, String(number))) : null),
    fullName && up(fullName) !== surname ? h('div', { style: { display: 'flex', fontFamily: 'Bebas Neue', fontSize: fit(fullName, 88, 44, 2600), color: C.ink, letterSpacing: 1, marginTop: 22, ...enter(t, at + 0.25, 0.4, { dy: 14 }) } }, up(fullName)) : null,
    flagSrc ? h('div', { style: { display: 'flex', marginTop: 20, ...enter(t, at + 0.35, 0.4, { dy: 12 }) } }, flagChip(flagSrc, 78)) : null)
}

// Club reveal (for Guess the Club): the missing club's crest + name, popped in with a tag.
export function clubReveal(t, { at, name, crestSrc, accent, tag, top = 700 }) {
  const e = enter(t, at, 0.5, { dy: 34, pop: true })
  const mono = up(String(name).replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('') || '?')
  return abs({ top, left: 40, right: 40, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    h('div', { style: { display: 'flex', width: 300, height: 300, borderRadius: 48, background: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', padding: 40, boxShadow: '0 10px 30px rgba(0,0,0,0.35)', ...e } },
      crestSrc ? img(crestSrc, 220, 220) : h('div', { style: { display: 'flex', fontFamily: 'Bebas Neue', fontSize: 120, color: accent } }, mono)),
    h('div', { style: { fontFamily: 'Bebas Neue', fontSize: fit(name, 130, 54, 3400), lineHeight: 1, color: C.ink, textAlign: 'center', marginTop: 34, ...enter(t, at + 0.2, 0.5, { dy: 18 }) } }, up(name)),
    h('div', { style: { display: 'flex', marginTop: 20, padding: '10px 26px', borderRadius: 999, background: `${accent}22`, border: `2px solid ${accent}`, fontFamily: 'Inter', fontWeight: 800, fontSize: 30, letterSpacing: 3, color: accent, opacity: seg(t, at + 0.4, at + 0.8, easeOutCubic) } }, up(tag || 'The missing club')))
}

// ── Dense "every answer" grid: many name tiles, tinted by fame tier, the rarest highlighted. Sizes
// itself to a fixed box so any count fits without overflowing the footer. items: [{name,score}]
// pre-sorted famous→rare; cascades in; `rarest` name gets the accent tile. ──
export function grid(t, { items, start = 0, stagger = 0.028, accent, top = 430, boxH = 1180, cols = 3, rarest, pointless }) {
  const tier = (s) => s >= 60 ? C.ink : s >= 30 ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.56)'
  const mark = new Set(pointless || (rarest ? [rarest] : [])) // accent-highlight the "pointless"/rarest answers
  const rows = Math.max(1, Math.ceil(items.length / cols))
  const rowH = Math.min(66, Math.floor(boxH / rows))
  const gap = Math.max(6, Math.round(rowH * 0.14))
  const fontMax = Math.min(38, rowH - 22)
  // Right inset is larger than left to clear TikTok's action rail (like/comment/share/sound).
  const LEFT = 56, RIGHT = 130
  const colW = Math.floor((W - LEFT - RIGHT) / cols)
  // Container height must be exactly rows×rowH so the column-wrap yields precisely `cols` columns
  // (fixing it at boxH would overfill each column and collapse 3 cols → 2 for small counts).
  return abs({ top, left: LEFT, right: RIGHT, height: rows * rowH, flexWrap: 'wrap', flexDirection: 'column', alignContent: 'flex-start' },
    ...items.map((it, i) => {
      const at = start + i * stagger
      const e = enter(t, at, 0.3, { dy: 12, pop: true })
      const isR = mark.has(it.name)
      return h('div', { style: { display: 'flex', width: colW - 14, height: rowH - gap, marginBottom: gap, marginRight: 14, padding: '0 12px', borderRadius: 10, alignItems: 'center', background: isR ? `${accent}26` : 'rgba(255,255,255,0.05)', border: isR ? `2px solid ${accent}` : '2px solid rgba(255,255,255,0.07)', ...e } },
        h('div', { style: { fontFamily: 'Bebas Neue', fontSize: fit(it.name, fontMax, 20, colW * 2), lineHeight: 1.0, color: isR ? accent : tier(it.score) } }, up(it.name)))
    }))
}

// A header with one or two captioned logos (flanking an "&"/"→" when paired), above an imperative
// overline and optional title. Used for league-pair / club Pointless questions. bSrc null → single.
export function logoHeader(t, { overline, aSrc, bSrc, aName, bName, joiner = '&', titleLines = [], accent, at = 0.15, size = 132, top = 120 }) {
  const cap = (name) => h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 22, letterSpacing: 2, color: C.muted, marginTop: 12, textAlign: 'center', maxWidth: size + 60 } }, up(name))
  const unit = (src, name) => h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } }, crestOrMono(src, name, size, accent), cap(name))
  const paired = bSrc !== undefined && bName != null
  return abs({ top, left: 40, right: 40, flexDirection: 'column', alignItems: 'center' },
    overline ? h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 32, letterSpacing: 5, color: accent, textAlign: 'center', ...enter(t, at, 0.5, { dy: 22 }) } }, up(overline)) : null,
    h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 34, marginTop: 24, ...enter(t, at + 0.2, 0.5, { dy: 18, pop: true }) } },
      unit(aSrc, aName),
      paired ? h('div', { style: { display: 'flex', fontFamily: 'Bebas Neue', fontSize: 80, color: C.muted, marginTop: Math.round(size * 0.3) } }, joiner) : null,
      paired ? unit(bSrc, bName) : null),
    ...titleLines.map((ln, i) => h('div', { style: { fontFamily: 'Bebas Neue', fontSize: fit(titleLines.reduce((a, b) => a.length > b.length ? a : b), 96, 46, 2100), lineHeight: 1.0, color: C.ink, textAlign: 'center', marginTop: i === 0 ? 20 : 0, ...enter(t, at + 0.4 + i * 0.1, 0.5, { dy: 16 }) } }, up(ln))))
}

// A compact centred engagement line (comment prompt) that fades in near the end.
export function prompt(t, { at, text, accent, bottom = 260 }) {
  const op = seg(t, at, at + 0.5, easeOutCubic)
  return abs({ bottom, left: 50, right: 50, justifyContent: 'center', opacity: op, transform: `translateY(${(1 - op) * 20}px)` },
    h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 60, color: accent, letterSpacing: 1, textAlign: 'center' } }, up(text)))
}

// ── Winner Stays On: the two-player duel + reveal (one round). On reveal the actual stat values
// appear so the higher/lower verdict is justified (and viewers learn the number). ──
export function duel(t, { a, b, accent, catLabel, aVal, bVal, at = 0.2, cdStart, cdEnd, revealAt, winnerName, streak }) {
  const cd = t >= cdStart && t < revealAt
  const val = Math.max(1, Math.ceil(revealAt - t))
  const shown = t >= revealAt
  const side = (name, value, dx, on) => {
    const win = shown && name === winnerName
    const lose = shown && name !== winnerName
    return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: lose ? 0.5 : 1, transform: `scale(${win ? lerp(1, 1.06, seg(t, revealAt, revealAt + 0.4, easeOutBack)) : 1})`, ...enter(t, on, 0.4, { dx, pop: true }) } },
      h('div', { style: { fontFamily: 'Bebas Neue', fontSize: fit(name, 116, 48, 2100), lineHeight: 1, textAlign: 'center', color: win ? accent : lose ? C.faint : C.ink } }, up(name)),
      shown ? h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 96, lineHeight: 1, color: win ? accent : C.muted, marginTop: 6, opacity: seg(t, revealAt, revealAt + 0.35, easeOutCubic) } }, String(value)) : null)
  }
  return [
    header(t, { overline: catLabel, titleLines: [], accent, at }),
    abs({ top: 600, left: 50, right: 50, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
      side(a, aVal, -60, at + 0.3),
      h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 70, color: accent, margin: '14px 0', ...enter(t, at + 0.5, 0.3, { pop: true }) } }, 'VS'),
      side(b, bVal, 60, at + 0.7)),
    cd ? abs({ top: 1120, left: 0, right: 0, justifyContent: 'center' }, h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 200, color: accent } }, String(val))) : null,
    shown ? abs({ top: 1150, left: 0, right: 0, flexDirection: 'column', alignItems: 'center', opacity: seg(t, revealAt + 0.2, revealAt + 0.6, easeOutCubic) }, h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 62, color: C.successBright, letterSpacing: 2 } }, up(`${winnerName} STAYS ON`)), streak != null ? h('div', { style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 30, letterSpacing: 4, color: C.muted, marginTop: 8 } }, `STREAK ${streak}`) : null) : null,
  ]
}

// ── Football Pointless: leaderboard board of {name, score} revealed row by row ──
export function board(t, { rows, start, stagger = 0.5, accent, top = 980 }) {
  const max = Math.max(1, ...rows.map(r => r.score))
  return abs({ top, left: 70, right: 70, flexDirection: 'column' },
    ...rows.map((r, i) => {
      const at = start + i * stagger
      const e = enter(t, at, 0.4, { dy: 20 })
      const w = seg(t, at + 0.1, at + 0.5, easeOutCubic) * (r.score / max)
      return h('div', { style: { display: 'flex', flexDirection: 'column', marginBottom: 18, ...e } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' } },
          h('div', { style: { fontFamily: 'Bebas Neue', fontSize: fit(r.name, 56, 34, 1500), color: C.ink, lineHeight: 1 } }, up(r.name)),
          h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 52, color: accent } }, String(r.score))),
        h('div', { style: { width: '100%', height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.08)', marginTop: 8, display: 'flex' } },
          h('div', { style: { width: `${w * 100}%`, height: '100%', borderRadius: 6, background: accent } })))
    }))
}
