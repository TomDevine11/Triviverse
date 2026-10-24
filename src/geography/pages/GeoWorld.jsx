import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { geoDay } from '../data/day'
import { getMe } from '../../social/identity'
import { worldTable } from '../social/api'
import { Page, Panel, Overline, Table } from './GeoLeagues'
import { t } from '../strings'
import '../geography.css'

// /geography/world — the public geography leaderboard: everyone's points from
// the geography dailies for today, this week or all time (/api/geo/world, the
// same handler and fairness rules as football's /world, on geography's tables).
// Top 50, plus your own row under a gap if you're further down.

const PERIODS = ['today', 'week', 'all']
const LABEL = { today: 'leagues.today', week: 'leagues.week', all: 'leagues.allTime' }

export default function GeoWorld() {
  useEffect(() => {
    document.title = `${t('world.title')} | Triviverse Geography`
    let m = document.querySelector('meta[name="robots"][data-app]')
    if (!m) { m = document.createElement('meta'); m.name = 'robots'; m.setAttribute('data-app', ''); document.head.appendChild(m) }
    m.content = 'noindex'
    return () => m.remove()
  }, [])
  const [period, setPeriod] = useState('today')
  const [data, setData] = useState(undefined) // undefined = loading, null = offline
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const on = () => setTick(n => n + 1) // a result or a rename landed
    window.addEventListener('tvg-social', on)
    return () => window.removeEventListener('tvg-social', on)
  }, [])
  useEffect(() => {
    let alive = true
    worldTable(period, geoDay()).then(d => { if (alive) setData(d && !d.error ? d : null) })
    return () => { alive = false }
  }, [period, tick])

  const rows = data ? [...data.rows, ...(data.around.length ? [{ gap: true }, ...data.around] : [])] : []
  const n = data ? data.players.toLocaleString('en-GB') : ''

  return (
    <Page right={<Link to="/geography/leagues" className="hover:text-primary">{t('leagues.title').toUpperCase()} ›</Link>}>
      <div className="pt-2 pb-5">
        <Overline>{t('race.worldBoard')}</Overline>
        <h1 className="score-number uppercase text-5xl sm:text-6xl leading-none tv-wordmark mt-1 mb-0">{t('world.title')}</h1>
        <p className="text-muted text-sm mt-2 mb-0 max-w-xl">{t('world.subtitle')}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Panel>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="inline-flex rounded-lg border border-border bg-canvas p-0.5" role="tablist">
              {PERIODS.map(p => (
                <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${period === p ? 'bg-brand text-white' : 'text-muted hover:text-secondary'}`}>
                  {t(LABEL[p])}
                </button>
              ))}
            </div>
            {data && (
              <span className="text-[0.75rem] text-muted">
                {data.me ? <b className="text-primary">{t('world.you', { rank: data.me.rank, n })}</b> : t('world.players', { n })}
              </span>
            )}
          </div>

          {data === undefined ? (
            <div className="h-40" aria-busy="true" />
          ) : data === null ? (
            <p className="text-muted text-sm m-0">{t('world.offline')}</p>
          ) : !rows.length ? (
            <p className="text-muted text-sm m-0">{t('world.empty')}</p>
          ) : (
            <div className="overflow-x-auto -mx-1"><Table rows={rows} /></div>
          )}

          {data && !data.me && rows.length > 0 && <p className="text-[0.78rem] text-secondary mt-4 mb-0">{t('world.notRanked')}</p>}
          {data?.me && !getMe().name && (
            <p className="text-[0.78rem] text-secondary mt-4 mb-0">
              {t('world.setName')} <Link to="/geography/basecamp" className="text-brand-bright font-bold hover:text-brand">{t('world.setNameCta')} ›</Link>
            </p>
          )}
        </Panel>
        <p className="text-[0.7rem] text-faint m-0">{t('world.fair')} {t('leagues.scoring')} {t('world.footballNote')}</p>
      </div>
    </Page>
  )
}
