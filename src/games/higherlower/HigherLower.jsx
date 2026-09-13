import { useState, useEffect, useRef } from 'react'
import { STAT_MODES, poolFor, randomFrom, isCorrect, getDailyRun } from '../../data/higherlower'
import { useQa } from '../../dev/qa'
import QaBar from '../../dev/QaBar'
import { ShareCard } from '../../components/ShareCard'
import DailyStats from '../../components/DailyStats'
import ModeToggle from '../../components/ModeToggle'
import ResultModal from '../../components/ResultModal'
import GameChrome from '../../components/GameChrome'
import GameMotif from '../../components/GameMotif'
import UpNext from '../../components/UpNext'
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

function CountUp({ value, duration = 650 }) {
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
  return <>{reducedMotion() ? value : shown}</>
}

function PlayerCard({ player, statLabel, showValue, mystery, revealTone }) {
  return (
    <div className={`flex-1 rounded-2xl border px-4 py-6 text-center flex flex-col items-center justify-center min-h-[150px] gap-1 ${
      mystery
        ? 'border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--accent)_8%,#100e1c),#100e1c)]'
        : 'border-border-strong bg-board'
    }`}>
      <div className="text-primary font-bold text-lg leading-tight">{player.name}</div>
      <div className="mt-2 h-11 flex items-center justify-center">
        {showValue
          ? <div className={`score-number text-4xl tabular-nums ${revealTone || 'text-success-bright'}`}>{mystery ? <CountUp value={player.value} /> : player.value}</div>
          : <div className="text-accent-bright text-4xl font-black" aria-label="hidden">?</div>}
      </div>
      <div className="text-faint text-[0.6rem] font-black uppercase tracking-[0.16em]">{statLabel}</div>
    </div>
  )
}

// Signature of a daily run — mode + pool size + first player — so saved progress
// is discarded if the day's run changes (e.g. the stat pool was refreshed).
const runSig = (r) => `${r.mode.id}:${r.sequence.length}:${r.sequence[0]?.name ?? ''}`

