import { useEffect, useMemo, useRef } from 'react'
import { MAX_TRIES, formatSeconds } from '../../data/earshot'
import { t } from '../../strings'

// The hero: one big play control and the recording's real loudness envelope
// (precomputed from the encoded clip). Three identical bar layers share the same
// geometry — dim (locked), mid (unlocked) and bright (already played) — so the
// unlock and the playhead are just CSS clip-path insets: the unlock eases open
// when a stage is earned, and the playhead is written straight to the DOM per
// frame without re-rendering React.

const KIND_PILL = {
  correct: 'bg-success-strong border-success text-white',
  close: 'bg-[#facc15]/20 border-[#facc15]/70 text-[#fde047]',
  wrong: 'bg-danger/15 border-danger/50 text-danger-bright',
  skip: 'bg-inert border-border-strong text-muted',
}

const PlayGlyph = () => <svg viewBox="0 0 24 24" className="w-8 h-8 translate-x-[2px]" fill="currentColor" aria-hidden="true"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l12-7.2a1 1 0 0 0 0-1.72l-12-7.2A1 1 0 0 0 7 4.8z" /></svg>
const StopGlyph = () => <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.2" /></svg>
const RetryGlyph = () => <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
const LockGlyph = () => <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z" /></svg>

const R = 44, CIRC = 2 * Math.PI * R

export default function Player({ clip, audio, tries, done, rows }) {
  const { status, position } = audio
  const unlocked = done ? clip.dur : clip.stages[Math.min(tries, MAX_TRIES - 1)]
  const pct = (unlocked / clip.dur) * 100
  const bars = useMemo(() => [...clip.peaks].map(ch => parseInt(ch, 36) / 35), [clip.peaks])
  const played = useRef(null), ring = useRef(null), clock = useRef(null)

  // Playhead: rAF while playing, written to the DOM directly.
  useEffect(() => {
    const paint = (sec) => {
      if (played.current) played.current.style.clipPath = `inset(0 ${100 - (sec / clip.dur) * 100}% 0 0)`
      if (ring.current) ring.current.style.strokeDashoffset = String(CIRC * (1 - (unlocked ? sec / unlocked : 0)))
      if (clock.current) clock.current.textContent = sec ? sec.toFixed(1) : '0.0'
    }
    if (status !== 'playing') { paint(0); return }
    let raf
    const tick = () => { paint(position()); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status, position, clip.dur, unlocked])

  const busy = status === 'loading'
  const onPress = () => {
    if (status === 'error') return audio.retry()
    if (status === 'playing') return audio.pause()
    if (status === 'ready') audio.play(unlocked)
  }
  const label = status === 'playing' ? t('earshot.pauseAria') : status === 'error' ? t('earshot.retry') : t('earshot.playAria', { s: formatSeconds(unlocked) })

  return (
    <section className="es-player relative rounded-2xl border border-border-strong bg-card overflow-hidden" aria-label={t('earshot.recording')}>
      <div className="relative px-4 sm:px-6 pt-4 sm:pt-5 pb-4">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* play control with its progress ring */}
          <button type="button" onClick={onPress} disabled={busy} aria-label={label} title={label}
            className={`es-play group relative shrink-0 w-[5.5rem] h-[5.5rem] sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-bright disabled:cursor-wait ${status === 'playing' ? 'is-playing' : ''}`}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="4" />
              <circle ref={ring} cx="50" cy="50" r={R} fill="none" stroke="var(--accent-bright)" strokeWidth="4" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC} />
            </svg>
            <span className="es-play-core absolute inset-[11%] rounded-full" aria-hidden="true" />
            <span className="relative">
              {busy ? <span className="es-spin block w-7 h-7 rounded-full border-[3px] border-white/25 border-t-white" /> : status === 'error' ? <RetryGlyph /> : status === 'playing' ? <StopGlyph /> : <PlayGlyph />}
            </span>
          </button>

          {/* waveform + readout */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-[0.62rem] font-black tracking-[0.14em] uppercase">
              <span className="text-accent-bright">{done ? t('earshot.full') : t('earshot.unlocked')}</span>
              <span className="tabular-nums text-muted normal-case tracking-normal text-[0.78rem] font-bold">
                <span ref={clock} className="text-primary">0.0</span> / {formatSeconds(unlocked)}
              </span>
            </div>
            <div className="es-wave relative mt-2 h-16 sm:h-20" aria-hidden="true">
              <Bars bars={bars} className="es-bars-locked" />
              <Bars bars={bars} className="es-bars-open" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }} />
              <Bars bars={bars} className="es-bars-played" ref={played} style={{ clipPath: 'inset(0 100% 0 0)' }} />
              {!done && (
                <div className="es-locked absolute inset-y-0 right-0 transition-[left] duration-700 ease-out" style={{ left: `${pct}%` }}>
                  <span className="absolute -left-px top-0 bottom-0 w-px bg-accent-bright/80" />
                  <span className="absolute -left-[0.55rem] -top-1 w-[1.1rem] h-[1.1rem] rounded-full bg-card border border-border-strong text-muted flex items-center justify-center"><LockGlyph /></span>
                </div>
              )}
            </div>
            <div className="mt-1.5 h-4 text-[0.72rem] text-muted truncate" aria-live="polite">
              {status === 'loading' ? t('earshot.loading') : status === 'error' ? <span className="text-danger-bright">{t('earshot.error')}</span> : null}
            </div>
          </div>
        </div>

        {/* stage track: what each guess hears */}
        <ol className="m-0 mt-3 p-0 list-none grid grid-cols-6 gap-1.5" aria-label={t('earshot.stagesAria')}>
          {clip.stages.map((s, i) => {
            const r = rows[i]
            const current = !done && i === tries
            const open = done || i <= tries
            return (
              <li key={i} className={`es-pill h-8 rounded-lg border flex items-center justify-center text-[0.72rem] font-black tabular-nums transition-colors duration-500 ${r ? KIND_PILL[r.kind] : current ? 'border-accent text-accent-bright bg-accent-tint es-pill-current' : open ? 'border-border-strong text-secondary' : 'border-border text-faint'}`}
                aria-current={current ? 'step' : undefined}>
                {formatSeconds(s)}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function Bars({ bars, className, style, ref }) {
  return (
    <div ref={ref} className={`absolute inset-0 flex items-center gap-[1.5px] sm:gap-[2px] ${className}`} style={style}>
      {bars.map((v, i) => <span key={i} className="flex-1 rounded-full" style={{ height: `${10 + v * 90}%` }} />)}
    </div>
  )
}
