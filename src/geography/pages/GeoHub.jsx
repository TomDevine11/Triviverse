import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BrandMark from '../../components/BrandMark'
import GeoMotif from '../components/GeoMotif'
import { GeoHead, GeoContent } from '../components/GeoSeo'
import { GEO_GAMES } from '../games'
import { geoDayNumber, msUntilNextDay } from '../data/day'
import { loadProgress, loadStats } from '../data/progress'
import { dailyPair, pairSig, evaluateGame } from '../data/overland'
import { dailyCode as unfurlDaily, openCount } from '../data/unfurl'
import { dailyMissing, puzzleSig, evaluatePatchwork, MISSING } from '../data/patchwork'
import { countryByCode, dailyCode, evaluate, MAX_GUESSES } from '../data/borderline'
import { dailyPostcard, evaluateGuess, formatKm, PASS_SCORE as PC_PASS } from '../data/postcard'
import { dailySet, dailySig, evaluate as evaluateMilestone, DAILY_SIZE, PASS_SCORE } from '../data/milestone'
import { dailyClip as earshotDaily, evaluateRound, MAX_TRIES as EAR_TRIES } from '../data/earshot'
import { dailyQuestions as outrankDaily, DAILY_SIZE as OR_SIZE } from '../data/outrank'
import { readDaily as outrankProgress, dailyResults as outrankResults, dailyComplete as outrankComplete, dailyWon as outrankWon } from '../data/outrankPlay'
import { useGeoLeagues, chaseLeague, chaseLine } from '../social/leagues'
import { dayStreak, loadLog } from '../social/log'
import { SITE_URL } from '../seo'
import { t } from '../strings'
import '../geography.css'

// Triviverse Geography's home, in the same shape as the Triviverse Football hub:
// today's dailies as a board of compact tiles (2 across on phones, 3 from sm)
// with the perfect-day square as the last slot, and the competition — your
// league chase and Base Camp — in a rail on the right (stacked around the board
// on phones). Geography's own data, state and leagues throughout.

function hhmm() {
  const mins = Math.ceil(msUntilNextDay() / 60000)
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

const FlameIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 2.5c.6 3.2 2.8 4.7 4.3 6.8 1.3 1.8 2 3.6 2 5.6A6.3 6.3 0 0 1 12 21.5a6.3 6.3 0 0 1-6.3-6.6c0-2.2 1-4 2.4-5.4.2 1.6.9 2.7 2.1 3.2-.5-3.6.4-7 1.8-10.2z" />
  </svg>
)

// Today's state per game, for the hub cards.
function borderlineToday() {
  const code = dailyCode()
  const saved = loadProgress('borderline', code)
  const results = (saved?.guesses || []).map(g => evaluate(g, code)).filter(Boolean)
  const won = results.some(r => r.win)
  return {
    country: countryByCode(code),
    done: !!saved?.done,
    inPlay: !!saved && !saved.done,
    won,
    score: won ? `${results.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`,
    progress: `${results.length}/${MAX_GUESSES} · ${results.reduce((m, r) => Math.max(m, r.pct), 0)}%`,
  }
}

function overlandToday() {
  const pair = dailyPair()
  const saved = loadProgress('overland', pairSig(pair))
  const guesses = saved?.guesses || []
  const g = evaluateGame(pair[0], pair[1], guesses)
  const extra = guesses.length - g.par
  return {
    pair, game: g,
    done: !!saved?.done,
    inPlay: !!saved && !saved.done,
    won: g.won,
    score: g.won ? (extra ? `+${extra}` : t('overland.perfect')) : `X/${g.max}`,
    progress: `${guesses.length}/${g.max}`,
  }
}

function unfurlToday() {
  const code = unfurlDaily()
  const saved = loadProgress('unfurl', code)
  const results = (saved?.guesses || []).map(g => evaluate(g, code)).filter(Boolean)
  const won = results.some(r => r.win)
  const done = !!saved?.done
  return {
    code, done, won,
    inPlay: !!saved && !done,
    open: openCount(results.filter(r => !r.win).length, done),
    score: won ? `${results.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`,
    progress: `${results.length}/${MAX_GUESSES}`,
  }
}

