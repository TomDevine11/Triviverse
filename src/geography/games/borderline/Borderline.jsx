import { useState, useEffect, useMemo, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  MAX_GUESSES, BOX, countryByCode, evaluate, shareRow, dailyCode, puzzleNumber, randomCode,
} from '../../data/borderline'
import { loadProgress, saveProgress, loadStats, recordResult } from '../../data/progress'
import { SITE_URL } from '../../seo'
import { GeoChrome, ModeToggle, ResultModal, Flag, ShareButton, SECONDARY_BTN, StatsBlock } from '../../components/ui'
import { useCountdown } from '../../components/hooks'
import CountryInput from '../../components/CountryInput'
import { GuessRow, EmptyRow, GuessHeader } from '../../components/GuessRows'
import GeoMotif from '../../components/GeoMotif'
import { geoAccentVars } from '../../games'
import { t } from '../../strings'
import { geoTrack, GEO_EVENTS } from '../../analytics'
import '../../geography.css'

const GAME = 'borderline'
const ROUTE = '/geography/borderline'
// Board settle → finish card (the Triviverse family's 2.5s beat).
const RESULT_DELAY_MS = 2500

const fmtKm = (km) => `${Math.round(km).toLocaleString('en-GB')} km`

// ── The silhouette ────────────────────────────────────────────────────────────
// Every country is pre-fitted into the same 1000×1000 box (scripts/build-geo.mjs),
// so archipelagos, slivers and micro-states all sit centred at a consistent size.
function Silhouette({ country, outcome, nudge }) {
  const uid = useId().replace(/:/g, '')
  const won = outcome === 'won'
  const lost = outcome === 'lost'
  return (
    <div key={country.code} className="bl-enter relative w-full h-full flex items-center justify-center">
      {won && <span className="bl-ring absolute inset-[12%] rounded-full border-2 border-success/70" aria-hidden="true" />}
      <svg
        viewBox={`0 0 ${BOX} ${BOX}`}
        className={`bl-shape h-full w-auto max-w-full overflow-visible drop-shadow-[0_18px_28px_rgb(0_0_0/0.55)] ${nudge ? 'bl-nudge' : ''} ${won ? 'bl-solved' : ''}`}
        role="img"
        aria-label={outcome ? country.name : t('borderline.mystery')}
      >
        <defs>
          <linearGradient id={`${uid}l`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#c9bdf5" />
          </linearGradient>
          <linearGradient id={`${uid}w`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#86efac" />
            <stop offset="1" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id={`${uid}x`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#e7e5ee" />
            <stop offset="1" stopColor="#8c89a3" />
          </linearGradient>
        </defs>
        <g className="bl-land">
          {/* The thin same-colour stroke closes antimeridian seams and keeps
              one-pixel islands visible. */}
          <path className="bl-fill" d={country.d} fill={`url(#${uid}l)`} stroke={`url(#${uid}l)`} strokeWidth="3" fillRule="evenodd" strokeLinejoin="round" style={{ opacity: won || lost ? 0 : 1 }} />
          <path className="bl-fill" d={country.d} fill={`url(#${uid}w)`} stroke={`url(#${uid}w)`} strokeWidth="3" fillRule="evenodd" strokeLinejoin="round" style={{ opacity: won ? 1 : 0 }} />
          <path className="bl-fill" d={country.d} fill={`url(#${uid}x)`} stroke={`url(#${uid}x)`} strokeWidth="3" fillRule="evenodd" strokeLinejoin="round" style={{ opacity: lost ? 1 : 0 }} />
        </g>
        <path className="bl-edge" d={country.d} pathLength="1" fill="none" stroke="#a78bfa" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity="0" />
      </svg>
    </div>
  )
}

// ── The game ─────────────────────────────────────────────────────────────────
export default function Borderline() {
  const [saved] = useState(() => loadProgress(GAME, dailyCode()))
  const [mode, setMode] = useState('daily')
  const [target, setTarget] = useState(dailyCode)
  const [guesses, setGuesses] = useState(() => saved?.guesses ?? [])
  const [fresh, setFresh] = useState(-1)
  const [nudge, setNudge] = useState(false)
  const [showResult, setShowResult] = useState(!!saved?.done)
  const countdown = useCountdown()
  // One game_complete per round, even if two guesses land in the same render.
  const completedRound = useRef(false)

  const country = countryByCode(target)
  const results = useMemo(() => guesses.map(g => evaluate(g, target)).filter(Boolean), [guesses, target])
  const won = results.some(r => r.win)
  const phase = won ? 'won' : results.length >= MAX_GUESSES ? 'lost' : 'playing'
  const guessed = useMemo(() => new Set(guesses), [guesses])
  const dailyLocked = mode === 'daily' && phase !== 'playing'
  const stats = useMemo(() => loadStats(GAME, MAX_GUESSES), [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist the daily as it's played; a finished one stays locked to its result.
  useEffect(() => {
    if (mode !== 'daily' || guesses.length === 0) return
    saveProgress(GAME, { guesses }, phase !== 'playing', target)
  }, [mode, guesses, phase, target])

  // Record the daily once (idempotent), then let the board settle before the card.
  useEffect(() => {
    if (phase === 'playing') return
    if (mode !== 'daily' || showResult) return
    const id = setTimeout(() => setShowResult(true), RESULT_DELAY_MS)
    return () => clearTimeout(id)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Analytics fire from here, on a real guess, so restoring a saved daily on refresh
  // never re-sends a start or a completion.
  const onGuess = (code) => {
    if (phase !== 'playing') return
    const n = guesses.length + 1
    const finished = code === target || n >= MAX_GUESSES
    if (mode === 'daily' && finished) recordResult(GAME, code === target, n, MAX_GUESSES)
    if (n === 1) geoTrack(GEO_EVENTS.start, GAME, { game_mode: mode })
    geoTrack(GEO_EVENTS.guess, GAME, { game_mode: mode, guess_number: n })
    if (finished && !completedRound.current) {
      completedRound.current = true
      geoTrack(GEO_EVENTS.complete, GAME, { game_mode: mode, outcome: code === target ? 'won' : 'lost', won: code === target, guesses: n })
    }
    setFresh(guesses.length)
    setGuesses(g => [...g, code])
    if (code !== target) { setNudge(true); setTimeout(() => setNudge(false), 450) }
  }

  const startUnlimited = () => {
    completedRound.current = false
    setMode('unlimited'); setTarget(randomCode(target)); setGuesses([]); setFresh(-1); setShowResult(false)
  }
  const restoreDaily = () => {
    const code = dailyCode()
    const s = loadProgress(GAME, code)
    completedRound.current = !!s?.done
    setMode('daily'); setTarget(code); setGuesses(s?.guesses ?? []); setFresh(-1); setShowResult(!!s?.done)
  }
  const onModeChange = (m) => {
    geoTrack(GEO_EVENTS.mode, GAME, { game_mode: m, source: 'toggle' })
    return m === 'daily' ? restoreDaily() : startUnlimited()
  }
  const unlimitedFromResult = () => {
    geoTrack(GEO_EVENTS.mode, GAME, { game_mode: 'unlimited', source: 'result_card' })
    startUnlimited()
  }

  const last = results[results.length - 1]
  const live = last
    ? last.win ? t('borderline.rowWin', { name: countryByCode(last.code).name })
      : t('borderline.rowAria', { name: countryByCode(last.code).name, km: fmtKm(last.km), dir: t(`borderline.dir.${last.dir}`), pct: last.pct })
    : ''

  const best = results.reduce((m, r) => Math.max(m, r.pct), 0)
  const shareText = [
    `🌍 Borderline #${puzzleNumber()} ${won ? results.length : 'X'}/${MAX_GUESSES} (${best}%)`,
    ...results.map(shareRow),
    `${SITE_URL}${ROUTE}`,
  ].join('\n')

  return (
    <div className="tv-scene min-h-dvh text-primary" style={geoAccentVars(GAME)}>
      <div className="flex flex-col items-center px-4 pb-8 max-w-xl mx-auto">
        <div className="w-full">
          <GeoChrome gameId={GAME} title="BORDERLINE" howTo={{ n: MAX_GUESSES }} right={<b className="text-secondary tabular-nums">{results.length}/{MAX_GUESSES}</b>} />
        </div>

        <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-3" />

        {/* The stage */}
        <section aria-label={t('borderline.stage')} className="relative w-full rounded-2xl border border-border-strong bl-stage overflow-hidden">
          <div className="absolute top-3 left-3.5 text-[0.55rem] font-black tracking-[0.18em] text-accent-bright uppercase">
            {mode === 'daily' ? `${t('daily')} · #${puzzleNumber()}` : t('unlimited')}
          </div>
          <div className="absolute top-3 right-3.5 flex gap-1" aria-hidden="true">
            {Array.from({ length: MAX_GUESSES }).map((_, i) => {
              const r = results[i]
              return <i key={i} className={`w-1.5 h-1.5 rounded-full ${!r ? 'bg-inert' : r.win ? 'bg-success' : 'bg-accent'}`} />
            })}
          </div>
          <div className="h-[clamp(11rem,33dvh,21rem)] px-6 pt-9 pb-4 sm:pb-6">
            <Silhouette country={country} outcome={phase === 'playing' ? null : phase} nudge={nudge} />
          </div>
          {phase !== 'playing' && (
            <div className="bl-reveal absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
              <span className={`inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-canvas/80 backdrop-blur-sm text-sm font-extrabold ${phase === 'won' ? 'border-success/60 text-success-bright' : 'border-border-strong text-primary'}`}>
                <Flag code={country.code} className="w-5 h-[0.94rem]" />{country.name}
              </span>
            </div>
          )}
        </section>

        {/* Guesses */}
        <div className="w-full mt-3">
          <GuessHeader />
          <ol className="flex flex-col gap-1.5 m-0 p-0 list-none" aria-label={t('borderline.history')}>
            {Array.from({ length: MAX_GUESSES }).map((_, i) => (results[i]
              ? <GuessRow key={`${target}-${results[i].code}`} r={results[i]} fresh={i === fresh} />
              : <EmptyRow key={`e${i}`} active={i === results.length && phase === 'playing'} />))}
          </ol>
        </div>
        <p className="sr-only" aria-live="polite">{live}</p>

        {/* Input / end-of-round actions */}
        <div className="w-full mt-3">
          {phase === 'playing' ? (
            <CountryInput onGuess={onGuess} guessed={guessed} disabled={false} />
          ) : mode === 'unlimited' ? (
            <div className="bl-reveal flex flex-col items-center gap-3 text-center">
              <p className="text-muted text-sm m-0">{phase === 'won' ? t('borderline.solvedIn', { n: results.length, max: MAX_GUESSES }) : t('borderline.itWas')} <b className="text-primary">{country.name}</b></p>
              <button onClick={startUnlimited} className="w-full h-btn-lg bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] rounded-xl transition-colors">{t('borderline.newCountry')}</button>
            </div>
          ) : (
            <div className="bl-reveal flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 h-btn-lg rounded-xl border border-border-strong bg-surface flex items-center justify-center gap-2 text-[0.75rem] text-muted">
                {t('borderline.nextIn')} <b className="score-number font-normal text-[1.25rem] text-primary tabular-nums tracking-[0.04em]">{countdown}</b>
              </div>
              <button onClick={() => setShowResult(true)} className="flex-1 h-btn-lg rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors">{t('borderline.seeResult')}</button>
            </div>
          )}
        </div>

        <ResultModal open={showResult && dailyLocked} onClose={() => setShowResult(false)}>
          <div className="w-full flex flex-col items-center text-center">
            <GeoMotif id={GAME} className={`w-11 h-11 mb-2 ${phase === 'won' ? 'text-accent-bright' : 'text-dim'}`} />
            <h2 className={`score-number text-4xl m-0 ${phase === 'won' ? 'text-success-bright' : 'text-danger-bright'}`}>{phase === 'won' ? t('borderline.won') : t('borderline.lost')}</h2>
            <div className="flex flex-col items-center mt-3 mb-1">
              <div className="text-[0.62rem] font-black tracking-[0.16em] uppercase text-muted">{t('borderline.itWas')}</div>
              <div className="text-2xl md:text-[1.65rem] font-extrabold text-primary leading-tight mt-1.5 inline-flex items-center gap-2.5"><Flag code={country.code} className="w-8 h-6" />{country.name}</div>
              <div className="text-muted text-sm mt-1.5">{phase === 'won' ? t('borderline.solvedIn', { n: results.length, max: MAX_GUESSES }) : t('borderline.bestWas', { pct: best })}</div>
            </div>
            <StatsBlock stats={stats} last={phase === 'won' ? results.length : null} />
            <div className="w-full mt-4 text-[0.72rem] text-muted">{t('borderline.nextIn')} <b className="text-primary tabular-nums">{countdown}</b></div>
            <ShareButton text={shareText} primary onShared={(method) => geoTrack(GEO_EVENTS.share, GAME, { method, game_mode: mode })} />
            <button onClick={unlimitedFromResult} className={SECONDARY_BTN}>{t('borderline.playUnlimited')}</button>
            <Link to="/geography" onClick={() => geoTrack(GEO_EVENTS.related, GAME, { to: 'hub', placement: 'result_card' })} className="mt-3 text-[0.78rem] font-bold text-brand-bright hover:text-brand">{t('borderline.allGames')} →</Link>
          </div>
        </ResultModal>
      </div>
    </div>
  )
}
