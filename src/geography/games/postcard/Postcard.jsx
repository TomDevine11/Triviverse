import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  dailyPostcard, puzzleNumber, evaluateGuess, verdictKey, shareBar, bandOf, formatKm, formatCoord,
  SCORE_MAX, SEGMENTS, PASS_SCORE,
} from '../../data/postcard'
import { loadProgress, saveProgress, loadStats, recordScore } from '../../data/progress'
import { SITE_URL } from '../../seo'
import { GeoChrome, ResultModal, ShareButton } from '../../components/ui'
import { useCountdown, useCountUp } from '../../components/hooks'
import PinMap from '../../components/PinMap'
import GeoMotif from '../../components/GeoMotif'
import { geoAccentVars } from '../../games'
import { geoDay, geoDayNumber } from '../../data/day'
import { t } from '../../strings'
import '../../geography.css'

// Postcard — today's photograph, a world map, one pin. Daily only: one shared photo
// a day keeps the library fresh (an unlimited mode would spend tomorrow's answers).
//
// Flow: study the photo → drop/move the pin (tap anywhere, as often as you like) →
// lock in → the map glides out to frame both pins, the great-circle line draws, the
// answer pin lands, distance and points count up → the finish card.

const GAME = 'postcard'
const ROUTE = '/geography/postcard'
const LINE_MS = 1000 // camera glide, then the line draws
const RESULT_DELAY_MS = 3600 // reveal settles → finish card

const okPoint = (g) => Array.isArray(g) && g.length === 2 && g.every(Number.isFinite) && Math.abs(g[0]) <= 90 && Math.abs(g[1]) <= 180

// Saved state is only trusted if it is a submitted, well-formed pin for today's
// photo; the score is always recomputed, never read back.
function readSaved(card) {
  const s = loadProgress(GAME, card.id)
  if (!s?.done || !okPoint(s.guess)) return null
  return { guess: s.guess }
}

