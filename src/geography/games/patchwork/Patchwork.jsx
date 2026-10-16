import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  MISSING, MISS_SLOTS, MAX_MISSES, dailyMissing, randomMissing, puzzleSig, puzzleNumber, evaluatePatchwork, SHARE,
} from '../../data/patchwork'
import { countryByCode } from '../../data/countries'
import { loadProgress, saveProgress, loadStats, recordResult } from '../../data/progress'
import { SITE_URL } from '../../seo'
import { GeoChrome, ModeToggle, ResultModal, Flag, ShareButton, SECONDARY_BTN, StatsBlock } from '../../components/ui'
import { useCountdown } from '../../components/hooks'
import CountryInput from '../../components/CountryInput'
import WorldBoard from '../../components/WorldBoard'
import GeoMotif from '../../components/GeoMotif'
import { geoAccentVars } from '../../games'
import { t } from '../../strings'
import '../../geography.css'

const GAME = 'patchwork'
const ROUTE = '/geography/patchwork'
const RESULT_DELAY_MS = 2500 // board settle → finish card (the Triviverse beat)
const DIST_LABELS = ['0', '1', '2', '3', '4', '5']
const nameOf = (code) => countryByCode(code)?.name || code

// Saved state is only trusted if it's a list of known country codes.
function readSaved(missing) {
  const s = loadProgress(GAME, puzzleSig(missing))
  if (!s || !Array.isArray(s.guesses) || !s.guesses.every(g => typeof g === 'string' && countryByCode(g))) return null
  return { guesses: [...new Set(s.guesses)], gaveUp: !!s.gaveUp, done: !!s.done }
}

