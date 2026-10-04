import { useState, useEffect, useRef } from 'react'
import { STAT_MODES, poolFor, pickChallenger, pickStarter, isCorrect, getDailyRun } from '../../data/higherlower'
import { useQa } from '../../dev/qa'
import QaBar from '../../dev/QaBar'
import { ShareCard, RESULT_SECONDARY_BTN } from '../../components/ShareCard'
import ModeToggle from '../../components/ModeToggle'
import ResultModal from '../../components/ResultModal'
import { shortTitle } from '../../components/nextGames'
import GameChrome from '../../components/GameChrome'
import GameMotif from '../../components/GameMotif'
import { accentVars } from '../../design/accents'
import { recordResult, todayIndex, matchdayNumber } from '../../data/dailyStats'
import { loadDailyProgress, saveDailyProgress } from '../../data/dailyProgress'
import { TILE } from '../../utils/shareImage'
import { SITE_URL } from '../../utils/site'
import { useI18n } from '../../i18n'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

const BEST_KEY = 'ftg-higherlower-best'

// The reveal beat: the mystery number counts up to its value before the
// verdict lands. Renders the value instantly under prefers-reduced-motion.
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function CountUp({ value, duration = 650, format = String }) {
  const [shown, setShown] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (reducedMotion()) return
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3)))) // ease-out cubic
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])
  return <>{format(reducedMotion() ? value : shown)}</>
}

function PlayerCard({ player, statLabel, showValue, mystery, revealTone, format = String, note }) {
  return (
    <div className={`flex-1 rounded-2xl border px-4 py-6 text-center flex flex-col items-center justify-center min-h-[150px] gap-1 ${
      mystery
        ? 'border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--accent)_8%,#100e1c),#100e1c)]'
        : 'border-border-strong bg-board'
    }`}>
      <div className="text-primary font-bold text-lg leading-tight">{player.name}</div>
      <div className="mt-2 h-11 flex items-center justify-center">
        {showValue
          ? <div className={`score-number text-4xl tabular-nums ${revealTone || 'text-success-bright'}`}>{mystery ? <CountUp value={player.value} format={format} /> : format(player.value)}</div>
          : <div className="text-accent-bright text-4xl font-black" aria-label="hidden">?</div>}
      </div>
      <div className="text-faint text-[0.6rem] font-black uppercase tracking-[0.16em]">{statLabel}</div>
      {showValue && note && <div className="text-muted text-[0.7rem]">{note}</div>}
    </div>
  )
}

// Signature of a daily run — its length plus the first and last pairings — so
// saved progress is discarded if the day's run changes (e.g. pools refreshed).
const runSig = (r) => {
  const q = r.questions, pair = (x) => (x ? `${x.stat.id}:${x.a.id}-${x.b.id}` : '')
  return `v2:${q.length}:${pair(q[0])}:${pair(q[q.length - 1])}`
}

// The stat being compared, in the reader's language ("Premier League appearances",
// "Premier League goals for Arsenal").
const statName = (t, m) => {
  if (!m) return ''
  if (m.group === 'club') return t('higherlower.clubStat', { stat: t(`higherlower.stats.${m.base}`), club: m.club })
  return t(`higherlower.stats.${m.id}`)
}

// How a number reads: fees are € millions, everything else a plain count.
const formatter = (t, m) => (m?.kind === 'fee' ? (v) => t('higherlower.fee', { v }) : String)

// The small print under a revealed number: when a season best happened, what
// a fee actually was before inflation.
function noteFor(t, m, p) {
  if (!m || p?.extra == null) return null
  if (m.kind === 'season') return t('higherlower.inSeason', { season: `${p.extra}/${String(p.extra + 1).slice(2)}` })
  if (m.kind === 'fee') return t('higherlower.paid', { fee: t('higherlower.fee', { v: p.extra[0] }), year: p.extra[1] })
  return null
}

// Stat picker rows: one per competition — career goals, appearances/caps, then
// the single-season best — followed by transfer fees and the clubs.
const COMP_ORDER = ['Premier League', 'Champions League', 'International', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']
const KIND_ORDER = { goals: 0, apps: 1, season: 2 }
const STAT_GROUPS = COMP_ORDER
  .map(c => ({ competition: c, modes: STAT_MODES.filter(m => m.competition === c && (m.group === 'career' || m.group === 'season')).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]) }))
  .filter(g => g.modes.length)
