import { useMemo, useRef } from 'react'
import { useCamera, useSize } from './hooks'
import { frame, visibleIn, shapeOf, SHAPES } from '../data/world'
import { borders, nameOf } from '../data/overland'
import { t } from '../strings'

// Overland's board: a live map of the journey. Land is one quiet mass (borders stay
// hidden unless the borders hint is used); the start and destination glow; every
// named country lands in its tier colour; and each new land link between named
// countries is drawn as a leg of the route, from label point to label point.

export default function RouteMap({ start, end, rows, focus, outlines, nextHint, reveal, route, outcome, freshCode }) {
  const wrap = useRef(null)
  const size = useSize(wrap)
  const aspect = size.w / size.h
  const target = useMemo(() => frame(focus, aspect, { cap: 720 }), [focus, aspect])
  const box = useCamera(target)
  const view = useMemo(() => visibleIn(target), [target])
  const tierBy = useMemo(() => new Map(rows.map(r => [r.code, r.tier])), [rows])
  const px = box[2] / size.w // map units per screen pixel: markers and lines keep a constant on-screen size

  // Legs of the journey: land links between any two revealed countries.
  const nodes = [start, ...rows.filter(r => r.tier !== 'red').map(r => r.code), end]
  const legs = []
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    if (borders(nodes[i], nodes[j])) legs.push([nodes[i], nodes[j]])
  }
  const onRoute = new Set()
  if (route) for (let i = 0; i < route.length - 1; i++) onRoute.add([route[i], route[i + 1]].sort().join('-'))

  const lp = (c) => shapeOf(c)?.lp || [0, 0]
  const fillFor = (code) => {
    if (code === start) return 'var(--ov-start)'
    if (code === end) return 'var(--ov-end)'
    const tier = tierBy.get(code)
    if (tier) return `var(--ov-${tier})`
    if (reveal?.includes(code)) return 'var(--ov-ghost)'
    return null
  }

  return (
    <div ref={wrap} className={`absolute inset-0 ${outcome === 'won' ? 'ov-won' : ''}`}>
      <svg viewBox={box.join(' ')} preserveAspectRatio="xMidYMid slice" className="w-full h-full block" role="img"
        aria-label={t('overland.board')}>
        {/* land: one quiet mass; borders only with the hint */}
        <g className="ov-land">
          {view.map(s => (
            <g key={s.code}>
              {s.x && <path d={s.x} />}
              <path d={s.d} className={outlines ? 'ov-bordered' : ''} />
            </g>
          ))}
        </g>
        {/* revealed countries */}
        <g>
          {SHAPES.filter(s => fillFor(s.code)).map(s => (
            <path key={s.code} d={s.d} fill={fillFor(s.code)}
              className={`ov-country ${s.code === freshCode ? 'ov-pop' : ''} ${s.code === start || s.code === end ? 'ov-endpoint' : ''} ${reveal?.includes(s.code) && !tierBy.has(s.code) ? 'ov-ghost' : ''}`} />
          ))}
        </g>
        {/* the next-country hint: an outline, no fill */}
        {nextHint && shapeOf(nextHint) && <path d={shapeOf(nextHint).d} className="ov-hint" />}
        {/* the route */}
        <g className="ov-legs">
          {legs.map(([a, b]) => {
            const [x1, y1] = lp(a), [x2, y2] = lp(b)
            const hot = onRoute.has([a, b].sort().join('-'))
            return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} pathLength="1" style={{ strokeWidth: (hot ? 3.2 : 2.4) * px }} className={`ov-leg ${hot ? 'ov-leg-hot' : ''}`} />
          })}
        </g>
        {/* stops; the two ends carry their names */}
        {nodes.map(c => {
          const [x, y] = lp(c)
          const isEnd = c === start || c === end
          return (
            <g key={c} transform={`translate(${x} ${y})`}>
              {isEnd && <circle r={11 * px} className="ov-pulse" style={{ strokeWidth: 1.5 * px }} />}
              <circle r={(isEnd ? 5.5 : 3.6) * px} className={isEnd ? 'ov-pin' : 'ov-stop'} style={{ strokeWidth: 1.8 * px }} />
            </g>
          )
        })}
        {[start, end].map(c => {
          const [x, y] = lp(c)
          return (
            <text key={`l-${c}`} x={x} y={y - 12 * px} textAnchor="middle" className="ov-label" style={{ fontSize: 11 * px, strokeWidth: 3 * px }}>
              {nameOf(c)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
