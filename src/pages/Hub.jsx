import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../seo/Seo'
import BrandMark from '../components/BrandMark'
import GameMotif from '../components/GameMotif'
import LanguageSwitcher from '../components/LanguageSwitcher'
import AdSlot from '../ads/AdSlot'
import { routeByPath } from '../seo/seoConfig'
import { useI18n } from '../i18n'
import { playedToday, getStats, recordVisit, dailyPoints, matchdayNumber, todayIndex } from '../data/dailyStats'
import { inProgressToday } from '../data/dailyProgress'
import SiteFooter from '../components/SiteFooter'
import DayShareSheet from '../components/social/DayShareSheet'
import { UserIcon, TableIcon, FlameIcon, FreezeIcon, VsIcon, GlobeIcon } from '../components/social/bits'
import { useSocialTick, ordinal, fmt } from '../components/social/hooks'
import { getStreak } from '../social/streak'
import { useToday, useMyLeagues, useWorldRank, chaseLeague, chaseLine } from '../social/leagues'
import { rivalsOn } from '../social/challenge'
import { resultFor, playedDays } from '../social/log'
import { scoreLabel } from '../social/scoring'
import { BADGES, loadBadges, nextBadge } from '../social/badges'
import { msUntilNextMatchday } from '../utils/matchday.js'

// "The Title Race" hub (2026-10): the eleven dailies on the left, the
// competition — your league chase, world rank, dressing room — in a rail on
// the right (stacked above/below the board on phones).

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
  { to: '/football-bingo', stats: 'bingo', color: '#14b8a6' },
  { to: '/football-contexto', stats: 'contexto', color: '#d946ef' },
]

const shortName = (t, id) => t(`games.${id}.title`).replace(/^Football /, '').replace(/ de Fútbol$/, '')

// hh:mm until the next matchday (midnight UK time), when the dailies refresh.
function untilMidnight() {
  const mins = Math.ceil(msUntilNextMatchday() / 60000)
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

const HUB_TICK = ['result', 'rivals', 'streak', 'import', 'badges', 'leagues']

const StarIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
  </svg>
)
const chip = 'hidden sm:inline-flex absolute top-2.5 right-2.5 text-[0.56rem] font-black tracking-[0.1em] rounded px-1.5 py-0.5 border'

// One game in the lineup: a horizontal tile on phones, a card from sm up.
function GameCard({ g, isNext, showTagline, t, lp }) {
  const name = shortName(t, g.id)
  const state = g.played
    ? 'bg-board/90 border-border-strong'
    : g.inPlay
      ? 'bg-card border-warn/55'
      : isNext
        ? 'bg-card border-brand-bright/80 shadow-[0_0_0_1px_rgb(124_58_237/0.45),0_10px_30px_-12px_rgb(124_58_237/0.75)]'
        : 'bg-card border-border-strong'
  let badge = null
  if (g.inPlay) badge = <span className={`${chip} text-warn border-warn/50`}>{t('social.race.resume')}</span>
  else if (isNext) badge = <span className={`${chip} text-white bg-brand border-brand`}>{t('social.race.next')}</span>
  else if (g.played) badge = <span className={`${chip} text-success border-success/40`}>FT</span>
  else if (g.rival) badge = <span className={`${chip} text-brand-bright border-brand/55 items-center gap-0.5`}><VsIcon className="w-2.5 h-2.5" />VS</span>

  const flame = (quiet) => g.streak > 0 && (
    <span className={`inline-flex items-center gap-0.5 text-[0.68rem] sm:text-[0.75rem] font-black ${quiet ? 'text-faint' : 'text-warn'}`}>
      <FlameIcon className="w-3 h-3" />{g.streak}
    </span>
  )
  let foot
  if (g.played) {
    foot = (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <b className={`score-number font-normal text-[1.05rem] sm:text-[1.55rem] leading-none ${g.won ? 'text-primary' : 'text-muted'}`}>{g.result}</b>
        {flame(false)}
      </span>
    )
  } else if (g.inPlay) {
    foot = <span className="text-[0.66rem] sm:text-[0.68rem] font-extrabold tracking-[0.12em] uppercase text-warn">{t('social.race.resumeCta')} ▸</span>
  } else if (isNext) {
    foot = <span className="flex items-center gap-2"><span className="text-[0.66rem] sm:text-[0.68rem] font-extrabold tracking-[0.12em] uppercase text-brand-bright">{t('social.race.play')} ▸</span>{flame(true)}</span>
  } else if (showTagline) {
    foot = <span className="text-[0.66rem] sm:text-[0.72rem] text-muted leading-snug line-clamp-1 sm:line-clamp-2">{t(`games.${g.id}.tagline`)}</span>
  } else {
    foot = flame(true) || null
  }

  return (
    <Link
      to={lp(g.to)}
      style={{ '--g': g.color }}
      aria-label={g.played ? `${t(`games.${g.id}.title`)} — ${t('home.playedToday')}` : t(`games.${g.id}.title`)}
      className={`relative flex items-center gap-2.5 h-[4.25rem] px-2.5 sm:h-[7.25rem] sm:flex-col sm:items-start sm:justify-between sm:p-3.5 rounded-xl border transition-[transform,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--g)_55%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright active:scale-[0.985] ${state}`}
    >
      {badge}
      <GameMotif id={g.id} className={`w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-[color:var(--g)] ${g.played ? 'opacity-70' : ''}`} />
      <span className="min-w-0 flex flex-col gap-0.5 sm:gap-1">
        <span className="font-extrabold uppercase tracking-[0.03em] text-[0.74rem] sm:text-[0.88rem] leading-tight">{name}</span>
        <span className="flex items-center min-w-0 sm:h-7">{foot}</span>
      </span>
    </Link>
  )
}

