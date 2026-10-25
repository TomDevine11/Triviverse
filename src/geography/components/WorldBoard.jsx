import { useMemo, useRef } from 'react'
import { SHAPES, WORLD_W, WORLD_H, shapeOf, frame } from '../data/world'
import { useCamera, useSize } from './hooks'
import { t } from '../strings'

// Patchwork's board. The whole world is drawn once, from the shared geometry, as a
// static layer that never re-renders; only the missing countries live in a second
// layer whose state changes: a dashed, numbered gap → restored in green (exact
// shape, every part) → or revealed when the player gives up. Countries too small to
// see at the current zoom get a locator ring when they're restored.

// The whole map, stretched only by adding sea, to the container's aspect.
function worldBox(aspect) {
  let w = WORLD_W, h = WORLD_H
  if (w / h < aspect) w = h * aspect; else h = w / aspect
  return [(WORLD_W - w) / 2, (WORLD_H - h) / 2, w, h]
}

// A tapped point: a box a quarter of the world wide around it (inside the map).
function pointBox([x, y], aspect) {
  const w = WORLD_W / 4, h = w / aspect
  return [Math.max(0, Math.min(WORLD_W - w, x - w / 2)), Math.max(0, Math.min(WORLD_H - h, y - h / 2)), w, h]
}

// `focus` is a missing country's code (zoom to that gap) or a tapped map point
// ([x, y], zoom to that area); `onTap` reports a tap on the map in map units, so
// on a phone, where the whole world is a strip, the board can be explored by tapping.
export default function WorldBoard({ missing, restored, revealed, fresh, focus, onSlot, onTap }) {
  const wrap = useRef(null)
  const size = useSize(wrap)
  const aspect = size.w / size.h
  const target = useMemo(() => (
    Array.isArray(focus) ? pointBox(focus, aspect) : focus ? frame([focus], aspect, { pad: 1.4, min: 380 }) : worldBox(aspect)
  ), [focus, aspect])
  const box = useCamera(target)
  const px = box[2] / size.w // map units per screen pixel

  // Pins: on the gap when it's big enough to read around; otherwise lifted just
  // above it on a short lead so the gap itself stays visible. Pins that would
  // overlap step sideways.
  const pins = useMemo(() => {
    const placed = []
    missing.forEach((code, i) => {
      if (restored.has(code)) return
      const s = shapeOf(code)
      let [x, y] = s.lp
      let lead = null
      if (Math.max(s.bb[2] - s.bb[0], s.bb[3] - s.bb[1]) / px < 40) { lead = [x, y]; y = s.bb[1] - 14 * px }
      for (let k = 0; k < 8 && placed.some(q => Math.hypot(q.x - x, q.y - y) < 18 * px); k++) x += 18 * px
      placed.push({ i, x, y, lead })
    })
    return placed
  }, [missing, restored, px])

  // Static layer: everything that isn't missing today. Built once per puzzle.
  const land = useMemo(() => {
    const gone = new Set(missing)
    return (
      <g className="pw-land">
        {SHAPES.filter(s => !gone.has(s.code)).map(s => (
          <g key={s.code}>{s.x && <path d={s.x} />}<path d={s.d} /></g>
        ))}
      </g>
    )
  }, [missing])

  return (
    <div ref={wrap} className="absolute inset-0">
      <svg viewBox={box.join(' ')} preserveAspectRatio="xMidYMid meet" className={`w-full h-full block ${onTap ? 'cursor-zoom-in' : ''}`} role="img"
        onClick={onTap && ((e) => { const r = e.currentTarget.getBoundingClientRect(); onTap([box[0] + (e.clientX - r.left) * px, box[1] + (e.clientY - r.top) * px]) })}
        aria-label={t('patchwork.board', { n: missing.length - restored.size })}>
        {land}
        <g>
          {missing.map(code => {
            const s = shapeOf(code)
            const state = restored.has(code) ? 'pw-restored' : revealed ? 'pw-revealed' : 'pw-gap'
            return (
              <g key={code} className={`${state} ${fresh === code ? 'pw-fresh' : ''}`}>
                {s.x && <path d={s.x} />}
                <path d={s.d} />
              </g>
            )
          })}
        </g>
        {/* restored specks get a ping so the restoration is visible */}
        {missing.map(code => {
          const s = shapeOf(code)
          const tiny = Math.max(s.bb[2] - s.bb[0], s.bb[3] - s.bb[1]) / px < 22
          return restored.has(code) && fresh === code && tiny
            ? <circle key={code} cx={s.lp[0]} cy={s.lp[1]} r={14 * px} className="pw-ping" style={{ strokeWidth: 2 * px }} />
            : null
        })}
        {/* numbered pins on the open gaps */}
        {!revealed && pins.map(({ i, x, y, lead }) => (
          <g key={missing[i]} className="pw-pin" onClick={(e) => { e.stopPropagation(); onSlot?.(i) }} aria-hidden="true">
            {lead && <line x1={lead[0]} y1={lead[1]} x2={x} y2={y} style={{ strokeWidth: 1.2 * px }} />}
            <circle cx={x} cy={y} r={8 * px} style={{ strokeWidth: 1.5 * px }} />
            <text x={x} y={y + 3.5 * px} textAnchor="middle" style={{ fontSize: 10 * px }}>{i + 1}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
