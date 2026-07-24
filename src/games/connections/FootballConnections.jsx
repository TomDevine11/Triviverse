import { useState, useMemo, useEffect } from 'react'
import { getDailyConnections, getRandomConnections, shuffleNames } from '../../data/connections'
import DailyStats from '../../components/DailyStats'
import ModeToggle from '../../components/ModeToggle'
import ResultModal from '../../components/ResultModal'
import CategoryIcon from '../../components/CategoryIcon'
import GameChrome from '../../components/GameChrome'
import GameMotif from '../../components/GameMotif'
import UpNext from '../../components/UpNext'
import { accentVars } from '../../design/accents'
import { recordResult, matchdayNumber } from '../../data/dailyStats'
import { loadDailyProgress, saveDailyProgress } from '../../data/dailyProgress'
import { ShareCard } from '../../components/ShareCard'
import { useI18n } from '../../i18n'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

const MAX_LIVES = 4
// Group tier colours (board pieces, like Wordle's tile.*): the difficulty ramp
// volt → cyan → gold → purple. Applied inline (bg/border/text derive from one hex).
const GROUP_TIERS = ['#a3e635', '#22d3ee', '#eab308', '#a78bfa']
const tierStyle = (i) => ({
  background: `${GROUP_TIERS[i]}1f`,
  borderColor: `${GROUP_TIERS[i]}88`,
})
const keyOf = names => [...names].sort().join('|')

