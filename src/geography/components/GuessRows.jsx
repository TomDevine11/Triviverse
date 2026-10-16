import { useState, useEffect } from 'react'
import { countryByCode } from '../data/countries'
import { Flag } from './ui'
import { t } from '../strings'

// The Worldle-style guess row shared by Borderline and Unfurl: the guessed country,
// great-circle distance (counting up), an arrow swinging onto the bearing, and a
// proximity bar. Rows that were already there on load render settled.

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const fmtKm = (km) => `${Math.round(km).toLocaleString('en-GB')} km`

function useCountUp(target, animate) {
  const run = animate && !reducedMotion()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf
    const start = performance.now()
    const dur = 650
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur)
      setV(target * (1 - (1 - p) ** 3))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run])
  return run ? v : target
}

function Arrow({ bearing, fresh }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 bl-arrow ${fresh ? 'bl-arrow-in' : ''}`} style={{ '--b': `${bearing}deg`, animationDelay: fresh ? 'calc(var(--duration-instant) * 2)' : undefined }} aria-hidden="true">
      <path d="M12 2.5 19 11h-4.5v10.5h-5V11H5z" fill="currentColor" />
    </svg>
  )
}

const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_5.25rem_2.5rem_3.5rem] sm:grid-cols-[minmax(0,1fr)_6.5rem_2.75rem_4.25rem] gap-1.5'
const CELL = 'h-10 rounded-lg border flex items-center'

export function GuessRow({ r, fresh }) {
  const c = countryByCode(r.code)
  const km = useCountUp(r.km, fresh)
  const pct = useCountUp(r.pct, fresh)
  const stagger = (i) => (fresh ? { animationDelay: `calc(var(--duration-instant) * ${i})` } : undefined)
  const anim = fresh ? 'bl-cell' : ''
  const tone = r.win ? 'border-success/60 bg-success/[0.12]' : 'border-border-strong bg-surface'
  return (
    <li className={ROW_GRID} aria-label={r.win ? t('borderline.rowWin', { name: c.name }) : t('borderline.rowAria', { name: c.name, km: fmtKm(r.km), dir: t(`borderline.dir.${r.dir}`), pct: r.pct })}>
      <span className={`${CELL} ${tone} ${anim} gap-2 px-2.5 min-w-0`} style={stagger(0)}>
        <Flag code={c.code} className="w-5 h-[0.94rem] sm:w-6 sm:h-[1.125rem]" />
        <span className={`truncate text-[0.8rem] sm:text-sm font-bold ${r.win ? 'text-success-bright' : 'text-primary'}`}>{c.name}</span>
      </span>
      <span className={`${CELL} ${tone} ${anim} justify-center text-[0.78rem] sm:text-sm font-bold tabular-nums text-secondary`} style={stagger(1)}>
        {fmtKm(km)}
      </span>
      <span className={`${CELL} ${tone} ${anim} justify-center ${r.win ? 'text-success-bright' : 'text-accent-bright'}`} style={stagger(2)} title={r.dir ? t(`borderline.dir.${r.dir}`) : undefined}>
        {r.win
          ? <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          : <Arrow bearing={r.bearing} fresh={fresh} />}
      </span>
      <span className={`${CELL} ${tone} ${anim} relative overflow-hidden justify-center`} style={stagger(3)}>
        <span
          className={`absolute inset-y-0 left-0 ${r.win ? 'bg-success/25' : 'bg-[color-mix(in_srgb,var(--accent)_24%,transparent)]'} ${fresh ? 'bl-bar' : ''}`}
          style={{ width: `${r.pct}%`, animationDelay: fresh ? 'calc(var(--duration-instant) * 3)' : undefined }}
          aria-hidden="true"
        />
        <span className={`relative text-[0.78rem] sm:text-sm font-black tabular-nums ${r.win ? 'text-success-bright' : 'text-primary'}`}>{Math.round(pct)}%</span>
      </span>
    </li>
  )
}

export function EmptyRow({ active }) {
  return (
    <li className={ROW_GRID} aria-hidden="true">
      <span className={`${CELL} col-span-4 border-dashed ${active ? 'border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-accent-tint' : 'border-border bg-board/60'}`} />
    </li>
  )
}


// Column labels for the rows above.
export function GuessHeader() {
  return (
    <div className={`${ROW_GRID} px-0.5 mb-1 text-[0.55rem] font-black tracking-[0.14em] uppercase text-faint`} aria-hidden="true">
      <span>{t('borderline.colCountry')}</span><span className="text-center">{t('borderline.colDistance')}</span><span className="text-center">{t('borderline.colDir')}</span><span className="text-center">{t('borderline.colClose')}</span>
    </div>
  )
}
