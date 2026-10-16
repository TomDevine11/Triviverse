import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  STATS, UNLIMITED_STATS, DAILY_SIZE, PASS_STREAK, DATA_YEAR, SOURCE,
  dailyQuestions, puzzleNumber, outcomeOf, isCorrect, valueOf, nameOf, formatParts, exactLine, factFor, questionFor, rankOf, poolSize, square,
} from '../../data/outrank'
import {
  readDaily, answerDaily, advanceDaily, saveDaily, dailyResults, dailyComplete, dailyFinished, dailyWon,
  newRun, readRun, saveRun, answerRun, advanceRun, runStreak, runRevealed, recordRun, loadUnlimitedStats,
  readSetting, saveSetting, readMode, saveMode, GAME,
} from '../../data/outrankPlay'
import { loadStats } from '../../data/progress'
import { SITE_URL } from '../../seo'
import { GeoChrome, ModeToggle, ShareButton, Flag, SECONDARY_BTN } from '../../components/ui'
import { useCountdown, useCountUp } from '../../components/hooks'
import GeoMotif from '../../components/GeoMotif'
import { geoAccentVars } from '../../games'
import { t } from '../../strings'
import '../../geography.css'

// Outrank — geography higher or lower. Two countries, one statistic: the first
// country's figure is on show, say whether the second's is higher or lower.
//
// Daily: ten comparisons, the same for everyone, one guess each; a wrong answer is
// revealed and the run carries on, so the day ends as a score out of ten.
// Unlimited: an endless chain — every right answer slides the challenger into the
// reference seat and brings in a new country; one wrong answer ends the run.
// The rules and saved state live in ../../data/outrank(Play).js; this file is UI.

const ROUTE = '/geography/outrank'
const AUTO_NEXT_MS = 2200 // Unlimited: a right answer moves on by itself after this

const STAT_ICON = {
  population: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7.5-1a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zM2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5zm14.5 0c0-1.9-.6-3.6-1.7-5 .5-.1 1-.2 1.5-.2 2.9 0 5.2 2.3 5.2 5.2z',
  area: 'M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20zM9 4v13.5M15 6.5V20',
  density: 'M3 21V10l5-3v14M8 21V4l7 3v14M15 21v-9l6 2.5V21M2 21h20M11 10h1.5M11 13.5h1.5M11 17h1.5',
  life: 'M12 20.5s-8-4.6-8-10.4A4.6 4.6 0 0 1 12 7.4a4.6 4.6 0 0 1 8 2.7c0 5.8-8 10.4-8 10.4zM4.5 12h3.5l1.7-3 2.6 6 1.7-3h5.5',
}
const FILLED = new Set(['population'])
function StatIcon({ stat, className = 'w-4 h-4' }) {
  const d = STAT_ICON[stat]
  if (!d) return null
  return FILLED.has(stat)
    ? <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d={d} /></svg>
    : <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The headline figure: number large, unit small. When revealed this visit it runs
// from the reference country's figure to its own — up for higher, down for lower —
// in its own unit, so the unit never flickers mid-count.
function Figure({ stat, value, from, animate, className = '' }) {
  const [num, unit] = formatParts(stat, value)
  const target = Number(num.replace(/,/g, ''))
  const dp = (num.split('.')[1] || '').length
  const start = from != null ? target * (from / value) : 0
  const p = useCountUp(1, animate && !reducedMotion(), 1000)
  const text = animate ? (start + (target - start) * p).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp }) : num
  return (
    <span className={`inline-flex items-baseline gap-1.5 flex-wrap ${className}`}>
      <span className="score-number tabular-nums leading-none text-[2.1rem] sm:text-[2.9rem]">{text}</span>
      <span className="text-[0.78rem] sm:text-[0.9rem] font-bold text-secondary">{unit}</span>
    </span>
  )
}

