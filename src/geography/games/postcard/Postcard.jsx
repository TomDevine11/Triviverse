import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  dailyPostcard, puzzleNumber, evaluateGuess, verdictKey, shareBar, bandOf, formatKm, formatCoord,
  heldBack, unlimitedAt, postcardById, SCORE_MAX, SEGMENTS, PASS_SCORE,
} from '../../data/postcard'
import { loadProgress, saveProgress, loadStats, recordScore } from '../../data/progress'
import { SITE_URL } from '../../seo'
import { GeoChrome, ModeToggle, ResultModal, ShareButton, SECONDARY_BTN } from '../../components/ui'
import { useCountdown, useCountUp } from '../../components/hooks'
import PinMap from '../../components/PinMap'
import GeoMotif from '../../components/GeoMotif'
import { geoAccentVars } from '../../games'
import { geoDay, geoDayNumber } from '../../data/day'
import { t } from '../../strings'
import '../../geography.css'

// Postcard — today's photograph, a world map, one pin.
//
// Daily: one shared photo a day, PASS_SCORE to win. Unlimited: photo after photo
// with a running total and average; it holds back today's photo and the next month
// of dailies (data/postcard heldBack) so practice never spoils an upcoming day.
// The two modes keep completely separate saved state.
//
// Flow: study the photo → drop/move the pin (tap anywhere, as often as you like) →
// lock in → the map glides out to frame both pins, the great-circle line draws, the
// answer pin lands, distance and points count up → the finish card.

const GAME = 'postcard'
const ROUTE = '/geography/postcard'
const LINE_MS = 1000 // camera glide, then the line draws
const RESULT_DELAY_MS = 3600 // reveal settles → finish card
const MODE_KEY = 'tvg-postcard-mode'
const UNLIMITED_KEY = 'tvg-postcard-unlimited-v1'

const okPoint = (g) => Array.isArray(g) && g.length === 2 && g.every(Number.isFinite) && Math.abs(g[0]) <= 90 && Math.abs(g[1]) <= 180

const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* unavailable */ } }

// Unlimited: { seed, ex: photos held back at session start, answers: [{ id, g }], pos }.
function freshSession() {
  return { seed: Math.floor(Math.random() * 2 ** 31), ex: heldBack(), answers: [], pos: 0 }
}
function readSession() {
  const s = readJson(UNLIMITED_KEY)
  if (!s || !Number.isInteger(s.seed) || !Array.isArray(s.ex) || !Array.isArray(s.answers)) return freshSession()
  const answers = s.answers.filter(a => a && postcardById(a.id) && okPoint(a.g))
  const pos = Number.isInteger(s.pos) ? Math.max(0, Math.min(answers.length, s.pos)) : answers.length
  // a session from an earlier day re-reads the hold-back so it can't reach today's window
  return { seed: s.seed, ex: [...new Set([...s.ex.filter(id => typeof id === 'string'), ...heldBack()])], answers, pos }
}

// Saved state is only trusted if it is a submitted, well-formed pin for today's
// photo; the score is always recomputed, never read back.
function readSaved(card) {
  const s = loadProgress(GAME, card.id)
  if (!s?.done || !okPoint(s.guess)) return null
  return { guess: s.guess }
}

// The game's recognition mark: a postmark, cancelled with today's day number
// (or ∞ in Unlimited).
function Postmark({ className = '', unlimited }) {
  return (
    <svg viewBox="0 0 120 64" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M2 20c6-4 10 4 16 0s10 4 16 0 10 4 16 0" /><path d="M2 32c6-4 10 4 16 0s10 4 16 0 10 4 16 0" /><path d="M2 44c6-4 10 4 16 0s10 4 16 0 10 4 16 0" />
        <circle cx="90" cy="32" r="27" /><circle cx="90" cy="32" r="21" strokeWidth="1.2" />
      </g>
      <text x="90" y="27" textAnchor="middle" fill="currentColor" style={{ font: `900 ${unlimited ? 5.6 : 7.5}px Inter, sans-serif`, letterSpacing: unlimited ? '0.1em' : '0.18em' }}>{unlimited ? 'PRACTICE' : 'DAY'}</text>
      <text x="90" y="44" textAnchor="middle" fill="currentColor" style={{ font: '400 19px "Bebas Neue", sans-serif' }}>{unlimited ? '∞' : geoDayNumber()}</text>
    </svg>
  )
}

