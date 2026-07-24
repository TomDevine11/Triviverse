import { Fragment, useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getDailyGrid, getRandomGrid, categoryLabel, resolveGuess, findAssignment, normalizeName } from '../../data/tictactoe'
import { resolveNameToId } from '../../data/canonical/resolve'
import { refineSuggestions, searchRegistry } from '../../data/canonical/resolve.js'
import { players as localPlayers } from '../../data/players'
import { getFlagFromNationality } from '../../utils/flags'
import { ShareCard } from '../../components/ShareCard'
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
import { TILE } from '../../utils/shareImage'
import { useI18n } from '../../i18n'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

const MAX_LIVES = 3

const TSDB = 'https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p='
const EXCLUDE_SPORTS = new Set(['basketball','american football','baseball','ice hockey','tennis','golf','cricket','rugby','swimming','athletics','motorsport','cycling','boxing','mma'])

// Axis header chip — neutral, told apart by position + icon, never colour.
function HeaderChip({ category, t }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1 rounded-lg bg-surface/60 border border-border px-1 py-2 text-[10px] sm:text-xs font-bold text-secondary leading-tight">
      <CategoryIcon category={category} size={22} />
      <span>{categoryLabel(category, t)}</span>
    </div>
  )
}

// The row + column categories a square must satisfy, as neutral pills.
function CategoryPair({ rowCat, colCat, t, size = 13 }) {
  return (
    <>
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2 py-0.5 font-medium text-secondary">
        <CategoryIcon category={rowCat} size={size} />
        {categoryLabel(rowCat, t)}
      </span>
      <span className="text-faint font-black">+</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2 py-0.5 font-medium text-secondary">
        <CategoryIcon category={colCat} size={size} />
        {categoryLabel(colCat, t)}
      </span>
    </>
  )
}

// Signature of a grid's category pairs — identifies WHICH daily puzzle this is,
// so saved progress is discarded if the grid changes for a given day.
const gridSig = (g) => [...g.rowCategories, ...g.colCategories].map(c => c.value).join('|')