// The game's recognition mark: a postmark, cancelled with today's day number.
function Postmark({ className = '' }) {
  return (
    <svg viewBox="0 0 120 64" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M2 20c6-4 10 4 16 0s10 4 16 0 10 4 16 0" /><path d="M2 32c6-4 10 4 16 0s10 4 16 0 10 4 16 0" /><path d="M2 44c6-4 10 4 16 0s10 4 16 0 10 4 16 0" />
        <circle cx="90" cy="32" r="27" /><circle cx="90" cy="32" r="21" strokeWidth="1.2" />
      </g>
      <text x="90" y="27" textAnchor="middle" fill="currentColor" style={{ font: '900 7.5px Inter, sans-serif', letterSpacing: '0.18em' }}>DAY</text>
      <text x="90" y="44" textAnchor="middle" fill="currentColor" style={{ font: '400 19px "Bebas Neue", sans-serif' }}>{geoDayNumber()}</text>
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

function Photo({ card, revealed, compact, onExpand, onRestore }) {
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
        <Postmark className="pc-postmark w-[4.6rem] sm:w-[6rem] text-accent-bright" />
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
  const card = useMemo(() => dailyPostcard(), [])
  const [saved] = useState(() => readSaved(card))
  const [guess, setGuess] = useState(() => saved?.guess ?? null)
  const [submitted, setSubmitted] = useState(!!saved)
  const [fresh, setFresh] = useState(false) // revealed this visit → animate
  const [showResult, setShowResult] = useState(!!saved)
  const [compact, setCompact] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const countdown = useCountdown()
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const result = useMemo(() => (submitted && guess ? evaluateGuess(card, guess) : null), [submitted, guess, card])
  const stats = useMemo(() => loadStats(GAME, SEGMENTS), [submitted]) // eslint-disable-line react-hooks/exhaustive-deps
  const answer = submitted ? [card.lat, card.lon] : null
  const shownKm = useCountUp(result?.km ?? 0, fresh, 1200, LINE_MS + 600)
  const shownScore = useCountUp(result?.score ?? 0, fresh, 1300, LINE_MS + 700)

  const onSubmit = () => {
    if (!guess || submitted) return
    const r = evaluateGuess(card, guess)
    saveProgress(GAME, { guess: guess.map(n => +n.toFixed(5)) }, true, card.id)
    recordScore(GAME, r.score, bandOf(r.score), SEGMENTS, geoDay(), r.score >= PASS_SCORE)
    setFresh(true)
    setSubmitted(true)
    setCompact(true)
    timer.current = setTimeout(() => setShowResult(true), RESULT_DELAY_MS)
  }

  const verdict = result ? t(`postcard.verdict.${verdictKey(result.score)}`) : ''
  const won = !!result && result.score >= PASS_SCORE
  const pass = PASS_SCORE.toLocaleString('en-GB')
  const shareText = result ? [
    `📮 Postcard #${puzzleNumber()} · ${result.score.toLocaleString('en-GB')}/${SCORE_MAX.toLocaleString('en-GB')}${won ? ' ✅' : ''}`,
    `${shareBar(result.score)} ${formatKm(result.km)}`,
    `${SITE_URL}${ROUTE}`,
  ].join('\n') : ''
  const avg = stats.played ? Math.round((stats.total || 0) / stats.played) : 0
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

  return (
    <div className="tv-scene pc-scene h-dvh min-h-[34rem] flex flex-col text-primary overflow-hidden" style={geoAccentVars(GAME)}>
      <div className="w-full max-w-[90rem] mx-auto px-3 sm:px-5">
        <GeoChrome gameId={GAME} title="POSTCARD" howTo={{ pass, max: SCORE_MAX.toLocaleString('en-GB') }} right={<span className="tabular-nums">#{puzzleNumber()}</span>} />
      </div>

      <main className="flex-1 min-h-0 w-full max-w-[90rem] mx-auto px-3 sm:px-5 pb-3 sm:pb-4 flex flex-col lg:grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] gap-2.5 lg:gap-4">
        <h1 className="sr-only">Postcard — guess where the photo was taken</h1>
        <section className={`pc-photo-slot ${compact ? 'pc-compact' : ''}`} aria-label={t('postcard.kicker')}>
          <Photo card={card} revealed={submitted} compact={compact} onExpand={() => setLightbox(true)} onRestore={() => setCompact(false)} />
        </section>

        <section className="flex-1 min-h-0 flex flex-col gap-2.5">
          <div className={`pc-map-card relative flex-1 min-h-[12rem] rounded-2xl border overflow-hidden ${guess && !submitted ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--color-border-strong,#3a3654))]' : 'border-border-strong'}`}>
            <PinMap guess={guess} answer={answer} km={result?.km} locked={submitted} animateReveal={fresh}
              onPick={(g) => { setGuess(g); setCompact(true) }} onInteract={() => setCompact(true)} />
          </div>

          {/* the action bar */}
          {!submitted ? (
            <div className="flex items-stretch gap-2 h-14 shrink-0">
              <div className="flex-1 min-w-0 rounded-xl border border-border-strong bg-surface px-3 flex items-center gap-2.5">
                <PinIcon className={`w-5 h-5 shrink-0 transition-colors ${guess ? 'text-white' : 'text-faint'}`} />
                {guess ? (
                  <div key={guess.join()} className="min-w-0 flex-1 bl-reveal">
                    <div className="text-[0.55rem] font-black tracking-[0.16em] uppercase text-muted">{t('postcard.yourPin')}</div>
                    <div className="text-[0.8rem] font-bold tabular-nums text-primary truncate">{formatCoord(guess)}</div>
                  </div>
                ) : (
                  <span className="flex-1 text-[0.8rem] text-muted truncate">{coarse ? t('postcard.hint') : t('postcard.hintDesktop')}</span>
                )}
                {guess && (
                  <button type="button" onClick={() => setGuess(null)} aria-label={t('postcard.clear')} title={t('postcard.clear')}
                    className="shrink-0 w-8 h-8 rounded-lg text-muted hover:text-primary hover:bg-border/60 flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">✕</button>
                )}
              </div>
              <button type="button" onClick={onSubmit} disabled={!guess}
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
                <span className="ml-auto hidden sm:block text-[0.66rem] text-muted text-right leading-tight">{t('postcard.nextIn')}<br /><b className="text-primary tabular-nums">{countdown}</b></span>
              </div>
              <button type="button" onClick={() => setShowResult(true)}
                className="shrink-0 px-5 sm:px-7 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright">
                {t('postcard.seeResult')}
              </button>
            </div>
          )}
        </section>
      </main>

      {lightbox && <Lightbox card={card} revealed={submitted} onClose={() => setLightbox(false)} />}

      <ResultModal open={showResult && !!result} onClose={() => setShowResult(false)}>
        {result && (
          <div className="w-full flex flex-col items-center text-center">
            <GeoMotif id={GAME} className={`w-10 h-10 mb-1.5 ${won ? 'text-accent-bright' : 'text-dim'}`} />
            <h2 className={`score-number text-4xl m-0 ${won ? 'text-success-bright' : 'text-danger-bright'}`}>{verdict}</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="score-number text-[3.4rem] leading-none tabular-nums text-primary">{result.score.toLocaleString('en-GB')}</span>
              <span className="text-[0.7rem] font-black tracking-[0.14em] uppercase text-muted">/ {SCORE_MAX.toLocaleString('en-GB')} {t('postcard.points')}</span>
            </div>
            <ScoreBar score={result.score} className="w-48 mt-2" />
            <p className="m-0 mt-2 text-sm text-secondary"><b className="text-primary">{formatKm(result.km)}</b> {t('postcard.away')}</p>
            <p className={`m-0 mt-1 text-[0.75rem] font-bold ${won ? 'text-success-bright' : 'text-muted'}`}>{won ? t('postcard.passLine', { pass }) : t('postcard.shortBy', { n: (PASS_SCORE - result.score).toLocaleString('en-GB'), pass })}</p>

            {/* the answer */}
            <div className="w-full mt-4 flex gap-3 text-left rounded-xl border border-border-strong bg-canvas/60 p-2.5">
              <img src={card.img} alt="" className="w-[5.5rem] h-[5.5rem] rounded-lg object-cover shrink-0" style={{ backgroundColor: card.tone }} />
              <div className="min-w-0">
                <div className="text-[0.58rem] font-black tracking-[0.16em] uppercase text-muted">{t('postcard.itWas')}</div>
                <div className="text-[1.25rem] font-bold leading-tight text-primary">{card.name}</div>
                <div className="text-[0.78rem] text-secondary">{card.place}</div>
              </div>
            </div>
            {card.blurb && (
              <p className="m-0 mt-2.5 text-[0.78rem] leading-relaxed text-muted text-left">
                {card.blurb} <a href={card.wiki} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-bright hover:text-brand whitespace-nowrap">{t('postcard.readMore')} ↗</a>
              </p>
            )}

            <div className="w-full mt-4 grid grid-cols-4 gap-2 text-center">
              {[[stats.played, t('played')], [avg.toLocaleString('en-GB'), t('postcard.average')], [(stats.best || 0).toLocaleString('en-GB'), t('postcard.best')], [stats.streak, t('streak')]].map(([v, l]) => (
                <div key={l}><div className="score-number text-[1.55rem] leading-none tabular-nums text-primary">{v}</div><div className="text-[0.56rem] font-black tracking-[0.14em] uppercase text-muted mt-1">{l}</div></div>
              ))}
            </div>

            <div className="w-full mt-4 text-[0.72rem] text-muted">{t('postcard.nextIn')} <b className="text-primary tabular-nums">{countdown}</b></div>
            <ShareButton text={shareText} primary />
            <Link to="/geography" className="mt-3 text-[0.78rem] font-bold text-brand-bright hover:text-brand">{t('borderline.allGames')} →</Link>
            <Credit card={card} revealed className="mt-3 text-[0.62rem] text-faint leading-snug" />
          </div>
        )}
      </ResultModal>
    </div>
  )
}
