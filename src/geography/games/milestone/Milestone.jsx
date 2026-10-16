import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  dailySet, dailySig, puzzleNumber, evaluate, questionById, unlimitedAt, square, tierOf, formatYear,
  QUESTION_MAX, DAILY_SIZE, DAILY_MAX, PASS_SCORE,
} from '../../data/milestone'
import { formatKm, formatCoord } from '../../data/postcard'
import { loadProgress, saveProgress, loadStats, recordScore } from '../../data/progress'
import { geoDay } from '../../data/day'
import { SITE_URL } from '../../seo'
import { GeoChrome, ModeToggle, ResultModal, ShareButton, SECONDARY_BTN } from '../../components/ui'
import { useCountdown, useCountUp } from '../../components/hooks'
import PinMap from '../../components/PinMap'
import GeoMotif from '../../components/GeoMotif'
import { geoAccentVars } from '../../games'
import { t } from '../../strings'
import '../../geography.css'

// Milestone — read a moment from history, drop a pin where it happened.
//
// Daily: five questions, same for everyone, easiest first; up to 1,000 points each,
// PASS_SCORE of 5,000 to win. Unlimited: questions keep coming, scored the same,
// with a running total and average; today's daily five are never served there.
// The two modes keep completely separate saved state.
//
// Per question: the map opens on the question's own authored region → drop / move
// the pin → lock in → the answer lands, the great circle draws, points count up and
// the explanation appears → Continue glides the map to the next question's region.

const GAME = 'milestone'
const ROUTE = '/geography/milestone'
const MODE_KEY = 'tvg-milestone-mode'
const UNLIMITED_KEY = 'tvg-milestone-unlimited-v1'
const MIN_W = 4 // allow zooming to ~40 km across
const REVEAL_MIN_W = 90

const okPoint = (g) => Array.isArray(g) && g.length === 2 && g.every(Number.isFinite) && Math.abs(g[0]) <= 90 && Math.abs(g[1]) <= 180
const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* unavailable */ } }

// Daily: { answers: [[lat, lon] …] in question order, pos: the question on screen }.
function readDaily(set) {
  const s = loadProgress(GAME, dailySig(set))
  if (!s || !Array.isArray(s.answers) || !s.answers.every(okPoint)) return { answers: [], pos: 0 }
  const answers = s.answers.slice(0, DAILY_SIZE)
  const pos = Number.isInteger(s.pos) ? Math.max(0, Math.min(answers.length, s.pos, DAILY_SIZE)) : answers.length
  return { answers, pos }
}

// Unlimited: { seed, ex: today's daily ids at session start, answers: [{ id, g }], pos }.
function freshSession() {
  return { seed: Math.floor(Math.random() * 2 ** 31), ex: dailySet().map(q => q.id), answers: [], pos: 0 }
}
function readSession() {
  const s = readJson(UNLIMITED_KEY)
  if (!s || !Number.isInteger(s.seed) || !Array.isArray(s.ex) || !Array.isArray(s.answers)) return freshSession()
  const answers = s.answers.filter(a => a && questionById(a.id) && okPoint(a.g))
  const pos = Number.isInteger(s.pos) ? Math.max(0, Math.min(answers.length, s.pos)) : answers.length
  return { seed: s.seed, ex: s.ex.filter(id => typeof id === 'string'), answers, pos }
}

