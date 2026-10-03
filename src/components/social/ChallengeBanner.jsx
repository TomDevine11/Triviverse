// The "someone challenged you" strip. Mounted once in App: it picks up ?c=
// from any URL (share links land on /<game>?c=… or /?c=…), stores the rival,
// and shows a slim banner on the relevant page until you've played.

import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { consumeChallengeFromUrl, activeChallenge, dismissChallenge } from '../../social/challenge'
import { scoreLabel } from '../../social/scoring'
import { gameFromPath, gameShortTitle, routeOf } from '../../social/games'
import { matchdayNumber, playedToday } from '../../data/dailyStats'
import { track } from '../../utils/analytics'
import { VsIcon } from './bits'
import { useSocialTick } from './hooks'

const TICK = ['rivals', 'result']

export default function ChallengeBanner() {
  const { t, lp, locale } = useI18n()
  const { pathname, search } = useLocation()
  useSocialTick(TICK) // receiveChallenge emits 'rivals' → re-render with the new banner

  useEffect(() => {
    const ch = consumeChallengeFromUrl()
    if (ch) track('challenge_open', { kind: ch.kind, game: ch.game || 'day' })
  }, [pathname, search])

  const a = activeChallenge()
  if (!a) return null
  const here = gameFromPath(pathname)
  const onHub = /^\/(es)?\/?$/.test(pathname)
  const today = matchdayNumber()
  const name = a.name || t('social.challenge.someone')
  const results = Object.entries(a.rival.results || {})
    .filter(([k]) => Number(k.split(':')[0]) === a.matchday)
    .map(([k, r]) => ({ g: k.split(':')[1], r }))

  let msg, cta = null, to = null
  if (a.matchday !== today) {
    if (!(here && results.some(x => x.g === here)) && !onHub) return null
    msg = t('social.challenge.old', { name, m: a.matchday })
  } else if (here) {
    const mine = results.find(x => x.g === here)
    if (!mine || playedToday(here)) return null
    msg = t('social.challenge.beat', { name, score: scoreLabel(mine.r, locale), game: gameShortTitle(t, here) })
  } else if (onHub) {
    if (a.kind === 'day') {
      const pts = a.rival.dayPts?.[a.matchday]
      msg = t('social.challenge.beatDay', { name, m: a.matchday, n: results.length, pts: pts ?? '—' })
      const next = results.find(x => !playedToday(x.g))
      if (next) { cta = t('social.challenge.beatDayCta'); to = routeOf(next.g) }
    } else {
      const g = results[0]
      if (!g || playedToday(g.g)) return null
      msg = t('social.challenge.beat', { name, score: scoreLabel(g.r, locale), game: gameShortTitle(t, g.g) })
      cta = t('social.challenge.beatCta'); to = routeOf(g.g)
    }
  } else return null

  return (
    <div role="status" className="fixed top-2 left-1/2 z-toast w-[calc(100%-1.5rem)] max-w-lg banner-in"
      style={{ transform: 'translateX(-50%)' }}>
      <div className="flex items-center gap-2.5 bg-surface/95 backdrop-blur border border-brand/50 rounded-xl shadow-float pl-3 pr-1.5 py-1.5">
        <span className="w-7 h-7 shrink-0 rounded-lg bg-brand-tint text-brand-bright flex items-center justify-center"><VsIcon /></span>
        <span className="flex-1 min-w-0 text-[0.75rem] leading-snug text-primary font-semibold">{msg}</span>
        {cta && to && (
          <Link to={lp(to)} className="shrink-0 h-8 px-3 flex items-center rounded-lg bg-brand hover:bg-brand-hover text-white text-[0.7rem] font-black tracking-[0.04em] transition-colors">{cta}</Link>
        )}
        <button type="button" onClick={dismissChallenge} aria-label={t('social.challenge.dismiss')}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-border transition-colors">✕</button>
      </div>
    </div>
  )
}