function patchworkToday() {
  const missing = dailyMissing()
  const saved = loadProgress('patchwork', puzzleSig(missing))
  const guesses = Array.isArray(saved?.guesses) ? saved.guesses : []
  const g = evaluatePatchwork(missing, guesses)
  const done = !!saved?.done
  return {
    missing, restored: new Set(g.restored), done, won: g.won,
    inPlay: !!saved && !done,
    score: g.won ? `${g.misses.length} ✕` : `${g.restored.length}/${MISSING}`,
    progress: `${g.restored.length}/${MISSING}`,
  }
}

function postcardToday() {
  const card = dailyPostcard()
  const saved = loadProgress('postcard', card.id)
  const ok = saved?.done && Array.isArray(saved.guess) && saved.guess.length === 2 && saved.guess.every(Number.isFinite)
  const r = ok ? evaluateGuess(card, saved.guess) : null
  return {
    card, done: !!r, won: !!r && r.score >= PC_PASS, inPlay: false,
    score: r ? r.score.toLocaleString('en-GB') : '',
    km: r ? formatKm(r.km) : '',
  }
}

function milestoneToday() {
  const set = dailySet()
  const saved = loadProgress('milestone', dailySig(set))
  const answers = Array.isArray(saved?.answers) ? saved.answers.filter(g => Array.isArray(g) && g.length === 2 && g.every(Number.isFinite)).slice(0, DAILY_SIZE) : []
  const scores = answers.map((g, i) => evaluateMilestone(set[i], g).score)
  const total = scores.reduce((a, b) => a + b, 0)
  const done = scores.length === DAILY_SIZE
  return { set, scores, done, won: done && total >= PASS_SCORE, inPlay: scores.length > 0 && !done, score: total.toLocaleString('en-GB'), progress: `${scores.length}/${DAILY_SIZE}` }
}

function earshotToday() {
  const clip = earshotDaily()
  const saved = loadProgress('earshot', clip.id)
  const ev = evaluateRound(clip, Array.isArray(saved?.g) ? saved.g : [])
  return { clip, ev, done: ev.done, won: ev.won, inPlay: ev.tries > 0 && !ev.done, score: ev.won ? `${ev.tries}/${EAR_TRIES}` : `X/${EAR_TRIES}`, progress: `${ev.tries}/${EAR_TRIES}` }
}

function outrankToday() {
  const qs = outrankDaily()
  const saved = outrankProgress(qs)
  const results = outrankResults(qs, saved.answers)
  const done = outrankComplete(qs, saved)
  const score = results.filter(Boolean).length
  return { qs, results, done, won: done && outrankWon(score), inPlay: saved.answers.length > 0 && !done, score: `${score}/${OR_SIZE}`, progress: `${saved.answers.length}/${OR_SIZE}` }
}

const TODAY = { postcard: postcardToday, milestone: milestoneToday, earshot: earshotToday, outrank: outrankToday, borderline: borderlineToday, overland: overlandToday, unfurl: unfurlToday, patchwork: patchworkToday }

const StarIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
  </svg>
)
const TableIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
)
// Base Camp: a tent under a peak.
export const CampIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M15.5 3 22 14h-3.2l-3.3-5.6-1.4 2.4-1.2-2z" opacity=".45" />
    <path d="M9 6.5 1.5 20h15zM9 12.2 6.4 20h5.2z" fillRule="evenodd" />
  </svg>
)
const chip = 'hidden sm:inline-flex absolute top-2.5 right-2.5 text-[0.56rem] font-black tracking-[0.1em] rounded px-1.5 py-0.5 border'

