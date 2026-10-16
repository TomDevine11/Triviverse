import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  evaluateGame, bestRoute, dailyPair, randomPair, pairSig, puzzleNumber, nameOf, HINTS, SHARE_TILE, EXTRA_GUESSES,
} from '../../data/overland'
import { loadProgress, saveProgress, loadStats, recordResult } from '../../data/progress'
import { SITE_URL } from '../../seo'
import { GeoChrome, ModeToggle, ResultModal, Flag, ShareButton, SECONDARY_BTN, StatsBlock } from '../../components/ui'
import { useCountdown } from '../../components/hooks'
import CountryInput from '../../components/CountryInput'
import RouteMap from '../../components/RouteMap'
import GeoMotif from '../../components/GeoMotif'
import { geoAccentVars } from '../../games'
import { t } from '../../strings'
import '../../geography.css'

const GAME = 'overland'
const ROUTE = '/geography/overland'
const RESULT_DELAY_MS = 2500 // board settle → finish card (the Triviverse beat)
const SLOTS = EXTRA_GUESSES + 1 // result distribution: +0 … +4
const DIST_LABELS = Array.from({ length: SLOTS }, (_, i) => `+${i}`)

// One end of the journey, as a ticket stub.
function Stop({ code, label, align }) {
  return (
    <div className={`min-w-0 flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start'}`}>
      <span className={`text-[0.55rem] font-black tracking-[0.18em] uppercase ${align === 'right' ? 'text-accent-bright' : 'text-brand-bright'}`}>{label}</span>
      <span className={`mt-1 flex items-center gap-2 min-w-0 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <Flag code={code} className="w-7 h-[1.3rem] sm:w-8 sm:h-6" />
        <b className="text-[1rem] sm:text-[1.25rem] font-extrabold text-primary leading-tight truncate">{nameOf(code)}</b>
      </span>
    </div>
  )
}

// The slots between the two ends: one per country still needed on the best way
// through, lit as the player names them.
function Slots({ best, named }) {
  const mid = best ? best.slice(1, -1) : []
  return (
    <div className="flex-1 min-w-[3rem] flex items-center gap-1 sm:gap-1.5 px-1" aria-label={t('overland.progress')}>
      <i className="flex-1 h-px bg-border-strong" />
      {mid.map((c, i) => {
        const on = named.has(c)
        return <i key={`${i}-${on ? c : ''}`} className={`ov-slot w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border ${on ? 'on bg-success border-success' : 'bg-transparent border-faint'}`} />
      })}
      <i className="flex-1 h-px bg-border-strong" />
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-faint shrink-0" fill="currentColor" aria-hidden="true"><path d="M9 5l8 7-8 7z" /></svg>
    </div>
  )
}

function Chip({ row, fresh }) {
  return (
    <li className={`flex items-center gap-2 h-9 pl-2 pr-3 rounded-full border border-border-strong bg-surface ${fresh ? 'ov-chip-in' : ''}`}
      aria-label={`${nameOf(row.code)} — ${t(`overland.tier.${row.tier}`)}`}>
      <Flag code={row.code} className="w-5 h-[0.94rem]" />
      <span className="text-[0.8rem] font-bold text-primary whitespace-nowrap">{nameOf(row.code)}</span>
      <i className={`ov-dot ${row.tier}`} aria-hidden="true" />
    </li>
  )
}

function RouteChain({ codes }) {
  return (
    <ol className="m-0 p-0 list-none flex flex-wrap justify-center items-center gap-x-1.5 gap-y-2">
      {codes.map((c, i) => (
        <li key={c} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-faint text-xs" aria-hidden="true">→</span>}
          <span className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-board border border-border text-[0.75rem] font-bold text-primary">
            <Flag code={c} className="w-4 h-3" />{nameOf(c)}
          </span>
        </li>
      ))}
    </ol>
  )
}

export default function Overland() {
  const [saved] = useState(() => loadProgress(GAME, pairSig(dailyPair())))
  const [mode, setMode] = useState('daily')
  const [pair, setPair] = useState(dailyPair)
  const [guesses, setGuesses] = useState(() => saved?.guesses ?? [])
  const [hints, setHints] = useState(() => saved?.hints ?? [])
  const [fresh, setFresh] = useState(null)
  const [showResult, setShowResult] = useState(!!saved?.done)
  const countdown = useCountdown()
  const [start, end] = pair

  const game = useMemo(() => evaluateGame(start, end, guesses), [start, end, guesses])
  const named = useMemo(() => new Set(guesses), [guesses])
  const phase = game.won ? 'won' : game.lost ? 'lost' : 'playing'
  const dailyLocked = mode === 'daily' && phase !== 'playing'
  const stats = useMemo(() => loadStats(GAME, SLOTS), [phase]) // eslint-disable-line react-hooks/exhaustive-deps
  const extra = guesses.length - game.par

  // Camera: the two ends, one shortest route, and every named country that isn't miles off.
  const initialRoute = useMemo(() => bestRoute(start, end, new Set()) || [start, end], [start, end])
  const focus = useMemo(() => [...initialRoute, ...game.rows.filter(r => r.tier !== 'red').map(r => r.code)], [initialRoute, game.rows])
  const missing = (game.best || []).slice(1, -1).filter(c => !named.has(c))

  useEffect(() => {
    if (mode !== 'daily' || (guesses.length === 0 && hints.length === 0)) return
    saveProgress(GAME, { guesses, hints }, phase !== 'playing', pairSig(pair))
  }, [mode, guesses, hints, phase, pair])

  useEffect(() => {
    if (phase === 'playing' || mode !== 'daily' || showResult) return
    const id = setTimeout(() => setShowResult(true), RESULT_DELAY_MS)
    return () => clearTimeout(id)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const onGuess = (code) => {
    if (phase !== 'playing') return
    const next = [...guesses, code]
    setFresh(code)
    setGuesses(next)
    if (mode === 'daily') {
      const g = evaluateGame(start, end, next)
      if (g.won || g.lost) recordResult(GAME, g.won, Math.min(SLOTS, next.length - g.par + 1), SLOTS)
    }
  }
  const takeHint = (h) => { if (phase === 'playing' && !hints.includes(h)) setHints(hs => [...hs, h]) }

  const reset = (p, s) => { setPair(p); setGuesses(s?.guesses ?? []); setHints(s?.hints ?? []); setFresh(null); setShowResult(!!s?.done) }
  const startUnlimited = () => { setMode('unlimited'); reset(randomPair()) }
  const restoreDaily = () => { const p = dailyPair(); setMode('daily'); reset(p, loadProgress(GAME, pairSig(p))) }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())

  const blocked = { [start]: t('overland.isEndpoint', { name: nameOf(start) }), [end]: t('overland.isEndpoint', { name: nameOf(end) }) }
  const last = game.rows[game.rows.length - 1]
  const live = last ? `${nameOf(last.code)}: ${t(`overland.tier.${last.tier}`)}${phase === 'won' ? ` — ${t('overland.completeBanner')}` : ''}` : ''
  const hintCodes = hints.includes('next') && phase === 'playing' ? missing[0] : null
  const reveal = phase === 'lost' ? missing : null

  const scoreText = phase === 'won' ? (extra === 0 ? t('overland.perfect') : t('overland.overPar', { n: extra })) : t('overland.lost')
  const shareText = [
    `🗺️ Overland #${puzzleNumber()} · ${phase === 'won' ? `${guesses.length}/${game.max}${extra ? ` (+${extra})` : ' ✨'}` : `X/${game.max}`}${hints.length ? ` · 💡${hints.length}` : ''}`,
    game.rows.map(r => SHARE_TILE[r.tier]).join(''),
    `${SITE_URL}${ROUTE}`,
  ].join('\n')

  return (
    <div className="tv-scene min-h-dvh text-primary" style={geoAccentVars(GAME)}>
      <div className="flex flex-col items-center px-4 pb-8 max-w-2xl mx-auto">
        <div className="w-full">
          <GeoChrome gameId={GAME} title="OVERLAND" howTo={{ extra: EXTRA_GUESSES }} right={<b className="text-secondary tabular-nums">{guesses.length}/{game.max}</b>} />
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-3" />

        {/* The ticket: from → to, with a slot per country still to find */}
        <section className="w-full rounded-2xl border border-border-strong bg-card px-4 py-3 sm:px-5 sm:py-4" aria-label={t('overland.today', { a: nameOf(start), b: nameOf(end) })}>
          <div className="flex items-center gap-2 sm:gap-4">
            <Stop code={start} label={t('overland.from')} />
            <Slots best={game.best} named={named} />
            <Stop code={end} label={t('overland.to')} align="right" />
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3 text-[0.7rem] text-muted">
            <span>{t('overland.shortest', { n: game.par })}</span>
            <b className={`tabular-nums font-extrabold ${game.left <= 2 && phase === 'playing' ? 'text-warn' : 'text-secondary'}`}>
              {phase === 'playing' ? (game.left === 1 ? t('overland.leftOne') : t('overland.left', { n: game.left })) : scoreText}
            </b>
          </div>
        </section>

        {/* The map */}
        <section aria-label={t('overland.board')} className="ov-map relative w-full mt-3 h-[clamp(13rem,36dvh,25rem)] rounded-2xl border border-border-strong overflow-hidden">
          <RouteMap start={start} end={end} rows={game.rows} focus={focus} outlines={hints.includes('outlines') || phase !== 'playing'}
            nextHint={hintCodes} reveal={reveal} route={game.route} outcome={phase} freshCode={fresh} />
          <div className="absolute top-3 left-3.5 text-[0.55rem] font-black tracking-[0.18em] text-accent-bright uppercase pointer-events-none">
            {mode === 'daily' ? `${t('daily')} · #${puzzleNumber()}` : t('unlimited')}
          </div>
          <ul className="absolute bottom-2.5 right-3 m-0 p-0 list-none flex gap-2.5 text-[0.6rem] font-bold text-secondary pointer-events-none" aria-hidden="true">
            {['green', 'yellow', 'orange', 'red'].map(k => <li key={k} className="flex items-center gap-1"><i className={`ov-dot ${k}`} />{t(`overland.legend.${k}`)}</li>)}
          </ul>
          {phase === 'won' && (
            <div className="bl-reveal absolute top-3 right-3 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-success/60 bg-canvas/80 backdrop-blur-sm text-[0.72rem] font-extrabold text-success-bright">✓ {t('overland.completeBanner')}</span>
            </div>
          )}
        </section>

        {/* Input / end-of-round */}
        <div className="w-full mt-3">
          {phase === 'playing' ? (
            <CountryInput onGuess={onGuess} guessed={named} blocked={blocked} disabled={false} placeholder={t('overland.placeholder')} />
          ) : mode === 'unlimited' ? (
            <button onClick={startUnlimited} className="bl-reveal w-full h-btn-lg bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] rounded-xl transition-colors">{t('overland.newRoute')}</button>
          ) : (
            <div className="bl-reveal flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 h-btn-lg rounded-xl border border-border-strong bg-surface flex items-center justify-center gap-2 text-[0.75rem] text-muted">
                {t('overland.nextIn')} <b className="score-number font-normal text-[1.25rem] text-primary tabular-nums tracking-[0.04em]">{countdown}</b>
              </div>
              <button onClick={() => setShowResult(true)} className="flex-1 h-btn-lg rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors">{t('overland.seeResult')}</button>
            </div>
          )}
        </div>

        {/* Hints */}
        <div className="w-full mt-1 flex items-center gap-2 flex-wrap">
          <span className="text-[0.55rem] font-black tracking-[0.16em] uppercase text-faint mr-1">{t('overland.hints')} {hints.length}/{HINTS.length}</span>
          {HINTS.map(h => {
            const used = hints.includes(h)
            return (
              <button key={h} type="button" onClick={() => takeHint(h)} disabled={used || phase !== 'playing'} aria-pressed={used} aria-label={t(`overland.hintAria.${h}`)}
                className={`h-8 px-3 rounded-full border text-[0.7rem] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright ${used ? 'border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-accent-tint text-accent-bright' : 'border-border-strong text-secondary hover:text-primary hover:border-brand/50 disabled:opacity-40 disabled:hover:text-secondary'}`}>
                {used ? '✓ ' : ''}{t(`overland.hint.${h}`)}
              </button>
            )
          })}
        </div>
        {hints.includes('initials') && game.best && (
          <p className="bl-reveal w-full mt-2 mb-0 text-[0.78rem] text-muted">
            <span className="text-[0.55rem] font-black tracking-[0.16em] uppercase text-faint mr-2">{t('overland.initials')}</span>
            {game.best.slice(1, -1).map((c, i) => (
              <span key={c}>{i > 0 && <span className="text-faint"> → </span>}<b className="text-primary font-extrabold">{named.has(c) ? nameOf(c) : `${nameOf(c)[0]}…`}</b></span>
            ))}
          </p>
        )}

        {/* Named countries */}
        <div className="w-full mt-3">
          <h2 className="m-0 mb-2 text-[0.55rem] font-black tracking-[0.16em] uppercase text-faint">{t('overland.guesses')}</h2>
          {game.rows.length ? (
            <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5">
              {game.rows.map(r => <Chip key={r.code} row={r} fresh={r.code === fresh} />)}
            </ul>
          ) : <p className="m-0 text-[0.8rem] text-muted">{t('overland.none')}</p>}
        </div>
        <p className="sr-only" aria-live="polite">{live}</p>

        <ResultModal open={showResult && dailyLocked} onClose={() => setShowResult(false)}>
          <div className="w-full flex flex-col items-center text-center">
            <GeoMotif id={GAME} className={`w-11 h-11 mb-2 ${phase === 'won' ? 'text-accent-bright' : 'text-dim'}`} />
            <h2 className={`score-number text-4xl m-0 ${phase === 'won' ? 'text-success-bright' : 'text-danger-bright'}`}>{phase === 'won' ? t('overland.won') : t('overland.lost')}</h2>
            <p className="m-0 mt-1 text-sm text-muted">
              {phase === 'won' && <b className="text-primary">{scoreText} · </b>}
              {hints.length ? t('overland.usedOf', { n: guesses.length, max: game.max, h: hints.length }) : t('overland.usedOfNoHints', { n: guesses.length, max: game.max })}
            </p>
            <div className="w-full mt-4">
              <div className="text-[0.62rem] font-black tracking-[0.16em] uppercase text-muted mb-2">{phase === 'won' ? t('overland.yourRoute') : t('overland.aShortest')}</div>
              <RouteChain codes={phase === 'won' ? game.route : bestRoute(start, end, new Set())} />
            </div>
            <StatsBlock stats={stats} last={phase === 'won' ? Math.min(SLOTS, extra + 1) : null} labels={DIST_LABELS} />
            <div className="w-full mt-4 text-[0.72rem] text-muted">{t('overland.nextIn')} <b className="text-primary tabular-nums">{countdown}</b></div>
            <ShareButton text={shareText} primary />
            <button onClick={startUnlimited} className={SECONDARY_BTN}>{t('overland.playUnlimited')}</button>
            <Link to="/geography" className="mt-3 text-[0.78rem] font-bold text-brand-bright hover:text-brand">{t('borderline.allGames')} →</Link>
          </div>
        </ResultModal>
      </div>
    </div>
  )
}
