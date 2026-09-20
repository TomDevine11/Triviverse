import { useState, useEffect, useMemo, useRef } from 'react'
import { createBoard, getContextoForDay, getRandomContexto, relation, isInPool, getPoolPlayer, POOL_SIZE } from '../../data/contexto'
import { usePlayerSuggestions } from '../tictactoe/usePlayerSuggestions'
import { todayIndex, recordResult, matchdayNumber } from '../../data/dailyStats'
import { loadDailyProgress, saveDailyProgress } from '../../data/dailyProgress'
import { useQa } from '../../dev/qa'
import QaBar from '../../dev/QaBar'
import DailyStats from '../../components/DailyStats'
import ModeToggle from '../../components/ModeToggle'
import ResultModal from '../../components/ResultModal'
import GameChrome from '../../components/GameChrome'
import GameMotif from '../../components/GameMotif'
import UpNext from '../../components/UpNext'
import { accentVars } from '../../design/accents'
import { ShareCard } from '../../components/ShareCard'
import { useI18n } from '../../i18n'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

const getDaily = () => getContextoForDay(todayIndex())

// Proximity bands. Contexto's whole feedback loop is "am I warmer?", so the
// board has to answer that at a glance — a bare number does not. Thresholds are
// shaped to the pool (~5,000): the top 50 are genuinely the player's circle,
// the top 500 still share a club or a country, beyond that you are guessing.
const band = (rank) => (rank <= 50 ? 'hot' : rank <= 500 ? 'warm' : rank <= 2000 ? 'cool' : 'cold')
const BAND_OPACITY = { hot: 1, warm: 0.72, cool: 0.45, cold: 0.22 }
// A log scale, because the difference between 3 and 40 matters far more than
// between 3,000 and 4,000 — linear would leave every real guess pinned at zero.
const proximity = (rank) => Math.max(0.02, 1 - Math.log(rank) / Math.log(POOL_SIZE))

