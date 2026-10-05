// /leagues and /leagues/:code — private leagues. A league is a weekly table of
// matchday points (the same points the hub already shows) for a group of
// mates; join with a 6-character code or an invite link. Needs the social API
// (worker/api.js); without it the page says so and everything else still works.

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import SocialChrome from '../components/social/SocialChrome'
import SharePanel, { NameField } from '../components/social/SharePanel'
import GameMotif from '../components/GameMotif'
import { Overline, Panel, Crest, TableIcon } from '../components/social/bits'
import { useSocialTick, ordinal, fmt } from '../components/social/hooks'
import { useAppMeta } from '../components/social/useAppMeta'
import { createLeague, joinLeague, leaveLeague, getLeague, apiDown } from '../social/api'
import { useMyLeagues, refreshLeagues, noteChampion } from '../social/leagues'
import { leagueInviteUrl } from '../social/challenge'
import { nickname, setNickname } from '../social/identity'
import { bump, checkBadges } from '../social/badges'
import { scoreLabel } from '../social/scoring'
import { GAMES, gameShortTitle } from '../social/games'
import { todayIndex, DAILY_GAMES } from '../data/dailyStats'

const TICK = ['identity', 'leagues', 'result']
const input = 'flex-1 min-w-0 h-11 bg-board border border-border-strong rounded-lg px-3 text-body-lg sm:text-sm text-primary placeholder:text-faint focus:outline-none focus:border-brand'
const quiet = 'h-11 px-4 rounded-lg border border-border-strong bg-border/40 hover:bg-border text-secondary hover:text-primary text-sm font-bold transition-colors whitespace-nowrap'
const primary = 'h-11 px-5 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors whitespace-nowrap disabled:opacity-50'

const errText = (t, e) => t(`social.errors.${e}`) === `social.errors.${e}` ? t('social.errors.generic') : t(`social.errors.${e}`)

function Page({ children }) {
  return (
    <div className="tv-scene min-h-dvh text-primary">
      <div className="max-w-3xl mx-auto px-4 pb-16"><SocialChrome />{children}</div>
    </div>
  )
}

