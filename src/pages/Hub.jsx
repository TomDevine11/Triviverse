import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../seo/Seo'
import BrandMark from '../components/BrandMark'
import GameMotif from '../components/GameMotif'
import LanguageSwitcher from '../components/LanguageSwitcher'
import AdSlot from '../ads/AdSlot'
import { routeByPath } from '../seo/seoConfig'
import { useI18n } from '../i18n'
import { playedToday, getStats, recordVisit, formGuide, weeklyPoints, dailyPoints, matchdayNumber, todayIndex } from '../data/dailyStats'
import { inProgressToday } from '../data/dailyProgress'
import { buildDayShareUrl } from '../utils/shareUrl'

// The lineup. `stats` keys dailyStats (what each game passes to recordResult).
const GAMES = [
  { to: '/tenable', stats: 'tenable', color: '#eab308' },
  { to: '/wordle', stats: 'wordle', color: '#3b82f6' },
  { to: '/tictactoe', stats: 'tictactoe', color: '#6366f1' },
  { to: '/teammates', stats: 'teammates', color: '#ec4899' },
  { to: '/career-path', stats: 'careers', color: '#06b6d4' },
  { to: '/connections', stats: 'connections', color: '#a3e635' },
  { to: '/higher-or-lower', stats: 'higherlower', color: '#f97316' },
  { to: '/501', stats: '501', color: '#ef4444' },
  { to: '/football-pointless', stats: 'pointless', color: '#0ea5e9' },
]