export default function FootballTicTacToe({ onBackToModes }) {
  const { t, lp } = useI18n()
  // Today's daily state, if any: a terminal snapshot (done) locks the round to
  // its result screen; a live snapshot resumes it. Read once at mount.
  const [saved] = useState(() => loadDailyProgress('tictactoe', gridSig(getDailyGrid())))
  const restoredDone = !!saved?.done

  const [mode, setMode] = useState('daily') // 'daily' | 'unlimited'
  const [grid, setGrid] = useState(() => getDailyGrid())
  const [filled, setFilled] = useState(() => saved?.filled ?? {}) // cellIndex -> player name
  const [lives, setLives] = useState(() => saved?.lives ?? MAX_LIVES)
  const [selectedCell, setSelectedCell] = useState(null)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState(() => saved?.history ?? [])
  const [phase, setPhase] = useState(() => saved?.phase ?? 'playing') // 'playing' | 'won' | 'lost'
  const [dailyStats, setDailyStats] = useState(null)
  useEffect(() => {
    // Only Daily mode records stats/streaks (idempotent per day).
    if (phase !== 'playing' && mode === 'daily') setDailyStats(recordResult('tictactoe', phase === 'won'))
  }, [phase, mode])
  const [shake, setShake] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [gaveUp, setGaveUp] = useState(() => saved?.gaveUp ?? false)
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false)
  const [answersCell, setAnswersCell] = useState(null) // cell whose full answer list is open
  const [resultTab, setResultTab] = useState('board')

  // A finished daily is locked: it shows its result and offers Unlimited, but
  // the board can't be replayed. (True for a just-finished or a restored round.)
  const dailyLocked = mode === 'daily' && phase !== 'playing'

  // Persist the daily as it's played, so a mid-round refresh resumes the same
  // game (no bailing out to reset lives) and a finished one stays locked.
  useEffect(() => {
    if (mode !== 'daily') return
    const started = Object.keys(filled).length > 0 || history.length > 0 || phase !== 'playing'
    if (!started) return
    saveDailyProgress('tictactoe', { filled, lives, history, phase, gaveUp }, phase !== 'playing', gridSig(grid))
  }, [mode, filled, lives, history, phase, gaveUp])

  // Leave the daily untouched; start a fresh, replayable Unlimited round.
  const startUnlimited = () => {
    setMode('unlimited'); setGrid(getRandomGrid())
    setFilled({}); setLives(MAX_LIVES); setSelectedCell(null); setInput(''); setHistory([])
    setPhase('playing'); setDailyStats(null); setGaveUp(false); setShowGiveUpConfirm(false); setAnswersCell(null); setShowResult(false); setResultTab('board')
  }
  // Return to the daily: rehydrate today's saved state (locked, resumed, or fresh).
  const restoreDaily = () => {
    const s = loadDailyProgress('tictactoe', gridSig(getDailyGrid()))
    setMode('daily'); setGrid(getDailyGrid())
    setFilled(s?.filled ?? {}); setLives(s?.lives ?? MAX_LIVES); setHistory(s?.history ?? [])
    setPhase(s?.phase ?? 'playing'); setGaveUp(s?.gaveUp ?? false)
    setSelectedCell(null); setInput(''); setShowGiveUpConfirm(false); setAnswersCell(null)
    setShowResult(!!s?.done); setResultTab('board'); setDailyStats(null)
  }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())

  const [showResult, setShowResult] = useState(restoredDone) // a restored finished daily shows its result at once
  useEffect(() => {
    if (phase === 'playing') return
    const t = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS) // let the revealed grid show first
    return () => clearTimeout(t)
  }, [phase])
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const usedNames = useMemo(() => new Set(Object.values(filled)), [filled])

  // ── Win / lose checks ────────────────────────────────────────────
  useEffect(() => {
    if (Object.keys(filled).length === 9 && phase === 'playing') {
      const t = setTimeout(() => setPhase('won'), 400)
      return () => clearTimeout(t)
    }
  }, [filled, phase])

  useEffect(() => {
    if (lives <= 0 && phase === 'playing') {
      const t = setTimeout(() => setPhase('lost'), 500)
      return () => clearTimeout(t)
    }
  }, [lives, phase])

  // ── Reveal assignment for unfilled cells once the game ends ───────
  const revealAssignment = useMemo(() => {
    if (phase === 'playing') return null
    // Reveal famous example answers (the NOTABLE set), not obscure ones.
    return findAssignment(grid.reveal, usedNames) || []
  }, [phase, grid.reveal, usedNames])

  // ── Suggestions dropdown ──────────────────────────────────────────
  // Searches the full player universe (TheSportsDB + local lists), NOT just
  // this cell's valid answers — otherwise the dropdown would give the puzzle
  // away. Picking from it just disambiguates spelling/surnames; whether it's
  // actually correct is checked separately against the cell's candidates.
  const [apiPlayers, setApiPlayers] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (phase !== 'playing' || selectedCell == null) {
      setApiPlayers([]); setIsSearching(false); return
    }
    if (normalizeName(input).length < 2) { setApiPlayers([]); setIsSearching(false); return }

    setIsSearching(true)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(TSDB + encodeURIComponent(input), { signal: controller.signal })
        const data = await res.json()
        const fetched = (data.player || [])
          .filter(p => !EXCLUDE_SPORTS.has((p.strSport || '').toLowerCase()))
          .map(p => ({ name: p.strPlayer, flag: getFlagFromNationality(p.strNationality) }))
        setApiPlayers(fetched)
      } catch (err) {
        if (err.name !== 'AbortError') setApiPlayers([])
      } finally {
        setIsSearching(false)
      }
    }, 280)
    return () => { clearTimeout(timer); controller.abort(); setIsSearching(false) }
  }, [input, phase, selectedCell])

  const suggestions = useMemo(() => {
    if (phase !== 'playing' || selectedCell == null) return []
    const norm = normalizeName(input)
    if (norm.length < 2) return []

    const localMatches = localPlayers
      .filter(p => normalizeName(p.name).includes(norm))
      .map(p => ({ name: p.name, flag: p.flag }))

    // Sources: the external API, the local list, AND the whole registry (so any
    // valid player is findable by name or surname). Canonicalised + deduped.
    const merged = refineSuggestions([...apiPlayers, ...localMatches, ...searchRegistry(input)], usedNames)

    const rank = (name) => {
      const n = normalizeName(name)
      if (n === norm) return 0                                    // exact name / mononym
      if (n.startsWith(norm)) return 1
      if (n.split(' ').some(w => w.startsWith(norm))) return 2    // any word (incl. surname) prefix
      return 3
    }
    merged.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))

    return merged.slice(0, 10)
  }, [input, phase, selectedCell, apiPlayers, usedNames])

  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    setHighlightedIndex(-1)
    setDismissed(false)
  }, [input])

  const visibleSuggestions = dismissed ? [] : suggestions

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return
      setDismissed(true)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectCell = (idx) => {
    if (phase !== 'playing' || filled[idx] != null) return
    setSelectedCell(idx)
    setInput('')
    setHighlightedIndex(-1)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const submitGuess = (text, selectedId = null) => {
    if (selectedCell == null) return
    const candidates = grid.candidates[selectedCell]
    // Phase 3: a picked suggestion validates by stable id against this cell's
    // candidates. Free-typed text falls back to the (identity-backed) resolver,
    // which also handles surname disambiguation by cell context.
    let match = null
    if (selectedId != null) {
      for (const name of candidates) {
        if (resolveNameToId(name) === selectedId && !usedNames.has(name)) { match = name; break }
      }
    }
    if (!match) match = resolveGuess(text, candidates, usedNames)

    if (match) {
      setFilled(prev => ({ ...prev, [selectedCell]: match }))
      setHistory(prev => [...prev, { text, correct: true, cell: selectedCell, name: match }])
      setSelectedCell(null)
    } else {
      setHistory(prev => [...prev, { text, correct: false, cell: selectedCell }])
      setLives(l => Math.max(0, l - 1))
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
    setInput('')
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (phase !== 'playing' || selectedCell == null) return

    if (highlightedIndex >= 0 && visibleSuggestions[highlightedIndex]) {
      const s = visibleSuggestions[highlightedIndex]
      submitGuess(s.name, s.id)
      return
    }
    if (!input.trim()) return
    submitGuess(input.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (visibleSuggestions.length) { setDismissed(true); setHighlightedIndex(-1) }
      else setSelectedCell(null)
      return
    }
    if (!visibleSuggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, visibleSuggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, -1)) }
  }

  const confirmGiveUp = () => {
    setGaveUp(true)
    setPhase('lost')
    setShowGiveUpConfirm(false)
    setSelectedCell(null)
  }


  const filledCount = Object.keys(filled).length

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('tictactoe')}>
    <div className="flex flex-col items-center px-4 pb-8 max-w-4xl mx-auto">
      <div className="w-full"><GameChrome
        motifId="tictactoe"
        title={t('tictactoe.wordmark')}
        right={
          <span className="inline-flex items-center gap-1.5" aria-label={lives === 1 ? t('tictactoe.lifeLeft', { n: lives }) : t('tictactoe.livesLeft', { n: lives })}>
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <i key={i} className={`w-2.5 h-2.5 rounded-full ${i < lives ? 'bg-accent' : 'bg-inert'}`} aria-hidden="true" />
            ))}
            <b className="ml-1 text-secondary tabular-nums">{filledCount}/9</b>
          </span>
        }
      /></div>

      {/* Mode toggle stays dead-centre; the modes link is a satellite. */}
      <div className="relative w-full max-w-lg flex justify-center mt-1 mb-4">
        {onBackToModes ? (
          <button onClick={onBackToModes} className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-secondary transition-colors">
            {t('tictactoe.modes')}
          </button>
        ) : (
          <Link to={lp('/')} className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-secondary transition-colors">
            {t('common.allGames')}
          </Link>
        )}
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>

      {/* Intro card (or the locked-daily banner once today's round is finished) */}
      <div className="w-full max-w-lg mb-4">
        <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3">
          <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">
            {(mode === 'daily' ? t('common.daily') : t('common.unlimited')).toUpperCase()} · 3 × 3{dailyLocked ? ` · ${t('common.complete')}` : ''}
          </div>
          <div className="text-primary font-bold text-sm mt-0.5">{dailyLocked ? t('common.dailyDone') : t('tictactoe.fillEvery')}</div>
          <div className="text-muted text-xs mt-0.5">{dailyLocked ? t('common.comeBackTomorrow') : t('tictactoe.fillEverySub')}</div>
        </div>
      </div>

      {/* Grid — headers sit outside the board as neutral chips */}
      <div className="w-full max-w-lg mb-5 overflow-x-auto">
        <div
          className="grid gap-1.5 mx-auto"
          style={{ gridTemplateColumns: `minmax(70px, 1fr) repeat(3, minmax(90px, 1fr))`, width: 'fit-content', minWidth: '100%' }}
        >
          {/* corner */}
          <div />
          {/* column headers */}
          {grid.colCategories.map((cat, i) => (
            <HeaderChip key={`col-${i}`} category={cat} t={t} />
          ))}

          {/* rows */}
          {[0, 1, 2].map(r => (
            <Fragment key={r}>
              <HeaderChip category={grid.rowCategories[r]} t={t} />
              {[0, 1, 2].map(c => {
                const idx = r * 3 + c
                const playerName = filled[idx]
                const gameOver = phase !== 'playing'
                const revealName = !playerName && gameOver ? revealAssignment?.[idx] : null
                const isSelected = selectedCell === idx
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => gameOver ? setAnswersCell(idx) : selectCell(idx)}
                    disabled={phase === 'playing' && !!playerName}
                    className={`relative aspect-square w-full rounded-lg border flex flex-col items-center justify-center text-center px-1 transition-colors ${
                      gameOver ? 'cursor-pointer hover:ring-1 hover:ring-muted' : ''
                    } ${
                      playerName
                        ? 'border-success/60 bg-success/10 cell-reveal'
                        : revealName
                          ? 'border-danger/40 bg-danger/5'
                          : isSelected
                            ? 'border-accent ring-2 ring-accent/40 bg-[color-mix(in_srgb,var(--accent)_12%,#100e1c)]'
                            : 'border-border-strong bg-board hover:border-muted'
                    }`}
                  >
                    {gameOver && <span className="absolute top-1 right-1 text-[10px] opacity-50" aria-hidden="true">🔍</span>}
                    {playerName ? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-success-bright">
                          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[10px] sm:text-xs font-bold text-primary leading-tight mt-1 line-clamp-2">{playerName}</span>
                      </>
                    ) : revealName ? (
                      <span className="text-[10px] sm:text-xs font-medium text-muted leading-tight line-clamp-2">{revealName}</span>
                    ) : (
                      <span className="text-dim text-xl" aria-hidden="true">+</span>
                    )}
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {phase !== 'playing' && (
        <div className="w-full max-w-lg -mt-2 mb-4 text-center text-xs text-muted">
          {t('tictactoe.tapSquare')}
        </div>
      )}

      {/* Unlimited reveals its answers on the board itself — no result card,
          just a replay button once the round is over. */}
      {mode === 'unlimited' && phase !== 'playing' && (
        <button onClick={startUnlimited} className="mb-4 w-full max-w-lg bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">
          {t('tictactoe.newGrid')}
        </button>
      )}

      {phase === 'playing' && selectedCell != null && (
        <>
          <div className="w-full max-w-lg mb-2 flex items-center justify-center gap-1.5 text-xs">
            <CategoryPair rowCat={grid.rowCategories[Math.floor(selectedCell / 3)]} colCat={grid.colCategories[selectedCell % 3]} t={t} />
          </div>
          <form onSubmit={handleSubmit} className={`relative w-full max-w-lg ${shake ? 'shake' : ''}`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('tictactoe.placeholder')}
              autoFocus
              role="combobox"
              aria-expanded={visibleSuggestions.length > 0}
              aria-controls="ttt-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={highlightedIndex >= 0 ? `ttt-option-${highlightedIndex}` : undefined}
              className="w-full bg-surface border border-border-strong focus:border-accent rounded-xl px-4 py-3.5 text-primary placeholder-faint text-base outline-none transition-colors"
              autoComplete="off" autoCorrect="off" spellCheck="false"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-inert border-t-accent rounded-full animate-spin" />
              </div>
            )}
            {visibleSuggestions.length > 0 && (
              <div ref={dropdownRef} id="ttt-suggestions" role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-strong rounded-xl overflow-hidden z-10 shadow-2xl">
                {visibleSuggestions.map((item, i) => (
                  <button
                    key={item.name}
                    type="button"
                    id={`ttt-option-${i}`}
                    role="option"
                    aria-selected={i === highlightedIndex}
                    onMouseDown={e => { e.preventDefault(); submitGuess(item.name, item.id) }}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className={`w-full text-left px-4 py-2.5 transition-colors border-b border-border/50 last:border-0 ${i === highlightedIndex ? 'bg-canvas-high' : 'hover:bg-canvas-high/60'}`}
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
          <button
            type="button"
            onClick={() => setSelectedCell(null)}
            className="mt-2 text-xs text-muted hover:text-secondary transition-colors"
          >
            {t('common.cancel')}
          </button>
        </>
      )}

      {phase === 'playing' && (
        <>
          <div className="w-full max-w-lg mt-3 flex justify-between items-center text-xs text-faint px-1">
            <span>{t('tictactoe.squares', { n: filledCount })}</span>
            <span>{lives === 1 ? t('tictactoe.lifeLeft', { n: lives }) : t('tictactoe.livesLeft', { n: lives })}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowGiveUpConfirm(true)}
            className="mt-4 w-full max-w-lg border border-danger/40 text-danger-bright hover:bg-danger/10 hover:border-danger/70 text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            {t('tictactoe.giveUp')}
          </button>
        </>
      )}

      {showGiveUpConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-20 px-4">
          <div className="w-full max-w-sm bg-card border border-border-strong rounded-2xl p-5 text-center">
            <p className="text-primary font-medium mb-1">{t('tictactoe.giveUpTitle')}</p>
            <p className="text-muted text-sm mb-5">{t('tictactoe.giveUpBody')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowGiveUpConfirm(false)}
                className="flex-1 border border-border-strong text-secondary hover:bg-surface text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmGiveUp}
                className="flex-1 bg-danger/80 hover:bg-danger text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                {t('tictactoe.giveUpConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All-answers reveal for a finished square */}
      {answersCell != null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-30 px-4" onClick={() => setAnswersCell(null)}>
          <div className="w-full max-w-sm bg-card border border-border-strong rounded-2xl p-5 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center flex-wrap gap-1.5 mb-1 leading-tight text-xs">
              <CategoryPair rowCat={grid.rowCategories[Math.floor(answersCell / 3)]} colCat={grid.colCategories[answersCell % 3]} t={t} size={12} />
            </div>
            <div className="text-muted text-xs text-center mb-3">{t('tictactoe.possibleAnswers', { n: grid.candidates[answersCell].length })}</div>
            <div className="overflow-y-auto -mx-1 px-1">
              <div className="grid grid-cols-2 gap-1.5">
                {grid.candidates[answersCell].map(name => (
                  <div
                    key={name}
                    className={`text-xs rounded px-2 py-1.5 leading-tight ${
                      name === filled[answersCell] ? 'bg-success/15 border border-success/40 text-success-bright font-semibold' : 'bg-surface text-secondary'
                    }`}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAnswersCell(null)}
              className="mt-4 border border-border-strong text-secondary hover:bg-surface text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              {t('tictactoe.close')}
            </button>
          </div>
        </div>
      )}

      {mode === 'daily' && phase !== 'playing' && !showResult && (
        <button onClick={() => setShowResult(true)} className="mt-2 mb-6 text-sm text-brand-bright hover:text-primary font-medium transition-colors">{t('common.seeResult')}</button>
      )}

      <ResultModal open={showResult && mode === 'daily'} onClose={() => setShowResult(false)}>
        <div className="w-full flex flex-col items-center text-center">
          <GameMotif id="tictactoe" className={`w-11 h-11 mb-2 ${phase === 'won' ? 'text-accent-bright' : 'text-dim'}`} />
          <h2 className={`score-number text-4xl mb-1 ${phase === 'won' ? 'text-success-bright' : 'text-danger-bright'}`}>
            {phase === 'won' ? t('tictactoe.gridComplete') : gaveUp ? t('tictactoe.gaveUp') : t('tictactoe.gameOver')}
          </h2>
          <p className="text-muted text-sm mb-1">
            {phase === 'won'
              ? (lives === 1 ? t('tictactoe.filledAllLife', { n: lives }) : t('tictactoe.filledAllLives', { n: lives }))
              : gaveUp ? t('tictactoe.filledBeforeGaveUp', { n: filledCount }) : t('tictactoe.filledBeforeLost', { n: filledCount })}
          </p>
          {dailyLocked && (
            <p className="text-[0.62rem] font-black tracking-[0.14em] uppercase text-faint mb-1">{t('common.dailyDone')}</p>
          )}
        </div>
        {mode === 'daily' && <DailyStats game="tictactoe" stats={dailyStats} />}

        {/* Board recap, always shown (share is now a single button below). */}
        {resultTab === 'board' && (
          <div className="w-full mb-1">
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }, (_, i) => {
                const name = filled[i] ?? revealAssignment?.[i]
                const got = filled[i] != null
                return (
                  <div key={i} className={`rounded-lg border px-1 py-2.5 text-center text-[10px] font-medium leading-tight ${
                    got ? 'border-success/50 bg-success/10 text-primary' : 'border-danger/30 bg-danger/5 text-muted'
                  }`}>
                    {name}
                  </div>
                )
              })}
            </div>
            <p className="text-faint text-[0.64rem] text-center mt-2">{t('tictactoe.tapSquare')}</p>
          </div>
        )}
        <ShareCard card={{
          gameId: 'tictactoe',
          title: t('tictactoe.wordmark'),
          challenge: t('games.tictactoe.tagline'),
          result: phase === 'won' ? t('tictactoe.gridComplete') : gaveUp ? t('tictactoe.gaveUp') : t('tictactoe.gameOver'),
          rows: [0, 1, 2].map(r => [0, 1, 2].map(c => filled[r * 3 + c] != null ? TILE.hit : TILE.miss)),
          matchday: matchdayNumber(),
        }} />
        <button onClick={startUnlimited} className="mt-2 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-6 py-2.5 transition-colors">{mode === 'daily' ? t('common.playUnlimited') : t('tictactoe.newGrid')}</button>
        <UpNext exclude="tictactoe" />
      </ResultModal>

      {/* Guess history */}
      {history.length > 0 && (
        <div className="w-full max-w-lg mt-2">
          <div className="text-[0.56rem] font-black tracking-[0.16em] uppercase text-faint mb-2 px-1">
            {t('tictactoe.guesses', { n: history.length })}
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border/40 max-h-56 overflow-y-auto">
              {[...history].reverse().map((g, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${g.correct === true ? 'flash-valid' : 'flash-invalid'}`}>
                  <span className="text-sm text-primary truncate">{g.text}</span>
                  {g.correct === true
                    ? <span className="text-success-bright text-xs font-semibold shrink-0">{t('tictactoe.square', { n: g.cell + 1 })}</span>
                    : <span className="text-danger-bright text-xs font-semibold shrink-0">✗</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