// One country. `role`: 'ref' (figure on show) or 'chal' (figure hidden until revealed).
function CountryCard({ code, stat, role, revealed, verdict, animate, enter, from }) {
  const value = valueOf(code, stat)
  const showValue = role === 'ref' || revealed
  const exact = showValue ? exactLine(stat, value) : null
  const rank = rankOf(code, stat)
  const tone = verdict === 'right' ? 'or-card-right' : verdict === 'wrong' ? 'or-card-wrong' : role === 'chal' ? 'or-card-chal' : ''
  const shake = verdict === 'wrong' && animate ? 'or-shake' : ''
  return (
    <article className={`or-card ${tone} ${shake || enter || ''} relative flex-1 min-w-0 rounded-2xl border bg-card px-3.5 py-3 sm:px-5 sm:py-6 flex sm:flex-col items-center gap-3.5 sm:gap-3 sm:text-center`}
      aria-label={showValue ? `${nameOf(code)}: ${formatParts(stat, value).join(' ')}` : `${nameOf(code)}: ${t('outrank.hidden')}`}>
      <Flag code={code} className="or-flag w-[4.6rem] h-[3.45rem] sm:w-[7.5rem] sm:h-[5.625rem] rounded-md shadow-[0_10px_24px_-10px_rgb(0_0_0/0.8)]" />
      <div className="min-w-0 flex-1 sm:flex-none flex flex-col sm:items-center gap-1 sm:gap-2 w-full">
        <h2 className="m-0 text-[1.02rem] sm:text-[1.3rem] font-extrabold leading-tight text-primary truncate sm:whitespace-normal sm:line-clamp-2">{nameOf(code)}</h2>
        <div className="min-h-[2.4rem] sm:min-h-[3.4rem] flex items-center sm:justify-center">
          {showValue
            ? <Figure stat={stat} value={value} from={from} animate={animate && role === 'chal'} className="justify-start sm:justify-center" />
            : <span className="or-mystery score-number text-[2.1rem] sm:text-[2.9rem] leading-none text-accent-bright" aria-hidden="true">?</span>}
        </div>
        <div className="flex items-center gap-2 sm:justify-center min-h-[1.1rem] text-[0.66rem] font-bold text-muted">
          {showValue && exact && <span className="tabular-nums truncate">{exact}</span>}
          {showValue && revealed && rank && <span className="shrink-0 px-1.5 py-0.5 rounded border border-border-strong tabular-nums text-secondary">#{rank} {t('outrank.of')} {poolSize(stat)}</span>}
          {!showValue && <span className="uppercase tracking-[0.12em]">{t('outrank.higherOrLower')}</span>}
        </div>
      </div>
      {verdict && (
        <span className={`or-badge absolute -top-2.5 right-3 sm:left-0 sm:right-0 sm:mx-auto sm:w-max h-6 px-2.5 rounded-full inline-flex items-center text-[0.62rem] font-black tracking-[0.12em] uppercase text-white ${verdict === 'right' ? 'bg-success-strong' : 'bg-danger-strong'}`}>
          {verdict === 'right' ? t('outrank.correct') : t('outrank.wrong')}
        </span>
      )}
    </article>
  )
}

function StatBanner({ stat, step }) {
  const s = STATS[stat]
  return (
    <div key={`${stat}-${step}`} className="or-stat flex items-center gap-2.5 min-w-0">
      <span className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg bg-accent-tint text-accent-bright flex items-center justify-center"><StatIcon stat={stat} className="w-[1.1rem] h-[1.1rem]" /></span>
      <div className="min-w-0">
        <div className="text-[0.95rem] sm:text-[1.1rem] font-extrabold uppercase tracking-[0.04em] text-primary leading-tight">{s.label}</div>
        <div className="text-[0.68rem] sm:text-[0.72rem] text-muted leading-snug line-clamp-2 sm:truncate">{s.definition}</div>
      </div>
    </div>
  )
}

// Ten segments: green/red once answered, accent for the one on screen.
function DailyTrack({ results, pos }) {
  return (
    <ol className="m-0 p-0 list-none grid grid-cols-10 gap-1" aria-label={t('outrank.progressAria')}>
      {Array.from({ length: DAILY_SIZE }, (_, i) => {
        const r = results[i]
        const mark = i === PASS_STREAK - 1
        return <li key={i} className={`h-1.5 rounded-full transition-colors duration-500 ${mark ? 'ring-1 ring-primary/70 ring-offset-1 ring-offset-canvas' : ''} ${r === true ? 'bg-success' : r === false ? 'bg-danger' : i === pos ? 'bg-accent' : 'bg-inert'}`} />
      })}
    </ol>
  )
}

function GuessButtons({ onGuess, disabled }) {
  const btn = 'or-guess flex-1 h-14 sm:h-16 rounded-xl text-[0.95rem] sm:text-[1.05rem] font-black tracking-[0.05em] uppercase inline-flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright disabled:opacity-50'
  return (
    <div className="flex gap-2.5 sm:gap-3" role="group" aria-label={t('outrank.guessAria')}>
      <button type="button" onClick={() => onGuess('higher')} disabled={disabled} className={`${btn} bg-brand hover:bg-brand-hover text-white`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true"><path d="M12 5 4 15h16z" /></svg>{t('outrank.higher')}
        <kbd className="hidden lg:inline ml-1 text-[0.6rem] font-bold text-white/60 border border-white/25 rounded px-1">↑</kbd>
      </button>
      <button type="button" onClick={() => onGuess('lower')} disabled={disabled} className={`${btn} bg-surface hover:bg-border border border-border-strong text-primary`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true"><path d="M12 19 4 9h16z" /></svg>{t('outrank.lower')}
        <kbd className="hidden lg:inline ml-1 text-[0.6rem] font-bold text-muted border border-border-strong rounded px-1">↓</kbd>
      </button>
    </div>
  )
}

// After a guess: what happened, one line of context, and the way on.
function RevealBar({ q, ok, fact, onNext, nextLabel, autoMs }) {
  return (
    <div className="or-reveal flex flex-col gap-2.5">
      <p className="m-0 text-[0.82rem] sm:text-[0.9rem] leading-snug text-secondary text-center px-2" aria-live="polite">
        <b className={ok ? 'text-success-bright' : 'text-danger-bright'}>{ok ? (outcomeOf(q) === 'tie' ? t('outrank.tie') : t('outrank.right')) : t('outrank.nope')}</b>{' '}{fact}
      </p>
      {onNext && (
        <button type="button" onClick={onNext} autoFocus
          className="relative overflow-hidden h-14 sm:h-16 rounded-xl bg-brand hover:bg-brand-hover text-white text-[0.95rem] font-black tracking-[0.05em] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright">
          {nextLabel}
          {autoMs ? <span className="or-auto absolute left-0 bottom-0 h-1 bg-white/35" style={{ animationDuration: `${autoMs}ms` }} aria-hidden="true" /> : null}
        </button>
      )}
    </div>
  )
}

// Two cards with VS between: side by side from sm, stacked on phones.
function Arena({ q, revealed, ok, fresh, step }) {
  const verdict = revealed ? (ok ? 'right' : 'wrong') : null
  const slide = step > 0 && fresh === 'advance'
  return (
    <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-4">
      <CountryCard key={`a-${step}-${q.a}`} code={q.a} stat={q.stat} role="ref" enter={slide ? 'or-from-chal' : 'or-in'} />
      <div className="or-vs absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-canvas border border-border-strong flex items-center justify-center text-[0.7rem] sm:text-[0.78rem] font-black tracking-[0.08em] text-muted shadow-[0_0_0_5px_rgb(11_10_20)]" aria-hidden="true">VS</div>
      <CountryCard key={`b-${step}-${q.b}`} code={q.b} stat={q.stat} role="chal" revealed={revealed} verdict={verdict} animate={fresh === 'reveal'} from={valueOf(q.a, q.stat)} enter={slide ? 'or-new' : 'or-in'} />
    </div>
  )
}

export default function Outrank() {
  const qs = useMemo(() => dailyQuestions(), [])
  const [mode, setMode] = useState(() => readMode() || 'daily')
  const [daily, setDaily] = useState(() => readDaily(qs))
  const [setting, setSetting] = useState(readSetting)
  const [run, setRun] = useState(() => { const r = readRun(); return r && r.setting === readSetting() ? r : newRun(readSetting()) })
  const [ustats, setUstats] = useState(loadUnlimitedStats)
  const [fresh, setFresh] = useState(null) // 'reveal' | 'advance' — animate only what happens this visit
  const [showReview, setShowReview] = useState(false)
  const countdown = useCountdown()
  const isDaily = mode === 'daily'

  // ── persistence ──
  useEffect(() => { saveMode(mode) }, [mode])
  useEffect(() => { saveSetting(setting) }, [setting])
  useEffect(() => { if (daily.answers.length) saveDaily(qs, daily) }, [qs, daily])
  useEffect(() => { saveRun(run) }, [run])

  // ── derived ──
  const results = dailyResults(qs, daily.answers)
  const score = results.filter(Boolean).length
  const finished = dailyFinished(qs, daily)
  const dIndex = Math.min(daily.pos, DAILY_SIZE - 1)
  const dRevealed = daily.answers.length > dIndex

  const uIndex = run.qs.length - 1
  const uRevealed = runRevealed(run)
  const streak = runStreak(run)

  const q = isDaily ? qs[dIndex] : run.qs[uIndex]
  const revealed = isDaily ? dRevealed : uRevealed
  const guess = isDaily ? daily.answers[dIndex] : run.guesses[uIndex]
  const ok = revealed && isCorrect(q, guess)
  const step = isDaily ? dIndex : uIndex

  // ── actions (each transition ignores moves that aren't allowed) ──
  // One guess per question, however fast the taps: the lock names the question.
  const lock = useRef(null)
  const onGuess = (g) => {
    const id = isDaily ? `d${dIndex}` : `u${run.seed}:${uIndex}`
    if (revealed || lock.current === id) return
    lock.current = id
    setFresh('reveal')
    if (isDaily) { setDaily(answerDaily(qs, daily, g)); return }
    let next = answerRun(run, g)
    if (next.over) { const [r, st] = recordRun(next); next = r; setUstats(st) }
    setRun(next)
  }
  const onNext = () => {
    setFresh('advance')
    if (isDaily) setDaily(s => advanceDaily(s))
    else setRun(r => advanceRun(r))
  }
  const restart = (s = setting) => { setFresh(null); setRun(newRun(s)) }
  const pickMode = (m) => { setFresh(null); setShowReview(false); setMode(m) }
  const pickSetting = (s) => {
    if (s === setting) return
    // Changing the statistic mid-run banks the streak so far, then starts afresh.
    if (!run.over && streak > 0) { const [, st] = recordRun({ ...run, over: true }); setUstats(st) }
    setSetting(s)
    restart(s)
  }

  // Unlimited: a right answer moves on by itself.
  const autoNext = !isDaily && uRevealed && !run.over && fresh === 'reveal'
  useEffect(() => {
    if (!autoNext) return
    const id = setTimeout(() => { setFresh('advance'); setRun(r => advanceRun(r)) }, AUTO_NEXT_MS)
    return () => clearTimeout(id)
  }, [autoNext, uIndex])

  // Keyboard: ↑/H higher, ↓/L lower, Enter/→ next. Never steals keys from controls.
  const keys = useRef({})
  useEffect(() => {
    keys.current = { onGuess, onNext, revealed, canNext: isDaily ? dRevealed && !finished : uRevealed && !run.over, active: !(isDaily && finished) }
  })
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return
      const k = keys.current
      if (!k.active) return
      const key = e.key.toLowerCase()
      if (!k.revealed && (key === 'arrowup' || key === 'h')) { e.preventDefault(); k.onGuess('higher') }
      else if (!k.revealed && (key === 'arrowdown' || key === 'l')) { e.preventDefault(); k.onGuess('lower') }
      else if (k.canNext && (key === 'arrowright' || (key === 'enter' && tag !== 'BUTTON' && tag !== 'A'))) { e.preventDefault(); k.onNext() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const dStats = useMemo(() => loadStats(GAME, DAILY_SIZE + 1), [finished]) // eslint-disable-line react-hooks/exhaustive-deps
  const won = dailyWon(score)
  const shareText = [
    `📊 Outrank #${puzzleNumber()} · ${score}/${DAILY_SIZE}${won ? ' ✅' : ''}`,
    Array.from({ length: DAILY_SIZE }, (_, i) => (i < results.length ? square(results[i]) : '⬛')).join(''),
    `${SITE_URL}${ROUTE}`,
  ].join('\n')
  const unlimitedShare = `📊 Outrank Unlimited · ${streak} in a row (${setting === 'mixed' ? t('outrank.mixed') : STATS[setting].label})\n${SITE_URL}${ROUTE}`
  const best = ustats.best[setting] || 0

  return (
    <div className="tv-scene min-h-dvh flex flex-col text-primary" style={geoAccentVars(GAME)}>
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6">
        <GeoChrome gameId={GAME} title="OUTRANK" howTo={{ pass: PASS_STREAK, n: DAILY_SIZE }} right={<span className="tabular-nums">{isDaily ? `#${puzzleNumber()}` : '∞'}</span>} />
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 pb-6 flex flex-col gap-3 sm:gap-4">
        <h1 className="sr-only">Outrank — geography higher or lower</h1>

        {/* mode + score */}
        <div className="flex items-center justify-between gap-3">
          <ModeToggle mode={mode} onChange={pickMode} />
          {isDaily ? (
            <div className="text-right leading-none" aria-live="polite">
              <span key={score} className={`score-number text-[1.6rem] tabular-nums text-primary inline-block ${fresh === 'reveal' && ok ? 'score-pop' : ''}`}>{score}</span>
              <span className="text-[0.62rem] font-black tracking-[0.12em] uppercase text-muted"> / {DAILY_SIZE}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-3 leading-none" aria-live="polite">
              <span className="text-[0.6rem] font-black tracking-[0.12em] uppercase text-muted">{t('outrank.best')} <b className="text-secondary tabular-nums text-[0.8rem]">{Math.max(best, streak)}</b></span>
              <span><span key={streak} className={`score-number text-[1.6rem] tabular-nums text-primary inline-block ${fresh === 'reveal' && ok ? 'score-pop' : ''}`}>{streak}</span>
                <span className="text-[0.62rem] font-black tracking-[0.12em] uppercase text-muted"> {t('outrank.streak')}</span></span>
            </div>
          )}
        </div>

        {isDaily
          ? <DailyTrack results={results} pos={finished ? -1 : dIndex} />
          : (
            <div className="flex gap-1.5 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap [scrollbar-width:none]" role="radiogroup" aria-label={t('outrank.statPicker')}>
              {UNLIMITED_STATS.map(s => (
                <button key={s} type="button" role="radio" aria-checked={setting === s} onClick={() => pickSetting(s)}
                  className={`shrink-0 h-8 px-3 rounded-full border text-[0.72rem] font-bold inline-flex items-center gap-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright ${setting === s ? 'bg-accent-tint border-[color-mix(in_srgb,var(--accent)_60%,transparent)] text-primary' : 'border-border text-muted hover:text-secondary'}`}>
                  {s !== 'mixed' && <StatIcon stat={s} className="w-3.5 h-3.5" />}
                  {s === 'mixed' ? t('outrank.mixed') : STATS[s].label}
                </button>
              ))}
            </div>
          )}

        {isDaily && finished ? (
          <DailySummary qs={qs} daily={daily} results={results} score={score} won={won} stats={dStats} countdown={countdown} shareText={shareText}
            review={showReview} onReview={() => setShowReview(v => !v)} onUnlimited={() => pickMode('unlimited')} />
        ) : (
          <section className="flex flex-col gap-3 sm:gap-4" aria-label={t('outrank.boardAria')}>
            <div className="flex items-center justify-between gap-3">
              <StatBanner stat={q.stat} step={step} />
              <span className="shrink-0 text-[0.62rem] font-black tracking-[0.14em] uppercase text-accent-bright tabular-nums">
                {isDaily ? t('outrank.qOf', { n: dIndex + 1, total: DAILY_SIZE }) : t('outrank.qN', { n: uIndex + 1 })}
              </span>
            </div>

            <Arena q={q} revealed={revealed} ok={ok} fresh={fresh} step={step} />

            {!revealed && (
              <>
                <p className="m-0 text-center text-[0.84rem] sm:text-[0.95rem] text-secondary">
                  {questionFor(q)}
                </p>
                <GuessButtons onGuess={onGuess} />
              </>
            )}

            {revealed && isDaily && (
              <RevealBar q={q} ok={ok} fact={factFor(q)} onNext={onNext} nextLabel={dIndex === DAILY_SIZE - 1 || !ok ? t('outrank.seeScore') : t('outrank.next')} />
            )}
            {revealed && !isDaily && !run.over && (
              <RevealBar q={q} ok fact={factFor(q)} onNext={onNext} nextLabel={t('outrank.next')} autoMs={fresh === 'reveal' ? AUTO_NEXT_MS : 0} />
            )}
            {revealed && !isDaily && run.over && (
              <div className="or-reveal flex flex-col gap-3">
                <RevealBar q={q} ok={false} fact={factFor(q)} />
                <div className="rounded-2xl border border-border-strong bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 sm:flex-1">
                    <div>
                      <div className="text-[0.6rem] font-black tracking-[0.18em] uppercase text-accent-bright">{t('outrank.runOver')}</div>
                      <div className="score-number text-[2.6rem] leading-none tabular-nums text-primary">{streak}</div>
                      <div className="text-[0.7rem] text-muted">{t('outrank.inARow')}</div>
                    </div>
                    <div className="h-12 w-px bg-border-strong" />
                    <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-1 text-[0.72rem]">
                      <dt className="text-muted">{t('outrank.best')}</dt><dd className="m-0 font-bold tabular-nums text-primary">{best}{streak > 0 && streak >= best ? ` · ${t('outrank.newBest')}` : ''}</dd>
                      <dt className="text-muted">{t('outrank.runs')}</dt><dd className="m-0 font-bold tabular-nums text-primary">{ustats.played}</dd>
                    </dl>
                  </div>
                  <div className="flex flex-col gap-2 sm:w-56">
                    <button type="button" onClick={() => restart()} autoFocus
                      className="h-12 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.05em] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright">{t('outrank.playAgain')}</button>
                    {streak > 0 && <ShareButton text={unlimitedShare} />}
                  </div>
                </div>
                <p className="m-0 text-center text-[0.75rem] text-muted">
                  {dailyComplete(qs, daily) ? t('outrank.dailyDoneLine', { n: score }) : <button type="button" onClick={() => pickMode('daily')} className="font-bold text-brand-bright hover:text-brand">{t('outrank.tryDaily')} →</button>}
                </p>
              </div>
            )}
          </section>
        )}

        <p className="m-0 mt-auto pt-2 text-center text-[0.68rem] text-faint">
          {t('outrank.sourceLine', { source: SOURCE, year: DATA_YEAR })} · <a href="#methodology" className="underline decoration-border-strong hover:text-muted">{t('outrank.methodology')}</a>
        </p>
      </main>
    </div>
  )
}

function DailySummary({ qs, daily, results, score, won, stats, countdown, shareText, review, onReview, onUnlimited }) {
  const verdict = score === DAILY_SIZE ? t('outrank.perfect') : won ? t('outrank.won') : t('outrank.lost')
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0
  return (
    <section className="or-reveal flex flex-col gap-3 sm:gap-4" aria-label={t('outrank.summaryAria')}>
      <div className="rounded-2xl border border-border-strong bg-card p-4 sm:p-6 flex flex-col items-center text-center">
        <GeoMotif id={GAME} className={`w-10 h-10 ${won ? 'text-accent-bright' : 'text-dim'}`} />
        <div className="mt-1 text-[0.62rem] font-black tracking-[0.18em] uppercase text-accent-bright">{t('outrank.dailyN', { n: puzzleNumber() })}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="score-number text-[3.6rem] sm:text-[4.4rem] leading-none tabular-nums text-primary">{score}</span>
          <span className="text-[0.8rem] font-black tracking-[0.14em] uppercase text-muted">/ {DAILY_SIZE}</span>
        </div>
        <div className={`mt-1 text-[1.1rem] font-extrabold ${won ? 'text-success-bright' : 'text-danger-bright'}`}>{verdict}</div>
        <p className="m-0 mt-0.5 text-[0.75rem] text-muted">{won ? t('outrank.passLine', { pass: PASS_STREAK }) : t('outrank.shortBy', { n: PASS_STREAK - score, pass: PASS_STREAK })}</p>
        <div className="mt-3 flex gap-1" aria-label={t('outrank.gridAria', { n: score })}>
          {Array.from({ length: DAILY_SIZE }, (_, i) => {
            const ok = results[i]
            return <span key={i} className={`w-5 h-5 sm:w-6 sm:h-6 rounded ${ok === true ? 'bg-success' : ok === false ? 'bg-danger' : 'bg-inert'} ${i === PASS_STREAK - 1 ? 'ring-1 ring-primary/70 ring-offset-1 ring-offset-card' : ''}`} />
          })}
        </div>
        <div className="w-full max-w-sm mt-4 grid grid-cols-4 gap-2">
          {[[stats.played, t('played')], [winPct, t('winPct')], [stats.streak, t('outrank.dayStreak')], [stats.best ?? score, t('outrank.bestScore')]].map(([v, l]) => (
            <div key={l}><div className="score-number text-[1.5rem] leading-none tabular-nums text-primary">{v}</div><div className="text-[0.54rem] font-black tracking-[0.12em] uppercase text-muted mt-1 leading-tight">{l}</div></div>
          ))}
        </div>
        <div className="w-full max-w-sm">
          <ShareButton text={shareText} primary />
          <button type="button" onClick={onUnlimited} className={SECONDARY_BTN}>{t('outrank.playUnlimited')}</button>
        </div>
        <p className="m-0 mt-3 text-[0.75rem] text-muted">{t('outrank.nextIn')} <b className="text-primary tabular-nums">{countdown}</b></p>
      </div>

      <button type="button" onClick={onReview} aria-expanded={review}
        className="self-center h-9 px-4 rounded-full border border-border-strong text-[0.75rem] font-bold text-secondary hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
        {review ? t('outrank.hideAnswers') : t('outrank.showAnswers')}
      </button>
      {review && (
        <ol className="m-0 p-0 list-none grid gap-1.5 sm:grid-cols-2">
          {qs.slice(0, results.length).map((q, i) => {
            const ok = results[i]
            const [an, au] = formatParts(q.stat, valueOf(q.a, q.stat))
            const [bn, bu] = formatParts(q.stat, valueOf(q.b, q.stat))
            return (
              <li key={i} className="bl-cell flex items-center gap-2.5 rounded-xl border border-border bg-canvas/50 px-3 py-2.5" style={{ animationDelay: `${i * 40}ms` }}>
                <span className={`w-1.5 self-stretch rounded-full ${ok ? 'bg-success' : 'bg-danger'}`} />
                <span className="shrink-0 text-muted" title={STATS[q.stat].label}><StatIcon stat={q.stat} className="w-4 h-4" /></span>
                <span className="min-w-0 flex-1 text-[0.76rem] leading-snug">
                  <span className="flex items-center gap-1.5 text-primary font-bold min-w-0"><Flag code={q.a} className="w-4 h-3" /><span className="truncate">{nameOf(q.a)}</span><span className="ml-auto pl-2 tabular-nums text-secondary font-semibold whitespace-nowrap">{an} {au}</span></span>
                  <span className="flex items-center gap-1.5 text-primary font-bold min-w-0"><Flag code={q.b} className="w-4 h-3" /><span className="truncate">{nameOf(q.b)}</span><span className="ml-auto pl-2 tabular-nums text-secondary font-semibold whitespace-nowrap">{bn} {bu}</span></span>
                  <span className="block text-[0.66rem] text-muted">{STATS[q.stat].label} · {t('outrank.youSaid', { g: daily.answers[i] === 'higher' ? t('outrank.higher') : t('outrank.lower') })}</span>
                </span>
                <span className={`text-[0.95rem] font-black ${ok ? 'text-success-bright' : 'text-danger-bright'}`} aria-label={ok ? t('outrank.correct') : t('outrank.wrong')}>{ok ? '✓' : '✕'}</span>
              </li>
            )
          })}
        </ol>
      )}
      <Link to="/geography" className="self-center text-[0.78rem] font-bold text-brand-bright hover:text-brand">{t('borderline.allGames')} →</Link>
    </section>
  )
}

