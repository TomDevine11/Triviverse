import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GeoChrome, GeoFooter } from '../components/ui'
import GeoMotif from '../components/GeoMotif'
import { GEO_GAMES, geoAccentVars } from '../games'
import { geoDay } from '../data/day'
import { getMe, setNickname } from '../../social/identity'
import { createLeague, joinLeague, leaveLeague, getLeague, peekLeague, rename, apiDown } from '../social/api'
import { useGeoLeagues, refreshLeagues, emitGeo, chaseLine } from '../social/leagues'
import { SITE_URL } from '../seo'
import { t } from '../strings'
import '../geography.css'

// Triviverse Geography leagues: private weekly tables, the same format as
// Triviverse Football's but their own (geography dailies only, /api/geo).
// /geography/leagues — yours, start one, join with a code
// /geography/leagues/:code — the table (week · today · all-time), invite, leave

const input = 'h-11 min-w-0 flex-1 rounded-lg border border-border-strong bg-canvas px-3 text-sm text-primary placeholder:text-faint focus:outline-none focus:border-brand-bright'
const primary = 'h-11 px-5 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const quiet = 'h-11 px-5 rounded-lg border border-border-strong text-secondary hover:text-primary text-sm font-bold transition-colors disabled:opacity-50'
const members = (n) => (n === 1 ? t('leagues.member') : t('leagues.members', { n }))
const errText = (e) => t(`leagues.errors.${e}`) === `leagues.errors.${e}` ? t('leagues.errors.generic') : t(`leagues.errors.${e}`)

function useNoindex(title) {
  useEffect(() => {
    document.title = `${title} | Triviverse Geography`
    let m = document.querySelector('meta[name="robots"][data-app]')
    if (!m) { m = document.createElement('meta'); m.name = 'robots'; m.setAttribute('data-app', ''); document.head.appendChild(m) }
    m.content = 'noindex'
    return () => m.remove()
  }, [title])
}

export function Page({ children, right }) {
  return (
    <div className="tv-scene min-h-dvh text-primary">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 pb-4">
        <GeoChrome right={right} />
        {children}
        <GeoFooter />
      </div>
    </div>
  )
}
export const Panel = ({ children, className = '' }) => <section className={`bg-surface border border-border-strong rounded-2xl p-4 sm:p-5 shadow-panel ${className}`}>{children}</section>
export const Overline = ({ children, className = '' }) => <div className={`text-[0.6rem] font-black tracking-[0.16em] uppercase text-muted ${className}`}>{children}</div>

// The nickname gate: leagues show names, so creating or joining needs one.
function NameField({ onSaved }) {
  const [name, setName] = useState(getMe().name)
  const save = async () => {
    if (!name.trim()) return
    setNickname(name)
    await rename()
    onSaved?.(getMe().name)
  }
  return (
    <div className="flex gap-2">
      <input className={input} value={name} onChange={e => setName(e.target.value)} maxLength={20} placeholder={t('leagues.namePh')} aria-label={t('basecamp.nickname')}
        onKeyDown={e => { if (e.key === 'Enter') save() }} />
      <button type="button" className={quiet} onClick={save} disabled={!name.trim()}>{t('leagues.nameSave')}</button>
    </div>
  )
}

