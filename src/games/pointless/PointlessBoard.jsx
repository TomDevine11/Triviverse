import { useState, useEffect } from 'react'

// The countdown tower: a column of 100 lines that drains from the top as the
// number falls from 100 to the answer's score (how many of 100 would name it for
// this question). A pointless 0 empties the whole column — the jackpot moment.
// Recreated in Triviverse styling; the accent comes from the game's accent vars.
export default function PointlessBoard({ reveal }) {
  const target = reveal ? reveal.score : 100 // idle shows a full, dim column
  const [count, setCount] = useState(target)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!reveal) { setCount(100); setRunning(false); return }
    setRunning(true)
    setCount(100)
    let raf, start
    const dur = 900 + (100 - reveal.score) * 9 // lower score → longer, more dramatic drain
    const tick = (t) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3) // ease-out
      setCount(Math.round(100 - eased * (100 - reveal.score)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else { setCount(reveal.score); setRunning(false) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reveal?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const settled = reveal && !running
  const pointless = settled && reveal.score === 0
  const idle = !reveal

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* the big descending number */}
      <div className={`score-number text-[3.25rem] leading-none tabular-nums mb-0.5 transition-colors ${pointless ? 'text-success-bright' : idle ? 'text-faint' : 'text-accent-bright'}`}>
        {idle ? '100' : count}
      </div>
      <div className="h-5 mb-2 text-sm font-bold text-secondary text-center">
        {settled ? reveal.name : running ? '…' : idle ? 'Name an answer' : ''}
      </div>

      {/* the tower — 100 lines, drains from the top (flex-col-reverse ⇒ line 0 sits at the bottom) */}
      <div className={`relative w-28 sm:w-32 h-56 flex flex-col-reverse gap-px rounded-xl bg-black/40 border p-2 transition-shadow duration-500 ${pointless ? 'border-success/70 shadow-[0_0_24px_-2px_var(--accent-tint)]' : 'border-border-strong'}`}
        style={pointless ? { boxShadow: '0 0 30px -4px rgb(34 197 94 / 0.5)' } : undefined}>
        {Array.from({ length: 100 }).map((_, i) => {
          const lit = i < count
          return (
            <div key={i}
              className={`flex-1 rounded-full ${lit ? '' : 'bg-white/[0.04]'}`}
              style={lit ? { background: 'var(--accent-bright)', boxShadow: '0 0 3px color-mix(in srgb, var(--accent-bright) 70%, transparent)' } : undefined} />
          )
        })}
      </div>

      <div className="h-6 mt-2 flex items-center">
        {pointless
          ? <span className="text-success-bright text-sm font-black tracking-[0.16em] uppercase animate-pulse">★ Pointless! ★</span>
          : settled && reveal.score <= 15
            ? <span className="text-success text-xs font-black tracking-[0.14em] uppercase">Great — barely anyone said that</span>
            : null}
      </div>
    </div>
  )
}