function ScoreBar({ score, className = '' }) {
  return (
    <span className={`flex gap-1 ${className}`} aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const fill = Math.max(0, Math.min(1, (score - i * 1000) / 1000))
        return (
          <i key={i} className="relative flex-1 h-1.5 rounded-full bg-inert overflow-hidden">
            <b className="pc-seg absolute inset-y-0 left-0 rounded-full" style={{ width: `${fill * 100}%`, animationDelay: `${i * 90}ms` }} />
          </i>
        )
      })}
    </span>
  )
}

function Lightbox({ card, onClose, revealed }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-modal bg-black/92 flex items-center justify-center p-3 sm:p-8 result-modal-in" role="dialog" aria-modal="true" aria-label={t('postcard.expand')} onClick={onClose}>
      <img src={card.img} alt={revealed ? t('postcard.photoAltDone', { name: card.name, place: card.place }) : t('postcard.photoAlt')} className="max-w-full max-h-full object-contain rounded-lg shadow-modal" />
      <button type="button" onClick={onClose} autoFocus aria-label={t('postcard.closePhoto')}
        className="absolute top-3 right-3 w-11 h-11 rounded-full bg-black/60 border border-white/15 text-white text-lg flex items-center justify-center hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">✕</button>
    </div>
  )
}

function Credit({ card, revealed, className = '' }) {
  const c = card.credit
  return (
    <span className={className}>
      {t('postcard.photoBy')}: {c.artist} · {c.licenceUrl ? <a href={c.licenceUrl} target="_blank" rel="noopener noreferrer license" className="underline decoration-white/30 hover:decoration-white">{c.licence}</a> : c.licence}
      {revealed && <> · <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 hover:decoration-white">{t('postcard.source')}</a></>}
    </span>
  )
}

function Photo({ card, revealed, compact, unlimited, onExpand, onRestore }) {
  const [state, setState] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const src = attempt ? `${card.img}?r=${attempt}` : card.img
  return (
    <figure className={`pc-photo group relative m-0 h-full w-full rounded-2xl overflow-hidden border border-border-strong ${compact ? 'pc-photo-compact' : ''}`} style={{ backgroundColor: card.tone }}>
      <div className={`pc-photo-blur ${state === 'ok' ? 'is-on' : ''}`} style={{ backgroundImage: `url(${src})` }} aria-hidden="true" />
      <img key={src} src={src} width={card.w} height={card.h} decoding="async" fetchPriority="high" draggable="false"
        alt={revealed ? t('postcard.photoAltDone', { name: card.name, place: card.place }) : t('postcard.photoAlt')}
        onLoad={() => setState('ok')} onError={() => setState('error')}
        className={`pc-photo-img ${state === 'ok' ? 'is-on' : ''}`} />
      {state === 'loading' && <span className="pc-shimmer" aria-hidden="true" />}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-secondary">
          {t('postcard.photoError')}
          <button type="button" onClick={() => { setState('loading'); setAttempt(a => a + 1) }} className="h-10 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white font-bold">{t('postcard.retry')}</button>
        </div>
      )}

      {/* compact (mobile, while placing the pin): the whole photo is a button back */}
      {compact && <button type="button" onClick={onRestore} className="absolute inset-0 z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-bright" aria-label={t('postcard.showPhoto')} />}

      <div className="pc-photo-top absolute inset-x-0 top-0 flex items-start justify-between p-3 sm:p-4 pointer-events-none">
        <span className="pc-kicker text-[0.58rem] sm:text-[0.62rem] font-black tracking-[0.2em] uppercase text-white/90">{t('postcard.kicker')}</span>
        <Postmark unlimited={unlimited} className="pc-postmark w-[4.6rem] sm:w-[6rem] text-accent-bright" />
      </div>

      <figcaption className="pc-photo-foot absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-3 sm:px-4 pb-2.5 sm:pb-3 pt-10">
        <div className="min-w-0">
          {revealed && (
            <div className="bl-reveal mb-1">
              <div className="text-[1.05rem] sm:text-[1.35rem] font-extrabold leading-tight text-white">{card.name}</div>
              <div className="text-[0.75rem] sm:text-[0.82rem] font-semibold text-white/75">{card.place}</div>
            </div>
          )}
          <Credit card={card} revealed={revealed} className="pc-credit block text-[0.6rem] sm:text-[0.66rem] text-white/60 truncate" />
        </div>
        <button type="button" onClick={onExpand} aria-label={t('postcard.expand')} title={t('postcard.expand')}
          className="pc-expand relative z-[2] shrink-0 w-9 h-9 rounded-full bg-black/45 backdrop-blur-sm border border-white/15 text-white/90 flex items-center justify-center hover:bg-black/65 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
        </button>
      </figcaption>
    </figure>
  )
}

const PinIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 6.1 12.2 6.4 12.5a.8.8 0 0 0 1.2 0C12.9 21.2 19 14.2 19 9a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z" /></svg>
)

export default function Postcard() {
  const daily = useMemo(() => dailyPostcard(), [])
  const [mode, setMode] = useState(() => (readJson(MODE_KEY) === 'unlimited' ? 'unlimited' : 'daily'))
  const [dailyGuess, setDailyGuess] = useState(() => readSaved(daily)?.guess ?? null)
  const [session, setSession] = useState(readSession)
  const [pending, setPending] = useState(null) // the pin before it's locked in
  const [fresh, setFresh] = useState(false) // revealed this visit → animate
  const [showResult, setShowResult] = useState(() => !!dailyGuess && readJson(MODE_KEY) !== 'unlimited')
  const [compact, setCompact] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const countdown = useCountdown()
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { writeJson(MODE_KEY, mode) }, [mode])
  useEffect(() => { writeJson(UNLIMITED_KEY, session) }, [session])

  // Everything below works on "the photo on screen", whichever mode it is.
  const isDaily = mode !== 'unlimited'
  const card = isDaily ? daily : unlimitedAt(session.seed, session.pos, session.ex)
  const submittedGuess = isDaily ? dailyGuess : session.answers[session.pos]?.g
  const submitted = !!submittedGuess
  const guess = submitted ? submittedGuess : pending
  const result = useMemo(() => (submitted ? evaluateGuess(card, submittedGuess) : null), [submitted, submittedGuess, card])
  const dailyResult = useMemo(() => (dailyGuess ? evaluateGuess(daily, dailyGuess) : null), [dailyGuess, daily])
  const stats = useMemo(() => loadStats(GAME, SEGMENTS), [dailyGuess]) // eslint-disable-line react-hooks/exhaustive-deps
  const sessionScores = session.answers.map(a => evaluateGuess(postcardById(a.id), a.g).score)
  const sessionTotal = sessionScores.reduce((a, b) => a + b, 0)
  const sessionAvg = sessionScores.length ? Math.round(sessionTotal / sessionScores.length) : 0
  const answer = submitted ? [card.lat, card.lon] : null
  const shownKm = useCountUp(result?.km ?? 0, fresh, 1200, LINE_MS + 600)
  const shownScore = useCountUp(result?.score ?? 0, fresh, 1300, LINE_MS + 700)

  // Warm the next practice photo while this one is being played.
  const nextCard = isDaily ? null : unlimitedAt(session.seed, session.pos + 1, session.ex)
  useEffect(() => { if (nextCard) { const i = new Image(); i.src = nextCard.img } }, [nextCard?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = () => {
    if (!pending || submitted) return
    const g = pending.map(n => +n.toFixed(5))
    setFresh(true)
    setPending(null)
    setCompact(true)
    if (isDaily) {
      const r = evaluateGuess(daily, g)
      saveProgress(GAME, { guess: g }, true, daily.id)
      recordScore(GAME, r.score, bandOf(r.score), SEGMENTS, geoDay(), r.score >= PASS_SCORE)
      setDailyGuess(g)
      timer.current = setTimeout(() => setShowResult(true), RESULT_DELAY_MS)
    } else {
      setSession(s => ({ ...s, answers: [...s.answers.slice(0, s.pos), { id: card.id, g }] }))
    }
  }

  const onNext = () => {
    setFresh(false); setPending(null); setCompact(false)
    setSession(s => ({ ...s, pos: s.pos + 1 }))
  }
  const pickMode = (m) => {
    clearTimeout(timer.current)
    setMode(m); setPending(null); setFresh(false); setCompact(false); setShowResult(false); setConfirmNew(false)
  }
  const newSession = () => {
    if (!confirmNew && session.answers.length) { setConfirmNew(true); return }
    setSession(freshSession()); setPending(null); setFresh(false); setCompact(false); setConfirmNew(false)
  }

  const verdict = dailyResult ? t(`postcard.verdict.${verdictKey(dailyResult.score)}`) : ''
  const won = !!dailyResult && dailyResult.score >= PASS_SCORE
  const pass = PASS_SCORE.toLocaleString('en-GB')
  const shareText = dailyResult ? [
    `📮 Postcard #${puzzleNumber()} · ${dailyResult.score.toLocaleString('en-GB')}/${SCORE_MAX.toLocaleString('en-GB')}${won ? ' ✅' : ''}`,
    `${shareBar(dailyResult.score)} ${formatKm(dailyResult.km)}`,
    `${SITE_URL}${ROUTE}`,
  ].join('\n') : ''
  const avg = stats.played ? Math.round((stats.total || 0) / stats.played) : 0
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

  return (
    <div className="tv-scene pc-scene h-dvh min-h-[34rem] flex flex-col text-primary overflow-hidden" style={geoAccentVars(GAME)}>
      <div className="w-full max-w-[90rem] mx-auto px-3 sm:px-5">
        <GeoChrome gameId={GAME} title="POSTCARD" howTo={{ pass, max: SCORE_MAX.toLocaleString('en-GB') }} right={<span className="tabular-nums">{isDaily ? `#${puzzleNumber()}` : '∞'}</span>} />
        <div className="-mt-0.5 mb-2.5 flex items-center justify-between gap-3">
          <ModeToggle mode={mode} onChange={pickMode} />
          {!isDaily && (
            <div className="flex items-center gap-2.5 text-[0.7rem] text-muted min-w-0">
              <span className="truncate"><b className="text-secondary tabular-nums">{session.answers.length}</b> {t('postcard.played')} · {t('milestone.avg')} <b className="text-secondary tabular-nums">{sessionAvg.toLocaleString('en-GB')}</b></span>
              <button type="button" onClick={newSession} onBlur={() => setConfirmNew(false)}
                className={`shrink-0 h-7 px-2.5 rounded-md text-[0.66rem] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright ${confirmNew ? 'bg-danger/15 border border-danger/50 text-danger-bright' : 'text-muted hover:text-primary border border-border'}`}>
                {confirmNew ? t('milestone.newConfirm') : t('milestone.newSession')}
              </button>
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 min-h-0 w-full max-w-[90rem] mx-auto px-3 sm:px-5 pb-3 sm:pb-4 flex flex-col lg:grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] gap-2.5 lg:gap-4">
        <h1 className="sr-only">Postcard — guess where the photo was taken</h1>
        <section className={`pc-photo-slot ${compact ? 'pc-compact' : ''}`} aria-label={t('postcard.kicker')}>
          <Photo key={`${mode}:${card.id}`} card={card} revealed={submitted} compact={compact} unlimited={!isDaily} onExpand={() => setLightbox(true)} onRestore={() => setCompact(false)} />
        </section>

        <section className="flex-1 min-h-0 flex flex-col gap-2.5">
          <div className={`pc-map-card relative flex-1 min-h-[12rem] rounded-2xl border overflow-hidden ${guess && !submitted ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--color-border-strong,#3a3654))]' : 'border-border-strong'}`}>
            <PinMap guess={guess} answer={answer} km={result?.km} locked={submitted} animateReveal={fresh} resetKey={`${mode}:${card.id}`}
              onPick={(g) => { if (!submitted) { setPending(g); setCompact(true) } }} onInteract={() => setCompact(true)} />
          </div>

          {/* the action bar */}
          {!submitted ? (
            <div className="flex items-stretch gap-2 h-14 shrink-0">
              <div className="flex-1 min-w-0 rounded-xl border border-border-strong bg-surface px-3 flex items-center gap-2.5">
                <PinIcon className={`w-5 h-5 shrink-0 transition-colors ${pending ? 'text-white' : 'text-faint'}`} />
                {pending ? (
                  <div key={pending.join()} className="min-w-0 flex-1 bl-reveal">
                    <div className="text-[0.55rem] font-black tracking-[0.16em] uppercase text-muted">{t('postcard.yourPin')}</div>
                    <div className="text-[0.8rem] font-bold tabular-nums text-primary truncate">{formatCoord(pending)}</div>
                  </div>
                ) : (
                  <span className="flex-1 text-[0.8rem] text-muted truncate">{coarse ? t('postcard.hint') : t('postcard.hintDesktop')}</span>
                )}
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
              <div className="flex-1 min-w-0 rounded-xl border border-border-strong bg-surface px-3 flex items-center gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 leading-none">
                    <b className="score-number font-normal text-[1.6rem] text-primary tabular-nums">{Math.round(shownScore).toLocaleString('en-GB')}</b>
                    <span className="text-[0.6rem] font-black tracking-[0.14em] uppercase text-muted">{t('postcard.pts')}</span>
                    <span className="text-faint">·</span>
                    <span className="text-[0.8rem] font-bold tabular-nums text-secondary">{formatKm(fresh ? shownKm : result.km)}</span>
                  </div>
                  <ScoreBar score={fresh ? shownScore : result.score} className="mt-1.5 w-[8.5rem]" />
                </div>
                {isDaily
                  ? <span className="ml-auto hidden sm:block text-[0.66rem] text-muted text-right leading-tight">{t('postcard.nextIn')}<br /><b className="text-primary tabular-nums">{countdown}</b></span>
                  : <span className="ml-auto hidden sm:block min-w-0 text-[0.72rem] text-muted text-right leading-tight truncate"><b className="text-primary">{card.name}</b><br />{card.place}</span>}
              </div>
              <button type="button" onClick={isDaily ? () => setShowResult(true) : onNext} autoFocus={!isDaily && fresh}
                className="shrink-0 px-5 sm:px-7 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright">
                {isDaily ? t('postcard.seeResult') : t('postcard.nextPhoto')}
              </button>
            </div>
          )}
        </section>
      </main>

      {lightbox && <Lightbox card={card} revealed={submitted} onClose={() => setLightbox(false)} />}

      <ResultModal open={showResult && isDaily && !!dailyResult} onClose={() => setShowResult(false)}>
        {dailyResult && (
          <div className="w-full flex flex-col items-center text-center">
            <GeoMotif id={GAME} className={`w-10 h-10 mb-1.5 ${won ? 'text-accent-bright' : 'text-dim'}`} />
            <h2 className={`score-number text-4xl m-0 ${won ? 'text-success-bright' : 'text-danger-bright'}`}>{verdict}</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="score-number text-[3.4rem] leading-none tabular-nums text-primary">{dailyResult.score.toLocaleString('en-GB')}</span>
              <span className="text-[0.7rem] font-black tracking-[0.14em] uppercase text-muted">/ {SCORE_MAX.toLocaleString('en-GB')} {t('postcard.points')}</span>
            </div>
            <ScoreBar score={dailyResult.score} className="w-48 mt-2" />
            <p className="m-0 mt-2 text-sm text-secondary"><b className="text-primary">{formatKm(dailyResult.km)}</b> {t('postcard.away')}</p>
            <p className={`m-0 mt-1 text-[0.75rem] font-bold ${won ? 'text-success-bright' : 'text-muted'}`}>{won ? t('postcard.passLine', { pass }) : t('postcard.shortBy', { n: (PASS_SCORE - dailyResult.score).toLocaleString('en-GB'), pass })}</p>

            {/* the answer */}
            <div className="w-full mt-4 flex gap-3 text-left rounded-xl border border-border-strong bg-canvas/60 p-2.5">
              <img src={daily.img} alt="" className="w-[5.5rem] h-[5.5rem] rounded-lg object-cover shrink-0" style={{ backgroundColor: daily.tone }} />
              <div className="min-w-0">
                <div className="text-[0.58rem] font-black tracking-[0.16em] uppercase text-muted">{t('postcard.itWas')}</div>
                <div className="text-[1.25rem] font-bold leading-tight text-primary">{daily.name}</div>
                <div className="text-[0.78rem] text-secondary">{daily.place}</div>
              </div>
            </div>
            {daily.blurb && (
              <p className="m-0 mt-2.5 text-[0.78rem] leading-relaxed text-muted text-left">
                {daily.blurb} <a href={daily.wiki} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-bright hover:text-brand whitespace-nowrap">{t('postcard.readMore')} ↗</a>
              </p>
            )}

            <div className="w-full mt-4 grid grid-cols-4 gap-2 text-center">
              {[[stats.played, t('played')], [avg.toLocaleString('en-GB'), t('postcard.average')], [(stats.best || 0).toLocaleString('en-GB'), t('postcard.best')], [stats.streak, t('streak')]].map(([v, l]) => (
                <div key={l}><div className="score-number text-[1.55rem] leading-none tabular-nums text-primary">{v}</div><div className="text-[0.56rem] font-black tracking-[0.14em] uppercase text-muted mt-1">{l}</div></div>
              ))}
            </div>

            <div className="w-full mt-4 text-[0.72rem] text-muted">{t('postcard.nextIn')} <b className="text-primary tabular-nums">{countdown}</b></div>
            <ShareButton text={shareText} primary />
            <button type="button" onClick={() => pickMode('unlimited')} className={SECONDARY_BTN}>{t('postcard.playUnlimited')}</button>
            <Link to="/geography" className="mt-3 text-[0.78rem] font-bold text-brand-bright hover:text-brand">{t('borderline.allGames')} →</Link>
            <Credit card={daily} revealed className="mt-3 text-[0.62rem] text-faint leading-snug" />
          </div>
        )}
      </ResultModal>
    </div>
  )
}