export function GeoLeaguesIndex() {
  useNoindex(t('leagues.title'))
  const nav = useNavigate()
  const leagues = useGeoLeagues()
  const [hasName, setHasName] = useState(!!getMe().name)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const create = async (e) => {
    e.preventDefault()
    if (!name.trim() || !hasName || busy) return
    setBusy(true); setErr('')
    const res = await createLeague(name)
    setBusy(false)
    if (!res) return setErr(t('leagues.offline'))
    if (res.error) return setErr(errText(res.error))
    await refreshLeagues(true)
    emitGeo('leagues')
    nav(`/geography/leagues/${res.code}`)
  }
  const join = (e) => {
    e.preventDefault()
    const c = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (c) nav(`/geography/leagues/${c}`)
  }

  return (
    <Page right={<Link to="/geography/basecamp" className="hover:text-primary">{t('race.camp').toUpperCase()} ›</Link>}>
      <div className="pt-2 pb-5">
        <h1 className="score-number uppercase text-5xl sm:text-6xl leading-none tv-wordmark m-0">{t('leagues.title')}</h1>
        <p className="text-muted text-sm mt-2 mb-0 max-w-xl">{t('leagues.subtitle')}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Panel>
          <Overline>{t('leagues.mine')}</Overline>
          {!leagues.length ? <p className="text-muted text-sm mt-2 mb-0">{apiDown() ? t('leagues.offline') : t('leagues.none')}</p> : (
            <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-1.5">
              {leagues.map(l => (
                <li key={l.code}>
                  <Link to={`/geography/leagues/${l.code}`} className="flex items-center gap-3 rounded-xl border border-border bg-board px-3 py-2.5 hover:border-brand/50 transition-colors">
                    <span className="score-number text-[1.6rem] leading-none text-secondary w-8 text-center">{l.rank}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-primary text-[0.92rem] truncate">{l.name}</b>
                      <span className="block text-[0.72rem] text-muted truncate">{members(l.members)} · {chaseLine(l, t)}</span>
                    </span>
                    <span className="text-right shrink-0"><b className="block tabular-nums text-primary">{l.pts.toLocaleString('en-GB')}</b><span className="text-[0.6rem] font-black tracking-[0.12em] uppercase text-muted">{t('leagues.pts')}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {!hasName && (
          <Panel>
            <p className="text-sm text-secondary mt-0 mb-2">{t('leagues.needName')}</p>
            <NameField onSaved={(n) => setHasName(!!n)} />
          </Panel>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Panel>
            <Overline>{t('leagues.create')}</Overline>
            <form onSubmit={create} className="mt-3 flex gap-2">
              <input className={input} value={name} onChange={e => setName(e.target.value)} maxLength={32} placeholder={t('leagues.createPh')} aria-label={t('leagues.create')} />
              <button className={primary} disabled={busy || !name.trim() || !hasName}>{t('leagues.createBtn')}</button>
            </form>
          </Panel>
          <Panel>
            <Overline>{t('leagues.join')}</Overline>
            <form onSubmit={join} className="mt-3 flex gap-2">
              <input className={`${input} uppercase tracking-[0.2em]`} value={code} onChange={e => setCode(e.target.value)} maxLength={8} placeholder={t('leagues.joinPh')} aria-label={t('leagues.join')} />
              <button className={quiet} disabled={!code.trim()}>{t('leagues.joinBtn')}</button>
            </form>
          </Panel>
        </div>
        {err && <p className="m-0 text-sm text-danger-bright" role="alert">{err}</p>}
        <p className="text-[0.7rem] text-faint m-0">{t('leagues.scoring')} {t('leagues.footballNote')}</p>
      </div>
    </Page>
  )
}

function Table({ rows }) {
  return (
    <table className="w-full text-[0.82rem] border-collapse">
      <thead>
        <tr className="text-[0.58rem] font-black tracking-[0.12em] uppercase text-muted">
          <th className="text-left px-2 pb-2 w-10">{t('leagues.pos')}</th>
          <th className="text-left px-2 pb-2">{t('leagues.player')}</th>
          <th className="px-2 pb-2">{t('leagues.p')}</th>
          <th className="px-2 pb-2">{t('leagues.w')}</th>
          <th className="px-2 pb-2 text-warn">{t('leagues.perfect')}</th>
          <th className="text-right px-2 pb-2">{t('leagues.pts')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.pub} className={r.you ? 'bg-brand-tint' : 'border-t border-border'}>
            <td className="px-2 py-2"><span className="score-number text-[1.1rem] text-secondary">{r.tied ? '=' : ''}{r.rank}</span></td>
            <td className="px-2 py-2 font-bold text-primary truncate max-w-[10rem]">
              {r.name && r.name !== '—' ? r.name : <span className="text-muted font-semibold">{t('leagues.anonymous')}</span>}
              {r.you && <span className="ml-1.5 text-[0.55rem] font-black tracking-[0.12em] uppercase text-brand-bright">{t('leagues.you')}</span>}
            </td>
            <td className="px-2 py-2 text-center tabular-nums text-secondary">{r.played}</td>
            <td className="px-2 py-2 text-center tabular-nums text-secondary">{r.wins}</td>
            <td className="px-2 py-2 text-center tabular-nums text-warn">{r.perfect || ''}</td>
            <td className="px-2 py-2 text-right tabular-nums font-extrabold text-primary">{r.pts.toLocaleString('en-GB')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const label = (r) => {
  if (!r) return ''
  if (r.of) return r.low && !r.w ? `X/${r.of}` : `${r.v ?? 0}/${r.of}`
  return r.v != null ? Number(r.v).toLocaleString('en-GB') : r.w ? '✓' : '✗'
}

// Today: every member × every geography daily.
function TodayGrid({ league }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[0.75rem] border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-surface text-left px-2 pb-2 text-[0.58rem] font-black tracking-[0.12em] uppercase text-muted">{t('leagues.player')}</th>
            {GEO_GAMES.map(g => (
              <th key={g.id} className="px-1 pb-2" title={t(`games.${g.id}.title`)} style={geoAccentVars(g.id)}>
                <GeoMotif id={g.id} className="w-4 h-4 mx-auto text-accent-bright" /><span className="sr-only">{t(`games.${g.id}.title`)}</span>
              </th>
            ))}
            <th className="px-2 pb-2 text-right text-[0.58rem] font-black tracking-[0.12em] uppercase text-muted">{t('leagues.pts')}</th>
          </tr>
        </thead>
        <tbody>
          {league.week.map(m => {
            const day = league.today[m.pub] || {}
            const pts = Object.values(day).reduce((s, r) => s + (r.p || 0), 0)
            return (
              <tr key={m.pub} className={m.you ? 'bg-brand-tint' : 'border-t border-border'}>
                <td className="sticky left-0 bg-inherit px-2 py-1.5 font-bold text-primary truncate max-w-[7rem]">{m.name && m.name !== '—' ? m.name : t('leagues.anonymous')}</td>
                {GEO_GAMES.map(g => {
                  const r = day[g.id]
                  return (
                    <td key={g.id} className="px-0.5 py-1.5 text-center">
                      {r ? <span title={label(r)} className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[0.68rem] font-black ${r.w ? 'bg-success/20 text-success-bright' : 'bg-danger/15 text-danger-bright'}`}>{r.w ? '✓' : '✗'}</span>
                        : <span className="inline-block w-6 h-6 rounded-md bg-inert/40" aria-label="—" />}
                    </td>
                  )
                })}
                <td className="px-2 py-1.5 text-right tabular-nums font-extrabold text-primary">{pts}{day.perfect ? <span className="text-warn"> ★</span> : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function GeoLeagueView() {
  const { code: raw } = useParams()
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  const [league, setLeague] = useState(null)
  const [peek, setPeek] = useState(null)
  const [state, setState] = useState('loading') // loading | member | invite | missing | offline
  const [tab, setTab] = useState('week')
  const [hasName, setHasName] = useState(!!getMe().name)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const nav = useNavigate()
  useNoindex(league?.name || peek?.name || t('leagues.title'))

  useEffect(() => {
    let alive = true
    getLeague(code, geoDay()).then(async res => {
      if (!alive) return
      if (!res) return setState('offline')
      if (res.error) return setState(res.error === 'not_found' ? 'missing' : 'offline')
      if (res.member) { setLeague(res); setState('member'); return }
      const p = await peekLeague(code)
      if (!alive) return
      setPeek(p && !p.error ? p : { name: res.name, members: res.members })
      setState('invite')
    })
    return () => { alive = false }
  }, [code, reloadKey])

  const join = async () => {
    setErr('')
    const res = await joinLeague(code)
    if (!res) return setErr(t('leagues.offline'))
    if (res.error) return setErr(errText(res.error))
    await refreshLeagues(true)
    emitGeo('leagues')
    setState('loading')
    setReloadKey(k => k + 1)
  }
  const leave = async () => {
    if (!confirmLeave) { setConfirmLeave(true); return }
    await leaveLeague(code)
    await refreshLeagues(true)
    emitGeo('leagues')
    nav('/geography/leagues')
  }
  const inviteUrl = `${SITE_URL}/geography/leagues/${code}`
  const copyInvite = async () => {
    const text = `${t('leagues.inviteText', { name: league.name, code })}\n${inviteUrl}`
    if (typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)').matches) {
      try { await navigator.share({ text }) } catch { /* cancelled */ }
      return
    }
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* blocked */ }
  }
  const back = <Link to="/geography/leagues" className="hover:text-primary">‹ {t('leagues.back').toUpperCase()}</Link>

  if (state === 'loading') return <Page right={back}><Panel className="mt-4"><p className="text-muted m-0 text-sm">…</p></Panel></Page>
  if (state === 'offline') return <Page right={back}><Panel className="mt-4"><p className="text-muted m-0">{t('leagues.offline')}</p></Panel></Page>
  if (state === 'missing') return <Page right={back}><Panel className="mt-4"><p className="text-muted m-0">{t('leagues.notFound')}</p><Link to="/geography/leagues" className="inline-block mt-3 text-brand-bright font-bold text-sm">← {t('leagues.back')}</Link></Panel></Page>

  if (state === 'invite') {
    return (
      <Page right={back}>
        <Panel className="mt-4 max-w-md mx-auto text-center">
          <Overline>{t('leagues.joinTitle')}</Overline>
          <h1 className="score-number uppercase text-4xl sm:text-5xl leading-none tv-wordmark mt-2 mb-2">{peek?.name}</h1>
          <p className="text-muted text-sm m-0">{t('leagues.joinBody', { n: peek?.members ?? 0 })}</p>
          <div className="mt-5 flex flex-col gap-2 text-left">
            {!hasName && (<><p className="text-[0.75rem] text-secondary m-0">{t('leagues.needName')}</p><NameField onSaved={(n) => setHasName(!!n)} /></>)}
            <button type="button" onClick={join} disabled={!hasName} className={`${primary} w-full`}>{t('leagues.joinCta')}</button>
            {err && <p className="m-0 text-sm text-danger-bright" role="alert">{err}</p>}
          </div>
          <p className="text-[0.7rem] text-faint mt-6 mb-0">{t('leagues.scoring')}</p>
        </Panel>
      </Page>
    )
  }

  const me = league.week.find(r => r.you)
  const above = me ? [...league.week].reverse().find(r => r.pts > me.pts) : null
  const champ = league.lastWeek?.[0]
  const tabBtn = (id, text) => (
    <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
      className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${tab === id ? 'bg-brand text-white' : 'text-muted hover:text-secondary'}`}>{text}</button>
  )
  return (
    <Page right={back}>
      <div className="pt-2 pb-4">
        <Overline>{members(league.week.length)} · {t('leagues.code')} {league.code}</Overline>
        <h1 className="score-number uppercase text-5xl sm:text-6xl leading-none tv-wordmark mt-1 mb-1">{league.name}</h1>
        {me && <p className="m-0 text-sm font-bold text-brand-bright">{above ? t('leagues.nextUp', { n: above.pts - me.pts, name: above.name }) : t('leagues.leading')}</p>}
      </div>
      <div className="flex flex-col gap-3">
        {champ && (
          <Panel className="flex items-center gap-3 !py-3">
            <span className="text-warn text-xl" aria-hidden="true">★</span>
            <span className="text-sm"><span className="text-[0.6rem] font-black tracking-[0.14em] uppercase text-warn block">{t('leagues.champion')}</span><b className="text-primary">{champ.name}</b> · {champ.pts} {t('leagues.pts').toLowerCase()}</span>
          </Panel>
        )}
        <Panel>
          <div className="inline-flex rounded-lg border border-border bg-canvas p-0.5 mb-3">
            {tabBtn('week', t('leagues.week'))}{tabBtn('today', t('leagues.today'))}{tabBtn('all', t('leagues.allTime'))}
          </div>
          {tab === 'today' ? <TodayGrid league={league} /> : <Table rows={tab === 'week' ? league.week : league.allTime} />}
          <p className="text-[0.66rem] text-faint mt-4 mb-0">{t('leagues.resets')} · {t('leagues.scoring')}</p>
        </Panel>
        <Panel>
          <Overline className="mb-3">{t('leagues.inviteOver')}</Overline>
          <div className="flex items-center gap-3">
            <button type="button" onClick={copyInvite} className={`${primary} flex-1`} aria-live="polite">{copied ? t('leagues.inviteCopied') : t('leagues.invite')}</button>
            <div className="text-center shrink-0"><div className="text-[0.6rem] font-black tracking-[0.16em] uppercase text-muted">{t('leagues.code')}</div><div className="score-number text-[1.6rem] leading-none tracking-[0.08em]">{league.code}</div></div>
          </div>
          <button type="button" onClick={leave} onBlur={() => setConfirmLeave(false)}
            className={`mt-5 w-full h-9 text-[0.72rem] font-bold rounded-lg transition-colors ${confirmLeave ? 'bg-danger/15 border border-danger/50 text-danger-bright' : 'text-muted hover:text-danger-bright'}`}>
            {confirmLeave ? t('leagues.leaveConfirm') : t('leagues.leave')}
          </button>
        </Panel>
      </div>
    </Page>
  )
}
