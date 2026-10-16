import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  MAX_GUESSES, evaluate, shareRow, dailyCode, puzzleNumber, randomCode, tileOrder, openCount, TILES,
} from '../../data/unfurl'
import { countryByCode } from '../../data/countries'
import { loadProgress, saveProgress, loadStats, recordResult } from '../../data/progress'
import { SITE_URL } from '../../seo'
import { GeoChrome, ModeToggle, ResultModal, ShareButton, SECONDARY_BTN, StatsBlock } from '../../components/ui'
import { useCountdown } from '../../components/hooks'
import CountryInput from '../../components/CountryInput'
import FlagStage from '../../components/FlagStage'
import { flagUrl } from '../../data/flagAssets'
import { GuessRow, EmptyRow, GuessHeader } from '../../components/GuessRows'
import GeoMotif from '../../components/GeoMotif'
import { geoAccentVars } from '../../games'
import { t } from '../../strings'
import '../../geography.css'

const GAME = 'unfurl'
const ROUTE = '/geography/unfurl'
const RESULT_DELAY_MS = 2500 // board settle → finish card (the Triviverse beat)
const fmtKm = (km) => `${Math.round(km).toLocaleString('en-GB')} km`

export default function Unfurl() {
  const [saved] = useState(() => loadProgress(GAME, dailyCode()))
  const [mode, setMode] = useState('daily')
  const [target, setTarget] = useState(dailyCode)
  const [guesses, setGuesses] = useState(() => saved?.guesses ?? [])
  const [fresh, setFresh] = useState(-1)
  const [showResult, setShowResult] = useState(!!saved?.done)
  const countdown = useCountdown()

  const country = countryByCode(target)
  const order = useMemo(() => tileOrder(target), [target])
  const results = useMemo(() => guesses.map(g => evaluate(g, target)).filter(Boolean), [guesses, target])
  const won = results.some(r => r.win)
  const phase = won ? 'won' : results.length >= MAX_GUESSES ? 'lost' : 'playing'
  const wrong = results.filter(r => !r.win).length
  const open = openCount(wrong, phase !== 'playing')
  // Tiles below this rank were already open before the latest guess: drawn settled.
  const [animateFrom, setAnimateFrom] = useState(() => open)
  const guessed = useMemo(() => new Set(guesses), [guesses])
  const dailyLocked = mode === 'daily' && phase !== 'playing'
  const stats = useMemo(() => loadStats(GAME, MAX_GUESSES), [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== 'daily' || guesses.length === 0) return
    saveProgress(GAME, { guesses }, phase !== 'playing', target)
  }, [mode, guesses, phase, target])

  useEffect(() => {
    if (phase === 'playing' || mode !== 'daily' || showResult) return
    const id = setTimeout(() => setShowResult(true), RESULT_DELAY_MS)
    return () => clearTimeout(id)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const onGuess = (code) => {
    if (phase !== 'playing') return
    const n = guesses.length + 1
    if (mode === 'daily' && (code === target || n >= MAX_GUESSES)) recordResult(GAME, code === target, n, MAX_GUESSES)
    setAnimateFrom(open)
    setFresh(guesses.length)
    setGuesses(g => [...g, code])
  }

  const reset = (code, s) => {
    const g = s?.guesses ?? []
    const done = g.includes(code) || g.length >= MAX_GUESSES
    setTarget(code); setGuesses(g); setFresh(-1); setShowResult(!!s?.done)
    setAnimateFrom(openCount(g.filter(x => x !== code).length, done))
  }
  const startUnlimited = () => { setMode('unlimited'); reset(randomCode(target)) }
  const restoreDaily = () => { const code = dailyCode(); setMode('daily'); reset(code, loadProgress(GAME, code)) }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())

  const last = results[results.length - 1]
  const live = last
    ? last.win ? t('borderline.rowWin', { name: countryByCode(last.code).name })
      : `${t('borderline.rowAria', { name: countryByCode(last.code).name, km: fmtKm(last.km), dir: t(`borderline.dir.${last.dir}`), pct: last.pct })} ${phase === 'playing' ? t('unfurl.tileOpened') : ''}`
    : ''

  const shareText = [
    `🏁 Unfurl #${puzzleNumber()} ${won ? results.length : 'X'}/${MAX_GUESSES}`,
    ...results.map(shareRow),
    `${SITE_URL}${ROUTE}`,
  ].join('\n')

  return (
    <div className="tv-scene min-h-dvh text-primary" style={geoAccentVars(GAME)}>
      <div className="flex flex-col items-center px-4 pb-8 max-w-xl mx-auto">
        <div className="w-full">
          <GeoChrome gameId={GAME} title="UNFURL" howTo={{ n: MAX_GUESSES }} right={<b className="text-secondary tabular-nums">{results.length}/{MAX_GUESSES}</b>} />
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-3" />

        {/* The stage: the flag under its tiles */}
        <section aria-label={t('unfurl.stage')} className="uf-stage relative w-full rounded-2xl border border-border-strong overflow-hidden">
          <div className="absolute top-3 inset-x-3.5 flex items-center justify-between gap-2 z-[1]">
            <span className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright uppercase">
              {mode === 'daily' ? `${t('daily')} · #${puzzleNumber()}` : t('unlimited')}
            </span>
            {phase === 'playing' ? (
              <span className="flex items-center gap-2 text-[0.55rem] font-black tracking-[0.14em] uppercase text-muted">
                <span className="grid grid-cols-3 gap-[2px]" aria-hidden="true">
                  {Array.from({ length: TILES }).map((_, i) => <i key={i} className={`w-1.5 h-1 rounded-[1px] ${i < open ? 'bg-accent' : 'bg-inert'}`} />)}
                </span>
                {t('unfurl.tiles', { n: open })}
              </span>
            ) : (
              <span className={`bl-reveal inline-flex items-center h-6 px-2.5 rounded-full border bg-canvas/80 text-[0.72rem] font-extrabold ${phase === 'won' ? 'border-success/60 text-success-bright' : 'border-border-strong text-primary'}`}>
                {country.name}
              </span>
            )}
          </div>
          <div className="h-[calc(var(--uf-h)+3.5rem)] px-5 sm:px-8 pt-10 pb-4">
            <div className="h-[var(--uf-h)]">
              <FlagStage code={target} order={order} open={open} animateFrom={animateFrom} outcome={phase === 'playing' ? null : phase} />
            </div>
          </div>
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

        <div className="w-full mt-3">
          {phase === 'playing' ? (
            <CountryInput onGuess={onGuess} guessed={guessed} disabled={false} placeholder={t('unfurl.placeholder')} />
          ) : mode === 'unlimited' ? (
            <button onClick={startUnlimited} className="bl-reveal w-full h-btn-lg bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] rounded-xl transition-colors">{t('unfurl.newFlag')}</button>
          ) : (
            <div className="bl-reveal flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 h-btn-lg rounded-xl border border-border-strong bg-surface flex items-center justify-center gap-2 text-[0.75rem] text-muted">
                {t('unfurl.nextIn')} <b className="score-number font-normal text-[1.25rem] text-primary tabular-nums tracking-[0.04em]">{countdown}</b>
              </div>
              <button onClick={() => setShowResult(true)} className="flex-1 h-btn-lg rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors">{t('unfurl.seeResult')}</button>
            </div>
          )}
        </div>

        <ResultModal open={showResult && dailyLocked} onClose={() => setShowResult(false)}>
          <div className="w-full flex flex-col items-center text-center">
            <GeoMotif id={GAME} className={`w-11 h-11 mb-2 ${phase === 'won' ? 'text-accent-bright' : 'text-dim'}`} />
            <h2 className={`score-number text-4xl m-0 ${phase === 'won' ? 'text-success-bright' : 'text-danger-bright'}`}>{phase === 'won' ? t('unfurl.won') : t('unfurl.lost')}</h2>
            <img src={flagUrl(target)} alt="" className="mt-4 h-20 w-auto max-w-[70%] rounded-[4px] ring-1 ring-white/10 shadow-panel" />
            <div className="flex flex-col items-center mt-3 mb-1">
              <div className="text-[0.62rem] font-black tracking-[0.16em] uppercase text-muted">{t('unfurl.itWas')}</div>
              <div className="text-2xl md:text-[1.65rem] font-extrabold text-primary leading-tight mt-1.5 ">{country.name}</div>
              {phase === 'won' && <div className="text-muted text-sm mt-1.5">{t('unfurl.solvedIn', { n: results.length, max: MAX_GUESSES })}</div>}
            </div>
            <StatsBlock stats={stats} last={phase === 'won' ? results.length : null} />
            <div className="w-full mt-4 text-[0.72rem] text-muted">{t('unfurl.nextIn')} <b className="text-primary tabular-nums">{countdown}</b></div>
            <ShareButton text={shareText} primary />
            <button onClick={startUnlimited} className={SECONDARY_BTN}>{t('unfurl.playUnlimited')}</button>
            <Link to="/geography" className="mt-3 text-[0.78rem] font-bold text-brand-bright hover:text-brand">{t('borderline.allGames')} →</Link>
          </div>
        </ResultModal>
      </div>
    </div>
  )
}