// One daily on the board: a horizontal tile on phones, a card from sm up —
// the same footprint as a Triviverse Football tile.
function GeoTile({ g, isNext, showTagline }) {
  const name = t(`games.${g.id}.title`)
  const state = g.done
    ? 'bg-board/90 border-border-strong'
    : g.inPlay
      ? 'bg-card border-warn/55'
      : isNext
        ? 'bg-card border-brand-bright/80 shadow-[0_0_0_1px_rgb(124_58_237/0.45),0_10px_30px_-12px_rgb(124_58_237/0.75)]'
        : 'bg-card border-border-strong'
  let badge = null
  if (g.inPlay) badge = <span className={`${chip} text-warn border-warn/50`}>{t('race.resume')}</span>
  else if (isNext) badge = <span className={`${chip} text-white bg-brand border-brand`}>{t('race.nextUp')}</span>
  else if (g.done) badge = <span className={`${chip} ${g.won ? 'text-success border-success/40' : 'text-muted border-border-strong'}`}>{t('race.done')}</span>

  const flame = (quiet) => g.streak > 0 && (
    <span className={`inline-flex items-center gap-0.5 text-[0.68rem] sm:text-[0.75rem] font-black ${quiet ? 'text-faint' : 'text-warn'}`}>
      <FlameIcon className="w-3 h-3" />{g.streak}
    </span>
  )
  let foot
  if (g.done) {
    foot = (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <b className={`score-number font-normal text-[1.05rem] sm:text-[1.55rem] leading-none ${g.won ? 'text-primary' : 'text-muted'}`}>{g.score}</b>
        {flame(false)}
      </span>
    )
  } else if (g.inPlay) {
    foot = <span className="text-[0.66rem] sm:text-[0.68rem] font-extrabold tracking-[0.12em] uppercase text-warn">{t('race.resumeCta')} ▸</span>
  } else if (isNext) {
    foot = <span className="flex items-center gap-2"><span className="text-[0.66rem] sm:text-[0.68rem] font-extrabold tracking-[0.12em] uppercase text-brand-bright">{t('race.play')} ▸</span>{flame(true)}</span>
  } else if (showTagline) {
    foot = <span className="text-[0.66rem] sm:text-[0.72rem] text-muted leading-snug line-clamp-1 sm:line-clamp-2">{t(`games.${g.id}.tagline`)}</span>
  } else {
    foot = flame(true) || null
  }

  return (
    <Link to={g.route} style={{ '--g': g.accent.accent }}
      aria-label={g.done ? `${name} — ${t('race.done').toLowerCase()} · ${g.score}` : name}
      className={`relative flex items-center gap-2.5 h-[4.25rem] px-2.5 sm:h-[7.25rem] sm:flex-col sm:items-start sm:justify-between sm:p-3.5 rounded-xl border transition-[transform,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--g)_55%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright active:scale-[0.985] ${state}`}>
      {badge}
      <GeoMotif id={g.id} className={`w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-[color:var(--g)] ${g.done ? 'opacity-70' : ''}`} />
      <span className="min-w-0 flex flex-col gap-0.5 sm:gap-1">
        <span className="font-extrabold uppercase tracking-[0.03em] text-[0.74rem] sm:text-[0.88rem] leading-tight">{name}</span>
        <span className="flex items-center min-w-0 sm:h-7">{foot}</span>
      </span>
    </Link>
  )
}

// The last slot: the 2× perfect-day square. Lights gold once every daily is
// done and carries the share button.
function PerfectTile({ played, total, shareText }) {
  const done = played === total
  const [copied, setCopied] = useState(false)
  const share = async () => {
    if (typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)').matches) {
      try { await navigator.share({ text: shareText }) } catch { /* cancelled */ }
      return
    }
    try { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* blocked */ }
  }
  return (
    <div className={`relative col-span-2 sm:col-span-1 flex items-center gap-2.5 h-[4.25rem] px-2.5 sm:h-[7.25rem] sm:flex-col sm:items-start sm:justify-between sm:p-3.5 rounded-xl ${
      done
        ? 'border border-warn/75 bg-[radial-gradient(circle_at_25%_15%,rgb(251_191_36/0.2),transparent_60%)] bg-board shadow-[0_0_30px_-8px_rgb(251_191_36/0.55)]'
        : 'border border-dashed border-warn/40 bg-warn/[0.03]'
    }`}>
      <StarIcon className={`w-7 h-7 sm:w-9 sm:h-9 shrink-0 ${done ? 'text-warn drop-shadow-[0_0_8px_rgb(251_191_36/0.6)]' : 'text-inert'}`} />
      <span className="min-w-0 flex-1 flex flex-col gap-0.5 sm:gap-1">
        <span className="font-extrabold uppercase tracking-[0.03em] text-[0.74rem] sm:text-[0.88rem] leading-tight text-warn">{t('race.perfect')}</span>
        <span className="text-[0.66rem] sm:text-[0.72rem] text-muted leading-snug sm:h-7 flex items-center" aria-live="polite">
          {done ? (
            <>
              <button type="button" onClick={share} className="sm:hidden font-extrabold text-warn uppercase tracking-[0.08em]">{copied ? t('copied') : `${t('race.share')} ↗`}</button>
              <span className="hidden sm:inline">{t('race.perfectDone')}</span>
            </>
          ) : played === 0 ? t('race.perfectAll', { n: total }) : t('race.perfectLeft', { n: total - played })}
        </span>
      </span>
      {done && (
        <button type="button" onClick={share}
          className="hidden sm:block absolute top-3 right-3 h-8 px-2.5 rounded-lg bg-warn hover:bg-warn-strong text-canvas text-[0.62rem] sm:text-[0.66rem] font-black tracking-[0.08em] uppercase transition-colors">
          {copied ? t('copied') : t('race.share')}
        </button>
      )}
    </div>
  )
}