export default function Patchwork() {
  const [saved] = useState(() => readSaved(dailyMissing()))
  const [mode, setMode] = useState('daily')
  const [missing, setMissing] = useState(dailyMissing)
  const [guesses, setGuesses] = useState(() => saved?.guesses ?? [])
  const [gaveUp, setGaveUp] = useState(() => saved?.gaveUp ?? false)
  const [confirmGiveUp, setConfirmGiveUp] = useState(false)
  const [focus, setFocus] = useState(null)
  const [fresh, setFresh] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showResult, setShowResult] = useState(!!saved?.done)
  const noticeTimer = useRef(null)
  const countdown = useCountdown()

  const game = useMemo(() => evaluatePatchwork(missing, guesses), [missing, guesses])
  const restored = useMemo(() => new Set(game.restored), [game.restored])
  const guessed = useMemo(() => new Set(guesses), [guesses])
  const phase = game.won ? 'won' : gaveUp || game.lost ? 'lost' : 'playing'
  const dailyLocked = mode === 'daily' && phase !== 'playing'
  const stats = useMemo(() => loadStats(GAME, MISS_SLOTS), [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== 'daily' || (guesses.length === 0 && !gaveUp)) return
    saveProgress(GAME, { guesses, gaveUp }, phase !== 'playing', puzzleSig(missing))
  }, [mode, guesses, gaveUp, phase, missing])

  useEffect(() => {
    if (phase === 'playing' || mode !== 'daily' || showResult) return
    const id = setTimeout(() => setShowResult(true), RESULT_DELAY_MS)
    return () => clearTimeout(id)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(noticeTimer.current), [])

  const flash = (n) => {
    clearTimeout(noticeTimer.current)
    setNotice(n)
    noticeTimer.current = setTimeout(() => setNotice(null), 2800)
  }

  const onGuess = (code) => {
    if (phase !== 'playing') return
    const next = [...guesses, code]
    setGuesses(next)
    setConfirmGiveUp(false)
    if (missing.includes(code)) {
      setFresh(code)
      flash({ ok: true, text: t('patchwork.found', { name: nameOf(code) }) })
      const g = evaluatePatchwork(missing, next)
      if (g.won && mode === 'daily') recordResult(GAME, true, Math.min(MISS_SLOTS, g.misses.length + 1), MISS_SLOTS)
    } else {
      const g = evaluatePatchwork(missing, next)
      flash({ ok: false, text: g.lost ? t('patchwork.outOfLives') : t('patchwork.onMap', { name: nameOf(code) }) })
      if (g.lost) { setFocus(null); setFresh(null); if (mode === 'daily') recordResult(GAME, false, MISS_SLOTS, MISS_SLOTS) }
    }
  }

  const onGiveUp = () => {
    if (!confirmGiveUp) { setConfirmGiveUp(true); return }
    setGaveUp(true); setFocus(null); setFresh(null)
    if (mode === 'daily') recordResult(GAME, false, MISS_SLOTS, MISS_SLOTS)
  }

  const reset = (m, s) => {
    setMissing(m); setGuesses(s?.guesses ?? []); setGaveUp(s?.gaveUp ?? false); setConfirmGiveUp(false)
    setFocus(null); setFresh(null); setNotice(null); setShowResult(!!s?.done)
  }
  const startUnlimited = () => { setMode('unlimited'); reset(randomMissing()) }
  const restoreDaily = () => { const m = dailyMissing(); setMode('daily'); reset(m, readSaved(m)) }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())

  const n = game.restored.length
  const missWord = (k) => (k === 0 ? t('patchwork.summaryZero') : k === 1 ? t('patchwork.summaryOne') : t('patchwork.summary', { n: k }))
  const shareText = [
    `🧩 Patchwork #${puzzleNumber()} · ${n}/${MISSING} · ${game.misses.length === 1 ? '1 miss' : `${game.misses.length} misses`}`,
    guesses.map(g => (missing.includes(g) ? SHARE.hit : SHARE.miss)).join(''),
    `${SITE_URL}${ROUTE}`,
  ].join('\n')

  return (
    <div className="tv-scene min-h-dvh text-primary" style={geoAccentVars(GAME)}>
      <div className="flex flex-col items-center px-3 sm:px-4 pb-8 max-w-4xl mx-auto">
        <div className="w-full">
          <GeoChrome gameId={GAME} title="PATCHWORK" howTo={{ n: MISSING, lives: MAX_MISSES }} right={<b className="text-secondary tabular-nums">{n}/{MISSING}</b>} />
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-3" />

        {/* The map */}
        <section aria-label={t('patchwork.board', { n: MISSING - n })} className="pw-map relative w-full aspect-[1.3/1] sm:aspect-[1.62/1] rounded-2xl border border-border-strong overflow-hidden">
          <WorldBoard missing={missing} restored={restored} revealed={phase === 'lost'} fresh={fresh} focus={focus}
            onSlot={(i) => setFocus(f => (f === missing[i] ? null : missing[i]))} />
          <div className="absolute top-3 left-3.5 text-[0.55rem] font-black tracking-[0.18em] text-accent-bright uppercase pointer-events-none">
            {mode === 'daily' ? `${t('daily')} · #${puzzleNumber()}` : t('unlimited')}
          </div>
          {/* progress */}
          <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5 px-2.5 py-1.5 rounded-lg bg-canvas/75 backdrop-blur-sm border border-border pointer-events-none" aria-live="polite">
            <span className="text-[0.7rem] font-bold text-secondary">
              <b key={n} className={`score-number font-normal text-[1.15rem] text-primary tabular-nums ${n ? 'pw-pop' : ''}`}>{n}</b>
              <span className="text-faint"> / {MISSING}</span> {t('patchwork.restoredShort')}
            </span>
            <span className="flex gap-[3px]" aria-hidden="true">
              {missing.map(c => <i key={c} className={`w-3 sm:w-4 h-1 rounded-full transition-colors ${restored.has(c) ? 'bg-success' : phase === 'lost' ? 'bg-warn/70' : 'bg-inert'}`} />)}
            </span>
          </div>
          {focus && (
            <button type="button" onClick={() => setFocus(null)}
              className="absolute bottom-2.5 left-2.5 h-8 px-3 rounded-lg bg-canvas/80 backdrop-blur-sm border border-border-strong text-[0.7rem] font-bold text-secondary hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
              ← {t('patchwork.world')}
            </button>
          )}
          {notice && (
            <div className="absolute bottom-2.5 inset-x-0 flex justify-center pointer-events-none px-12">
              <span key={notice.text} className={`bl-reveal px-3 py-1.5 rounded-lg bg-canvas/85 backdrop-blur-sm border text-[0.75rem] font-bold text-center ${notice.ok ? 'border-success/60 text-success-bright' : 'border-danger/50 text-danger-bright'}`}>
                {notice.text}
              </span>
            </div>
          )}
        </section>

        {/* The gaps: numbered until found, zoomable */}
        <ol className="w-full mt-2.5 m-0 p-0 list-none flex flex-wrap gap-1.5" aria-label={t('patchwork.missing')}>
          {missing.map((c, i) => {
            const done = restored.has(c)
            if (done || phase === 'lost') {
              return (
                <li key={c} className={`flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-full border text-[0.75rem] font-bold ${done ? 'border-success/50 bg-success/10 text-success-bright' : 'border-warn/50 bg-warn/10 text-warn'} ${fresh === c ? 'ov-chip-in' : ''}`}>
                  <Flag code={c} className="w-5 h-[0.94rem]" />{nameOf(c)}
                </li>
              )
            }
            return (
              <li key={c}>
                <button type="button" onClick={() => setFocus(f => (f === c ? null : c))} aria-pressed={focus === c} aria-label={t('patchwork.slotZoom', { n: i + 1 })}
                  className={`h-8 min-w-[2.75rem] px-2.5 rounded-full border border-dashed text-[0.75rem] font-black tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright ${focus === c ? 'border-accent-bright bg-accent-tint text-accent-bright' : 'border-[color-mix(in_srgb,var(--accent)_55%,transparent)] text-accent-bright hover:bg-accent-tint'}`}>
                  {i + 1}
                </button>
              </li>
            )
          })}
        </ol>

        <div className="w-full mt-2.5">
          {phase === 'playing' ? (
            <CountryInput onGuess={onGuess} guessed={guessed} disabled={false} placeholder={t('patchwork.placeholder')} />
          ) : mode === 'unlimited' ? (
            <button onClick={startUnlimited} className="bl-reveal w-full h-btn-lg bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] rounded-xl transition-colors">{t('patchwork.newMap')}</button>
          ) : (
            <div className="bl-reveal flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 h-btn-lg rounded-xl border border-border-strong bg-surface flex items-center justify-center gap-2 text-[0.75rem] text-muted">
                {t('patchwork.nextIn')} <b className="score-number font-normal text-[1.25rem] text-primary tabular-nums tracking-[0.04em]">{countdown}</b>
              </div>
              <button onClick={() => setShowResult(true)} className="flex-1 h-btn-lg rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors">{t('patchwork.seeResult')}</button>
            </div>
          )}
        </div>

        {/* Misses + give up */}
        <div className="w-full mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 mb-1.5 flex items-center gap-2 text-[0.55rem] font-black tracking-[0.16em] uppercase text-faint">
              {t('patchwork.misses')} · {game.misses.length}/{MAX_MISSES}
              <span className="flex gap-[3px]" aria-hidden="true">
                {Array.from({ length: MAX_MISSES }, (_, i) => <i key={i} className={`w-2 h-2 rounded-full ${i < game.misses.length ? 'bg-danger' : 'bg-inert'}`} />)}
              </span>
            </h2>
            {game.misses.length ? (
              <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5">
                {game.misses.map(c => (
                  <li key={c} className="flex items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-full border border-border bg-surface text-[0.72rem] font-semibold text-muted">
                    <Flag code={c} className="w-4 h-3" /><span className="line-through decoration-danger/60">{nameOf(c)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="m-0 text-[0.75rem] text-faint">{t('patchwork.noMisses')}</p>}
          </div>
          {phase === 'playing' && guesses.length > 0 && (
            <button type="button" onClick={onGiveUp} onBlur={() => setConfirmGiveUp(false)}
              className={`shrink-0 h-8 px-3 rounded-lg text-[0.7rem] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright ${confirmGiveUp ? 'bg-danger/15 border border-danger/50 text-danger-bright' : 'text-muted hover:text-secondary'}`}>
              {confirmGiveUp ? t('patchwork.giveUpConfirm') : t('patchwork.giveUp')}
            </button>
          )}
        </div>

        <ResultModal open={showResult && dailyLocked} onClose={() => setShowResult(false)}>
          <div className="w-full flex flex-col items-center text-center">
            <GeoMotif id={GAME} className={`w-11 h-11 mb-2 ${phase === 'won' ? 'text-accent-bright' : 'text-dim'}`} />
            <h2 className={`score-number text-4xl m-0 ${phase === 'won' ? 'text-success-bright' : 'text-warn'}`}>{phase === 'won' ? t('patchwork.won') : t('patchwork.lost')}</h2>
            <p className="m-0 mt-1 text-sm text-muted">{phase === 'won' ? missWord(game.misses.length) : t('patchwork.foundOf', { n, total: MISSING })}</p>
            <div className="w-full mt-4">
              <div className="text-[0.62rem] font-black tracking-[0.16em] uppercase text-muted mb-2">{t('patchwork.missing')}</div>
              <ul className="m-0 p-0 list-none flex flex-wrap justify-center gap-1.5">
                {missing.map(c => (
                  <li key={c} className={`inline-flex items-center gap-1.5 h-7 px-2 rounded-md border text-[0.75rem] font-bold ${restored.has(c) ? 'border-success/40 text-success-bright bg-success/10' : 'border-warn/40 text-warn bg-warn/10'}`}>
                    <Flag code={c} className="w-4 h-3" />{nameOf(c)}
                  </li>
                ))}
              </ul>
            </div>
            <StatsBlock stats={stats} last={phase === 'won' ? Math.min(MISS_SLOTS, game.misses.length + 1) : null} labels={DIST_LABELS} />
            <div className="w-full mt-4 text-[0.72rem] text-muted">{t('patchwork.nextIn')} <b className="text-primary tabular-nums">{countdown}</b></div>
            <ShareButton text={shareText} primary />
            <button onClick={startUnlimited} className={SECONDARY_BTN}>{t('patchwork.playUnlimited')}</button>
            <Link to="/geography" className="mt-3 text-[0.78rem] font-bold text-brand-bright hover:text-brand">{t('borderline.allGames')} →</Link>
          </div>
        </ResultModal>
      </div>
    </div>
  )
}