// ── /leagues ─────────────────────────────────────────────────────────────────
export function LeaguesIndex() {
  const { t, lp, locale } = useI18n()
  const nav = useNavigate()
  useSocialTick(TICK)
  useAppMeta(t('social.leagues.title'))
  const leagues = useMyLeagues()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const hasName = !!nickname()

  const create = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    const res = await createLeague(name)
    setBusy(false)
    if (!res) return setErr(t('social.leagues.offline'))
    if (res.error) return setErr(errText(t, res.error))
    bump('leaguesCreated'); checkBadges()
    await refreshLeagues(true)
    nav(lp(`/leagues/${res.code}`))
  }
  const join = (e) => {
    e.preventDefault()
    const c = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (c) nav(lp(`/leagues/${c}`))
  }

  return (
    <Page>
      <div className="mt-2 mb-5">
        <h1 className="score-number text-5xl sm:text-6xl leading-none tv-wordmark m-0">{t('social.leagues.title')}</h1>
        <p className="text-muted text-sm mt-2 mb-0 max-w-xl">{t('social.leagues.subtitle')}</p>
      </div>
      <div className="grid gap-4">
        <Panel>
          <Overline>{t('social.leagues.mine')}</Overline>
          {!leagues.length ? <p className="text-muted text-sm mt-2 mb-0">{apiDown() ? t('social.leagues.offline') : t('social.leagues.none')}</p> : (
            <div className="mt-3 flex flex-col gap-1.5">
              {leagues.map(l => (
                <Link key={l.code} to={lp(`/leagues/${l.code}`)} className="flex items-center gap-3 bg-board border border-border-strong rounded-xl px-4 py-3 hover:border-brand/50 transition-colors">
                  <span className="score-number text-3xl leading-none w-12 text-brand-bright">{ordinal(l.rank, locale)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-black text-primary truncate">{l.name}</span>
                    <span className="block text-[0.7rem] text-muted">
                      {t('social.leagues.members', { n: l.members })} · {l.rank === 1 ? t('social.leagues.leading') : t('social.leagues.ptsBehind', { n: l.leaderPts - l.pts })}
                    </span>
                  </span>
                  <span className="text-right"><b className="score-number text-2xl leading-none tabular-nums">{fmt(l.pts, locale)}</b><span className="block text-[0.55rem] font-bold tracking-[0.12em] text-muted">PTS</span></span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        {!hasName && (
          <Panel>
            <p className="text-sm text-secondary mt-0 mb-2">{t('social.leagues.needName')}</p>
            <NameField />
          </Panel>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Panel>
            <Overline>{t('social.leagues.create')}</Overline>
            <form className="flex gap-2 mt-3" onSubmit={create}>
              <input className={input} value={name} onChange={e => setName(e.target.value)} maxLength={32} placeholder={t('social.leagues.createPh')} />
              <button className={primary} disabled={busy || !name.trim() || !hasName}>{t('social.leagues.createBtn')}</button>
            </form>
          </Panel>
          <Panel>
            <Overline>{t('social.leagues.join')}</Overline>
            <form className="flex gap-2 mt-3" onSubmit={join}>
              <input className={`${input} uppercase tracking-[0.2em]`} value={code} onChange={e => setCode(e.target.value)} maxLength={8} placeholder={t('social.leagues.joinPh')} />
              <button className={quiet} disabled={!code.trim()}>{t('social.leagues.joinBtn')}</button>
            </form>
          </Panel>
        </div>
        {err && <p className="text-danger-bright text-sm m-0">{err}</p>}
        <p className="text-[0.7rem] text-faint m-0">{t('social.leagues.scoring')}</p>
      </div>
    </Page>
  )
}

// ── /leagues/:code ───────────────────────────────────────────────────────────
// Shared with /world. Rows: { rank, name, played, wins, perfect, pts, you, tied? }
// — a null name shows as Anonymous; a { gap: true } row draws a "…" separator.
export function Table({ rows, t, locale, showPerfect = true }) {
  const { lp } = useI18n()
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-[0.58rem] font-black tracking-[0.12em] uppercase text-muted">
          <th className="text-left px-2 pb-2 w-10">{t('social.leagues.pos')}</th>
          <th className="text-left px-2 pb-2">{t('social.leagues.player')}</th>
          <th className="px-2 pb-2">{t('social.leagues.p')}</th>
          <th className="px-2 pb-2">{t('social.leagues.w')}</th>
          {showPerfect && <th className="px-2 pb-2 text-warn">{t('social.leagues.perfect')}</th>}
          <th className="text-right px-2 pb-2">{t('social.leagues.pts')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => r.gap ? (
          <tr key={`gap-${i}`} className="border-t border-border"><td colSpan={showPerfect ? 6 : 5} className="px-2 py-1 text-center text-faint">…</td></tr>
        ) : (
          <tr key={r.pub || `${r.rank}-${i}`} className={`border-t border-border ${r.you ? 'bg-brand-tint' : ''}`}>
            <td className="px-2 py-2.5">
              <span className={`score-number text-xl leading-none ${r.rank === 1 && r.pts > 0 ? 'text-warn' : 'text-muted'}`}>{r.rank}{r.tied ? '=' : ''}</span>
            </td>
            <td className="px-2 py-2.5 font-bold text-primary">
              {r.name ?? <span className="text-muted font-semibold">{t('social.world.anonymous')}</span>}{r.you && <span className="ml-1.5 text-[0.55rem] font-black tracking-[0.12em] uppercase text-brand-bright">{t('social.leagues.you')}</span>}
              {/* Only on your own row, only while you're Anonymous: the shortest path to a name. */}
              {r.you && !r.name && (
                <Link to={lp('/me?name=1')} className="block sm:inline sm:ml-1.5 text-[0.66rem] font-semibold text-brand-bright hover:text-brand underline-offset-2 hover:underline whitespace-nowrap">
                  ({t('social.world.setNick')})
                </Link>
              )}
            </td>
            <td className="px-2 py-2.5 text-center text-secondary">{r.played}</td>
            <td className="px-2 py-2.5 text-center text-secondary">{r.wins}</td>
            {showPerfect && <td className="px-2 py-2.5 text-center text-warn">{r.perfect || ''}</td>}
            <td className="px-2 py-2.5 text-right score-number text-2xl leading-none">{fmt(r.pts, locale)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TodayGrid({ league, t, locale }) {
  const rows = league.week.map(m => ({ ...m, res: league.today[m.pub] || {} }))
    .map(m => ({ ...m, dayPts: Object.values(m.res).reduce((s, r) => s + (r.p || 0), 0) }))
    .sort((a, b) => b.dayPts - a.dayPts)
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="text-[0.7rem] tabular-nums min-w-full">
        <thead>
          <tr>
            <th className="sticky left-0 bg-surface text-left px-2 pb-2 text-[0.58rem] font-black tracking-[0.12em] uppercase text-muted">{t('social.leagues.player')}</th>
            {DAILY_GAMES.map(g => (
              <th key={g} className="px-1 pb-2" title={gameShortTitle(t, g)}>
                <GameMotif id={GAMES[g].id} className="w-4 h-4 mx-auto text-brand-bright" />
              </th>
            ))}
            <th className="px-2 pb-2 text-right text-[0.58rem] font-black tracking-[0.12em] uppercase text-muted">{t('social.leagues.pts')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(m => (
            <tr key={m.pub} className={`border-t border-border ${m.you ? 'bg-brand-tint' : ''}`}>
              <td className="sticky left-0 bg-surface px-2 py-2 font-bold text-primary whitespace-nowrap max-w-[8rem] truncate">{m.name}</td>
              {DAILY_GAMES.map(g => {
                const r = m.res[g]
                return (
                  <td key={g} className="px-1 py-2 text-center whitespace-nowrap">
                    {r ? <span className={`inline-block min-w-[2.2rem] rounded px-1 py-0.5 font-bold ${r.w ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger-bright'}`}>{scoreLabel(r, locale).replace(/ (pts|mistakes|guesses|players|in a row|fallos|intentos|jugadores|seguidas)$/, '')}</span>
                      : <span className="text-inert">·</span>}
                  </td>
                )
              })}
              <td className="px-2 py-2 text-right score-number text-lg leading-none">{m.dayPts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LeagueView() {
  const { code: raw } = useParams()
  const code = String(raw || '').toUpperCase()
  const { t, lp, locale } = useI18n()
  const nav = useNavigate()
  useSocialTick(TICK)
  const [league, setLeague] = useState(null)
  const [peek, setPeek] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | join | missing | offline
  const [tab, setTab] = useState('week')
  const [err, setErr] = useState(null)
  useAppMeta(league?.name || peek?.name || t('social.leagues.title'))

  const apply = useCallback((res) => {
    if (!res) return setState('offline')
    if (res.error === 'not_found') return setState('missing')
    if (res.error) return setState('offline')
    if (!res.member) {
      setPeek({ name: res.name, members: res.members })
      return setState('join')
    }
    setLeague(res)
    setState('ok')
    const champ = res.lastWeek?.[0]
    if (champ?.you) noteChampion(res.code, res.weekStart - 7)
  }, [])
  const load = useCallback(() => getLeague(code, todayIndex()).then(apply), [code, apply])

  useEffect(() => {
    let alive = true
    getLeague(code, todayIndex()).then(res => { if (alive) apply(res) })
    return () => { alive = false }
  }, [code, apply])
  useEffect(() => {
    if (state !== 'ok') return
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [state, load])

  const [joinName, setJoinName] = useState(nickname())
  const join = async () => {
    setErr(null)
    if (!nickname()) {
      if (!joinName.trim()) return setErr(t('social.leagues.needName'))
      setNickname(joinName)
    }
    const res = await joinLeague(code)
    if (!res) return setErr(t('social.leagues.offline'))
    if (res.error) return setErr(errText(t, res.error))
    await refreshLeagues(true)
    load()
  }
  const leave = async () => {
    if (!window.confirm(t('social.leagues.leaveConfirm'))) return
    await leaveLeague(code)
    await refreshLeagues(true)
    nav(lp('/leagues'))
  }

  if (state === 'loading') return <Page><div className="h-64" aria-busy="true" /></Page>
  if (state === 'offline') return <Page><Panel className="mt-4"><p className="text-muted m-0">{t('social.leagues.offline')}</p></Panel></Page>
  if (state === 'missing') return <Page><Panel className="mt-4"><p className="text-muted m-0">{t('social.leagues.notFound')}</p><Link to={lp('/leagues')} className="inline-block mt-3 text-brand-bright font-bold text-sm">← {t('social.leagues.title')}</Link></Panel></Page>

  if (state === 'join') {
    const hasName = !!nickname()
    return (
      <Page>
        <Panel className="tv-board mt-4 text-center py-10">
          <Overline>{t('social.leagues.joinTitle')}</Overline>
          <h1 className="score-number text-6xl sm:text-7xl leading-none tv-wordmark mt-3 mb-2">{peek?.name}</h1>
          <p className="text-muted text-sm m-0">{t('social.leagues.joinBody', { n: peek?.members ?? 0 })}</p>
          <div className="max-w-sm mx-auto mt-6 flex flex-col gap-3">
            {!hasName && (
              <>
                <p className="text-[0.75rem] text-secondary m-0">{t('social.leagues.needName')}</p>
                <input className={`${input} flex-none w-full`} value={joinName} onChange={e => setJoinName(e.target.value)} maxLength={20}
                  placeholder={t('social.me.nicknamePh')} aria-label={t('social.me.nickname')} onKeyDown={e => { if (e.key === 'Enter') join() }} />
              </>
            )}
            <button type="button" onClick={join} disabled={!hasName && !joinName.trim()} className={`${primary} w-full`}>{t('social.leagues.joinCta')}</button>
            {err && <p className="text-danger-bright text-sm m-0">{err}</p>}
          </div>
          <p className="text-[0.7rem] text-faint mt-6 mb-0">{t('social.leagues.scoring')}</p>
        </Panel>
      </Page>
    )
  }

  const me = league.week.find(r => r.you)
  const above = me ? league.week.filter(r => r.pts > me.pts).slice(-1)[0] : null
  const champ = league.lastWeek?.[0]
  const inviteUrl = leagueInviteUrl(league.code)
  const tabBtn = (id, label) => (
    <button key={id} type="button" onClick={() => setTab(id)}
      className={`h-9 px-3.5 rounded-lg text-[0.66rem] font-black tracking-[0.12em] uppercase border transition-colors ${tab === id ? 'bg-brand border-brand text-white' : 'border-border-strong text-muted hover:text-primary'}`}>{label}</button>
  )

  return (
    <Page>
      <div className="mt-2 mb-4 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Overline className="flex items-center gap-1.5"><TableIcon className="w-3.5 h-3.5" />{t('social.leagues.members', { n: league.week.length })} · {t('social.leagues.code')} {league.code}</Overline>
          <h1 className="score-number text-5xl sm:text-6xl leading-none tv-wordmark mt-1 mb-0 break-words">{league.name}</h1>
        </div>
        {me && (
          <div className="text-right">
            <div className="score-number text-5xl leading-none">{ordinal(me.rank, locale)}{me.tied ? '=' : ''}</div>
            <div className="text-[0.7rem] text-muted mt-1">
              {above ? t('social.leagues.nextUp', { n: above.pts - me.pts, name: above.name }) : t('social.leagues.leading')}
            </div>
          </div>
        )}
      </div>

      {champ && (
        <div className="flex items-center gap-3 bg-surface border border-warn/40 rounded-xl px-4 py-2.5 mb-4">
          <Crest tier="gold" mark="CUP" size={34} />
          <span className="text-sm"><span className="text-[0.6rem] font-black tracking-[0.14em] uppercase text-warn block">{t('social.leagues.champion')}</span>
            <b className="text-primary">{champ.name}</b> <span className="text-muted">· {fmt(champ.pts, locale)} pts</span></span>
        </div>
      )}

      <div className="grid md:grid-cols-[minmax(0,1fr)_18rem] gap-4 items-start">
        <Panel>
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {tabBtn('week', t('social.leagues.week'))}
            {tabBtn('today', t('social.leagues.today'))}
            {tabBtn('all', t('social.leagues.allTime'))}
          </div>
          {tab === 'week' && <Table rows={league.week} t={t} locale={locale} />}
          {tab === 'today' && <TodayGrid league={league} t={t} locale={locale} />}
          {tab === 'all' && <Table rows={league.allTime} t={t} locale={locale} />}
          <p className="text-[0.66rem] text-faint mt-4 mb-0">{t('social.leagues.resetsIn')} · {t('social.leagues.scoring')}</p>
        </Panel>

        <Panel>
          <Overline className="mb-3">{t('social.leagues.invite')}</Overline>
          <SharePanel game="league" url={inviteUrl} askName={false} preview={false}
            primaryLabel={t('social.leagues.invite')} copiedLabel={t('social.leagues.inviteCopied')}
            text={`${t('social.leagues.inviteText', { name: league.name, code: league.code })}\n${inviteUrl}`} />
          <div className="mt-4 text-center">
            <div className="text-[0.6rem] font-black tracking-[0.16em] uppercase text-muted">{t('social.leagues.code')}</div>
            <div className="score-number text-5xl tracking-[0.18em] leading-none mt-1">{league.code}</div>
          </div>
          <button type="button" onClick={leave} className="mt-6 w-full h-9 text-[0.7rem] font-bold text-muted hover:text-danger-bright">{t('social.leagues.leave')}</button>
        </Panel>
      </div>
    </Page>
  )
}
