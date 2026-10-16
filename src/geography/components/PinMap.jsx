import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SHAPES, WORLD_W, WORLD_H, project, invert } from '../data/world'
import placesData from '../data/places.generated.json'
import { greatCircle, formatKm } from '../data/postcard'
import { useSize } from './hooks'
import { t } from '../strings'

// Postcard's pin map: the shared world geometry (Natural Earth on one Mercator),
// drawn once as a static SVG layer and navigated by moving the viewBox — drag or
// one-finger pan, wheel / trackpad / pinch zoom, double-click zoom, keyboard
// (arrows, + −, 0, Enter drops at the centre). A tap that doesn't move drops the
// pin. City labels fade in by tier as you zoom. Pins are HTML laid over the SVG so
// their drop animation stays crisp at every zoom; the guess→answer line is the true
// great circle. No tiles, no provider, no network: everything ships in the bundle.

const MIN_W = 12 // default: map units across at full zoom (≈120 km at the equator)
const TIERS = [2.2, 4.2, 7.5, 12] // zoom (world width ÷ view width) where label tier n appears
const PLACES = placesData.places // [name, x, y, tier]
const TAP_SLOP = 7 // px a press may wander and still count as a tap
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const ease = (p) => 1 - (1 - p) ** 3

function clampView(v, aspect, minW = MIN_W) {
  const w = Math.max(minW, Math.min(WORLD_W, v.w))
  const h = w / aspect
  let cx = v.x + v.w / 2, cy = v.y + v.w / aspect / 2
  cx = w >= WORLD_W ? WORLD_W / 2 : Math.max(w / 2, Math.min(WORLD_W - w / 2, cx))
  cy = h >= WORLD_H ? WORLD_H / 2 : Math.max(h / 2, Math.min(WORLD_H - h / 2, cy))
  return { x: cx - w / 2, y: cy - h / 2, w }
}

// The whole world, filling the width — Europe-centred like every Geography map.
const worldView = (aspect) => clampView({ x: 0, y: 0, w: WORLD_W }, aspect)

// An authored opening view — [lat, lon, zoom], zoom = world width ÷ view width.
function homeOf(home, aspect, minW) {
  if (!home) return worldView(aspect)
  const [cx, cy] = project(home[0], home[1]), w = WORLD_W / home[2]
  return clampView({ x: cx - w / 2, y: cy - w / aspect / 2, w }, aspect, minW)
}

// Frame a set of map points with room around them.
function frameView(pts, aspect, minW = 240) { // default ≥ ~2,400 km across, so a close guess still shows its region
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  let w = Math.max(minW, (x1 - x0) * 1.7), h = Math.max(minW / aspect, (y1 - y0) * 1.9)
  if (w / h < aspect) w = h * aspect
  return clampView({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - w / aspect / 2, w }, aspect, 1)
}

const Graticule = () => {
  const lines = []
  for (let lon = -150; lon <= 180; lon += 30) { const x = project(0, lon)[0]; lines.push(<line key={`m${lon}`} x1={x} x2={x} y1={0} y2={WORLD_H} />) }
  for (const lat of [-30, 0, 30, 60]) { const y = project(lat, 11)[1]; lines.push(<line key={`p${lat}`} x1={0} x2={WORLD_W} y1={y} y2={y} className={lat === 0 ? 'pc-equator' : ''} />) }
  return <g className="pc-grid">{lines}</g>
}

const PinGlyph = ({ kind }) => (
  <svg viewBox="0 0 32 42" className="pc-pin-glyph" aria-hidden="true">
    <path d="M16 1.5C8 1.5 2 7.4 2 15.2c0 9.6 11.3 21.8 13 23.6a1.4 1.4 0 0 0 2 0c1.7-1.8 13-14 13-23.6C30 7.4 24 1.5 16 1.5z" className="pc-pin-body" />
    {kind === 'answer'
      ? <path d="M10.4 15.4l3.8 3.8 7.6-7.8" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="pc-pin-mark" />
      : <circle cx="16" cy="15" r="5.2" className="pc-pin-mark" />}
  </svg>
)

