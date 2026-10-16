import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GeoMotif from '../components/GeoMotif'
import { GEO_GAMES, geoAccentVars } from '../games'
import { geoDay } from '../data/day'
import { loadStats } from '../data/progress'
import { getMe, setNickname } from '../../social/identity'
import { rename } from '../social/api'
import { loadLog, byDay, dayStreak, isPerfect } from '../social/log'
import { useGeoLeagues, chaseLine } from '../social/leagues'
import { Page, Panel, Overline } from './GeoLeagues'
import { t } from '../strings'
import '../geography.css'

// Base Camp — Triviverse Geography's take on football's Dugout: your name, the
// geography day streak, perfect days, per-game records, a 16-week calendar and
// your leagues. Everything here is read from this browser (no account).

const WEEKS = 16

// Score games keep a best score; guess games a best streak.
const SCORE_GAMES = new Set(['postcard', 'milestone', 'outrank'])

function Calendar({ days, today }) {
  // Columns are Monday-start weeks, the last one containing today.
  const monday = today - ((today + 3) % 7)
  const start = monday - (WEEKS - 1) * 7
  const cols = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => start + w * 7 + d))
  const cell = (day) => {
    if (day > today) return 'bg-transparent'
    const rows = days.get(day)
    if (!rows) return 'bg-inert/45'
    if (isPerfect(rows)) return 'bg-warn shadow-[0_0_6px_rgb(251_191_36/0.6)]'
    return rows.length >= 4 ? 'bg-brand-bright' : rows.length >= 2 ? 'bg-brand' : 'bg-brand/55'
  }
  return (
    <div>
      <div className="grid grid-flow-col gap-[3px] sm:gap-1 justify-start" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }} role="img" aria-label={t('basecamp.calendarAria')}>
        {cols.flat().map(day => (
          <span key={day} title={day <= today ? `${days.get(day)?.length || 0}/${GEO_GAMES.length}` : undefined}
            className={`w-[0.95rem] h-[0.95rem] sm:w-4 sm:h-4 rounded-[3px] ${cell(day)} ${day === today ? 'ring-1 ring-primary/70' : ''}`} />
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-3 text-[0.66rem] text-muted">
        <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded-[3px] bg-inert/45" />{t('basecamp.legendNone')}</span>
        <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded-[3px] bg-brand" />{t('basecamp.legendSome')}</span>
        <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded-[3px] bg-warn" />{t('basecamp.legendPerfect')}</span>
      </div>
    </div>
  )
}

export default function GeoBaseCamp() {
  useEffect(() => { document.title = 'Base Camp | Triviverse Geography' }, [])
  const [name, setName] = useState(getMe().name)
  const [saved, setSaved] = useState(false)
  const leagues = useGeoLeagues()
  const today = geoDay()
  const log = loadLog()
  const camp = dayStreak(log, today)
  const days = byDay(log)

  const save = async () => {
    setNickname(name)
    setName(getMe().name)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    await rename()
  }

  return (
    <Page right={<Link to="/geography/leagues" className="hover:text-primary">{t('leagues.title').toUpperCase()} ›</Link>}>
      <div className="pt-2 pb-5">
        <h1 className="score-number uppercase text-5xl sm:text-6xl leading-none tv-wordmark m-0">{t('basecamp.title')}</h1>
        <p className="text-muted text-sm mt-2 mb-0 max-w-xl">{t('basecamp.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Panel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[[camp.streak, t('basecamp.streak'), 'text-warn'], [camp.best, t('basecamp.best'), 'text-primary'], [camp.perfect, t('basecamp.perfect'), 'text-warn'], [camp.days, t('basecamp.days'), 'text-primary']].map(([v, l, c]) => (
              <div key={l}><div className={`score-number text-[2.4rem] leading-none tabular-nums ${c}`}>{v}</div><div className="text-[0.58rem] font-black tracking-[0.14em] uppercase text-muted mt-1">{l}</div></div>
            ))}
          </div>
          {camp.atRisk && <p className="m-0 mt-3 text-center text-[0.78rem] font-bold text-warn">{t('basecamp.atRisk')}</p>}
        </Panel>

        <Panel>
          <Overline className="mb-2">{t('basecamp.nickname')}</Overline>
          <div className="flex gap-2">
            <input className="h-11 min-w-0 flex-1 rounded-lg border border-border-strong bg-canvas px-3 text-sm text-primary placeholder:text-faint focus:outline-none focus:border-brand-bright"
              value={name} onChange={e => setName(e.target.value)} maxLength={20} placeholder={t('leagues.namePh')} aria-label={t('basecamp.nickname')}
              onKeyDown={e => { if (e.key === 'Enter') save() }} />
            <button type="button" onClick={save} className="h-11 px-5 rounded-lg border border-border-strong text-secondary hover:text-primary text-sm font-bold transition-colors" aria-live="polite">{saved ? '✓' : t('leagues.nameSave')}</button>
          </div>
          <p className="m-0 mt-2 text-[0.72rem] text-muted">{t('basecamp.nicknameHint')}</p>
        </Panel>

        <Panel>
          <Overline className="mb-3">{t('basecamp.calendar')}</Overline>
          <div className="overflow-x-auto"><Calendar days={days} today={today} /></div>
        </Panel>

        <Panel>
          <Overline className="mb-2">{t('basecamp.records')}</Overline>
          <table className="w-full text-[0.82rem] border-collapse">
            <thead>
              <tr className="text-[0.58rem] font-black tracking-[0.12em] uppercase text-muted">
                <th className="text-left px-1.5 pb-2">{t('basecamp.game')}</th>
                <th className="px-1.5 pb-2">{t('basecamp.played')}</th>
                <th className="px-1.5 pb-2">{t('basecamp.wins')}</th>
                <th className="px-1.5 pb-2">{t('basecamp.current')}</th>
                <th className="text-right px-1.5 pb-2">{t('basecamp.top')}</th>
              </tr>
            </thead>
            <tbody>
              {GEO_GAMES.map(g => {
                const s = loadStats(g.id)
                const top = SCORE_GAMES.has(g.id) ? (s.best ? s.best.toLocaleString('en-GB') : '—') : s.maxStreak
                return (
                  <tr key={g.id} className="border-t border-border" style={geoAccentVars(g.id)}>
                    <td className="px-1.5 py-2"><Link to={g.route} className="inline-flex items-center gap-2 font-bold text-primary hover:text-accent-bright"><GeoMotif id={g.id} className="w-4 h-4 text-accent-bright" />{t(`games.${g.id}.title`)}</Link></td>
                    <td className="px-1.5 py-2 text-center tabular-nums text-secondary">{s.played}</td>
                    <td className="px-1.5 py-2 text-center tabular-nums text-secondary">{s.played ? `${Math.round((s.wins / s.played) * 100)}%` : '—'}</td>
                    <td className="px-1.5 py-2 text-center tabular-nums text-warn">{s.streak || ''}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums font-extrabold text-primary">{top}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between mb-2">
            <Overline>{t('basecamp.leagues')}</Overline>
            <Link to="/geography/leagues" className="text-[0.72rem] font-extrabold text-brand-bright hover:text-brand">{t('basecamp.leaguesCta')}</Link>
          </div>
          {!leagues.length ? <p className="m-0 text-sm text-muted">{t('basecamp.noLeagues')}</p> : (
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
              {leagues.map(l => (
                <li key={l.code}><Link to={`/geography/leagues/${l.code}`} className="flex items-center justify-between gap-3 text-sm hover:text-primary">
                  <span className="min-w-0 truncate"><b className="score-number font-normal text-secondary mr-2">{l.rank}</b><b className="text-primary">{l.name}</b></span>
                  <span className="text-[0.72rem] text-muted truncate">{chaseLine(l, t)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Page>
  )
}