// ── The competition: league chase · Base Camp ───────────────────────────────
const Overline = ({ children, right }) => (
  <div className="flex items-center justify-between gap-2 text-[0.6rem] font-black tracking-[0.16em] uppercase text-muted">
    <span className="flex items-center gap-1.5 min-w-0">{children}</span>{right}
  </div>
)

function LeagueBlock({ league, compact }) {
  if (!league) {
    return (
      <div className="flex flex-col gap-2">
        <Overline><TableIcon className="w-3.5 h-3.5 text-brand-bright" />{t('leagues.title')}</Overline>
        <div className={compact ? 'flex items-center justify-between gap-3' : 'flex flex-col gap-2'}>
          <div className="min-w-0">
            <p className="m-0 text-primary font-extrabold text-[0.9rem]">{t('race.noLeague')}</p>
            {!compact && <p className="m-0 mt-1 text-muted text-[0.78rem] leading-snug">{t('race.noLeagueBody')}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to="/geography/leagues" className="h-9 px-3.5 inline-flex items-center rounded-lg bg-brand hover:bg-brand-hover text-white text-[0.75rem] font-black tracking-[0.04em] transition-colors">{t('race.create')}</Link>
            {!compact && <Link to="/geography/leagues" className="h-9 px-3.5 inline-flex items-center rounded-lg border border-border-strong text-secondary hover:text-primary text-[0.75rem] font-bold transition-colors">{t('race.join')}</Link>}
          </div>
        </div>
      </div>
    )
  }
  const slice = league.slice || []
  const you = slice.find(r => r.you)
  return (
    <div className="flex flex-col gap-2">
      <Overline right={<Link to={`/geography/leagues/${league.code}`} className="text-brand-bright hover:text-brand tracking-[0.08em]">{t('race.fullTable')} ›</Link>}>
        <TableIcon className="w-3.5 h-3.5 text-warn shrink-0" /><span className="text-primary truncate tracking-[0.08em]">{league.name}</span>
      </Overline>
      {slice.length > 0 && (compact ? (
        <div className="grid grid-cols-3 gap-1.5">
          {slice.map(r => (
            <div key={`${r.rank}-${r.name}`} className={`rounded-lg border px-2 py-1.5 min-w-0 ${r.you ? 'border-brand-bright/60 bg-brand-tint' : 'border-border bg-board'}`}>
              <b className="block truncate text-[0.74rem] text-primary"><span className="score-number font-normal text-[0.95rem] text-secondary mr-1">{r.rank}</span>{r.you ? t('leagues.you') : r.name}</b>
              <span className="text-[0.66rem] text-muted tabular-nums">{r.pts.toLocaleString('en-GB')} {t('leagues.pts').toLowerCase()}</span>
            </div>
          ))}
        </div>
      ) : (
        <ol className="m-0 p-0 list-none flex flex-col gap-1">
          {slice.map(r => (
            <li key={`${r.rank}-${r.name}`} className={`grid grid-cols-[1.4rem_minmax(0,1fr)_auto] items-center gap-2 h-9 px-2.5 rounded-lg text-[0.8rem] ${r.you ? 'bg-brand-tint border border-brand-bright/45 text-primary font-extrabold' : 'text-secondary'}`}>
              <span className="score-number font-normal text-[1.05rem] text-muted">{r.rank}</span>
              <span className="truncate">{r.you ? `${r.name} (${t('leagues.you')})` : r.name}</span>
              <span className="tabular-nums text-primary font-bold">
                {r.pts.toLocaleString('en-GB')}
                {!r.you && you && <span className="ml-1.5 text-[0.66rem] text-brand-bright font-extrabold">{r.pts >= you.pts ? '+' : '−'}{Math.abs(r.pts - you.pts)}</span>}
              </span>
            </li>
          ))}
        </ol>
      ))}
      <Link to={`/geography/leagues/${league.code}`} className="text-[0.78rem] font-extrabold text-brand-bright hover:text-brand">{chaseLine(league, t)}</Link>
    </div>
  )
}

function CampBlock({ camp, compact }) {
  return (
    <Link to="/geography/basecamp" className={`group flex flex-col gap-1.5 ${compact ? 'bg-surface border border-border-strong rounded-xl p-3 shadow-panel' : ''}`}>
      <Overline right={<span className="text-brand-bright tracking-[0.08em] group-hover:text-brand">{t('race.camp')} ›</span>}>
        <CampIcon className="w-3.5 h-3.5 text-brand-bright" />{t('race.campOver')}
      </Overline>
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[0.78rem] text-secondary">
        {camp.streak > 0 ? (
          <span className={`inline-flex items-center gap-1 font-extrabold text-warn ${camp.atRisk ? 'risk-pulse rounded' : ''}`}>
            <FlameIcon className="w-3.5 h-3.5" />{t('race.streakDays', { n: camp.streak })}
          </span>
        ) : <span className="text-muted">{t('race.startToday')}</span>}
        {camp.best > 0 && <span>{t('race.bestStreak', { n: camp.best })}</span>}
        {camp.perfect > 0 && <span className="inline-flex items-center gap-1 text-warn"><StarIcon className="w-3 h-3" />{t('race.perfectDays', { n: camp.perfect })}</span>}
      </div>
      <p className="m-0 text-[0.75rem] text-muted">{t('race.campLine')}</p>
    </Link>
  )
}

export default function GeoHub() {
  const [countdown, setCountdown] = useState(hhmm)
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setCountdown(hhmm()), 30_000)
    const on = () => setTick(n => n + 1) // a result landed: re-read the day log
    window.addEventListener('tvg-social', on)
    return () => { clearInterval(id); window.removeEventListener('tvg-social', on) }
  }, [])
  const league = chaseLeague(useGeoLeagues())

  const lineup = GEO_GAMES.map(g => {
    const s = TODAY[g.id]()
    return { ...g, done: s.done, won: s.won, inPlay: s.inPlay, score: s.score, streak: loadStats(g.id).streak }
  })
  const total = lineup.length
  const played = lineup.filter(g => g.done).length
  const done = played === total
  const next = lineup.find(g => g.inPlay) || lineup.find(g => !g.done) || null
  const log = loadLog()
  const camp = dayStreak(log)
  const firstTimer = log.length === 0

  const shareText = [
    `🌍 ${t('race.dayShare', { n: geoDayNumber(), played, total })}${done ? ' ⭐' : ''}`,
    ...lineup.map(g => `${g.done ? (g.won ? '🟩' : '🟥') : '⬜'} ${t(`games.${g.id}.title`)}${g.done ? ` ${g.score}` : ''}`),
    `${SITE_URL}/geography`,
  ].join('\n')

  const kicker = camp.atRisk
    ? <span className="text-warn inline-flex items-center gap-1"><FlameIcon className="w-3 h-3" />{t('race.streakDays', { n: camp.streak })} · {t('basecamp.atRisk')}</span>
    : done ? t('hub.kickerDone', { t: countdown }) : <><span className="hidden sm:inline">{t('hub.kicker')} · </span>{t('hub.newIn', { t: countdown })}</>

  const segments = (cls) => (
    <div className={`flex items-center ${cls}`} aria-hidden="true">
      {lineup.map(g => (
        <i key={g.id}
          style={g.done ? { background: g.accent.accent, boxShadow: `0 0 8px color-mix(in srgb, ${g.accent.accent} 60%, transparent)` } : undefined}
          className="w-5 h-1.5 sm:h-2 rounded-[3px] bg-border -skew-x-[14deg]" />
      ))}
      <StarIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5 shrink-0 ${done ? 'text-warn' : 'text-inert'}`} />
    </div>
  )

  return (
    <div className="tv-scene text-primary min-h-dvh">
      <GeoHead path="/geography" />
      <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4 px-3 sm:px-6 pt-2 sm:pt-3 pb-6">
        {/* top bar: brand · Base Camp */}
        <div className="flex items-center justify-between gap-3 h-11 sm:h-12">
          <Link to="/geography" className="flex items-center gap-2 text-[0.66rem] sm:text-[0.85rem] font-black tracking-[0.13em]">
            <BrandMark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-bright" />
            <span className="text-primary">{t('brand')}</span>
            <span className="text-brand-bright">{t('wing')}</span>
          </Link>
          <Link to="/geography/basecamp" aria-label={t('race.camp')}
            className={`h-8 sm:h-9 px-2.5 sm:px-3 inline-flex items-center gap-1.5 rounded-lg border bg-surface text-secondary hover:text-primary hover:border-brand/50 transition-colors text-[0.62rem] sm:text-[0.66rem] font-bold tracking-[0.1em] uppercase ${camp.atRisk ? 'border-warn/60 risk-pulse' : 'border-border-strong'}`}>
            <CampIcon className="w-3.5 h-3.5" />
            {camp.streak > 0 && <b className="inline-flex items-center gap-0.5 text-warn text-[0.8rem] tracking-normal"><FlameIcon className="w-3 h-3" />{camp.streak}</b>}
            <span className="hidden sm:inline">{t('race.camp')}</span>
          </Link>
        </div>

        {/* hero: today's number · progress */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.55rem] sm:text-[0.66rem] font-extrabold tracking-[0.2em] uppercase text-brand-bright m-0 truncate">{kicker}</p>
            <div className="score-number text-[2.6rem] sm:text-[4rem] leading-[0.88] mt-1 tv-wordmark whitespace-nowrap">{t('day')} {geoDayNumber()}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="score-number text-[2rem] sm:text-[2.6rem] leading-[0.85]">{played}<span className="text-faint text-[1.1rem] sm:text-[1.4rem]">/{total}</span></span>
              <span className={`hidden sm:inline ml-1.5 text-[0.6rem] font-black tracking-[0.16em] ${done ? 'text-warn' : 'text-muted'}`}>{t('race.complete')}</span>
            </div>
            {segments('hidden sm:flex gap-1')}
            <span className="hidden sm:block text-[0.72rem] font-semibold text-muted">{t(firstTimer ? 'race.firstPts' : 'race.winPts')}</span>
          </div>
        </div>
        {segments('sm:hidden -mt-1 gap-[3px] [&>i]:flex-1')}

        {/* the board + the competition */}
        <div className="grid gap-3 lg:gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] items-start">
          <section aria-label={t('race.title')} className="lg:hidden bg-surface border border-border-strong rounded-xl p-3 shadow-panel">
            <LeagueBlock league={league} compact />
          </section>

          <div className="relative border border-border-strong rounded-xl sm:rounded-2xl p-2 sm:p-3 tv-board">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3" aria-label={t('hub.lineup')}>
              {lineup.map(g => <GeoTile key={g.id} g={g} isNext={next?.id === g.id} showTagline={firstTimer} />)}
              <PerfectTile played={played} total={total} shareText={shareText} />
            </div>
          </div>

          <aside aria-label={t('race.title')} className="hidden lg:flex flex-col gap-4 bg-surface border border-border-strong rounded-2xl p-4 shadow-panel">
            <LeagueBlock league={league} />
            <hr className="border-0 border-t border-border m-0" />
            <CampBlock camp={camp} />
          </aside>

          <div className="lg:hidden flex flex-col gap-3">
            <CampBlock camp={camp} compact />
          </div>
        </div>

        <p className="m-0 text-center text-[0.75rem] text-muted">
          {t('hub.football')} · <a href="/" className="font-bold text-brand-bright hover:text-brand">{t('hub.footballLink')}</a>
        </p>
      </div>
      <GeoContent path="/geography" />
    </div>
  )
}
