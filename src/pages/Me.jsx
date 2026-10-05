// /me — "Your dressing room". Everything the site knows about you, all local:
// streak + freezes, this week, a 16-week calendar, per-game records, the trophy
// cabinet, head-to-heads against mates, your leagues, the daily reminder, and
// moving your stats to another device.

import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import SocialChrome from '../components/social/SocialChrome'
import { Overline, Panel, Crest, FlameIcon, FreezeIcon, CalendarIcon } from '../components/social/bits'
import { useCountdown, useSocialTick, ordinal, fmt } from '../components/social/hooks'
import { NameField } from '../components/social/SharePanel'
import ReminderSheet from '../components/social/ReminderSheet'
import GameMotif from '../components/GameMotif'
import { useAppMeta } from '../components/social/useAppMeta'
import { getStreak, FREEZE_CAP } from '../social/streak'
import { loadLog } from '../social/log'
import { badgeCabinet } from '../social/badges'
import { rivalTable } from '../social/challenge'
import { compareResults, scoreLabel } from '../social/scoring'
import { useMyLeagues } from '../social/leagues'
import { GAMES, gameShortTitle } from '../social/games'
import { exportCode, decodeCode, applySnapshot } from '../social/transfer'
import { putTransfer, getTransfer } from '../social/api'
import { getStats, weeklyPoints, todayIndex, weekStart, DAILY_GAMES } from '../data/dailyStats'
import { loadJson } from '../social/store'

const TICK = ['result', 'badges', 'rivals', 'import', 'identity', 'streak', 'leagues']

