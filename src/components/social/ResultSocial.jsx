// The social half of a daily finish card (left column, under DailyStats):
//
//   1. Head-to-head   — every rival who has sent you today's result for this game
//   2. Global         — "you beat 64% of today's players" + how everyone did
//   3. League         — your place in each league after this result
//   4. Streak         — the matchday streak, freezes, countdown, reminder
//   5. Share          — pasteable text (a challenge link) + WhatsApp/Teams/image
//
// Every block degrades on its own: no rivals → no H2H; API down → no global
// or league lines; the share block always works.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { todayIndex } from '../../data/dailyStats'
import { finalizeResult } from '../../social/results'
import { resultFor } from '../../social/log'
import { useShortUrl } from '../../social/shortLinks'
import { rivalsOn, activeChallenge, encodeGameChallenge, gameChallengeUrl } from '../../social/challenge'
import { resultText, rowsToCodes } from '../../social/shareText'
import { compareResults, scoreLabel } from '../../social/scoring'
import { distribution } from '../../social/api'
import { getStreak } from '../../social/streak'
import { useMyLeagues } from '../../social/leagues'
import { FlameIcon, FreezeIcon, VsIcon, CalendarIcon, TableIcon } from './bits'
import { useCountdown, useSocialTick, ordinal, fmt } from './hooks'
import ReminderSheet from './ReminderSheet'
import SharePanel from './SharePanel'