export default function HigherLower() {
  const { t } = useI18n()
  const qa = useQa('HigherLower') // dev-only; inert for normal players
  const [dailyMode, setDailyMode] = useState(qa.active ? 'unlimited' : 'daily')  // 'daily' | 'unlimited'
  // Today's daily chain progress, if any (current/challenger derive from seqIdx).
  const [saved] = useState(() => loadDailyProgress('higherlower', runSig(getDailyRun(todayIndex()))))
  const restoredDone = !!saved?.done
  const [run, setRun] = useState(() => getDailyRun(todayIndex())) // daily chain
  const [seqIdx, setSeqIdx] = useState(() => saved?.seqIdx ?? 1)              // position in the daily chain
  const [mode, setMode] = useState(run.mode)           // chosen STAT_MODE (daily auto / unlimited picked)
  const [current, setCurrent] = useState(() => run.sequence[(saved?.seqIdx ?? 1) - 1])
  const [challenger, setChallenger] = useState(() => run.sequence[saved?.seqIdx ?? 1])
  const [streak, setStreak] = useState(() => saved?.streak ?? 0)
  const [trail, setTrail] = useState(() => saved?.trail ?? [])               // players you've moved past (the chain)
  const [best, setBest] = useState(() => Number((typeof localStorage !== 'undefined' && localStorage.getItem(BEST_KEY)) || 0))
  const [phase, setPhase] = useState(() => saved?.phase ?? 'playing')        // 'playing' | 'reveal' | 'over'
  const [lastCorrect, setLastCorrect] = useState(() => saved?.lastCorrect ?? null)
  const [dailyStats, setDailyStats] = useState(null)

  // Daily mode records the run's final streak as a score, once it ends.
  useEffect(() => {
    if (phase === 'over' && dailyMode === 'daily') setDailyStats(recordResult('higherlower', true, streak))
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
    saveDailyProgress('higherlower', { seqIdx, streak, trail, phase, lastCorrect }, phase === 'over', runSig(run))
  }, [dailyMode, seqIdx, streak, trail, phase, lastCorrect])

  // Return to the daily: rehydrate today's chain (locked, resumed, or fresh).
  const startDaily = () => {
    const r = getDailyRun(todayIndex())
    const s = loadDailyProgress('higherlower', runSig(getDailyRun(todayIndex())))
    const idx = s?.seqIdx ?? 1
    setRun(r); setSeqIdx(idx); setMode(r.mode)
    setCurrent(r.sequence[idx - 1]); setChallenger(r.sequence[idx])
    setStreak(s?.streak ?? 0); setTrail(s?.trail ?? []); setPhase(s?.phase ?? 'playing')
    setLastCorrect(s?.lastCorrect ?? null); setDailyStats(null); setShowResult(!!s?.done)
  }

  const startMode = (m) => {
    const pool = poolFor(m.id)
    const a = randomFrom(pool)
    setMode(m)
    setCurrent(a)
    setChallenger(randomFrom(pool, new Set([a.name])))
    setStreak(0); setTrail([]); setPhase('playing'); setLastCorrect(null); setDailyStats(null); setShowResult(false)
  }

  const switchMode = (dm) => {
    setDailyMode(dm)
    if (dm === 'daily') startDaily()
    else { setMode(null); setPhase('playing'); setStreak(0); setTrail([]); setLastCorrect(null); setDailyStats(null); setShowResult(false) }
  }
  const [showResult, setShowResult] = useState(restoredDone)
  /* eslint-disable react-hooks/set-state-in-effect -- intentional dev-only QA loader */
  // QA mode (dev-only): load the generated daily run at the cursor index in practice
  // mode (dailyMode 'unlimited' so nothing is recorded). Runs on mount + on Skip.
  useEffect(() => {
    if (!qa.active) return
    const r = getDailyRun(qa.index)
    setDailyMode('unlimited'); setRun(r); setSeqIdx(1); setMode(r.mode)
    setCurrent(r.sequence[0]); setChallenger(r.sequence[1])
    setStreak(0); setTrail([]); setPhase('playing'); setLastCorrect(null); setDailyStats(null); setShowResult(false)
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

      if (dailyMode === 'daily') {
        const nextIdx = seqIdx + 1
        if (nextIdx >= run.sequence.length) { setPhase('over'); return } // chain cleared
        setCurrent(challenger); setChallenger(run.sequence[nextIdx]); setSeqIdx(nextIdx); setPhase('playing')
      } else {
        const pool = poolFor(mode.id)
        setCurrent(challenger)
        setChallenger(randomFrom(pool, new Set([challenger.name, current.name])))
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
        <div className="w-full max-w-lg grid grid-cols-1 gap-3">
          {STAT_MODES.map(m => (
            <button key={m.id} onClick={() => startMode(m)}
              className="bg-card border border-border-strong hover:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] rounded-xl px-5 py-4 text-left transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
              <div className="text-primary font-bold capitalize">{m.label}</div>
              <div className="text-muted text-xs mt-0.5">{t('higherlower.allTime', { competition: m.competition })}</div>
            </button>
          ))}
        </div>
      </div>
      </div>
    )
  }

  // ── Game screen ───────────────────────────────────────────────────
  const facedown = dailyMode === 'daily' ? Math.max(0, run.sequence.length - seqIdx - 1) : 2
  const shownTrail = trail.slice(-4)

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('higherlower')}>
      {qa.active && <QaBar gameId="Higher/Lower" index={qa.index} onPrev={qa.prev} onNext={qa.next}
        meta={{ statMode: mode, chainLength: run.sequence?.length, start: current?.name }} />}
    <div className="flex flex-col items-center px-4 pb-8 max-w-3xl mx-auto">
      {chrome}
      <ModeToggle mode={dailyMode} onChange={switchMode} className="mt-1 mb-4" />

      <div className="w-full max-w-2xl space-y-3">
        <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3">
          <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">{(dailyMode === 'daily' ? t('common.daily') : t('common.unlimited')).toUpperCase()} · <span className="capitalize">{mode.label}</span>{dailyLocked ? ` · ${t('common.complete')}` : ''}</div>
          <div className="text-primary font-bold text-sm mt-0.5">{dailyLocked ? t('common.dailyDone') : t('higherlower.moreOrFewer')}</div>
          <div className="text-muted text-xs mt-0.5">{dailyLocked ? t('common.comeBackTomorrow') : dailyMode === 'daily' ? t('higherlower.todayChain') : t('higherlower.allTime', { competition: mode.competition })}</div>
        </div>

        {/* The chain — your streak as objects */}
        <div className="flex items-center justify-center gap-1.5 bg-board border border-border rounded-xl px-3 py-2.5 overflow-x-auto" aria-label={`${t('higherlower.streak')} ${streak}`}>
          {shownTrail.length === 0 && trail.length === 0 && (
            <span className="text-[0.6rem] font-black tracking-[0.12em] text-faint">{t('higherlower.streak').toUpperCase().replace(':', '')} 0</span>
          )}
          {trail.length > shownTrail.length && <span className="text-[0.6rem] text-faint font-bold shrink-0">+{trail.length - shownTrail.length}</span>}
          {shownTrail.map((p, i) => (
            <span key={i} className="flex items-center gap-1.5 shrink-0">
              <span className="text-center text-[0.6rem] font-bold text-secondary bg-surface border border-success/40 rounded-lg px-2 py-1 leading-tight">
                {p.name.split(' ').pop()}<br /><i className="not-italic text-success-bright font-mono">{p.value}</i>
              </span>
              <i className="w-3 h-0.5 bg-success/50 shrink-0" aria-hidden="true" />
            </span>
          ))}
          <span className="shrink-0 text-[0.52rem] font-black tracking-[0.1em] text-accent-bright border border-dashed border-[color-mix(in_srgb,var(--accent)_55%,transparent)] rounded-lg px-2 py-2">
            🔥 {streak}
          </span>
          {Array.from({ length: Math.min(2, facedown) }).map((_, i) => (
            <span key={i} className="flex items-center gap-1.5 shrink-0">
              <i className="w-3 h-0.5 bg-inert shrink-0" aria-hidden="true" />
              <span className="w-7 h-9 flex items-center justify-center text-faint font-black bg-surface border border-border-strong rounded-lg">?</span>
            </span>
          ))}
        </div>

        {/* The duel */}
        <div className="flex gap-3 items-stretch">
          <PlayerCard player={current} statLabel={mode.label} showValue />
          <div className="flex items-center text-faint font-black text-sm" aria-hidden="true">VS</div>
          <PlayerCard
            player={challenger}
            statLabel={phase === 'playing' ? t('higherlower.moreOrFewer') : mode.label}
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
              <p className="text-secondary text-sm mt-1">{t('higherlower.scoredLine', { name: challenger.name, value: challenger.value, label: mode.label })}</p>
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

      <ResultModal open={showResult && dailyMode === 'daily'} onClose={() => setShowResult(false)}>
        <div className="w-full flex flex-col items-center text-center">
          <GameMotif id="higher-or-lower" className={`w-11 h-11 mb-2 ${dailyCleared ? 'text-accent-bright' : 'text-dim'}`} />
          <h2 className={`score-number text-4xl mb-1 ${dailyCleared ? 'text-success-bright' : 'text-danger-bright'}`}>{dailyCleared ? t('higherlower.chainCleared') : t('higherlower.gameOver')}</h2>
          <div className="score-number text-6xl tv-wordmark tabular-nums leading-none my-1">{streak}</div>
          <p className="text-muted text-xs font-black tracking-[0.2em] uppercase mb-2">
            {t('higherlower.streak').replace(':', '')}
            {dailyMode === 'unlimited' && streak >= best && streak > 0 && <span className="text-warn normal-case tracking-normal">{t('higherlower.newBest')}</span>}
          </p>
          {!dailyCleared && (
            <p className="text-secondary text-sm mb-2">{t('higherlower.scoredLine', { name: challenger.name, value: challenger.value, label: mode.label })}</p>
          )}
          {dailyMode === 'daily' && <DailyStats game="higherlower" stats={dailyStats} variant="score" />}
          <ShareCard
            text={[
              dailyMode === 'daily'
                ? t('share.hlDaily', { label: mode.label, streak })
                : t('share.hlUnlimited', { label: mode.label, streak, best }),
              SITE_URL,
            ].join('\n\n')}
            card={{
              gameId: 'higherlower',
              title: 'Higher or Lower',
              challenge: `${mode.label} · ${t('higherlower.todayChain')}`,
              result: dailyCleared ? t('higherlower.chainCleared') : t('higherlower.gameOver'),
              rows: [Array.from({ length: Math.min(streak, 12) }, () => TILE.hit).concat(dailyCleared ? [] : [TILE.miss])],
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
            : <>
                <button onClick={() => switchMode('unlimited')} className="mt-2 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-6 py-2.5 transition-colors">{t('common.playUnlimited')}</button>
                <p className="text-faint text-xs mt-3">{t('common.comeBackTomorrow')}</p>
              </>}
        </div>
        <UpNext exclude="higherlower" />
      </ResultModal>
    </div>
    </div>
  )
}