const ZoomButton = ({ label, onClick, small, children }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label}
    className={`w-10 h-10 flex items-center justify-center text-secondary hover:text-primary hover:bg-border/60 transition-colors border-border [&:not(:first-child)]:border-t focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-bright ${small ? 'text-[0.95rem]' : 'text-xl font-semibold'}`}>
    {children}
  </button>
)

// Optional, for games with authored views (Milestone): `home` opens the map on a
// region; changing `resetKey` glides back to it for the next question; `minW` allows
// deeper zoom; `revealMinW` sets how tight the reveal may frame; `answerLabel` names
// the answer pin.
export default function PinMap({ guess, answer, km, onPick, locked = false, animateReveal = true, onInteract, home = null, resetKey, minW = MIN_W, revealMinW = 240, answerLabel }) {
  const wrap = useRef(null)
  const size = useSize(wrap)
  const aspect = size.w / size.h
  const [stored, setViewState] = useState(() => homeOf(home, aspect, minW))
  const [touched, setTouched] = useState(false)
  // Until the player moves the map (or the answer is shown) it simply frames the
  // world for whatever size it is; after that it keeps their view, kept valid.
  const view = touched || answer ? clampView(stored, aspect, minW) : homeOf(home, aspect, minW)
  const viewRef = useRef(view)
  useLayoutEffect(() => { viewRef.current = view })
  const anim = useRef(0)
  const ptrs = useRef(new Map())
  const gesture = useRef(null)

  const setView = (v) => { viewRef.current = v; setViewState(v) }
  const touch = () => { if (!touched) { setViewState(viewRef.current); setTouched(true) } }
  const stopAnim = () => cancelAnimationFrame(anim.current)
  const flyTo = (target, dur = 650) => {
    stopAnim()
    const a = viewRef.current
    if (!dur || reducedMotion()) { Promise.resolve().then(() => setView(target)); return } // not rAF: must land even in a background tab
    const start = performance.now()
    const acx = a.x + a.w / 2, acy = a.y + a.w / aspect / 2, bcx = target.x + target.w / 2, bcy = target.y + target.w / aspect / 2
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur), e = ease(p)
      const w = Math.exp(Math.log(a.w) + (Math.log(target.w) - Math.log(a.w)) * e)
      const cx = acx + (bcx - acx) * e, cy = acy + (bcy - acy) * e
      setView({ x: cx - w / 2, y: cy - w / aspect / 2, w })
      if (p < 1) anim.current = requestAnimationFrame(tick)
    }
    anim.current = requestAnimationFrame(tick)
  }
  useEffect(() => stopAnim, [])

  // The reveal: glide out to frame the guess, the answer and the arc between them.
  const arcs = useMemo(() => (guess && answer ? greatCircle(guess, answer) : []), [guess, answer])
  useEffect(() => {
    if (!answer) return
    const pts = arcs.length > 1 ? null : [project(...answer), ...(guess ? [project(...guess)] : []), ...(arcs[0] || [])]
    flyTo(pts ? frameView(pts, aspect, revealMinW) : worldView(aspect), animateReveal ? 1000 : 0)
  }, [answer, arcs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Next question: glide to its opening view.
  const lastReset = useRef(resetKey)
  useEffect(() => {
    if (lastReset.current === resetKey) return
    lastReset.current = resetKey
    flyTo(homeOf(home, aspect, minW), 800)
  }, [resetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const px = view.w / size.w // map units per screen pixel
  const toScreen = ([lat, lon]) => { const [x, y] = project(lat, lon); return [(x - view.x) / px, (y - view.y) / px] }
  const local = (e) => { const r = wrap.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }

  const zoomAt = (sx, sy, f, dur = 0) => {
    const v = viewRef.current
    const k = v.w / size.w
    const mx = v.x + sx * k, my = v.y + sy * k
    const nw = Math.max(minW, Math.min(WORLD_W, v.w / f))
    const target = clampView({ x: mx - sx * (nw / size.w), y: my - sy * (nw / size.w), w: nw }, aspect, minW)
    touch()
    if (dur) flyTo(target, dur); else { stopAnim(); setView(target) }
  }

  const pickAt = (sx, sy) => {
    if (locked) return
    const v = viewRef.current, k = v.w / size.w
    const mx = v.x + sx * k, my = v.y + sy * k
    if (mx < 0 || mx > WORLD_W || my < 0 || my > WORLD_H) return
    onPick?.(invert(mx, my))
  }

  // Wheel and trackpad pinch zoom around the cursor; never scrolls the page.
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? 400 : 1
      const p = local(e)
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.012 : 0.0022)))
      onInteract?.()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    if (e.target.closest('button')) return
    wrap.current.setPointerCapture?.(e.pointerId)
    const p = local(e)
    ptrs.current.set(e.pointerId, p)
    stopAnim()
    touch()
    onInteract?.()
    const list = [...ptrs.current.values()]
    if (list.length === 1) gesture.current = { mode: 'pan', start: p, view: viewRef.current, moved: false, t: performance.now() }
    else if (list.length === 2) {
      const [a, b] = list
      gesture.current = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: viewRef.current, moved: true }
    }
  }

  const onPointerMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return
    const p = local(e)
    ptrs.current.set(e.pointerId, p)
    const g = gesture.current
    if (!g) return
    const k = g.view.w / size.w
    if (g.mode === 'pan') {
      const dx = p.x - g.start.x, dy = p.y - g.start.y
      if (!g.moved && Math.hypot(dx, dy) > TAP_SLOP) g.moved = true
      if (g.moved) setView(clampView({ x: g.view.x - dx * k, y: g.view.y - dy * k, w: g.view.w }, aspect, minW))
    } else if (ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const mx = g.view.x + g.mid0.x * k, my = g.view.y + g.mid0.y * k
      const nw = Math.max(minW, Math.min(WORLD_W, g.view.w / (d / g.d0)))
      setView(clampView({ x: mx - mid.x * (nw / size.w), y: my - mid.y * (nw / size.w), w: nw }, aspect, minW))
    }
  }

  const onPointerUp = (e) => {
    if (!ptrs.current.has(e.pointerId)) return
    const p = local(e)
    ptrs.current.delete(e.pointerId)
    const g = gesture.current
    if (g?.mode === 'pan' && !g.moved && performance.now() - g.t < 800) pickAt(p.x, p.y)
    if (ptrs.current.size === 1) {
      // A pinch became a one-finger pan: carry on from where we are, never as a tap.
      const [rest] = [...ptrs.current.values()]
      gesture.current = { mode: 'pan', start: rest, view: viewRef.current, moved: true, t: 0 }
    } else if (ptrs.current.size === 0) gesture.current = null
  }

  const onKeyDown = (e) => {
    const v = viewRef.current, step = 0.18
    const pan = (dx, dy) => { e.preventDefault(); touch(); flyTo(clampView({ x: v.x + dx * v.w * step, y: v.y + dy * v.w * step, w: v.w }, aspect, minW), 180) }
    switch (e.key) {
      case 'ArrowLeft': return pan(-1, 0)
      case 'ArrowRight': return pan(1, 0)
      case 'ArrowUp': return pan(0, -1)
      case 'ArrowDown': return pan(0, 1)
      case '+': case '=': e.preventDefault(); return zoomAt(size.w / 2, size.h / 2, 1.8, 220)
      case '-': case '_': e.preventDefault(); return zoomAt(size.w / 2, size.h / 2, 1 / 1.8, 220)
      case '0': e.preventDefault(); return flyTo(homeOf(home, aspect, minW), 450)
      case 'Enter': case ' ': e.preventDefault(); return pickAt(size.w / 2, size.h / 2)
      default:
    }
  }

  // Static layers: built once, never re-rendered while the camera moves.
  const land = useMemo(() => (
    <g className="pc-land">{SHAPES.map(s => <g key={s.code}>{s.x && <path d={s.x} />}<path d={s.d} /></g>)}</g>
  ), [])
  const grid = useMemo(() => <Graticule />, [])

  // City labels: tiers by zoom, culled to the view, de-cluttered in screen space.
  const zoom = WORLD_W / view.w
  const labels = useMemo(() => {
    const maxTier = TIERS.filter(z => zoom >= z).length - 1
    if (maxTier < 0) return []
    const vh = view.w / aspect, out = [], boxes = []
    for (const [name, x, y, tier] of PLACES) {
      if (tier > maxTier || x < view.x || x > view.x + view.w || y < view.y || y > view.y + vh) continue
      const sx = (x - view.x) / px, sy = (y - view.y) / px
      const bw = name.length * 6.4 + 10, box = [sx - 4, sy - 14, sx + bw, sy + 5]
      if (boxes.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue
      boxes.push(box)
      out.push({ name, x, y, tier })
      if (out.length >= 70) break
    }
    return out
  }, [view, px, aspect, zoom])

  const [gx, gy] = guess ? toScreen(guess) : [0, 0]
  const [ax, ay] = answer ? toScreen(answer) : [0, 0]
  const longest = arcs.reduce((m, l) => (l.length > (m?.length || 0) ? l : m), null)
  const mid = longest ? longest[Math.floor(longest.length / 2)] : null

  return (
    <div ref={wrap} className={`pc-map absolute inset-0 select-none ${locked ? 'cursor-grab' : 'cursor-crosshair'}`} tabIndex={0}
      role="application" aria-label={t('postcard.mapAria')} aria-describedby="pc-map-help"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onDoubleClick={(e) => { const p = local(e); zoomAt(p.x, p.y, 2.2, 260) }} onKeyDown={onKeyDown}>
      <p id="pc-map-help" className="sr-only">{t('postcard.mapHelp')}</p>
      <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.w / aspect}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full block" aria-hidden="true">
        <rect x={0} y={0} width={WORLD_W} height={WORLD_H} className="pc-sea" />
        {grid}
        {land}
        <g className="pc-places">
          {labels.map(l => (
            <g key={l.name + l.x} className={`pc-place pc-tier-${l.tier}`}>
              <circle cx={l.x} cy={l.y} r={2.1 * px} />
              <text x={l.x + 5 * px} y={l.y + 3.6 * px} style={{ fontSize: (l.tier === 0 ? 11.5 : 10.5) * px, strokeWidth: 3 * px }}>{l.name}</text>
            </g>
          ))}
        </g>
        {arcs.map((line, i) => (
          <polyline key={i} points={line.map(p => p.join(',')).join(' ')} pathLength="1" style={{ strokeWidth: 2.2 * px }}
            className={`pc-arc ${animateReveal ? 'pc-arc-draw' : ''}`} />
        ))}
      </svg>

      {/* keyboard crosshair (shown while the map has keyboard focus) */}
      {!locked && <span className="pc-cross" aria-hidden="true" />}

      {answer && mid && guess && km != null && (
        <span className={`pc-km ${animateReveal ? 'pc-km-in' : ''}`} style={{ left: (mid[0] - view.x) / px, top: (mid[1] - view.y) / px }}>
          {formatKm(km)}
        </span>
      )}
      {guess && (
        <span key={guess.join(',')} className={`pc-pin pc-pin-guess ${animateReveal || !answer ? 'pc-drop' : ''}`} style={{ left: gx, top: gy }} aria-hidden="true">
          <i className="pc-pin-shadow" /><PinGlyph kind="guess" />
        </span>
      )}
      {answer && (
        <span className={`pc-pin pc-pin-answer ${animateReveal ? 'pc-drop pc-drop-late' : ''}`} style={{ left: ax, top: ay }} aria-hidden="true">
          <i className="pc-ring" /><i className="pc-pin-shadow" /><PinGlyph kind="answer" />
          {answerLabel && <b className="pc-answer-label">{answerLabel}</b>}
        </span>
      )}

      {/* zoom controls */}
      <div className="absolute right-2.5 bottom-2.5 flex flex-col rounded-xl border border-border-strong bg-canvas/80 backdrop-blur-sm overflow-hidden shadow-[0_8px_20px_-10px_rgb(0_0_0/0.8)]">
        <ZoomButton label={t('postcard.zoomIn')} onClick={() => zoomAt(size.w / 2, size.h / 2, 2, 260)}>+</ZoomButton>
        <ZoomButton label={t('postcard.zoomOut')} onClick={() => zoomAt(size.w / 2, size.h / 2, 0.5, 260)}>−</ZoomButton>
        <ZoomButton label={home ? t('postcard.zoomHome') : t('postcard.zoomWorld')} onClick={() => flyTo(homeOf(home, aspect, minW), 450)} small>◎</ZoomButton>
      </div>
    </div>
  )
}
