// /world — the public leaderboard: everyone's matchday points for today, this
// week or all time (worker/api.js → getWorld). Top 50, plus your own row under
// a gap if you're further down. Players without a nickname
// show as Anonymous; points are server-computed and impossible days are left
// out (see worldStandings), so the table is fair enough to put names on.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import SocialChrome from '../components/social/SocialChrome'
import { Overline, Panel, GlobeIcon } from '../components/social/bits'
import { useSocialTick, ordinal, fmt } from '../components/social/hooks'
import { useAppMeta } from '../components/social/useAppMeta'
import { Table } from './Leagues'
import { worldTable } from '../social/api'
import { nickname } from '../social/identity'
import { todayIndex } from '../data/dailyStats'

const PERIODS = ['today', 'week', 'all']
const LABEL = { today: 'social.world.today', week: 'social.world.week', all: 'social.world.allTime' }
const TICK = ['identity', 'result']

export default function World() {
  const { t, lp, locale } = useI18n()
  useAppMeta(t('social.world.title'))
  const tick = useSocialTick(TICK)
  const [period, setPeriod] = useState('today')
  const [data, setData] = useState(undefined) // undefined = loading, null = offline

  useEffect(() => {
    let alive = true
    worldTable(period, todayIndex()).then(d => { if (alive) setData(d && !d.error ? d : null) })
    return () => { alive = false }
  }, [period, tick])

  const rows = data ? [...data.rows, ...(data.around.length ? [{ gap: true }, ...data.around] : [])] : []
  const named = !!nickname()

  return (
    <div className="tv-scene min-h-dvh text-primary">
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <SocialChrome />
        <div className="mt-4">
          <Overline className="flex items-center gap-1.5"><GlobeIcon className="w-3.5 h-3.5" />{t('social.world.board')}</Overline>
          <h1 className="score-number text-5xl sm:text-6xl leading-none tv-wordmark mt-1 mb-0">{t('social.world.title')}</h1>
          <p className="text-muted text-sm mt-2 mb-0 max-w-xl">{t('social.world.subtitle')}</p>
        </div>

        <Panel className="mt-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="inline-flex rounded-lg border border-border-strong bg-board p-0.5" role="tablist">
              {PERIODS.map(p => (
                <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}
                  className={`h-8 px-3 rounded-md text-[0.7rem] font-black tracking-[0.08em] uppercase transition-colors ${period === p ? 'bg-brand text-white' : 'text-muted hover:text-primary'}`}>
                  {t(LABEL[p])}
                </button>
              ))}
            </div>
            {data && (
              <span className="text-[0.75rem] text-muted">
                {data.me
                  ? <b className="text-primary">{t('social.world.you', { rank: ordinal(data.me.rank, locale), n: fmt(data.players, locale) })}</b>
                  : t('social.world.players', { n: fmt(data.players, locale) })}
              </span>
            )}
          </div>

          {data === undefined ? (
            <div className="h-40" aria-busy="true" />
          ) : data === null ? (
            <p className="text-muted text-sm m-0">{t('social.world.offline')}</p>
          ) : !rows.length ? (
            <p className="text-muted text-sm m-0">{t('social.world.empty')}</p>
          ) : (
            <div className="overflow-x-auto -mx-1"><Table rows={rows} t={t} locale={locale} /></div>
          )}

          {data && !data.me && rows.length > 0 && <p className="text-[0.78rem] text-secondary mt-4 mb-0">{t('social.world.notRanked')}</p>}
          {data?.me && !named && (
            <p className="text-[0.78rem] text-secondary mt-4 mb-0">
              {t('social.world.setName')} <Link to={lp('/me')} className="text-brand-bright font-bold hover:text-brand">{t('social.world.setNameCta')} ›</Link>
            </p>
          )}
        </Panel>
        <p className="text-[0.7rem] text-faint mt-4 mb-0">{t('social.world.fair')} {t('social.leagues.scoring')}</p>
      </div>
    </div>
  )
}
