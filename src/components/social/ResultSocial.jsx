// The social half of a daily finish card (left column, under the verdict):
//
//   0. Name        — only while you're Anonymous and ranked: your world rank
//                    with a name field ("3rd of 29 today — add a name")
//   1. Streak      — matchday streak, countdown, Remind me (StreakReminder)
//   2. Leagues     — every league, with how this result moved you ("6th → 4th")
//   3. Head-to-head — the rival whose result you're answering (one line)
//   4. Share       — "Share & challenge" + WhatsApp/Teams/image/link icons
//
// Every block degrades on its own: API down → no league rows; no rivals → no
// H2H; streak and share always work. finalizeResult (on mount) submits the
// result, which is what moves the league rows.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { finalizeResult } from '../../social/results'
import { useShortUrl } from '../../social/shortLinks'
import { rivalsOn, activeChallenge, encodeGameChallenge, gameChallengeUrl } from '../../social/challenge'
import { resultText, rowsToCodes } from '../../social/shareText'
import { compareResults, scoreLabel } from '../../social/scoring'
import { getStreak } from '../../social/streak'
import { VsIcon, TableIcon } from './bits'
import StreakReminder from './StreakReminder'
import { useLeagueImpact, useWorldRank, chaseLine } from '../../social/leagues'
import { apiDown } from '../../social/api'
import { useSocialTick, ordinal } from './hooks'
import SharePanel, { NameField } from './SharePanel'
import { nickname } from '../../social/identity'

function HeadToHead({ mine, rivals, t }) {
  if (!rivals.length) return null
  return (
    <div className="w-full flex flex-col gap-1.5">
      {rivals.slice(0, 1).map(r => {
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

// Each league, as this result moved it. Up to three rows; the rest link out.
function LeagueImpact({ leagues, t, lp, locale }) {
  if (!leagues) return null
  if (!leagues.length) {
    if (apiDown()) return null
    return (
      <Link to={lp('/leagues')} className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-2 text-[0.75rem] font-bold text-brand-bright hover:border-brand/50 transition-colors">
        <TableIcon className="w-3.5 h-3.5 shrink-0" />{t('social.card.startLeague')}<span className="ml-auto">›</span>
      </Link>
    )
  }
  const shown = leagues.slice(0, 3)
  return (
    <div className="w-full flex flex-col gap-1.5">
      {shown.map(l => {
        const before = l.rankBefore ?? l.rank
        const up = before - l.rank
        return (
          <Link key={l.code} to={lp(`/leagues/${l.code}`)}
            className="flex items-center gap-2.5 bg-board border border-border-strong rounded-lg px-3 py-2 hover:border-brand/50 transition-colors text-left">
            <TableIcon className="w-3.5 h-3.5 text-warn shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.78rem] font-bold text-primary truncate">{l.name}</span>
              <span className="block text-[0.64rem] text-muted truncate">{chaseLine(l, t)}</span>
            </span>
            <span className="shrink-0 flex flex-col items-end gap-0.5">
              <span className="flex items-center gap-1.5 text-[0.75rem] tabular-nums">
                {up > 0 && <span className="text-muted">{ordinal(before, locale)} →</span>}
                <b className="text-primary">{ordinal(l.rank, locale)}</b>
                {up > 0 && <span className="text-success text-[0.62rem] font-black">▲{up}</span>}
              </span>
              {l.gained > 0 && <span className="text-[0.62rem] font-bold text-brand-bright">{t('social.card.gained', { n: l.gained })}</span>}
            </span>
          </Link>
        )
      })}
      {leagues.length > shown.length && (
        <Link to={lp('/leagues')} className="self-end text-[0.66rem] font-bold text-brand-bright hover:text-primary">{t('social.card.more', { n: leagues.length - shown.length })} ›</Link>
      )}
    </div>
  )
}

const TICK = ['identity', 'result']

// The moment a name matters most: you've just landed on the world table and
// it shows you as Anonymous. Rendered only while that's true; after saving it
// confirms once and the share panel's own (fallback) name field stays hidden.
function NameForRank({ world, t, locale, onSaved }) {
  const [saved, setSaved] = useState(null)
  if (saved) return <p className="w-full m-0 text-center text-[0.78rem] font-bold text-success-bright">{t('social.race.nameSaved', { name: saved })}</p>
  return (
    <div className="w-full rounded-xl border border-brand/50 bg-brand-tint px-3 py-2.5">
      <p className="m-0 mb-2 text-[0.8rem] text-primary leading-snug">
        {t('social.race.nameRank', { rank: ordinal(world.rank, locale), n: world.players })}
      </p>
      <NameField compact onSaved={n => { if (n) { setSaved(n); onSaved?.() } }} />
    </div>
  )
}

export default function ResultSocial({ card }) {
  const { t, lp, locale } = useI18n()
  useSocialTick(TICK) // re-read the log when the submission lands; a typed name re-signs the link
  const mine = useMemo(() => ({ w: !!card.won, ...(card.score || {}) }), [card.won, card.score])
  const rivals = rivalsOn(card.matchday, card.gameId)
  const leagues = useLeagueImpact(card.gameId)
  const world = useWorldRank()
  // Decided when the card opens (not live), so the prompt survives the save and
  // can confirm it rather than vanishing mid-click.
  const [anonymous] = useState(() => !nickname())
  const askForName = anonymous && world?.rank > 0

  useEffect(() => {
    finalizeResult(card)
    // finalize once per mount — the card object is rebuilt each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.gameId])

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
    <div className="w-full flex flex-col items-center gap-2.5 mb-1">
      {askForName && <NameForRank world={world} t={t} locale={locale} />}
      <StreakReminder />
      <LeagueImpact leagues={leagues} t={t} lp={lp} locale={locale} />
      <HeadToHead mine={mine} rivals={reply ? [reply] : rivals} t={t} />
      <SharePanel game={card.gameId} url={url} imageCard={card} inline askName={!askForName}
        text={() => resultText({ title: card.title, matchday: card.matchday, result: mine, rows: card.rows, streak: getStreak().streak, url, locale, rival: rivalForText })} />
    </div>
  )
}