function HeadToHead({ mine, rivals, t }) {
  if (!rivals.length) return null
  return (
    <div className="w-full flex flex-col gap-1.5">
      {rivals.slice(0, 3).map(r => {
        const c = compareResults(mine, r.result)
        const tone = c > 0 ? 'text-success border-success/40' : c < 0 ? 'text-danger-bright border-danger/40' : 'text-warn border-warn/40'
        return (
          <div key={r.id} className="flex items-center gap-2 bg-board border border-border-strong rounded-lg px-3 py-2">
            <VsIcon className="w-3.5 h-3.5 text-brand-bright shrink-0" />
            <span className="text-[0.75rem] font-bold text-secondary truncate">{r.name || t('social.challenge.someone')}</span>
            <span className="ml-auto flex items-center gap-2 tabular-nums">
              <b className="score-number text-lg leading-none text-primary">{scoreLabel(mine)}</b>
              <span className="text-faint text-[0.7rem]">–</span>
              <b className="score-number text-lg leading-none text-muted">{scoreLabel(r.result)}</b>
              <span className={`text-[0.55rem] font-black tracking-[0.12em] border rounded px-1.5 py-0.5 ${tone}`}>
                {c > 0 ? t('social.challenge.youWin') : c < 0 ? t('social.challenge.youLose') : t('social.challenge.draw')}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Bin the day's results into at most 8 bars (lost results get their own "X" bar).
function bins(dist, low) {
  const won = dist.buckets.filter(b => b.w && b.v != null)
  const lost = dist.buckets.filter(b => !b.w).reduce((s, b) => s + b.n, 0)
  const values = [...new Set(won.map(b => b.v))].sort((a, b) => a - b)
  let bars
  if (values.length <= 8) {
    bars = values.map(v => ({ key: String(v), lo: v, hi: v, n: won.filter(b => b.v === v).reduce((s, b) => s + b.n, 0) }))
  } else {
    const lo = values[0], hi = values[values.length - 1], step = Math.ceil((hi - lo + 1) / 6)
    bars = Array.from({ length: 6 }, (_, i) => {
      const a = lo + i * step, z = a + step - 1
      return { key: `${a}–${z}`, lo: a, hi: z, n: won.filter(b => b.v >= a && b.v <= z).reduce((s, b) => s + b.n, 0) }
    })
  }
  if (!low) bars.reverse() // best first
  if (lost) bars.push({ key: 'X', lost: true, n: lost })
  return bars
}

function Distribution({ dist, mine, t }) {
  const bars = bins(dist, dist.meta?.low)
  const max = Math.max(1, ...bars.map(b => b.n))
  const isMine = (b) => b.lost ? !mine.w : mine.w && mine.v >= b.lo && mine.v <= b.hi
  return (
    <div className="w-full mt-2 flex flex-col gap-1" aria-label={t('social.global.howEveryone')}>
      {bars.map(b => (
        <div key={b.key} className="flex items-center gap-2 text-[0.62rem] tabular-nums">
          <span className="w-9 text-right text-muted font-bold">{b.key}</span>
          <span className="flex-1 h-3.5 bg-board rounded-sm overflow-hidden">
            <i className={`block h-full rounded-sm bar-grow ${isMine(b) ? 'bg-brand' : b.lost ? 'bg-danger/40' : 'bg-inert'}`} style={{ width: `${Math.max(4, (b.n / max) * 100)}%` }} />
          </span>
          <span className="w-7 text-muted">{b.n}</span>
        </div>
      ))}
    </div>
  )
}

function GlobalLine({ rank, dist, mine, t, locale }) {
  const [open, setOpen] = useState(false)
  if (!rank) return null
  const pc = rank.pc
  return (
    <div className="w-full">
      <button type="button" onClick={() => setOpen(o => !o)} disabled={!dist || dist.total < 3}
        className="w-full flex items-center gap-3 text-left group">
        <span className="relative w-10 h-10 shrink-0">
          <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-border-strong" strokeWidth="4" />
            {pc != null && <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-brand-bright" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pc / 100) * 94.2} 94.2`} />}
          </svg>
          <b className="absolute inset-0 flex items-center justify-center text-[0.62rem] font-black tabular-nums">{pc != null ? `${pc}%` : '—'}</b>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[0.8rem] font-bold text-primary leading-tight">
            {pc != null && rank.others > 0 ? t('social.global.beat', { pc }) : t('social.global.first')}
          </span>
          <span className="block text-[0.66rem] text-muted mt-0.5">
            {t('social.global.players', { n: fmt((rank.others || 0) + 1, locale) })}
            {dist && dist.total >= 3 && <span className="text-brand-bright font-bold"> · {t('social.global.howEveryone')} {open ? '▴' : '▾'}</span>}
          </span>
        </span>
      </button>
      {open && dist && <Distribution dist={dist} mine={mine} t={t} />}
    </div>
  )
}

function LeagueLines({ leagues, t, lp, locale }) {
  if (!leagues?.length) return null
  return (
    <div className="w-full flex flex-col gap-1.5">
      {leagues.slice(0, 2).map(l => (
        <Link key={l.code} to={lp(`/leagues/${l.code}`)}
          className="flex items-center gap-2 bg-board border border-border-strong rounded-lg px-3 py-2 hover:border-brand/50 transition-colors">
          <TableIcon className="w-3.5 h-3.5 text-brand-bright shrink-0" />
          <span className="text-[0.75rem] font-bold text-primary truncate">{l.name}</span>
          <span className="ml-auto text-[0.66rem] text-muted whitespace-nowrap">
            <b className="text-primary">{ordinal(l.rank, locale)}</b>
            {' · '}
            {l.rank === 1 ? t('social.leagues.leading') : t('social.leagues.ptsBehind', { n: l.leaderPts - l.pts })}
          </span>
        </Link>
      ))}
    </div>
  )
}

function StreakLine({ t }) {
  const s = getStreak()
  const countdown = useCountdown()
  const [remind, setRemind] = useState(false)
  return (
    <div className="w-full flex items-center gap-3 bg-board border border-border-strong rounded-lg px-3 py-2.5">
      <span className="flex items-center gap-1 text-warn">
        <FlameIcon className="w-5 h-5" />
        <b className="score-number text-2xl leading-none tabular-nums">{s.streak}</b>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[0.72rem] font-bold text-primary leading-tight">{t('social.streak.keepAlive', { n: s.streak + 1 })}</span>
        <span className="block text-[0.62rem] text-muted mt-0.5 tabular-nums">
          {t('social.streak.nextMatchday', { t: countdown })}
          {s.freezes > 0 && <span className="text-brand-bright"> · <FreezeIcon className="w-3 h-3 inline -mt-0.5" /> {s.freezes}</span>}
        </span>
      </span>
      <button type="button" onClick={() => setRemind(true)} aria-label={t('social.reminder.button')}
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-border-strong text-secondary hover:text-primary hover:border-brand/50 transition-colors">
        <CalendarIcon />
      </button>
      {remind && <ReminderSheet onClose={() => setRemind(false)} />}
    </div>
  )
}

const TICK = ['identity', 'result']

export default function ResultSocial({ card }) {
  const { t, lp, locale } = useI18n()
  useSocialTick(TICK) // re-read the log when the submission lands; a typed name re-signs the link
  const [dist, setDist] = useState(null)
  const leagues = useMyLeagues()
  const mine = useMemo(() => ({ w: !!card.won, ...(card.score || {}) }), [card.won, card.score])
  const rivals = rivalsOn(card.matchday, card.gameId)
  // The percentile lives on the log row (finalizeResult stores it), so it shows
  // however the card mounts — fresh finish, StrictMode remount or reopen.
  const row = resultFor(todayIndex(), card.gameId)
  const rank = row?.sent ? { pc: row.pc ?? null, others: row.others ?? 0 } : null

  useEffect(() => {
    finalizeResult(card)
    // finalize once per mount — the card object is rebuilt each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.gameId])

  const others = rank?.others || 0
  useEffect(() => {
    if (others < 2) return
    let alive = true
    distribution(todayIndex(), card.gameId).then(d => { if (alive && d && !d.error) setDist(d) })
    return () => { alive = false }
  }, [others, card.gameId])

  // The rival this share replies to (the challenge that brought you here).
  const active = activeChallenge()
  const reply = active && active.matchday === card.matchday && (active.game === card.gameId || active.kind === 'day')
    ? rivals.find(r => r.id === active.id) : null
  const rivalForText = reply ? { name: reply.name || t('social.challenge.someone'), outcome: compareResults(mine, reply.result) } : null
  const payload = encodeGameChallenge({
    game: card.gameId, matchday: card.matchday, result: mine, title: card.title, subtitle: card.challenge, tiles: rowsToCodes(card.rows),
  })
  const url = useShortUrl(gameChallengeUrl(card.gameId, payload), payload)

  return (
    <div className="w-full flex flex-col items-center gap-2.5 mb-3">
      <HeadToHead mine={mine} rivals={rivals} t={t} />
      <GlobalLine rank={rank} dist={dist} mine={mine} t={t} locale={locale} />
      <LeagueLines leagues={leagues} t={t} lp={lp} locale={locale} />
      <StreakLine t={t} />
      <SharePanel game={card.gameId} url={url} imageCard={card}
        text={() => resultText({ title: card.title, matchday: card.matchday, result: mine, rows: card.rows, streak: getStreak().streak, url, locale, rival: rivalForText })} />
    </div>
  )
}