// The 12th slot: the 2× perfect-day reward. Once all eleven are done it lights
// gold and carries the share button; before that, sharing lives in the rail
// (desktop) or under the board (phones and tablets).
function PerfectTile({ played, total, daily, onShare, t }) {
  const done = played === total
  return (
    <div className={`relative flex items-center gap-2.5 h-[4.25rem] px-2.5 sm:h-[7.25rem] sm:flex-col sm:items-start sm:justify-between sm:p-3.5 rounded-xl ${
      done
        ? 'border border-warn/75 bg-[radial-gradient(circle_at_25%_15%,rgb(251_191_36/0.2),transparent_60%)] bg-board shadow-[0_0_30px_-8px_rgb(251_191_36/0.55)]'
        : 'border border-dashed border-warn/40 bg-warn/[0.03]'
    }`}>
      <StarIcon className={`w-7 h-7 sm:w-9 sm:h-9 shrink-0 ${done ? 'text-warn drop-shadow-[0_0_8px_rgb(251_191_36/0.6)]' : 'text-inert'}`} />
      <span className="min-w-0 flex-1 flex flex-col gap-0.5 sm:gap-1">
        <span className="font-extrabold uppercase tracking-[0.03em] text-[0.74rem] sm:text-[0.88rem] leading-tight text-warn">{t('social.race.perfect')}</span>
        <span className="text-[0.66rem] sm:text-[0.72rem] text-muted leading-snug sm:h-7 flex items-center">
          {done ? (
            <>
              <button type="button" onClick={onShare} className="sm:hidden font-extrabold text-warn uppercase tracking-[0.08em]">{t('social.race.share')} ↗</button>
              <span className="hidden sm:inline">{t('social.race.perfectDone')} · <b className="text-warn">{fmt(daily)}</b></span>
            </>
          ) : played === 0 ? t('social.race.perfectAll', { n: total }) : t('social.race.perfectLeft', { n: total - played })}
        </span>
      </span>
      {done ? (
        <button type="button" onClick={onShare}
          className="hidden sm:block absolute top-3 right-3 h-8 px-2.5 rounded-lg bg-warn hover:bg-warn-strong text-canvas text-[0.62rem] sm:text-[0.66rem] font-black tracking-[0.08em] uppercase transition-colors">
          {t('social.race.share')}
        </button>
      ) : null}
    </div>
  )
}

// ── The competition: league chase · world rank · dressing room ─────────────
const Overline = ({ children, right }) => (
  <div className="flex items-center justify-between gap-2 text-[0.6rem] font-black tracking-[0.16em] uppercase text-muted">
    <span className="flex items-center gap-1.5 min-w-0">{children}</span>{right}
  </div>
)