export default function FootballContexto() {
  const { t } = useI18n()
  const qa = useQa('Contexto')

  const [saved] = useState(() => loadDailyProgress('contexto', getDaily().target.i))
  const restoredDone = !!saved?.done

  const [mode, setMode] = useState(qa.active ? 'unlimited' : 'daily')
  const [round, setRound] = useState(() => getDaily())
  const [guesses, setGuesses] = useState(() => saved?.guesses ?? [])  // [{ id, name, rank }]
  const [gaveUp, setGaveUp] = useState(() => saved?.gaveUp ?? false)
  const [input, setInput] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [message, setMessage] = useState('')
  const [shake, setShake] = useState(false)
  const [latestId, setLatestId] = useState(null)
  const [showResult, setShowResult] = useState(restoredDone)
  const [dailyStats, setDailyStats] = useState(null)

  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const board = useMemo(() => createBoard(round.target), [round])
  const won = guesses.some(g => g.rank === 1)
  const over = won || gaveUp
  const dailyLocked = mode === 'daily' && over

  const usedNames = useMemo(() => new Set(guesses.map(g => g.name)), [guesses])
  const { suggestions } = usePlayerSuggestions(input, !over, usedNames)
  // Only offer players the board can actually rank — a dropdown that suggests
  // someone outside the pool sets the player up to be told "not in the list".
  const visibleSuggestions = suggestions.filter(s => isInPool(s.id)).slice(0, 8)

  // Closest first: the board is a leaderboard of your own guesses, so the best
  // one stays at the top where it can be reasoned from.
  const ordered = useMemo(() => [...guesses].sort((a, b) => a.rank - b.rank), [guesses])
  const activeIndex = Math.min(highlightedIndex, Math.max(0, visibleSuggestions.length - 1))

  const finish = (didWin) => { if (mode === 'daily') setDailyStats(recordResult('contexto', didWin)) }

  useEffect(() => {
    if (mode !== 'daily') return
    if (!guesses.length && !gaveUp) return
    saveDailyProgress('contexto', { guesses, gaveUp }, over, round.target.i)
  }, [mode, guesses, gaveUp, over, round])

  useEffect(() => {
    if (!over) return
    const id = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS)
    return () => clearTimeout(id)
  }, [over])

  const resetTo = (next, m) => {
    setMode(m); setRound(next); setGuesses([]); setGaveUp(false); setInput('')
    setMessage(''); setLatestId(null); setDailyStats(null); setShowResult(false)
  }
  const startUnlimited = () => resetTo(getRandomContexto(), 'unlimited')
  const restoreDaily = () => {
    const r = getDaily()
    const s = loadDailyProgress('contexto', r.target.i)
    setMode('daily'); setRound(r)
    setGuesses(s?.guesses ?? []); setGaveUp(s?.gaveUp ?? false)
    setInput(''); setMessage(''); setLatestId(null); setDailyStats(null); setShowResult(!!s?.done)
  }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())

  /* eslint-disable react-hooks/set-state-in-effect -- intentional dev-only QA loader */
  useEffect(() => {
    if (!qa.active) return
    resetTo(getContextoForDay(qa.index), 'unlimited')
  }, [qa.active, qa.index])
  /* eslint-enable react-hooks/set-state-in-effect */

  const submitGuess = (name, id) => {
    if (over) return
    setInput('')
    const rank = id ? board.rankOf(id) : null
    if (!rank) {
      setMessage(t('contexto.notInList', { name }))
      setShake(true); setTimeout(() => setShake(false), 450)
      return
    }
    if (guesses.some(g => g.id === id)) {
      setMessage(t('contexto.alreadyGuessed', { name }))
      setLatestId(id)
      return
    }
    setMessage('')
    setLatestId(id)
    const next = [...guesses, { id, name, rank }]
    setGuesses(next)
    if (rank === 1) finish(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const pick = visibleSuggestions[activeIndex] || visibleSuggestions[0]
    if (pick) submitGuess(pick.name, pick.id)
  }
  const handleKeyDown = (e) => {
    if (!visibleSuggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, visibleSuggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)) }
  }

  const giveUp = () => { if (over) return; setGaveUp(true); finish(false) }

  const nearest = useMemo(() => board.nearest(10), [board])

  const shareRows = useMemo(() => {
    // One row per guess in play order, coloured by band — the shape of the hunt.
    const palette = { hot: '#d946ef', warm: '#c026d3', cool: '#701a75', cold: '#3a3846' }
    return guesses.slice(-12).map(g => [palette[band(g.rank)]])
  }, [guesses])

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('contexto')}>
      {qa.active && <QaBar gameId="Contexto" index={qa.index} onPrev={qa.prev} onNext={qa.next}
        meta={{ target: round.target.n, pool: POOL_SIZE }} />}
      <div className="flex flex-col items-center px-4 pb-8 max-w-4xl mx-auto">
        <div className="w-full"><GameChrome
          motifId="football-contexto"
          title={t('contexto.wordmark')}
          right={<b className="text-secondary tabular-nums">{t('contexto.guessCount', { n: guesses.length })}</b>}
        /></div>

        <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-4" />

        <div className="w-full max-w-lg space-y-2.5">
          <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3">
            <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">
              {(mode === 'daily' ? t('common.daily') : t('common.unlimited')).toUpperCase()} · {POOL_SIZE.toLocaleString()} {t('contexto.players')}{dailyLocked ? ` · ${t('common.complete')}` : ''}
            </div>
            <div className="text-primary font-bold text-sm mt-0.5">{dailyLocked ? t('common.dailyDone') : t('contexto.intro')}</div>
            <div className="text-muted text-xs mt-0.5">{dailyLocked ? t('common.comeBackTomorrow') : t('contexto.introSub')}</div>
          </div>

          {!over && (
            <form onSubmit={handleSubmit} className={`relative w-full ${shake ? 'shake' : ''}`}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); setHighlightedIndex(0) }}
                onKeyDown={handleKeyDown}
                placeholder={t('contexto.placeholder')}
                autoFocus
                role="combobox"
                aria-expanded={visibleSuggestions.length > 0}
                aria-controls="contexto-suggestions"
                aria-autocomplete="list"
                aria-label={t('contexto.placeholder')}
                className="w-full bg-surface border border-border-strong focus:border-accent rounded-xl px-4 py-3.5 text-primary placeholder-faint text-base outline-none transition-colors"
                autoComplete="off" autoCorrect="off" spellCheck="false"
              />
              {visibleSuggestions.length > 0 && (
                <div ref={dropdownRef} id="contexto-suggestions" role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-strong rounded-xl overflow-hidden z-dropdown shadow-float">
                  {visibleSuggestions.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={i === activeIndex}
                      onMouseDown={e => { e.preventDefault(); submitGuess(item.name, item.id) }}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      className={`w-full text-left px-4 py-2.5 transition-colors border-b border-border/50 last:border-0 ${i === activeIndex ? 'bg-border' : 'hover:bg-border/60'}`}
                    >
                      <div className="flex items-center gap-2">
                        {item.flag && <span className="text-base shrink-0">{item.flag}</span>}
                        <span className="text-primary text-sm font-medium truncate">{item.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          {message && <div className="text-center text-sm text-warn font-semibold">{message}</div>}

          {/* The board: your guesses, closest first. */}
          {ordered.length > 0 && (
            <ol className="space-y-1.5">
              {ordered.map(g => {
                const b = band(g.rank)
                const guessed = getPoolPlayer(g.id)
                const rel = guessed ? relation(round.target, guessed) : { kind: 'none' }
                const hint = rel.kind === 'teammate' ? t('contexto.hint.teammate', { club: rel.club })
                  : rel.kind === 'club' ? t('contexto.hint.club', { club: rel.club })
                  : rel.kind === 'nationality' ? t('contexto.hint.nationality', { value: rel.value })
                  : null
                return (
                  <li
                    key={g.id}
                    className={`relative overflow-hidden rounded-lg border px-3 py-2.5 flex items-center justify-between gap-3 ${
                      g.rank === 1
                        ? 'border-success bg-success/10'
                        : g.id === latestId ? 'border-accent bg-surface cell-reveal' : 'border-border-strong bg-surface'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-300"
                      style={{ width: `${proximity(g.rank) * 100}%`, opacity: BAND_OPACITY[b] * 0.16 }}
                    />
                    <span className="relative min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-primary truncate">{g.name}</span>
                      {hint && g.rank !== 1 && <span className="block text-[0.62rem] text-muted truncate">{hint}</span>}
                    </span>
                    <span
                      className="relative text-sm font-black tabular-nums shrink-0"
                      style={{ color: g.rank === 1 ? undefined : 'var(--accent-bright)', opacity: g.rank === 1 ? 1 : BAND_OPACITY[b] }}
                    >
                      {g.rank === 1 ? t('contexto.found') : g.rank.toLocaleString()}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}

          {!over && guesses.length >= 8 && (
            <button onClick={giveUp} className="w-full border border-border-strong text-muted hover:text-secondary hover:bg-surface text-sm font-medium rounded-xl py-2.5 transition-colors">
              {t('contexto.giveUp')}
            </button>
          )}
        </div>

        {mode === 'unlimited' && over && (
          <button onClick={startUnlimited} className="mt-5 w-full max-w-lg bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">{t('contexto.newPlayer')}</button>
        )}
        {mode === 'daily' && over && !showResult && (
          <button onClick={() => setShowResult(true)} className="mt-5 text-sm text-brand-bright hover:text-primary font-medium transition-colors">{t('common.seeResult')}</button>
        )}

        <ResultModal open={showResult && mode === 'daily'} onClose={() => setShowResult(false)}>
          <div className="w-full flex flex-col items-center text-center">
            <GameMotif id="football-contexto" className={`w-11 h-11 mb-2 ${won ? 'text-accent-bright' : 'text-dim'}`} />
            <h2 className={`score-number text-4xl mb-1 ${won ? 'text-success-bright' : 'text-danger-bright'}`}>
              {won ? t('contexto.solved', { n: guesses.length }) : t('contexto.gaveUp')}
            </h2>
            <p className="text-muted text-sm mb-1">
              {t('contexto.theAnswer')} <b className="text-primary">{round.target.n}</b>
            </p>
          </div>
          {dailyLocked && <p className="text-[0.62rem] font-black tracking-[0.14em] uppercase text-faint mb-1">{t('common.dailyDone')}</p>}
          {mode === 'daily' && <DailyStats game="contexto" stats={dailyStats} />}

          <div className="w-full mb-1">
            <div className="text-[0.55rem] font-black tracking-[0.16em] text-muted uppercase mb-1.5">{t('contexto.closest')}</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {nearest.map(p => (
                <div key={p.i} className="rounded-lg border border-border bg-surface px-3 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-[0.72rem] text-secondary truncate">{p.n}</span>
                  <span className="text-[0.72rem] text-accent-bright font-semibold tabular-nums shrink-0">{p.rank}</span>
                </div>
              ))}
            </div>
          </div>

          <ShareCard card={{
            gameId: 'contexto',
            title: 'Football Contexto',
            challenge: t('games.football-contexto.tagline'),
            result: won ? t('contexto.solved', { n: guesses.length }) : t('contexto.gaveUp'),
            rows: shareRows,
            matchday: matchdayNumber(),
          }} />
          <button onClick={startUnlimited} className="mt-2 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-6 py-2.5 transition-colors">{t('common.playUnlimited')}</button>
          <UpNext exclude="contexto" />
        </ResultModal>
      </div>
    </div>
  )
}
