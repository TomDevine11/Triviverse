// Shared brand tokens, fonts and animation helpers for the short-form video factory.
// Colours come from the Triviverse design system (docs/design-tokens.md); fonts are the same
// Bebas Neue + Inter files the OG-image pipeline already ships.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const FONTS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'og-service', 'fonts')
export const fonts = [
  { name: 'Bebas Neue', data: readFileSync(path.join(FONTS, 'bebas-neue.ttf')), weight: 400, style: 'normal' },
  { name: 'Inter', data: readFileSync(path.join(FONTS, 'inter-500.woff')), weight: 500, style: 'normal' },
  { name: 'Inter', data: readFileSync(path.join(FONTS, 'inter-800.woff')), weight: 800, style: 'normal' },
]

export const C = {
  canvas: '#0b0a14', canvasHigh: '#151024', board: '#100e1c',
  ink: '#ffffff', secondary: '#c9c6d6', muted: '#8c89a3', faint: '#57536e',
  brand: '#7c3aed', brandBright: '#a78bfa', brandDeep: '#5b21b6',
  success: '#22c55e', successBright: '#4ade80', warn: '#fbbf24', danger: '#ef4444',
}

// hyperscript for satori (React-element shape, no JSX build step)
export const h = (type, props = {}, ...children) => {
  const kids = children.flat().filter(c => c !== null && c !== undefined && c !== false)
  return { type, props: { ...props, children: kids.length === 0 ? undefined : kids.length === 1 ? kids[0] : kids } }
}

// ── animation maths ──
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const clamp01 = (v) => clamp(v, 0, 1)
export const lerp = (a, b, t) => a + (b - a) * t
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
export const easeInCubic = (t) => t * t * t
export const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
// progress 0→1 of a segment [start,end] at time t (seconds), optionally eased
export const seg = (t, start, end, ease = (x) => x) => ease(clamp01((t - start) / (end - start)))
// a value that eases in over [inStart,inEnd] and stays; combine two segs for in/out
export const inOut = (t, inStart, inEnd, outStart, outEnd) =>
  clamp01(seg(t, inStart, inEnd, easeOutCubic) - (outStart != null ? seg(t, outStart, outEnd, easeInCubic) : 0))

// enter animation: returns {opacity, transform} for a fade+slide+optional pop
export function enter(t, start, dur = 0.5, { dy = 40, dx = 0, pop = false } = {}) {
  const p = seg(t, start, start + dur, pop ? easeOutBack : easeOutCubic)
  const fade = seg(t, start, start + dur * 0.8, easeOutCubic)
  const sc = pop ? lerp(0.7, 1, p) : 1
  return { opacity: fade, transform: `translate(${lerp(dx, 0, p)}px, ${lerp(dy, 0, p)}px) scale(${sc})` }
}

// Uppercase + soft truncation guard (templates also validate length up front)
export const up = (s) => String(s).toUpperCase()