function LeagueBlock({ league, compact, t, locale, lp, worldChip }) {
  if (!league) {
    return (
      <div className="flex flex-col gap-2">
        <Overline right={worldChip}><TableIcon className="w-3.5 h-3.5 text-brand-bright" />{t('social.nav.leagues')}</Overline>
        <div className={compact ? 'flex items-center justify-between gap-3' : 'flex flex-col gap-2'}>
          <div className="min-w-0">
            <p className="m-0 text-primary font-extrabold text-[0.9rem]">{t('social.race.noLeague')}</p>
            {!compact && <p className="m-0 mt-1 text-muted text-[0.78rem] leading-snug">{t('social.race.noLeagueBody')}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to={lp('/leagues')} className="h-9 px-3.5 inline-flex items-center rounded-lg bg-brand hover:bg-brand-hover text-white text-[0.75rem] font-black tracking-[0.04em] transition-colors">{t('social.race.create')}</Link>
            {!compact && <Link to={lp('/leagues')} className="h-9 px-3.5 inline-flex items-center rounded-lg border border-border-strong text-secondary hover:text-primary text-[0.75rem] font-bold transition-colors">{t('social.race.join')}</Link>}
          </div>
        </div>
      </div>
    )
  }
  const slice = league.slice || []
  const you = slice.find(r => r.you)
  return (
    <div className="flex flex-col gap-2">
      <Overline right={compact ? worldChip : <Link to={lp(`/leagues/${league.code}`)} className="text-brand-bright hover:text-brand tracking-[0.08em]">{t('social.race.fullTable')} ›</Link>}>
        <TableIcon className="w-3.5 h-3.5 text-warn shrink-0" /><span className="text-primary truncate tracking-[0.08em]">{league.name}</span>
      </Overline>
      {slice.length > 0 && (compact ? (
        <div className="grid grid-cols-3 gap-1.5">
          {slice.map(r => (
            <div key={`${r.rank}-${r.name}`} className={`rounded-lg border px-2 py-1.5 min-w-0 ${r.you ? 'border-brand-bright/60 bg-brand-tint' : 'border-border bg-board'}`}>
              <b className="block truncate text-[0.74rem] text-primary"><span className="score-number font-normal text-[0.95rem] text-secondary mr-1">{r.rank}</span>{r.you ? t('social.leagues.you') : r.name}</b>
              <span className="text-[0.66rem] text-muted tabular-nums">{fmt(r.pts, locale)} {t('social.leagues.pts').toLowerCase()}</span>
            </div>
          ))}
        </div>
      ) : (
        <ol className="m-0 p-0 list-none flex flex-col gap-1">
          {slice.map(r => (
            <li key={`${r.rank}-${r.name}`} className={`grid grid-cols-[1.4rem_minmax(0,1fr)_auto] items-center gap-2 h-9 px-2.5 rounded-lg text-[0.8rem] ${r.you ? 'bg-brand-tint border border-brand-bright/45 text-primary font-extrabold' : 'text-secondary'}`}>
              <span className="score-number font-normal text-[1.05rem] text-muted">{r.rank}</span>
              <span className="truncate">{r.you ? `${r.name} (${t('social.leagues.you')})` : r.name}</span>
              <span className="tabular-nums text-primary font-bold">
                {fmt(r.pts, locale)}
                {!r.you && you && <span className="ml-1.5 text-[0.66rem] text-brand-bright font-extrabold">{r.pts >= you.pts ? '+' : '−'}{Math.abs(r.pts - you.pts)}</span>}
              </span>
            </li>
          ))}
        </ol>
      ))}
      <Link to={lp(`/leagues/${league.code}`)} className="text-[0.78rem] font-extrabold text-brand-bright hover:text-brand">
        {ordinal(league.rank, locale)} · {chaseLine(league, t)}
      </Link>
    </div>
  )
}

function WorldBlock({ world, live, t, locale, lp }) {
  if (!world && !live) return null
  let big = null, sub, extra = null
  if (world?.rank) {
    big = `#${fmt(world.rank, locale)}`
    sub = world.rank === 1 ? t('social.race.worldTop') : t('social.race.worldRank', { n: fmt(world.players, locale), pc: world.top })
    if (world.toNext > 0) extra = t('social.race.toNext', { n: world.toNext })
  } else if (world?.yesterday?.rank) {
    big = `#${fmt(world.yesterday.rank, locale)}`
    sub = t('social.race.yesterday')
    extra = t('social.race.defend')
  } else {
    const n = world?.playing ?? live?.players ?? 0
    sub = n > 0 ? t('social.race.unranked', { n: fmt(n, locale) }) : t('social.race.unrankedNone')
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Overline right={<Link to={lp('/world')} className="text-brand-bright hover:text-brand tracking-[0.08em]">{t('social.world.board')} ›</Link>}>
        <GlobeIcon className="w-3.5 h-3.5 text-brand-bright" />{t('social.race.world')}
      </Overline>
      {big ? (
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="score-number text-[2.6rem] leading-[0.9] tv-wordmark">{big}</span>
          <span className="text-[0.78rem] text-muted">{sub}</span>
        </div>
      ) : <p className="m-0 text-[0.8rem] text-muted">{sub}</p>}
      {extra && <p className="m-0 text-[0.75rem] font-bold text-brand-bright">{extra}</p>}
    </div>
  )
}

function DressingBlock({ streak, badges, t, lp, compact }) {
  const next = badges.next ? (t(`social.badges.names.${badges.next.id}`) || [badges.next.id])[0] : null
  return (
    <Link to={lp('/me')} className={`group flex flex-col gap-1.5 ${compact ? 'bg-surface border border-border-strong rounded-xl p-3 shadow-panel' : ''}`}>
      <Overline right={<span className="text-brand-bright tracking-[0.08em] group-hover:text-brand">{t('social.race.dugout')} ›</span>}>
        <UserIcon className="w-3.5 h-3.5 text-brand-bright" />{t('social.race.dressing')}
      </Overline>
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[0.78rem] text-secondary">
        {streak.streak > 0 ? (
          <span className={`inline-flex items-center gap-1 font-extrabold ${streak.atRisk ? 'text-warn risk-pulse rounded' : 'text-warn'}`}>
            <FlameIcon className="w-3.5 h-3.5" />{t('social.streak.days', { n: streak.streak })}
          </span>
        ) : <span className="text-muted">{t('social.streak.startToday')}</span>}
        {streak.best > 0 && <span>{t('social.race.bestStreak', { n: streak.best })}</span>}
        {streak.freezes > 0 && <span className="inline-flex items-center gap-1 text-brand-bright"><FreezeIcon className="w-3 h-3" />{streak.freezes}</span>}
      </div>
      <p className="m-0 text-[0.75rem] text-muted">
        {t('social.race.badges', { n: badges.earned, total: badges.total })}
        {next && <> · {t('social.race.nextBadge', { name: next })}</>}
      </p>
    </Link>
  )
}

export default function Hub() {
  const { locale, t, lp } = useI18n()
  const home = routeByPath('/', locale)
  useState(recordVisit) // keeps the visit ledger ("welcome back") current
  const [countdown, setCountdown] = useState(untilMidnight)
  const [shareOpen, setShareOpen] = useState(false)
  const matchday = matchdayNumber()
  useSocialTick(HUB_TICK)
  const streak = getStreak()
  const live = useToday()
  const world = useWorldRank()
  const league = chaseLeague(useMyLeagues())

  // Keep the next-dailies countdown live (minute precision).
  useEffect(() => {
    const id = setInterval(() => setCountdown(untilMidnight()), 30_000)
    return () => clearInterval(id)
  }, [])

  const day = todayIndex()
  const lineup = GAMES.map(g => {
    const played = playedToday(g.stats)
    const row = played ? resultFor(day, g.stats) : null
    const won = getStats(g.stats).lastWin === day
    return {
      ...g,
      id: g.to.slice(1),
      played,
      inPlay: !played && inProgressToday(g.stats),
      won: row ? !!row.w : won,
      result: played ? scoreLabel(row || { w: won }, locale) : null,
      streak: getStats(g.stats).currentStreak,
      rival: rivalsOn(matchday, g.stats).length > 0,
    }
  })
  const playedCount = lineup.filter(g => g.played).length
  const total = lineup.length
  const done = playedCount === total
  const next = lineup.find(g => g.inPlay) || lineup.find(g => !g.played) || null
  const daily = dailyPoints()
  const firstTimer = playedDays().length === 0
  const badges = { earned: Object.keys(loadBadges()).length, total: BADGES.length, next: nextBadge() }

  const kicker = firstTimer && !playedCount
    ? <span>{t('social.race.kickNew')}</span>
    : streak.atRisk
      ? <span className="text-warn inline-flex items-center gap-1"><FlameIcon className="w-3 h-3" />{t('social.streak.atRiskShort', { n: streak.streak }).replace(/^🔥\s*/, '')}</span>
      : done
        ? <span>{t('social.race.kickDone', { t: countdown })}</span>
        : <span className="hidden sm:inline">{t('social.race.kickDefault', { t: countdown })}</span>

  const segments = (cls) => (
    <div className={`flex items-center ${cls}`} aria-hidden="true">
      {lineup.map(g => (
        <i key={g.to}
          style={g.played ? { background: g.color, boxShadow: `0 0 8px color-mix(in srgb, ${g.color} 60%, transparent)` } : undefined}
          className="w-5 h-1.5 sm:h-2 rounded-[3px] bg-border -skew-x-[14deg]" />
      ))}
      <StarIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5 shrink-0 ${done ? 'text-warn' : 'text-inert'}`} />
    </div>
  )

  const worldChip = world?.rank
    ? <span className="inline-flex items-center gap-1 text-primary tracking-[0.04em]"><GlobeIcon className="w-3 h-3 text-brand-bright" />#{fmt(world.rank, locale)}</span>
    : null

  return (
    <div className="tv-scene text-primary min-h-dvh">
      <Seo path="/" />

      <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4 px-3 sm:px-6 pt-2 sm:pt-3 pb-6">

        {/* top bar: brand (the page's h1 — site name + sr-only keywords) · Dugout · language */}
        <div className="flex items-center justify-between gap-3 h-11 sm:h-12">
          <h1 className="flex items-center gap-2 text-[0.66rem] sm:text-[0.85rem] font-black tracking-[0.13em] m-0">
            <BrandMark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-bright" />
            <span className="text-primary">TRIVIVERSE</span>
            <span className="text-brand-bright">FOOTBALL</span>
            <span className="sr-only">— {t('home.subtitle')}</span>
          </h1>
          <div className="flex items-center gap-2">
            <Link to={lp('/me')} aria-label={t('social.race.dugout')}
              className={`h-8 sm:h-9 px-2.5 sm:px-3 inline-flex items-center gap-1.5 rounded-lg border bg-surface text-secondary hover:text-primary hover:border-brand/50 transition-colors text-[0.62rem] sm:text-[0.66rem] font-bold tracking-[0.1em] uppercase ${streak.atRisk ? 'border-warn/60 risk-pulse' : 'border-border-strong'}`}>
              <UserIcon className="w-3.5 h-3.5" />
              {streak.streak > 0 && <b className="inline-flex items-center gap-0.5 text-warn text-[0.8rem] tracking-normal"><FlameIcon className="w-3 h-3" />{streak.streak}</b>}
              <span className="hidden sm:inline">{t('social.race.dugout')}</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>

        {/* matchday hero: the day's number · today's progress */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.55rem] sm:text-[0.66rem] font-extrabold tracking-[0.2em] uppercase text-brand-bright m-0 truncate">{kicker}</p>
            <div className="score-number text-[2.6rem] sm:text-[4rem] leading-[0.88] mt-1 tv-wordmark whitespace-nowrap">
              {t('hub.matchday')} {matchday}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="score-number text-[2rem] sm:text-[2.6rem] leading-[0.85]">{playedCount}<span className="text-faint text-[1.1rem] sm:text-[1.4rem]">/{total}</span></span>
              <span className={`hidden sm:inline ml-1.5 text-[0.6rem] font-black tracking-[0.16em] ${done ? 'text-warn' : 'text-muted'}`}>{t('social.race.complete')}</span>
            </div>
            {segments('hidden sm:flex gap-1')}
            <span className="hidden sm:block text-[0.72rem] font-semibold text-muted">
              {playedCount ? <><b className="text-brand-bright font-extrabold">{fmt(daily, locale)}</b> {t('social.race.ptsToday', { n: '' }).trim()}</> : t(firstTimer ? 'social.race.firstPts' : 'social.race.winPts')}
            </span>
          </div>
        </div>

        {/* phones: the progress strip gets the full width under the hero */}
        {segments('sm:hidden -mt-1 gap-[3px] [&>i]:flex-1')}

        {/* the board + the title race */}
        <div className="grid gap-3 lg:gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] items-start">
          {/* phones/tablets: the race sits above the board */}
          <section aria-label={t('social.race.title')} className="lg:hidden bg-surface border border-border-strong rounded-xl p-3 shadow-panel">
            <LeagueBlock league={league} compact t={t} locale={locale} lp={lp} worldChip={worldChip} />
          </section>

          <div className="relative border border-border-strong rounded-xl sm:rounded-2xl p-2 sm:p-3 tv-board">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {lineup.map(g => (
                <GameCard key={g.to} g={g} isNext={next?.to === g.to} showTagline={firstTimer} t={t} lp={lp} />
              ))}
              <PerfectTile played={playedCount} total={total} daily={daily} onShare={() => setShareOpen(true)} t={t} />
            </div>
          </div>

          {/* desktop: the rail */}
          <aside aria-label={t('social.race.title')} className="hidden lg:flex flex-col gap-4 bg-surface border border-border-strong rounded-2xl p-4 shadow-panel">
            <LeagueBlock league={league} t={t} locale={locale} lp={lp} />
            <hr className="border-0 border-t border-border m-0" />
            <WorldBlock world={world} live={live} t={t} locale={locale} lp={lp} />
            {(world || live) && <hr className="border-0 border-t border-border m-0" />}
            <DressingBlock streak={streak} badges={badges} t={t} lp={lp} />
            {playedCount > 0 && (
              <button type="button" onClick={() => setShareOpen(true)}
                className={`h-10 rounded-lg font-black text-[0.78rem] tracking-[0.05em] transition-colors ${done ? 'bg-warn text-canvas hover:bg-warn-strong' : 'bg-brand hover:bg-brand-hover text-white'}`}>
                {t('social.race.share')}
              </button>
            )}
          </aside>

          {/* phones/tablets: world rank + dressing room below the board */}
          <div className="lg:hidden flex flex-col gap-3">
            {(world || live) && (
              <section className="bg-surface border border-border-strong rounded-xl p-3 shadow-panel">
                <WorldBlock world={world} live={live} t={t} locale={locale} lp={lp} />
              </section>
            )}
            <DressingBlock streak={streak} badges={badges} t={t} lp={lp} compact />
            {playedCount > 0 && !done && (
              <button type="button" onClick={() => setShareOpen(true)}
                className="h-10 rounded-lg bg-brand hover:bg-brand-hover text-white font-black text-[0.78rem] tracking-[0.05em] transition-colors">
                {t('social.race.share')}
              </button>
            )}
          </div>
        </div>

        <AdSlot name="hub-rail" className="lg:max-w-[19rem] lg:mr-0 lg:ml-auto" />
      </div>
      {shareOpen && <DayShareSheet onClose={() => setShareOpen(false)} />}

      {/* ── Below the fold: SEO content, unchanged in substance ── */}
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-16">
        <section className="text-left">
          <h2 className="text-primary font-semibold text-lg mb-3">{t('home.aboutHeading')}</h2>
          <p className="text-muted text-sm leading-relaxed mb-4">{home.about}</p>

          <nav aria-label={t('common.moreGames')} className="mb-8">
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {GAMES.map(g => {
                const id = g.to.slice(1)
                return (
                  <li key={g.to}>
                    <Link to={lp(g.to)} className="text-brand-bright hover:text-brand transition-colors">{t(`games.${id}.title`)}</Link>
                  </li>
                )
              })}
            </ul>
          </nav>

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
        <SiteFooter />
      </div>
    </div>
  )
}