export default function FootballConnections() {
  const { t } = useI18n()
  // Today's daily state, if any: resume it, or lock a finished one to its result.
  const [saved] = useState(() => loadDailyProgress('connections', getDailyConnections().tiles.join('|')))
  const restoredDone = !!saved?.done

  const [mode, setMode] = useState('daily') // 'daily' | 'unlimited'
  const [puzzle, setPuzzle] = useState(() => getDailyConnections())
  const [solved, setSolved] = useState(() => saved?.solved ?? [])        // [{ groupIndex, label, players }]
  const [selected, setSelected] = useState([])    // names
  const [lives, setLives] = useState(() => saved?.lives ?? MAX_LIVES)
  const [order, setOrder] = useState(() => saved?.order ?? puzzle.tiles)
  const [message, setMessage] = useState('')
  const [pastGuesses, setPastGuesses] = useState(() => new Set(saved?.pastGuesses ?? []))
  const [guessRows, setGuessRows] = useState(() => saved?.guessRows ?? []) // each row: group index per selected tile
  const [shake, setShake] = useState(false)
  const [resultTab, setResultTab] = useState('groups')

  const solvedNames = useMemo(() => new Set(solved.flatMap(s => s.players)), [solved])
  const remaining = order.filter(n => !solvedNames.has(n))
  const won = solved.length === 4
  const lost = lives <= 0 && !won
  const over = won || lost
  // A finished daily is locked to its result and offers Unlimited.
  const dailyLocked = mode === 'daily' && over

  const [dailyStats, setDailyStats] = useState(null)
  // Only Daily mode records stats/streaks (idempotent per day).
  useEffect(() => { if (over && mode === 'daily') setDailyStats(recordResult('connections', won)) }, [over, won, mode])

  // Persist the daily as it's played so a refresh resumes it and a finished
  // round stays locked (no bailing out to reset lives). Set → array for storage.
  useEffect(() => {
    if (mode !== 'daily') return
    if (solved.length === 0 && guessRows.length === 0 && !over) return
    saveDailyProgress('connections', { solved, lives, order, guessRows, pastGuesses: [...pastGuesses] }, over, puzzle.tiles.join('|'))
  }, [mode, solved, lives, order, guessRows, pastGuesses, over])

  // Leave the daily untouched; start a fresh, replayable Unlimited round.
  const startUnlimited = () => {
    const p = getRandomConnections()
    setMode('unlimited'); setPuzzle(p); setOrder(p.tiles)
    setSolved([]); setSelected([]); setLives(MAX_LIVES); setMessage('')
    setPastGuesses(new Set()); setGuessRows([]); setDailyStats(null); setShowResult(false); setResultTab('groups')
  }
  // Return to the daily: rehydrate today's saved state (locked, resumed, or fresh).
  const restoreDaily = () => {
    const s = loadDailyProgress('connections', getDailyConnections().tiles.join('|'))
    const p = getDailyConnections()
    setMode('daily'); setPuzzle(p); setOrder(s?.order ?? p.tiles)
    setSolved(s?.solved ?? []); setSelected([]); setLives(s?.lives ?? MAX_LIVES); setMessage('')
    setPastGuesses(new Set(s?.pastGuesses ?? [])); setGuessRows(s?.guessRows ?? []); setDailyStats(null)
    setShowResult(!!s?.done); setResultTab('groups')
  }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())
  const [showResult, setShowResult] = useState(restoredDone)
  useEffect(() => {
    if (!over) return
    const t = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS) // let the solved groups show first
    return () => clearTimeout(t)
  }, [over])

  const toggle = (name) => {
    if (over) return
    setMessage('')
    setSelected(sel => sel.includes(name) ? sel.filter(n => n !== name) : sel.length < 4 ? [...sel, name] : sel)
  }

  const submit = () => {
    if (selected.length !== 4 || over) return
    const key = keyOf(selected)
    if (pastGuesses.has(key)) { setMessage(t('connections.alreadyGuessed')); return }

    // record this guess as a colour row (the group each selected tile belongs to)
    setGuessRows(rows => [...rows, selected.map(n => puzzle.groups.findIndex(g => g.players.includes(n)))])

    const match = puzzle.groups.findIndex(g => keyOf(g.players) === key)
    if (match >= 0) {
      setSolved(s => [...s, { groupIndex: match, label: puzzle.groups[match].label, players: puzzle.groups[match].players }])
      setSelected([])
      setMessage('')
      return
    }

    // wrong — record, deduct a life, hint if one away
    setPastGuesses(p => new Set(p).add(key))
    const oneAway = puzzle.groups.some(g => g.players.filter(p => selected.includes(p)).length === 3)
    setLives(l => l - 1)
    setMessage(oneAway ? t('connections.oneAway') : t('connections.notGroup'))
    setShake(true); setTimeout(() => setShake(false), 400)
    setSelected([])
  }

  const shuffleTiles = () => {
    setOrder([...solved.flatMap(s => s.players), ...shuffleNames(remaining)])
  }

  // On loss, reveal the groups not yet solved.
  const revealed = lost
    ? puzzle.groups.map((g, i) => ({ groupIndex: i, label: g.label, players: g.players }))
        .filter(g => !solved.some(s => s.groupIndex === g.groupIndex))
    : []
  const shownGroups = [...solved, ...revealed]
  // The finish card always lists all four in difficulty order.
  const allGroups = puzzle.groups.map((g, i) => ({ groupIndex: i, label: g.label, players: g.players }))

  const mistakes = MAX_LIVES - lives

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('connections')}>
    <div className="flex flex-col items-center px-4 pb-8 max-w-4xl mx-auto">
      <div className="w-full"><GameChrome
        motifId="connections"
        title={t('connections.wordmark')}
        right={
          <span className="inline-flex items-center gap-1.5" aria-label={t('connections.introSub')}>
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <i key={i} className={`w-2.5 h-2.5 rounded-full ${i < lives ? 'bg-accent' : 'bg-inert'}`} aria-hidden="true" />
            ))}
            <b className="ml-1 text-secondary tabular-nums">{solved.length}/4</b>
          </span>
        }
      /></div>

      <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-4" />

      {/* The board — a wider stage on desktop, the tight grid on mobile */}
      <div className="w-full max-w-lg lg:max-w-[52rem] space-y-2.5">
        <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3">
          <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">{(mode === 'daily' ? t('common.daily') : t('common.unlimited')).toUpperCase()} · 4 × 4{dailyLocked ? ` · ${t('common.complete')}` : ''}</div>
          <div className="text-primary font-bold text-sm mt-0.5">{dailyLocked ? t('common.dailyDone') : t('connections.intro')}</div>
          <div className="text-muted text-xs mt-0.5">{dailyLocked ? t('common.comeBackTomorrow') : t('connections.introSub')}</div>
        </div>

        {/* Solved / revealed group bars */}
        {shownGroups.map(g => (
          <div key={g.groupIndex} style={tierStyle(g.groupIndex)} className="rounded-xl border px-4 py-3 text-center cell-reveal">
            <div className="flex items-center justify-center gap-1.5">
              <CategoryIcon category={puzzle.groups[g.groupIndex].category} size={18} />
              <div className="font-black text-xs uppercase tracking-[0.1em]" style={{ color: GROUP_TIERS[g.groupIndex] }}>{g.label}</div>
            </div>
            <div className="text-secondary text-sm mt-0.5">{g.players.join(', ')}</div>
          </div>
        ))}

        {/* Remaining tiles */}
        {!over && (
          <div className={`grid grid-cols-4 gap-2 lg:gap-2.5 ${shake ? 'shake' : ''}`}>
            {remaining.map(name => {
              const isSel = selected.includes(name)
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggle(name)}
                  aria-pressed={isSel}
                  className={`rounded-lg lg:rounded-xl border px-1 py-4 lg:py-6 flex items-center justify-center text-center text-[11px] sm:text-xs lg:text-sm font-bold leading-tight transition-[transform,border-color,background-color] duration-fast ${
                    isSel
                      ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_12%,#16151f)] text-primary -translate-y-0.5'
                      : 'border-border-strong bg-surface text-secondary hover:border-muted'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}

        {message && <div className="text-center text-sm text-warn font-semibold">{message}</div>}

        {!over && (
          <div className="flex gap-3 pt-1">
            <button onClick={shuffleTiles} className="flex-1 border border-border-strong text-secondary hover:bg-surface text-sm font-medium rounded-xl py-3 transition-colors">{t('connections.shuffle')}</button>
            <button onClick={() => setSelected([])} disabled={!selected.length} className="flex-1 border border-border-strong text-secondary hover:bg-surface disabled:opacity-40 text-sm font-medium rounded-xl py-3 transition-colors">{t('connections.deselect')}</button>
            <button onClick={submit} disabled={selected.length !== 4} className="flex-1 bg-brand hover:bg-brand-hover disabled:opacity-40 text-white text-sm font-bold rounded-xl py-3 transition-colors">{t('connections.submit')}</button>
          </div>
        )}
      </div>

      {/* Unlimited: the group bars reveal in place — just a replay button. */}
      {mode === 'unlimited' && over && (
        <button onClick={startUnlimited} className="mt-5 w-full max-w-lg lg:max-w-[52rem] bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">{t('connections.newPuzzle')}</button>
      )}

      {mode === 'daily' && over && !showResult && (
        <button onClick={() => setShowResult(true)} className="mt-5 text-sm text-brand-bright hover:text-primary font-medium transition-colors">{t('common.seeResult')}</button>
      )}

      <ResultModal open={showResult && mode === 'daily'} onClose={() => setShowResult(false)}>
        <div className="w-full flex flex-col items-center text-center">
          <GameMotif id="connections" className={`w-11 h-11 mb-2 ${won ? 'text-accent-bright' : 'text-dim'}`} />
          <h2 className={`score-number text-4xl mb-1 ${won ? 'text-success-bright' : 'text-danger-bright'}`}>
            {won ? t('connections.solved') : t('connections.outOf')}
          </h2>
          <p className="text-muted text-sm mb-1">
            {won
              ? t('connections.foundAll', { n: mistakes })
              : mode === 'daily' ? t('common.comeBackTomorrow') : t('connections.betterLuck')}
          </p>
        </div>
        {dailyLocked && <p className="text-[0.62rem] font-black tracking-[0.14em] uppercase text-faint mb-1">{t('common.dailyDone')}</p>}
        {mode === 'daily' && <DailyStats game="connections" stats={dailyStats} />}

        {/* The groups, always shown (share is now a single button below). */}
        {resultTab === 'groups' && (
          <div className="w-full space-y-1.5 mb-1 max-h-56 overflow-y-auto">
            {allGroups.map(g => (
              <div key={g.groupIndex} style={tierStyle(g.groupIndex)} className="rounded-lg border px-3 py-2 text-center">
                <div className="font-black text-[0.66rem] uppercase tracking-[0.1em]" style={{ color: GROUP_TIERS[g.groupIndex] }}>{g.label}</div>
                <div className="text-secondary text-xs mt-0.5">{g.players.join(' · ')}</div>
              </div>
            ))}
          </div>
        )}
        <ShareCard card={{
          gameId: 'connections',
          title: 'Football Connections',
          challenge: t('games.connections.tagline'),
          result: won ? t('connections.solved') : t('connections.outOf'),
          rows: guessRows.map(row => row.map(g => GROUP_TIERS[g])),
          matchday: matchdayNumber(),
        }} />
        <button onClick={startUnlimited} className="mt-2 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-6 py-2.5 transition-colors">{t('common.playUnlimited')}</button>
        <UpNext exclude="connections" />
      </ResultModal>
    </div>
    </div>
  )
}