function StreakHero({ t }) {
  const s = getStreak()
  const countdown = useCountdown()
  const [remind, setRemind] = useState(false)
  const pref = loadJson('ftg-reminder-v1', null)
  return (
    <Panel className="tv-board relative overflow-hidden">
      <Overline>{t('social.me.streak')}</Overline>
      <div className="flex items-end gap-4 mt-2">
        <div className={`flex items-center gap-1.5 ${s.streak ? 'text-warn' : 'text-dim'}`}>
          <FlameIcon className="w-10 h-10" />
          <span className="score-number text-7xl leading-[0.85] tabular-nums tv-wordmark">{s.streak}</span>
        </div>
        <div className="pb-1 min-w-0">
          <div className="text-sm font-bold text-primary">
            {s.atRisk ? <span className="text-warn">{t('social.streak.atRisk', { n: s.streak })}</span>
              : s.streak ? t('social.streak.keepAlive', { n: s.streak + 1 }) : t('social.streak.startToday')}
          </div>
          <div className="text-[0.7rem] text-muted mt-1 tabular-nums">
            {t('social.streak.best', { n: s.best })} · {t('social.streak.nextMatchday', { t: countdown })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <div className="flex items-center gap-1.5" title={t('social.streak.freezeHelp')}>
          {Array.from({ length: FREEZE_CAP }, (_, i) => (
            <span key={i} className={`w-8 h-8 rounded-lg border flex items-center justify-center ${i < s.freezes ? 'border-brand/60 bg-brand-tint text-brand-bright' : 'border-border-strong text-inert'}`}>
              <FreezeIcon className="w-4 h-4" />
            </span>
          ))}
          <span className="text-[0.7rem] text-muted ml-1">
            {s.freezes === 1 ? t('social.streak.freezes', { n: 1 }) : t('social.streak.freezesMany', { n: s.freezes })}
            {s.toNextFreeze != null && s.streak > 0 && <> · {t('social.streak.nextFreeze', { n: s.toNextFreeze })}</>}
          </span>
        </div>
        <button type="button" onClick={() => setRemind(true)}
          className="ml-auto h-9 px-3 flex items-center gap-2 rounded-lg border border-border-strong text-secondary hover:text-primary hover:border-brand/50 text-[0.72rem] font-bold transition-colors">
          <CalendarIcon />{pref ? `${t('social.me.reminder')} · ${pref.time}` : t('social.reminder.button')}
        </button>
      </div>
      <p className="text-[0.66rem] text-faint mt-3 mb-0">{t('social.streak.freezeHelp')}</p>
      {remind && <ReminderSheet onClose={() => setRemind(false)} />}
    </Panel>
  )
}

function Heatmap({ log, frozen, t }) {
  const today = todayIndex()
  const end = weekStart(today) + 6
  const start = end - 16 * 7 + 1
  const byDay = new Map()
  for (const r of log) {
    if (r.d < start) continue
    const e = byDay.get(r.d) || { n: 0, perfect: false }
    if (r.g === 'perfect') e.perfect = true
    else e.n++
    byDay.set(r.d, e)
  }
  const frozenSet = new Set(frozen)
  const level = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 8 ? 3 : 4)
  const shade = ['bg-inert/40', 'bg-brand/30', 'bg-brand/55', 'bg-brand/80', 'bg-brand-bright']
  const weeks = Array.from({ length: 16 }, (_, w) => Array.from({ length: 7 }, (_, d) => start + w * 7 + d))
  return (
    <div>
      <div className="flex gap-[3px] sm:gap-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] sm:gap-1.5 flex-1 max-w-[2rem]">
            {week.map(d => {
              const e = byDay.get(d)
              const future = d > today
              const cls = future ? 'bg-transparent border border-border/40'
                : e?.perfect ? 'bg-warn'
                  : frozenSet.has(d) ? 'bg-transparent border border-brand-bright/70'
                    : shade[level(e?.n || 0)]
              return <i key={d} title={e ? `${e.n}` : ''} className={`block aspect-square w-full rounded-[3px] ${cls} ${d === today ? 'ring-1 ring-primary/70' : ''}`} />
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-2 text-[0.6rem] text-muted">
        {t('social.me.less')}
        {shade.map((c, i) => <i key={i} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />)}
        {t('social.me.more')}
        <i className="w-2.5 h-2.5 rounded-[2px] bg-warn ml-2" />★
        <i className="w-2.5 h-2.5 rounded-[2px] border border-brand-bright/70 ml-2" /><FreezeIcon className="w-3 h-3" />
      </div>
    </div>
  )
}

function Records({ log, t, locale }) {
  const rows = DAILY_GAMES.map(g => {
    const mine = log.filter(r => r.g === g)
    if (!mine.length) return null
    const st = getStats(g)
    const wins = mine.filter(r => r.w).length
    const scored = mine.filter(r => r.v != null)
    const best = scored.slice().sort((a, b) => -compareResults(a, b))[0]
    const wonScored = scored.filter(r => r.w)
    const avgPool = wonScored.length ? wonScored : scored
    const avg = avgPool.length ? avgPool.reduce((s, r) => s + Number(r.v), 0) / avgPool.length : null
    const topPc = Math.max(-1, ...mine.map(r => r.pc ?? -1))
    return { g, played: mine.length, winPct: Math.round((wins / mine.length) * 100), best, avg, streak: st.currentStreak, topPc }
  }).filter(Boolean)
  if (!rows.length) return <p className="text-muted text-sm m-0">{t('social.me.noRecords')}</p>
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[0.75rem] tabular-nums">
        <thead>
          <tr className="text-[0.58rem] font-black tracking-[0.12em] uppercase text-muted">
            <th className="text-left font-black px-1 pb-2">{t('social.me.recGame')}</th>
            <th className="px-1 pb-2">{t('social.me.recPlayed')}</th>
            <th className="px-1 pb-2">{t('social.me.recWin')}</th>
            <th className="px-1 pb-2">{t('social.me.recBest')}</th>
            <th className="px-1 pb-2">{t('social.me.recAvg')}</th>
            <th className="px-1 pb-2">{t('social.me.recTop')}</th>
            <th className="px-1 pb-2">🔥</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.g} className="border-t border-border">
              <td className="px-1 py-2">
                <span className="flex items-center gap-2 font-bold text-primary whitespace-nowrap">
                  <GameMotif id={GAMES[r.g].id} className="w-4 h-4 text-brand-bright" />{gameShortTitle(t, r.g)}
                </span>
              </td>
              <td className="px-1 py-2 text-center text-secondary">{r.played}</td>
              <td className="px-1 py-2 text-center text-secondary">{r.winPct}</td>
              <td className="px-1 py-2 text-center font-bold text-primary whitespace-nowrap">{r.best ? scoreLabel(r.best, locale) : '—'}</td>
              <td className="px-1 py-2 text-center text-secondary">{r.avg != null ? (Math.round(r.avg * 10) / 10).toLocaleString(locale) : '—'}</td>
              <td className="px-1 py-2 text-center text-secondary">{r.topPc >= 0 ? `${r.topPc}%` : '—'}</td>
              <td className="px-1 py-2 text-center font-bold text-warn">{r.streak || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Cabinet({ t }) {
  const list = badgeCabinet()
  const earned = list.filter(b => b.earned).length
  return (
    <>
      <div className="flex items-baseline justify-between">
        <Overline>{t('social.badges.cabinet')}</Overline>
        <span className="text-[0.7rem] text-muted tabular-nums">{t('social.badges.earned', { n: earned, total: list.length })}</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-2 gap-y-4 mt-4">
        {list.map(b => {
          const [name, desc] = t(`social.badges.names.${b.id}`) || [b.id, '']
          return (
            <div key={b.id} className="flex flex-col items-center text-center" title={desc}>
              <Crest tier={b.tier} mark={b.mark} flame={b.flame} locked={!b.earned} size={46} />
              <span className={`text-[0.62rem] font-bold leading-tight mt-1.5 ${b.earned ? 'text-primary' : 'text-faint'}`}>{name}</span>
              <span className="text-[0.56rem] text-muted leading-tight mt-0.5">{desc}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

function Rivals({ t }) {
  const rivals = rivalTable()
  return (
    <>
      <Overline>{t('social.me.rivals')}</Overline>
      {!rivals.length ? <p className="text-muted text-sm mt-2 mb-0">{t('social.me.rivalsEmpty')}</p> : (
        <div className="mt-3 flex flex-col gap-1.5">
          {rivals.map(r => {
            const lead = r.w - r.l
            return (
              <div key={r.id} className="flex items-center gap-3 bg-board border border-border-strong rounded-lg px-3 py-2">
                <span className="w-8 h-8 rounded-full bg-brand-tint text-brand-bright flex items-center justify-center text-sm font-black uppercase">{(r.name || '?').slice(0, 1)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-primary truncate">{r.name}</span>
                  {r.pending > 0 && <span className="block text-[0.62rem] text-brand-bright">{t('social.me.rivalsPending', { n: r.pending })}</span>}
                </span>
                <span className="flex items-center gap-2 tabular-nums text-[0.75rem]">
                  <b className="text-success">{r.w}{t('social.me.rivalsW')}</b>
                  <b className="text-muted">{r.d}{t('social.me.rivalsD')}</b>
                  <b className="text-danger-bright">{r.l}{t('social.me.rivalsL')}</b>
                </span>
                <span className={`w-10 text-right score-number text-xl leading-none ${lead > 0 ? 'text-success' : lead < 0 ? 'text-danger-bright' : 'text-muted'}`}>{lead > 0 ? `+${lead}` : lead}</span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function Transfer({ t, initialCode }) {
  const [state, setState] = useState({})
  const [code, setCode] = useState(initialCode || '')
  const make = async () => {
    setState({ busy: true })
    const long = await exportCode()
    const res = await putTransfer(long)
    const link = `${window.location.origin}/me?import=${res?.code || long}`
    setState({ short: res?.code || null, link })
  }
  const doImport = async (c) => {
    const raw = String(c || '').trim()
    if (!raw) return
    if (!window.confirm(t('social.me.importConfirm'))) return
    try {
      let long = raw
      if (/^[A-Za-z0-9]{6}$/.test(raw)) {
        const res = await getTransfer(raw.toUpperCase())
        if (!res?.blob) throw new Error('missing')
        long = res.blob
      }
      const summary = applySnapshot(await decodeCode(long))
      setState({ msg: t('social.me.imported', { n: summary.games }) })
    } catch {
      setState({ err: t('social.me.importFailed') })
    }
  }
  // Deferred (and cancelled on cleanup) so StrictMode's double effect doesn't ask twice.
  useEffect(() => {
    if (!initialCode) return
    const id = setTimeout(() => doImport(initialCode), 0)
    return () => clearTimeout(id)
  }, [initialCode]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Overline>{t('social.me.transfer')}</Overline>
      <p className="text-muted text-[0.8rem] mt-2">{t('social.me.transferBody')}</p>
      <button type="button" onClick={make} disabled={state.busy}
        className="h-10 px-4 rounded-lg border border-border-strong bg-border/40 hover:bg-border text-secondary hover:text-primary text-sm font-bold transition-colors">
        {t('social.me.makeCode')}
      </button>
      {state.link && (
        <div className="mt-3 flex flex-col gap-2">
          {state.short && (
            <div>
              <div className="text-[0.7rem] text-muted">{t('social.me.codeShort')}</div>
              <div className="score-number text-4xl tracking-[0.2em] text-primary mt-1">{state.short}</div>
            </div>
          )}
          <div className="text-[0.7rem] text-muted">{state.short ? t('social.me.codeReady') : t('social.me.codeLong')}</div>
          <div className="flex gap-2">
            <input readOnly value={state.link} onFocus={e => e.target.select()} className="flex-1 min-w-0 h-10 bg-board border border-border-strong rounded-lg px-3 text-[0.7rem] text-secondary" />
            <button type="button" onClick={() => navigator.clipboard?.writeText(state.link)} className="h-10 px-3 rounded-lg border border-border-strong text-secondary hover:text-primary text-[0.7rem] font-bold">{t('social.me.copyLink')}</button>
          </div>
        </div>
      )}
      <form className="mt-4 flex gap-2 items-center" onSubmit={e => { e.preventDefault(); doImport(code) }}>
        <span className="text-[0.7rem] text-muted whitespace-nowrap">{t('social.me.enterCode')}</span>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder={t('social.me.enterPh')}
          className="flex-1 min-w-0 h-10 bg-board border border-border-strong rounded-lg px-3 text-body-lg sm:text-sm text-primary uppercase tracking-[0.15em] placeholder:text-faint focus:outline-none focus:border-brand" />
        <button type="submit" className="h-10 px-4 rounded-lg border border-border-strong bg-border/40 hover:bg-border text-secondary hover:text-primary text-sm font-bold">{t('social.me.importBtn')}</button>
      </form>
      {state.msg && <p className="text-success text-[0.8rem] mt-2 mb-0">{state.msg}</p>}
      {state.err && <p className="text-danger-bright text-[0.8rem] mt-2 mb-0">{state.err}</p>}
    </>
  )
}

// Dev-only: fill this browser with ~10 weeks of plausible history so the page
// can be reviewed as a regular player would see it. Never shipped (DEV guard).
function DemoSeed() {
  const seed = async () => {
    const { seedDemo } = await import('../social/demo')
    seedDemo()
    window.location.reload()
  }
  return (
    <button type="button" onClick={seed} className="h-10 rounded-lg border border-dashed border-border-strong text-faint hover:text-secondary text-xs font-bold">
      DEV · load demo history (overwrites this browser's stats)
    </button>
  )
}

export default function Me() {
  const { t, lp, locale } = useI18n()
  const { search } = useLocation()
  const askName = new URLSearchParams(search).get('name') === '1'
  useSocialTick(TICK)
  useAppMeta(t('social.me.title'))
  const log = loadLog()
  const streak = getStreak()
  const leagues = useMyLeagues()
  const importCode = useMemo(() => new URLSearchParams(search).get('import'), [search])
  const ws = weekStart()
  const thisWeek = log.filter(r => r.d >= ws && r.g !== 'perfect')
  const perfectWeek = log.filter(r => r.d >= ws && r.g === 'perfect').length

  return (
    <div className="tv-scene min-h-dvh text-primary">
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <SocialChrome />
        <div className="mt-2 mb-5">
          <h1 className="score-number text-5xl sm:text-6xl leading-none tv-wordmark m-0">{t('social.me.title')}</h1>
          <p className="text-muted text-sm mt-2 mb-0">{t('social.me.subtitle')}</p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          {/* /me?name=1 — arrived from "(set a nickname)" on a leaderboard: focus the field. */}
          <Panel className={askName ? 'ring-1 ring-brand/60' : ''}>
            <Overline>{t('social.me.nickname')}</Overline>
            <div className="mt-2"><NameField autoFocus={askName} /></div>
            <p className="text-[0.7rem] text-muted mt-2 mb-0">{t('social.me.nicknameHelp')}</p>
          </Panel>

          <StreakHero t={t} />

          <Panel>
            <div className="flex items-baseline justify-between">
              <Overline>{t('social.me.thisWeek')}</Overline>
              <span className="text-[0.62rem] text-faint">{t('social.me.calendar')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 my-4">
              {[[fmt(Math.max(weeklyPoints(), log.filter(r => r.d >= ws).reduce((n, r) => n + (r.p || 0), 0)), locale), t('social.me.pts')], [thisWeek.length, t('social.me.played')], [perfectWeek, t('social.me.perfect')]].map(([v, l]) => (
                <div key={l} className="bg-board border border-border rounded-lg py-3 text-center">
                  <div className="score-number text-3xl leading-none tabular-nums">{v}</div>
                  <div className="text-[0.58rem] font-bold tracking-[0.12em] uppercase text-muted mt-1">{l}</div>
                </div>
              ))}
            </div>
            <Heatmap log={log} frozen={streak.frozenDays} t={t} />
          </Panel>

          <Panel>
            <Overline className="mb-3">{t('social.me.records')}</Overline>
            <Records log={log} t={t} locale={locale} />
          </Panel>

          <Panel><Cabinet t={t} /></Panel>

          <Panel><Rivals t={t} /></Panel>

          <Panel>
            <div className="flex items-baseline justify-between">
              <Overline>{t('social.me.leagues')}</Overline>
              <Link to={lp('/leagues')} className="text-[0.7rem] font-bold text-brand-bright hover:text-primary">{t('social.me.openLeagues')}</Link>
            </div>
            {!leagues.length ? <p className="text-muted text-sm mt-2 mb-0">{t('social.leagues.none')}</p> : (
              <div className="mt-3 flex flex-col gap-1.5">
                {leagues.map(l => (
                  <Link key={l.code} to={lp(`/leagues/${l.code}`)} className="flex items-center gap-3 bg-board border border-border-strong rounded-lg px-3 py-2.5 hover:border-brand/50 transition-colors">
                    <span className="score-number text-2xl leading-none w-10 text-brand-bright">{ordinal(l.rank, locale)}</span>
                    <span className="flex-1 min-w-0 text-sm font-bold truncate">{l.name}</span>
                    <span className="text-[0.7rem] text-muted tabular-nums">{t('social.leagues.members', { n: l.members })} · <b className="text-primary">{l.pts}</b> {t('social.me.pts')}</span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel><Transfer t={t} initialCode={importCode} /></Panel>
          {import.meta.env.DEV && <DemoSeed />}
        </div>
      </div>
    </div>
  )
}