const TRANSFER_MODES = STAT_MODES.filter(m => m.group === 'transfer')
const CLUBS = COMP_ORDER.flatMap(c => {
  const goals = STAT_MODES.filter(m => m.group === 'club' && m.competition === c && m.kind === 'goals')
  return goals.map(g => ({ club: g.club, competition: c, modes: [g, STAT_MODES.find(m => m.id === g.id.replace(/-goals$/, '-apps'))].filter(Boolean) }))
})
const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }

export default function HigherLower() {
  const { t } = useI18n()
  const qa = useQa('HigherLower') // dev-only; inert for normal players
  const [dailyMode, setDailyMode] = useState(qa.active ? 'unlimited' : 'daily')  // 'daily' | 'unlimited'
  // Today's daily progress, if any (current/challenger derive from qIdx).
  const [saved] = useState(() => loadDailyProgress('higherlower', runSig(getDailyRun(todayIndex()))))
  const restoredDone = !!saved?.done
  const [run, setRun] = useState(() => getDailyRun(todayIndex())) // today's 15 questions
  const startQ = Math.min(saved?.qIdx ?? 0, run.questions.length - 1)
  const [qIdx, setQIdx] = useState(startQ)                                    // daily question index
  const [mode, setMode] = useState(run.questions[startQ].stat) // stat in play (daily: per question; unlimited: picked)
  const [current, setCurrent] = useState(() => run.questions[startQ].a)
  const [challenger, setChallenger] = useState(() => run.questions[startQ].b)
  const recent = useRef([])                                                   // unlimited: ids seen, for repeat avoidance
  const [pickClub, setPickClub] = useState(null)                              // stat picker: expanded club
  const [streak, setStreak] = useState(() => saved?.streak ?? 0)
  const [trail, setTrail] = useState(() => saved?.trail ?? [])               // players you've moved past (the chain)
  const [best, setBest] = useState(() => Number((typeof localStorage !== 'undefined' && localStorage.getItem(BEST_KEY)) || 0))
  const [phase, setPhase] = useState(() => saved?.phase ?? 'playing')        // 'playing' | 'reveal' | 'over'
  const [lastCorrect, setLastCorrect] = useState(() => saved?.lastCorrect ?? null)

  // Daily mode records the run's final streak as a score, once it ends.
  useEffect(() => {
    if (phase === 'over' && dailyMode === 'daily') recordResult('higherlower', true, streak)
  }, [phase, dailyMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // In daily, finishing on a correct answer means the chain was exhausted (a win).
  const dailyCleared = dailyMode === 'daily' && phase === 'over' && lastCorrect === true
  // A finished daily is locked to its result and offers Unlimited.
  const dailyLocked = dailyMode === 'daily' && phase === 'over'

  // Persist the daily chain so a refresh resumes it and a finished run stays
  // locked (no bailing out mid-chain to farm a longer streak). 'reveal' is a
  // transient animation frame, so it's never the persisted state.
  useEffect(() => {
    if (dailyMode !== 'daily' || phase === 'reveal') return
    if (streak === 0 && phase !== 'over') return
    saveDailyProgress('higherlower', { qIdx, streak, trail, phase, lastCorrect }, phase === 'over', runSig(run))
  }, [dailyMode, qIdx, streak, trail, phase, lastCorrect, run])

  const showQuestion = (r, idx) => {
    const q = r.questions[idx]
    setQIdx(idx); setMode(q.stat); setCurrent(q.a); setChallenger(q.b)
  }

  // Return to the daily: rehydrate today's run (locked, resumed, or fresh).
  const startDaily = () => {
    const r = getDailyRun(todayIndex())
    const s = loadDailyProgress('higherlower', runSig(r))
    setRun(r); showQuestion(r, Math.min(s?.qIdx ?? 0, r.questions.length - 1))
    setStreak(s?.streak ?? 0); setTrail(s?.trail ?? []); setPhase(s?.phase ?? 'playing')
    setLastCorrect(s?.lastCorrect ?? null); setShowResult(!!s?.done)
  }

  const startMode = (m) => {
    const pool = poolFor(m.id)
    const a = pickStarter(pool)
    const b = pickChallenger(pool, a, recent.current)
    recent.current = [...recent.current, a.id, b.id].slice(-40)
    setMode(m)
    setCurrent(a)
    setChallenger(b)
    setStreak(0); setTrail([]); setPhase('playing'); setLastCorrect(null); setShowResult(false)
  }

  const switchMode = (dm) => {
    setDailyMode(dm)
    if (dm === 'daily') startDaily()
    else { setMode(null); setPhase('playing'); setStreak(0); setTrail([]); setLastCorrect(null); setShowResult(false) }
  }
  const [showResult, setShowResult] = useState(restoredDone)
  /* eslint-disable react-hooks/set-state-in-effect -- intentional dev-only QA loader */
  // QA mode (dev-only): load the generated daily run at the cursor index in practice
  // mode (dailyMode 'unlimited' so nothing is recorded). Runs on mount + on Skip.
  useEffect(() => {
    if (!qa.active) return
    const r = getDailyRun(qa.index)
    setDailyMode('unlimited'); setRun(r); showQuestion(r, 0)
    setStreak(0); setTrail([]); setPhase('playing'); setLastCorrect(null); setShowResult(false)
  }, [qa.active, qa.index])
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (phase !== 'over') return
    const t = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS)
    return () => clearTimeout(t)
  }, [phase])

  const guess = (direction) => {
    if (phase !== 'playing') return
    const correct = isCorrect(direction, current, challenger)
    setLastCorrect(correct)
    setPhase('reveal')
    setTimeout(() => {
      if (!correct) { setPhase('over'); return }
      const newStreak = streak + 1
      setStreak(newStreak)
      setTrail(tr => [...tr, current])
      if (dailyMode === 'unlimited' && newStreak > best) { setBest(newStreak); localStorage.setItem(BEST_KEY, String(newStreak)) }

      // QA previews a daily run in practice mode, so it follows the daily path too.
      if (dailyMode === 'daily' || qa.active) {
        const nextIdx = qIdx + 1
        if (nextIdx >= run.questions.length) { setPhase('over'); return } // all questions cleared
        showQuestion(run, nextIdx); setPhase('playing')
      } else {
        // Endless chain: the revealed player becomes the one to beat.
        const next = pickChallenger(poolFor(mode.id), challenger, recent.current)
        recent.current = [...recent.current, next.id].slice(-40)
        setCurrent(challenger)
        setChallenger(next)
        setPhase('playing')
      }
    }, 1100)
  }

  const chrome = (
    <div className="w-full"><GameChrome
      motifId="higher-or-lower"
      title={t('higherlower.wordmark')}
      right={<b className="text-secondary tabular-nums">{t('higherlower.best', { n: best })}</b>}
    /></div>
  )

  const pickedClub = CLUBS.find(c => c.club === pickClub)
  const btnLabel = (m) => {
    if (m.id === 'intl-caps') return t('higherlower.caps')
    if (m.kind === 'fee') return t('higherlower.recordFee')
    if (m.kind === 'apps') return <><span className="sm:hidden">{t('higherlower.appsShort')}</span><span className="hidden sm:inline">{t('higherlower.apps')}</span></>
    return t(`higherlower.${m.kind}`)
  }
  const statBtn = (m) => (
    <button key={m.id} onClick={() => startMode(m)} aria-label={statName(t, m)}
      className="bg-surface border border-border-strong hover:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] rounded-lg px-2.5 sm:px-3 py-2 text-left transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
      <div className="text-primary font-bold text-[0.8rem] sm:text-sm leading-tight">{btnLabel(m)}</div>
      <div className="text-faint text-[0.65rem] tabular-nums">{t('higherlower.players', { n: m.size })}</div>
    </button>
  )

  // ── Stat-selection screen (Unlimited only) ────────────────────────
  if (!mode) {
    return (
      <div className="tv-scene min-h-dvh text-primary" style={accentVars('higherlower')}>
      <div className="flex flex-col items-center px-4 pb-8 max-w-3xl mx-auto">
        {chrome}
        <ModeToggle mode={dailyMode} onChange={switchMode} className="mt-1 mb-6" />
        <div className="w-full max-w-lg text-center mb-6">
          <h1 className="score-number text-3xl tv-wordmark mb-1">{t('higherlower.title').toUpperCase()}</h1>
          <p className="text-muted text-sm">{t('higherlower.pickStat')}</p>
        </div>
        <div className="w-full max-w-lg grid grid-cols-1 gap-2.5">
          {STAT_GROUPS.map(g => (
            <div key={g.competition} className="bg-card border border-border-strong rounded-xl px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="sm:w-32 shrink-0 pl-1 text-primary font-bold text-sm leading-tight">{t(`higherlower.comps.${g.competition}`)}</div>
              <div className={`flex-1 grid ${COLS[g.modes.length]} gap-2`}>{g.modes.map(statBtn)}</div>
            </div>
          ))}
          {TRANSFER_MODES.length > 0 && (
            <div className="bg-card border border-border-strong rounded-xl px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="sm:w-32 shrink-0 pl-1 text-primary font-bold text-sm leading-tight">{t('higherlower.transfers')}</div>
              <div className="flex-1 grid grid-cols-1 gap-2">{TRANSFER_MODES.map(statBtn)}</div>
            </div>
          )}
          {CLUBS.length > 0 && (
            <div className="bg-card border border-border-strong rounded-xl px-3 py-3">
              <div className="pl-1 text-primary font-bold text-sm">{t('higherlower.clubs')}</div>
              <div className="text-faint text-[0.65rem] pl-1 mb-2">{t('higherlower.clubsHint')}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {CLUBS.map(c => (
                  <button key={c.club} onClick={() => setPickClub(pickClub === c.club ? null : c.club)} aria-expanded={pickClub === c.club}
                    className={`rounded-lg px-2.5 py-1.5 text-left text-[0.8rem] font-bold leading-tight border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright ${
                      pickClub === c.club ? 'border-[color-mix(in_srgb,var(--accent)_60%,transparent)] bg-surface text-primary' : 'border-border-strong bg-board text-secondary hover:text-primary'}`}>
                    {c.club}
                  </button>
                ))}
              </div>
              {pickedClub && (
                <div className="mt-2.5 clue-reveal">
                  <div className="pl-1 text-faint text-[0.6rem] font-black uppercase tracking-[0.14em] mb-1.5">{pickedClub.club} · {t(`higherlower.comps.${pickedClub.competition}`)}</div>
                  <div className="grid grid-cols-2 gap-2">{pickedClub.modes.map(statBtn)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    )
  }

  // ── Game screen ───────────────────────────────────────────────────
  const inDaily = dailyMode === 'daily' || qa.active // QA previews a daily run
  const total = run.questions.length
  const label = statName(t, mode)
  const fmt = formatter(t, mode)
  const shownTrail = trail.slice(-4)

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('higherlower')}>
      {qa.active && <QaBar gameId="Higher/Lower" index={qa.index} onPrev={qa.prev} onNext={qa.next}
        meta={{ stat: mode?.id, question: `${qIdx + 1}/${total}`, a: current?.name, b: challenger?.name }} />}
    <div className="flex flex-col items-center px-4 pb-8 max-w-3xl mx-auto">
      {chrome}
      <ModeToggle mode={dailyMode} onChange={switchMode} className="mt-1 mb-4" />

      <div className="w-full max-w-2xl space-y-3">
        {/* What's being compared. In the daily the stat changes every question,
            so it is the headline, re-animated on each change. */}
        <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3">
          <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright uppercase">
            {inDaily ? `${t('common.daily')} · ${t('higherlower.question', { n: qIdx + 1, total })}` : `${t('common.unlimited')} · ${t('higherlower.players', { n: mode.size })}`}
            {dailyLocked ? ` · ${t('common.complete')}` : ''}
          </div>
          <div key={mode.id} className={`text-primary font-black text-xl leading-tight mt-1 ${inDaily ? 'clue-reveal' : ''}`} aria-live={inDaily ? 'polite' : undefined}>
            {label}
          </div>
          <div className="text-muted text-xs mt-0.5">
            {dailyLocked ? t('common.dailyDone') : t('higherlower.moreOrFewerThan', { name: current.name })}
          </div>
        </div>

        {inDaily ? (
          /* Daily progress — one pip per question */
          <div className="flex items-center gap-3 bg-board border border-border rounded-xl px-3 py-2.5" aria-label={`${t('higherlower.streak')} ${streak} / ${total}`}>
            <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
              {run.questions.map((_, i) => {
                const missed = phase === 'over' && lastCorrect === false && i === qIdx
                const tone = i < streak ? 'bg-success' : missed ? 'bg-danger' : i === qIdx && phase !== 'over' ? 'bg-accent' : 'bg-inert'
                return <span key={i} className={`h-2 rounded-full ${tone}`} />
              })}
            </div>
            <span className="shrink-0 text-[0.6rem] font-black tracking-[0.1em] text-accent-bright tabular-nums">🔥 {streak}</span>
          </div>
        ) : (
          /* The chain — your streak as objects */
          <div className="flex items-center justify-center gap-1.5 bg-board border border-border rounded-xl px-3 py-2.5 overflow-x-auto" aria-label={`${t('higherlower.streak')} ${streak}`}>
            {shownTrail.length === 0 && trail.length === 0 && (
              <span className="text-[0.6rem] font-black tracking-[0.12em] text-faint">{t('higherlower.streak').toUpperCase().replace(':', '')} 0</span>
            )}
            {trail.length > shownTrail.length && <span className="text-[0.6rem] text-faint font-bold shrink-0">+{trail.length - shownTrail.length}</span>}
            {shownTrail.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5 shrink-0">
                <span className="text-center text-[0.6rem] font-bold text-secondary bg-surface border border-success/40 rounded-lg px-2 py-1 leading-tight">
                  {p.name.split(' ').pop()}<br /><i className="not-italic text-success-bright font-mono">{fmt(p.value)}</i>
                </span>
                <i className="w-3 h-0.5 bg-success/50 shrink-0" aria-hidden="true" />
              </span>
            ))}
            <span className="shrink-0 text-[0.52rem] font-black tracking-[0.1em] text-accent-bright border border-dashed border-[color-mix(in_srgb,var(--accent)_55%,transparent)] rounded-lg px-2 py-2">
              🔥 {streak}
            </span>
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="flex items-center gap-1.5 shrink-0">
                <i className="w-3 h-0.5 bg-inert shrink-0" aria-hidden="true" />
                <span className="w-7 h-9 flex items-center justify-center text-faint font-black bg-surface border border-border-strong rounded-lg">?</span>
              </span>
            ))}
          </div>
        )}

        {/* The duel */}
        <div className="flex gap-3 items-stretch">
          <PlayerCard player={current} statLabel={label} showValue format={fmt} note={noteFor(t, mode, current)} />
          <div className="flex items-center text-faint font-black text-sm" aria-hidden="true">VS</div>
          <PlayerCard
            player={challenger}
            statLabel={phase === 'playing' ? t('higherlower.moreOrFewer') : label}
            format={fmt}
            note={noteFor(t, mode, challenger)}
            showValue={phase !== 'playing'}
            mystery
            revealTone={phase !== 'playing' ? (lastCorrect ? 'text-success-bright' : 'text-danger-bright') : null}
          />
        </div>

        {phase === 'playing' && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => guess('higher')}
              className="flex items-center justify-center gap-2 bg-surface border border-border-strong hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] hover:-translate-y-0.5 text-primary font-black tracking-[0.08em] rounded-xl py-3.5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
              <i className="not-italic text-accent-bright" aria-hidden="true">▲</i> {t('higherlower.more').replace('▲ ', '')}
            </button>
            <button onClick={() => guess('lower')}
              className="flex items-center justify-center gap-2 bg-surface border border-border-strong hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] hover:-translate-y-0.5 text-primary font-black tracking-[0.08em] rounded-xl py-3.5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
              <i className="not-italic text-accent-bright" aria-hidden="true">▼</i> {t('higherlower.fewer').replace('▼ ', '')}
            </button>
          </div>
        )}

        {phase === 'reveal' && (
          <div className={`text-center font-black tracking-[0.08em] ${lastCorrect ? 'text-success-bright' : 'text-danger-bright'}`} aria-live="polite">
            {lastCorrect ? t('higherlower.correct') : t('higherlower.wrong')}
          </div>
        )}

        {/* Unlimited: the duel already reveals the number in place — show the
            outcome line and replay controls inline, no result card. */}
        {dailyMode === 'unlimited' && phase === 'over' && (
          <div className="flex flex-col items-center gap-3 text-center pt-1">
            <div>
              <p className="text-danger-bright font-black tracking-[0.06em]">{t('higherlower.gameOver')} · 🔥 {streak}</p>
              <p className="text-secondary text-sm mt-1">{t('higherlower.scoredLine', { name: challenger.name, value: fmt(challenger.value), label })}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => startMode(mode)} className="bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">{t('higherlower.playAgain')}</button>
              <button onClick={() => setMode(null)} className="border border-border-strong text-secondary hover:bg-surface text-sm font-medium rounded-xl px-6 py-3 transition-colors">{t('higherlower.changeStat').replace('← ', '')}</button>
            </div>
          </div>
        )}

        {dailyMode === 'daily' && phase === 'over' && !showResult && (
          <div className="text-center">
            <button onClick={() => setShowResult(true)} className="text-sm text-brand-bright hover:text-primary font-medium transition-colors">{t('common.seeResult')}</button>
          </div>
        )}
      </div>

      <ResultModal game="higherlower" open={showResult && dailyMode === 'daily'} onClose={() => setShowResult(false)}>
        <div className="w-full flex flex-col items-center text-center">
          <GameMotif id="higher-or-lower" className={`w-11 h-11 mb-2 ${dailyCleared ? 'text-accent-bright' : 'text-dim'}`} />
          <h2 className={`score-number text-4xl mb-1 ${dailyCleared ? 'text-success-bright' : 'text-danger-bright'}`}>{dailyCleared ? t('higherlower.chainCleared', { total }) : t('higherlower.gameOver')}</h2>
          <div className="score-number text-6xl tv-wordmark tabular-nums leading-none my-1">{streak}<span className="text-2xl text-muted">/{total}</span></div>
          <p className="text-muted text-xs font-black tracking-[0.2em] uppercase mb-2">
            {t('higherlower.streak').replace(':', '')}
            {dailyMode === 'unlimited' && streak >= best && streak > 0 && <span className="text-warn normal-case tracking-normal">{t('higherlower.newBest')}</span>}
          </p>
          {!dailyCleared && (
            <p className="text-secondary text-sm mb-2">{t('higherlower.scoredLine', { name: challenger.name, value: fmt(challenger.value), label })}</p>
          )}
          <ShareCard
            text={[
              dailyMode === 'daily'
                ? t('share.hlDaily', { label: t('higherlower.dailyChallenge'), streak, total })
                : t('share.hlUnlimited', { label, streak, best }),
              SITE_URL,
            ].join('\n\n')}
            card={{
              gameId: 'higherlower',
              daily: dailyMode === 'daily',
              won: dailyCleared,
              score: { v: streak, u: 'streak' },
              title: 'Higher or Lower',
              challenge: `${t('higherlower.dailyChallenge')} · ${streak}/${total}`,
              result: dailyCleared ? t('higherlower.chainCleared', { total }) : t('higherlower.gameOver'),
              rows: [Array.from({ length: Math.min(streak, total) }, () => TILE.hit).concat(dailyCleared ? [] : [TILE.miss])],
              matchday: matchdayNumber(),
            }}
          />
          {dailyMode === 'unlimited'
            ? (
              <div className="flex gap-3 mt-2">
                <button onClick={() => startMode(mode)} className="bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-6 py-2.5 transition-colors">{t('higherlower.playAgain')}</button>
                <button onClick={() => setMode(null)} className="border border-border-strong text-secondary hover:bg-surface text-sm font-medium rounded-lg px-6 py-2.5 transition-colors">{t('higherlower.changeStat').replace('← ', '')}</button>
              </div>
            )
            : <button onClick={() => switchMode('unlimited')} className={RESULT_SECONDARY_BTN}>{t('common.unlimitedGame', { name: shortTitle(t, 'higher-or-lower') })}</button>}
        </div>
      </ResultModal>
    </div>
    </div>
  )
}