const CAT_ICON = {
  science: 'M9 3h6M10 3v6L5 18a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3L14 9V3',
  invention: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  firsts: 'M5 21V4M5 4h11l-2 4 2 4H5',
  history: 'M4 21h16M6 18V10M10 18V10M14 18V10M18 18V10M3 10l9-6 9 6z',
  exploration: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm3.5 6.5-2 5-5 2 2-5z',
  engineering: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6',
  sport: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  culture: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  archaeology: 'M3 21h18M5 21l2-9h10l2 9M9 12V8a3 3 0 0 1 6 0v4',
  nature: 'M12 3 2 21h20zM9 14l3-3 3 3',
}
const CatIcon = ({ cat, className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={CAT_ICON[cat] || CAT_ICON.firsts} /></svg>
)

const TIER_CLASS = { great: 'bg-success', good: 'bg-[#facc15]', fair: 'bg-[#fb923c]', far: 'bg-danger' }
const TIER_TEXT = { great: 'text-success-bright', good: 'text-[#fde047]', fair: 'text-[#fdba74]', far: 'text-danger-bright' }

// Daily progress: five segments, coloured by score once answered.
function DailyTrack({ scores, pos }) {
  return (
    <ol className="m-0 p-0 list-none grid grid-cols-5 gap-1.5" aria-label={t('milestone.progressAria')}>
      {Array.from({ length: DAILY_SIZE }, (_, i) => {
        const s = scores[i]
        const current = i === pos && s == null
        return (
          <li key={i} className="min-w-0">
            <span className={`block h-1.5 rounded-full transition-colors duration-500 ${s != null ? TIER_CLASS[tierOf(s)] : current ? 'bg-accent' : 'bg-inert'}`} />
            <span className={`mt-1 block text-[0.6rem] font-black tracking-[0.08em] tabular-nums ${current ? 'text-accent-bright' : s != null ? 'text-secondary' : 'text-faint'}`}>
              {s != null ? s : `Q${i + 1}`}
            </span>
          </li>
        )
      })}
    </ol>
  )
}


export default function Milestone() {
  const set = useMemo(() => dailySet(), [])
  const [mode, setMode] = useState(() => { const m = readJson(MODE_KEY); return m === 'unlimited' ? m : 'daily' })
  const [daily, setDaily] = useState(() => readDaily(set))
  const [session, setSession] = useState(readSession)
  const [pending, setPending] = useState(null) // the pin before it's locked in
  const [fresh, setFresh] = useState(false) // a reveal that happened this visit → animate
  const [showResult, setShowResult] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const countdown = useCountdown()
  const panel = useRef(null)
  const stats = useMemo(() => loadStats(GAME, 5), [daily.answers.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { writeJson(MODE_KEY, mode) }, [mode])
  useEffect(() => { writeJson(UNLIMITED_KEY, session) }, [session])

  // Everything below works on "the round on screen", whichever mode it is.
  const isDaily = mode !== 'unlimited'
  const dailyScores = daily.answers.map((g, i) => evaluate(set[i], g).score)
  const dailyTotal = dailyScores.reduce((a, b) => a + b, 0)
  const dailyDone = daily.answers.length === DAILY_SIZE
  const sessionResults = session.answers.map(a => evaluate(questionById(a.id), a.g))
  const sessionTotal = sessionResults.reduce((a, r) => a + r.score, 0)
  const sessionAvg = session.answers.length ? Math.round(sessionTotal / session.answers.length) : 0

  const dailyFinished = isDaily && dailyDone && daily.pos >= DAILY_SIZE
  const qIndex = isDaily ? Math.min(daily.pos, DAILY_SIZE - 1) : session.pos
  const question = isDaily ? set[qIndex] : unlimitedAt(session.seed, session.pos, session.ex)
  const submittedGuess = isDaily ? daily.answers[qIndex] : session.answers[session.pos]?.g
  const submitted = !!submittedGuess
  const guess = submitted ? submittedGuess : pending
  const result = submitted ? evaluate(question, submittedGuess) : null
  const runningTotal = isDaily ? dailyTotal : sessionTotal
  const shownPoints = useCountUp(result?.score ?? 0, fresh, 1100, 1700)
  const shownTotal = useCountUp(runningTotal, fresh, 1100, 1700)
  const passed = dailyTotal >= PASS_SCORE

  // A finished daily opens straight onto its results.
  const [autoOpened, setAutoOpened] = useState(false)
  if (dailyFinished && !autoOpened && !fresh) { setAutoOpened(true); setShowResult(true) }

  const onSubmit = () => {
    if (!pending || submitted) return
    const g = pending.map(n => +n.toFixed(4))
    setFresh(true)
    setPending(null)
    if (isDaily) {
      const answers = [...daily.answers, g]
      const next = { answers, pos: daily.pos }
      setDaily(next)
      saveProgress(GAME, next, answers.length === DAILY_SIZE, dailySig(set))
      if (answers.length === DAILY_SIZE) {
        const total = answers.reduce((s, a, i) => s + evaluate(set[i], a).score, 0)
        recordScore(GAME, total, Math.min(4, Math.floor(total / 1000)), 5, geoDay(), total >= PASS_SCORE)
      }
    } else {
      setSession(s => ({ ...s, answers: [...s.answers, { id: question.id, g }] }))
    }
    panel.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const onContinue = () => {
    setFresh(false)
    setPending(null)
    if (isDaily) {
      const next = { ...daily, pos: daily.pos + 1 }
      setDaily(next)
      saveProgress(GAME, next, dailyDone, dailySig(set))
      if (next.pos >= DAILY_SIZE) { setAutoOpened(true); setShowResult(true) }
    } else {
      setSession(s => ({ ...s, pos: s.pos + 1 }))
    }
    panel.current?.scrollTo?.({ top: 0 })
  }

  const pickMode = (m) => { setMode(m); setPending(null); setFresh(false); setShowResult(false); setConfirmNew(false) }
  const newSession = () => {
    if (!confirmNew && session.answers.length) { setConfirmNew(true); return }
    setSession(freshSession()); setPending(null); setFresh(false); setConfirmNew(false)
  }

  const shareText = [
    `📍 Milestone #${puzzleNumber()} · ${dailyTotal.toLocaleString('en-GB')}/${DAILY_MAX.toLocaleString('en-GB')}${passed ? ' ✅' : ''}`,
    dailyScores.map(square).join(''),
    `${SITE_URL}${ROUTE}`,
  ].join('\n')
  const lastInDaily = isDaily && qIndex === DAILY_SIZE - 1
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

  return (
    <div className="tv-scene h-dvh min-h-[34rem] flex flex-col text-primary overflow-hidden" style={geoAccentVars(GAME)}>
      <div className="w-full max-w-[90rem] mx-auto px-3 sm:px-5">
        <GeoChrome gameId={GAME} title="MILESTONE" howTo={{ pass: PASS_SCORE.toLocaleString('en-GB'), max: DAILY_MAX.toLocaleString('en-GB'), each: QUESTION_MAX.toLocaleString('en-GB') }} right={<span className="tabular-nums">{isDaily ? `#${puzzleNumber()}` : '∞'}</span>} />
      </div>

      <main className="flex-1 min-h-0 w-full max-w-[90rem] mx-auto px-3 sm:px-5 pb-3 sm:pb-4 flex flex-col lg:grid lg:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1.28fr)] gap-2.5 lg:gap-4">
        <h1 className="sr-only">Milestone — where in the world did it happen?</h1>

        {/* ── the clue panel ── */}
        <section ref={panel} className="ms-panel shrink-0 max-h-[46%] lg:max-h-none lg:shrink lg:min-h-0 flex flex-col rounded-2xl border border-border-strong bg-card overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-[1] bg-card/95 backdrop-blur-sm px-3.5 sm:px-5 pt-3 pb-2.5 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <ModeToggle mode={isDaily ? 'daily' : 'unlimited'} onChange={pickMode} />
              <div className="text-right leading-none" aria-live="polite">
                <span className="score-number text-[1.5rem] tabular-nums text-primary">{Math.round(fresh ? shownTotal : runningTotal).toLocaleString('en-GB')}</span>
                <span className="text-[0.6rem] font-black tracking-[0.12em] uppercase text-muted"> {isDaily ? `/ ${DAILY_MAX.toLocaleString('en-GB')}` : t('postcard.pts')}</span>
              </div>
            </div>
            <div className="mt-2.5">
              {isDaily ? (
                <DailyTrack scores={dailyScores} pos={daily.pos} />
              ) : (
                <div className="flex items-center justify-between gap-2 text-[0.7rem] text-muted">
                  <span><b className="text-secondary tabular-nums">{session.answers.length}</b> {t('milestone.answered')} · {t('milestone.avg')} <b className="text-secondary tabular-nums">{sessionAvg}</b></span>
                  <button type="button" onClick={newSession} onBlur={() => setConfirmNew(false)}
                    className={`h-7 px-2.5 rounded-md text-[0.66rem] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright ${confirmNew ? 'bg-danger/15 border border-danger/50 text-danger-bright' : 'text-muted hover:text-primary border border-border'}`}>
                    {confirmNew ? t('milestone.newConfirm') : t('milestone.newSession')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {dailyFinished ? (
            <div className="px-3.5 sm:px-5 py-4 bl-reveal">
              <div className="text-[0.6rem] font-black tracking-[0.18em] uppercase text-accent-bright">{t('milestone.dailyDone')}</div>
              <div className={`mt-1 score-number text-[2.2rem] leading-none ${passed ? 'text-success-bright' : 'text-primary'}`}>{passed ? t('milestone.passed') : t('milestone.notPassed')}</div>
              <p className="m-0 mt-2 text-[0.82rem] text-muted">{t('milestone.nextIn')} <b className="text-primary tabular-nums">{countdown}</b></p>
              <div className="mt-3 flex flex-col gap-2">
                <button type="button" onClick={() => setShowResult(true)} className="h-11 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors">{t('milestone.seeResults')}</button>
                <button type="button" onClick={() => pickMode('unlimited')} className={SECONDARY_BTN.replace('mt-2 ', '')}>{t('milestone.playUnlimited')}</button>
              </div>
            </div>
          ) : (
            <div key={question.id} className="ms-q flex-1 px-3.5 sm:px-5 py-3.5 sm:py-5 flex flex-col">
              <div className="flex items-center gap-2 text-[0.62rem] font-black tracking-[0.14em] uppercase">
                <span className="text-accent-bright">{isDaily ? t('milestone.qOf', { n: qIndex + 1, total: DAILY_SIZE }) : t('milestone.qN', { n: session.pos + 1 })}</span>
                <span className="text-faint">·</span>
                <span className="inline-flex items-center gap-1 text-muted"><CatIcon cat={question.cat} className="w-3.5 h-3.5" />{t(`milestone.cat.${question.cat}`)}</span>
                <span className="ml-auto px-1.5 py-0.5 rounded border border-border-strong text-secondary tabular-nums tracking-[0.06em]">{formatYear(question.year)}</span>
              </div>
              <p className="ms-clue m-0 mt-2.5 text-[1.02rem] sm:text-[1.2rem] lg:text-[1.32rem] font-semibold leading-snug text-primary">{question.q}</p>

              {submitted && (
                <div className={`ms-answer ${fresh ? 'ms-answer-late' : ''} mt-3.5 sm:mt-5 rounded-xl border border-border-strong bg-canvas/60 p-3 sm:p-3.5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[0.58rem] font-black tracking-[0.16em] uppercase text-muted">{t('postcard.itWas')}</div>
                      <div className="text-[1.08rem] sm:text-[1.2rem] font-bold leading-tight text-primary">{question.a}</div>
                      <div className="text-[0.76rem] text-secondary">{question.place}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`score-number text-[1.9rem] leading-none tabular-nums ${TIER_TEXT[tierOf(result.score)]}`}>+{Math.round(fresh ? shownPoints : result.score)}</div>
                      <div className="text-[0.66rem] font-bold text-muted tabular-nums">{formatKm(result.km)} {t('postcard.away')}</div>
                    </div>
                  </div>
                  <p className="m-0 mt-2.5 text-[0.8rem] leading-relaxed text-secondary">{question.why}</p>
                  <p className="m-0 mt-2 text-[0.68rem] text-faint">
                    {t('milestone.sources')}: {question.src.map((u, i) => (
                      <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong hover:text-secondary">{decodeURIComponent(u.split('/wiki/')[1]).replace(/_/g, ' ')}{i < question.src.length - 1 ? ', ' : ''}</a>
                    ))}
                  </p>
                </div>
              )}
              {!submitted && (
                <p className="hidden lg:flex mt-auto pt-6 m-0 items-center gap-2 text-[0.72rem] text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {t('milestone.precision', { r: question.r, max: QUESTION_MAX.toLocaleString('en-GB') })}
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── the map + action bar ── */}
        <section className="flex-1 min-h-0 flex flex-col gap-2.5">
          <div className={`pc-map-card relative flex-1 min-h-[13rem] rounded-2xl border overflow-hidden ${pending ? 'border-[color-mix(in_srgb,var(--accent)_45%,#3a3654)]' : 'border-border-strong'}`}>
            <PinMap guess={guess} answer={submitted ? [question.lat, question.lon] : null} km={result?.km} locked={submitted}
              animateReveal={fresh} home={question.view} resetKey={`${mode}:${question.id}`} minW={MIN_W} revealMinW={REVEAL_MIN_W}
              answerLabel={submitted ? question.a.split(/[,(]/)[0].trim() : null}
              onPick={(g) => !submitted && setPending(g)} />
          </div>

          {dailyFinished ? null : !submitted ? (
            <div className="flex items-stretch gap-2 h-14 shrink-0">
              <div className="flex-1 min-w-0 rounded-xl border border-border-strong bg-surface px-3 flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" className={`w-5 h-5 shrink-0 transition-colors ${pending ? 'text-white' : 'text-faint'}`} fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 6.1 12.2 6.4 12.5a.8.8 0 0 0 1.2 0C12.9 21.2 19 14.2 19 9a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z" /></svg>
                {pending ? (
                  <div key={pending.join()} className="min-w-0 flex-1 bl-reveal">
                    <div className="text-[0.55rem] font-black tracking-[0.16em] uppercase text-muted">{t('postcard.yourPin')}</div>
                    <div className="text-[0.8rem] font-bold tabular-nums text-primary truncate">{formatCoord(pending)}</div>
                  </div>
                ) : <span className="flex-1 text-[0.8rem] text-muted truncate">{coarse ? t('postcard.hint') : t('postcard.hintDesktop')}</span>}
                {pending && (
                  <button type="button" onClick={() => setPending(null)} aria-label={t('postcard.clear')} title={t('postcard.clear')}
                    className="shrink-0 w-8 h-8 rounded-lg text-muted hover:text-primary hover:bg-border/60 flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">✕</button>
                )}
              </div>
              <button type="button" onClick={onSubmit} disabled={!pending}
                className="shrink-0 px-5 sm:px-7 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors disabled:bg-surface disabled:text-faint disabled:border disabled:border-border disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright">
                {t('postcard.send')}
              </button>
            </div>
          ) : (
            <div className="flex items-stretch gap-2 h-14 shrink-0 bl-reveal">
              <div className="flex-1 min-w-0 rounded-xl border border-border-strong bg-surface px-3 flex items-center gap-3 text-[0.78rem] text-muted">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${TIER_CLASS[tierOf(result.score)]}`} />
                <span className="truncate"><b className="text-primary tabular-nums">{Math.round(fresh ? shownPoints : result.score)}</b> / {QUESTION_MAX} · {formatKm(result.km)}</span>
              </div>
              <button type="button" onClick={onContinue} autoFocus={fresh}
                className="shrink-0 px-5 sm:px-7 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright">
                {lastInDaily ? t('milestone.finish') : t('milestone.next')}
              </button>
            </div>
          )}
        </section>
      </main>


      <ResultModal open={showResult && isDaily && dailyDone} onClose={() => setShowResult(false)}>
        <div className="w-full flex flex-col items-center text-center">
          <GeoMotif id={GAME} className={`w-10 h-10 mb-1.5 ${passed ? 'text-accent-bright' : 'text-dim'}`} />
          <h2 className={`score-number text-4xl m-0 ${passed ? 'text-success-bright' : 'text-primary'}`}>{passed ? t('milestone.passed') : t('milestone.notPassed')}</h2>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="score-number text-[3.4rem] leading-none tabular-nums text-primary">{dailyTotal.toLocaleString('en-GB')}</span>
            <span className="text-[0.7rem] font-black tracking-[0.14em] uppercase text-muted">/ {DAILY_MAX.toLocaleString('en-GB')}</span>
          </div>
          {/* total against the pass mark */}
          <div className="relative w-full max-w-[18rem] mt-2.5 h-2 rounded-full bg-inert">
            <span className={`absolute inset-y-0 left-0 rounded-full bl-bar ${passed ? 'bg-success' : 'bg-accent'}`} style={{ width: `${(dailyTotal / DAILY_MAX) * 100}%` }} />
            <span className="absolute -top-1 -bottom-1 w-0.5 bg-primary/80 rounded" style={{ left: `${(PASS_SCORE / DAILY_MAX) * 100}%` }} aria-hidden="true" />
          </div>
          <p className="m-0 mt-2 text-[0.75rem] text-muted">
            {passed ? t('milestone.passLine', { pass: PASS_SCORE.toLocaleString('en-GB') }) : t('milestone.shortBy', { n: (PASS_SCORE - dailyTotal).toLocaleString('en-GB'), pass: PASS_SCORE.toLocaleString('en-GB') })}
          </p>

          <ol className="w-full mt-4 m-0 p-0 list-none flex flex-col gap-1.5 text-left">
            {set.map((q, i) => {
              const r = daily.answers[i] ? evaluate(q, daily.answers[i]) : null
              return (
                <li key={q.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-canvas/50 px-2.5 py-2">
                  <span className={`w-2 self-stretch rounded-full ${r ? TIER_CLASS[tierOf(r.score)] : 'bg-inert'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.82rem] font-bold text-primary truncate">{q.a}</span>
                    <span className="block text-[0.66rem] text-muted truncate">{q.place}{r ? ` · ${formatKm(r.km)}` : ''}</span>
                  </span>
                  <span className={`score-number text-[1.3rem] tabular-nums ${r ? TIER_TEXT[tierOf(r.score)] : 'text-faint'}`}>{r ? r.score : '—'}</span>
                </li>
              )
            })}
          </ol>

          <div className="w-full mt-4 grid grid-cols-4 gap-2 text-center">
            {[[stats.played, t('played')], [stats.played ? Math.round((stats.wins / stats.played) * 100) : 0, t('winPct')], [stats.streak, t('streak')], [(stats.best || 0).toLocaleString('en-GB'), t('postcard.best')]].map(([v, l]) => (
              <div key={l}><div className="score-number text-[1.55rem] leading-none tabular-nums text-primary">{v}</div><div className="text-[0.56rem] font-black tracking-[0.14em] uppercase text-muted mt-1">{l}</div></div>
            ))}
          </div>
          <div className="w-full mt-4 text-[0.72rem] text-muted">{t('milestone.nextIn')} <b className="text-primary tabular-nums">{countdown}</b></div>
          <ShareButton text={shareText} primary />
          <button type="button" onClick={() => pickMode('unlimited')} className={SECONDARY_BTN}>{t('milestone.playUnlimited')}</button>
          <Link to="/geography" className="mt-3 text-[0.78rem] font-bold text-brand-bright hover:text-brand">{t('borderline.allGames')} →</Link>
        </div>
      </ResultModal>
    </div>
  )
}