const FORM_DOT = { W: 'bg-success', L: 'bg-danger/75', '-': 'bg-inert' }
const FormGuide = ({ form, className = '' }) => (
  <span className={`inline-flex gap-[3px] ${className}`} aria-hidden="true">
    {form.split('').map((ch, i) => (
      <i key={i} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-[2px] ${FORM_DOT[ch]}`} />
    ))}
  </span>
)

const StatChip = ({ value, label, accent = false }) => (
  <span className="bg-surface border border-border rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 text-[0.5rem] sm:text-[0.62rem] font-bold tracking-[0.1em] text-muted whitespace-nowrap">
    <b className={`${accent ? 'text-brand-bright' : 'text-primary'} text-[0.72rem] sm:text-[0.85rem] mr-1 tabular-nums`}>{value}</b>
    {label}
  </span>
)

// hh:mm until local midnight, when the dailies refresh.
function untilMidnight() {
  const now = new Date()
  const mins = 24 * 60 - (now.getHours() * 60 + now.getMinutes())
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

export default function Hub() {
  const { locale, t, lp } = useI18n()
  const home = routeByPath('/', locale)
  const [visit] = useState(recordVisit)
  const [countdown, setCountdown] = useState(untilMidnight)
  const [copied, setCopied] = useState(false)
  const matchday = matchdayNumber()

  // Keep the next-dailies countdown live (minute precision).
  useEffect(() => {
    const id = setInterval(() => setCountdown(untilMidnight()), 30_000)
    return () => clearInterval(id)
  }, [])

  const lineup = GAMES.map(g => ({
    ...g,
    id: g.to.slice(1),
    played: playedToday(g.stats),
    inPlay: inProgressToday(g.stats),
    won: getStats(g.stats).lastWin === todayIndex(),
    streak: getStats(g.stats).currentStreak,
    form: formGuide(g.stats),
  }))
  const playedCount = lineup.filter(g => g.played).length
  const wonCount = lineup.filter(g => g.won).length
  const points = weeklyPoints()
  const daily = dailyPoints()

  // Share my day as a link that unfurls into the "matchday" recap image and
  // opens the hub — same pipeline as the game cards. Desktop copies the link.
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const shareDay = async () => {
    const url = buildDayShareUrl({ matchday, dailyPoints: daily, weeklyPoints: points, dayStreak: visit.streak, won: wonCount })
    if (canNativeShare) { try { await navigator.share({ url }) } catch { /* cancelled */ } return }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="tv-scene text-primary">
      <Seo path="/" />

      {/* ── The matchday dashboard: every feature in one viewport, no scroll ── */}
      <div className="h-dvh max-w-5xl mx-auto flex flex-col gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4">

        {/* top bar: brand (the page's h1 — site name + sr-only keywords) · stats · language */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="flex items-center gap-2 text-[0.66rem] sm:text-[0.85rem] font-black tracking-[0.13em] m-0">
            <BrandMark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-bright" />
            <span className="text-primary">TRIVIVERSE</span>
            <span className="text-brand-bright">FOOTBALL</span>
            <span className="sr-only">— {t('home.subtitle')}</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex gap-2">
              <StatChip value={visit.streak} label={t('hub.dayStreak')} />
              <StatChip value={`${playedCount}/9`} label={t('hub.played')} />
              <StatChip value={daily} label={t('hub.ptsToday')} accent />
              <StatChip value={points} label={t('hub.ptsWeek')} />
              <StatChip value={countdown} label={t('hub.nextDailies')} accent />
            </div>
            <span className="md:hidden text-[0.6rem] font-bold tracking-[0.1em] text-brand-bright">
              {t('hub.next')} {countdown}
            </span>
            <LanguageSwitcher />
          </div>
        </div>

        {/* matchday hero */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.55rem] sm:text-[0.62rem] font-extrabold tracking-[0.22em] text-brand-bright m-0">
              {t('hub.kick')}
            </p>
            <div className="score-number text-[2rem] sm:text-[2.6rem] leading-none mt-0.5 tv-wordmark">
              {t('hub.matchday')} {matchday}
            </div>
            <div className="md:hidden flex gap-1.5 mt-2">
              <StatChip value={visit.streak} label={t('hub.streak')} />
              <StatChip value={daily} label={t('hub.ptsToday')} accent />
              <StatChip value={points} label={t('hub.pts')} />
            </div>
          </div>
          <span className="hidden sm:block text-[0.62rem] tracking-[0.1em] text-faint pb-1">
            {t('hub.lineupNote')}
          </span>
        </div>

        {/* the pitch — your lineup */}
        <div className="relative flex-1 min-h-0 border border-border-strong rounded-xl sm:rounded-2xl p-2 sm:p-4 overflow-hidden tv-board">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-border-strong" aria-hidden="true" />
          <div className="absolute left-1/2 top-1/2 w-32 h-32 border border-border-strong rounded-full -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
          <div className="relative grid grid-cols-3 grid-rows-3 gap-1.5 sm:gap-4 h-full">
            {lineup.map(g => (
              <Link
                key={g.to}
                to={lp(g.to)}
                style={{ '--g': g.color }}
                aria-label={g.played ? `${t(`games.${g.id}.title`)} — ${t('home.playedToday')}` : t(`games.${g.id}.title`)}
                className="relative flex flex-col items-center justify-center gap-0.5 sm:gap-1.5 bg-card border border-border-strong rounded-lg sm:rounded-xl p-1 sm:p-2 transition-[transform,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--g)_55%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright active:scale-[0.985]"
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-1 right-1 sm:top-2 sm:right-2 text-[0.45rem] sm:text-[0.56rem] font-black tracking-[0.1em] rounded px-1 py-px sm:px-1.5 sm:py-0.5 border ${
                    g.played ? 'text-success border-success/40' : g.inPlay ? 'text-warn border-warn/40' : 'text-brand-bright border-brand/55'
                  }`}
                >
                  {g.played
                    ? 'FT'
                    : g.inPlay
                      ? <><span className="sm:hidden">▶</span><span className="hidden sm:inline">{t('common.inPlay').toUpperCase()}</span></>
                      : <><span className="sm:hidden">KO</span><span className="hidden sm:inline">{t('hub.kickOff')}</span></>}
                </span>
                <GameMotif id={g.id} className="w-5 h-5 sm:w-9 sm:h-9 text-[color:var(--g)]" />
                <span className="font-extrabold uppercase tracking-[0.03em] text-[0.55rem] sm:text-[0.85rem] text-center leading-tight">
                  {t(`games.${g.id}.title`).replace(/^Football /, '').replace(/ de Fútbol$/, '')}
                </span>
                <span className="flex items-center gap-1 sm:gap-1.5">
                  {g.streak > 0 ? (
                    <b className="text-[0.6rem] sm:text-[0.75rem] font-black text-warn">
                      🔥{g.streak}<em className="not-italic hidden sm:inline text-[0.55rem] tracking-[0.12em] text-muted font-extrabold ml-1">{t('hub.streak')}</em>
                    </b>
                  ) : (
                    <b className="text-[0.6rem] font-black text-dim">—</b>
                  )}
                  <FormGuide form={g.form} />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* footer: perfect-day tracker + share */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1" aria-hidden="true">
              {lineup.map(g => (
                <i
                  key={g.to}
                  style={g.played ? { background: g.color, boxShadow: `0 0 8px color-mix(in srgb, ${g.color} 60%, transparent)` } : undefined}
                  className="w-4 sm:w-6 h-1.5 sm:h-2 rounded-[3px] bg-border -skew-x-[14deg]"
                />
              ))}
              <span className={`ml-1 text-base sm:text-xl leading-none ${playedCount === 9 ? 'text-warn' : 'text-inert'}`}>★</span>
            </div>
            <p className="m-0 mt-1 text-[0.5rem] sm:text-[0.66rem] tracking-[0.1em] text-muted">
              <b className="text-warn">{t('hub.perfectDay')}</b> — {t('hub.perfectDayHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={shareDay}
            className="bg-brand hover:bg-brand-hover text-white font-bold text-[0.68rem] sm:text-[0.8rem] tracking-[0.06em] rounded-lg px-3.5 py-2 sm:px-4 sm:py-2.5 whitespace-nowrap transition-colors"
          >
            {copied ? t('hub.copied') : t('hub.shareDay')}
          </button>
        </div>
      </div>

      {/* ── Below the fold: SEO content, unchanged in substance ── */}
      <div className="max-w-2xl mx-auto px-4 pt-14 pb-16">
        <section className="text-left">
          <h2 className="text-primary font-semibold text-lg mb-3">{t('home.aboutHeading')}</h2>
          <p className="text-muted text-sm leading-relaxed mb-8">{home.about}</p>

          <h2 className="text-primary font-semibold text-lg mb-3">{t('home.faqHeading')}</h2>
          <dl className="space-y-4">
            {home.faq.map((f, i) => (
              <div key={i}>
                <dt className="text-secondary text-sm font-medium">{f.q}</dt>
                <dd className="text-muted text-sm mt-1 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
        <AdSlot name="hub-footer" />
      </div>
    </div>
  )
}
