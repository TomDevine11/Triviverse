import { Fragment, useState, useRef, useEffect, useMemo } from 'react'
import { getRandomGrid, buildGrid, categoryLabel, resolveGuess, normalizeName } from '../../data/tictactoe'
import { usePlayerSuggestions } from './usePlayerSuggestions'
import { getWinner, isFull } from './winner'
import GridBuilder from './GridBuilder'
import CategoryIcon from '../../components/CategoryIcon'
import GameChrome from '../../components/GameChrome'
import ResultModal from '../../components/ResultModal'
import Mark from './Mark'
import { accentVars } from '../../design/accents'
import { useI18n } from '../../i18n'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

const MARK = { X: 'X', O: 'O' } // letters for inline text; <Mark> renders the glyph
// X/O are game pieces, not UI — they keep their own mark.* colours.
const MARK_COLOR = { X: 'text-mark-x', O: 'text-mark-o' }
const MARK_EDGE = { X: 'border-l-mark-x', O: 'border-l-mark-o' }

export default function TicTacToeVersus({ onBackToModes }) {
  const { t } = useI18n()
  const [grid, setGrid] = useState(null)         // null = setup screen
  const [building, setBuilding] = useState(false) // showing the grid builder
  const [owners, setOwners] = useState({})       // cellIndex -> 'X' | 'O'
  const [cellPlayers, setCellPlayers] = useState({}) // cellIndex -> player name
  const [turn, setTurn] = useState('X')
  const [starter, setStarter] = useState('X')
  const [selectedCell, setSelectedCell] = useState(null)
  const [input, setInput] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dismissed, setDismissed] = useState(false)
  const [result, setResult] = useState(null)     // null | {mark, line} | 'draw'
  const [scores, setScores] = useState({ X: 0, O: 0 })
  const [shake, setShake] = useState(false)
  const [lastWrong, setLastWrong] = useState(null) // { by, text, why } — why the last guess failed
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const usedNames = useMemo(() => new Set(Object.values(cellPlayers)), [cellPlayers])
  const active = result == null && selectedCell != null
  const { suggestions, isSearching } = usePlayerSuggestions(input, active, usedNames)

  useEffect(() => { setHighlightedIndex(-1); setDismissed(false) }, [input])
  const visibleSuggestions = dismissed ? [] : suggestions

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return
      setDismissed(true)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Let the winning line show on the board first, then raise the finish card.
  const [showResult, setShowResult] = useState(false)
  useEffect(() => {
    if (result == null) return
    const timer = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS)
    return () => clearTimeout(timer)
  }, [result])

  const selectCell = (idx) => {
    if (result != null || owners[idx]) return
    setSelectedCell(idx)
    setInput('')
    setHighlightedIndex(-1)
    setLastWrong(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Work out WHY a guess failed so we can tell the player.
  const reasonWrong = (text, cell) => {
    const norm = normalizeName(text)
    for (const used of usedNames) {
      const surname = normalizeName(used.split(' ').slice(-1)[0])
      if (normalizeName(used) === norm || surname === norm) {
        return t('tictactoe.alreadyUsed', { name: used })
      }
    }
    const rowLabel = categoryLabel(grid.rowCategories[Math.floor(cell / 3)], t)
    const colLabel = categoryLabel(grid.colCategories[cell % 3], t)
    return t('tictactoe.doesntSatisfy', { row: rowLabel, col: colLabel })
  }

  const endTurnWrong = (text, cell) => {
    setLastWrong({ by: turn, text: text.trim(), why: reasonWrong(text, cell) })
    setShake(true)
    setTimeout(() => setShake(false), 400)
    setTurn(t => (t === 'X' ? 'O' : 'X'))
    setSelectedCell(null)
    setInput('')
  }

  // Skip your go: pass the turn to the other player without claiming a square.
  const skipTurn = () => {
    if (result != null) return
    setLastWrong({ by: turn, skipped: true })
    setTurn(t => (t === 'X' ? 'O' : 'X'))
    setSelectedCell(null)
    setInput('')
  }

  const submitGuess = (text) => {
    if (selectedCell == null || result != null) return
    const match = resolveGuess(text, grid.candidates[selectedCell], usedNames)
    if (!match) { endTurnWrong(text, selectedCell); return }

    const nextOwners = { ...owners, [selectedCell]: turn }
    setOwners(nextOwners)
    setCellPlayers(prev => ({ ...prev, [selectedCell]: match }))
    setSelectedCell(null)
    setInput('')
    setLastWrong(null)

    const win = getWinner(nextOwners)
    if (win) {
      setResult(win)
      setScores(s => ({ ...s, [win.mark]: s[win.mark] + 1 }))
    } else if (isFull(nextOwners)) {
      setResult('draw')
    } else {
      setTurn(t => (t === 'X' ? 'O' : 'X'))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!active) return
    if (highlightedIndex >= 0 && visibleSuggestions[highlightedIndex]) {
      submitGuess(visibleSuggestions[highlightedIndex].name); return
    }
    if (input.trim()) submitGuess(input.trim())
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

  const resetBoard = (nextStarter) => {
    setOwners({}); setCellPlayers({})
    setStarter(nextStarter); setTurn(nextStarter)
    setSelectedCell(null); setInput(''); setResult(null); setLastWrong(null); setShowResult(false)
  }
  const startRandom = () => { setGrid(getRandomGrid()); setScores({ X: 0, O: 0 }); resetBoard('X') }
  const startCustom = (rowCats, colCats) => { setGrid(buildGrid(rowCats, colCats)); setBuilding(false); setScores({ X: 0, O: 0 }); resetBoard('X') }
  const playAgain = () => resetBoard(starter === 'X' ? 'O' : 'X') // same grid, keep scores
  const toSetup = () => { setGrid(null); setBuilding(false); setScores({ X: 0, O: 0 }); resetBoard('X') }

  const winningLine = result && result !== 'draw' ? result.line : []

  const scoreline = (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <span className={`inline-flex items-center gap-1 ${MARK_COLOR.X}`}><Mark mark="X" size={13} /> {scores.X}</span>
      <span className="text-faint">·</span>
      <span className={`inline-flex items-center gap-1 ${MARK_COLOR.O}`}><Mark mark="O" size={13} /> {scores.O}</span>
    </span>
  )

  const chrome = (right) => (
    <div className="w-full"><GameChrome motifId="tictactoe" title={t('tictactoe.wordmark')} right={right} /></div>
  )

  const modesLink = (
    <div className="relative w-full max-w-lg flex justify-center mt-1 mb-4 min-h-[1rem]">
      <button onClick={onBackToModes} className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-secondary transition-colors">
        {t('tictactoe.modes')}
      </button>
    </div>
  )

  // ── Grid builder ──────────────────────────────────────────────────
  if (building) return <GridBuilder onBuild={startCustom} onCancel={() => setBuilding(false)} />

  // ── Setup: choose a random or custom grid ─────────────────────────
  if (!grid) {
    return (
      <div className="tv-scene min-h-dvh text-primary" style={accentVars('tictactoe')}>
        <div className="flex flex-col items-center px-4 pb-8 max-w-4xl mx-auto">
          {chrome('1V1')}
          {modesLink}
          <div className="w-full max-w-lg text-center mt-6 mb-6">
            <div className="flex items-center justify-center gap-1.5 mb-3"><Mark mark="X" size={30} /><Mark mark="O" size={30} /></div>
            <h1 className="score-number text-3xl text-primary mb-1">{t('tictactoe.versusTitle')}</h1>
            <p className="text-muted text-sm">{t('tictactoe.vsChoose')}</p>
          </div>
          <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={startRandom} className="bg-card border border-border-strong hover:border-accent rounded-2xl p-6 text-left transition-colors">
              <div className="text-primary font-bold text-lg">{t('tictactoe.randomGrid')}</div>
              <div className="text-muted text-xs mt-1">{t('tictactoe.randomGridDesc')}</div>
              <div className="text-accent-bright text-sm font-black mt-3" aria-hidden="true">→</div>
            </button>
            <button onClick={() => setBuilding(true)} className="bg-card border border-border-strong hover:border-accent rounded-2xl p-6 text-left transition-colors">
              <div className="text-primary font-bold text-lg">{t('tictactoe.buildOwn')}</div>
              <div className="text-muted text-xs mt-1">{t('tictactoe.buildOwnDesc')}</div>
              <div className="text-accent-bright text-sm font-black mt-3" aria-hidden="true">→</div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('tictactoe')}>
    <div className="flex flex-col items-center px-4 pb-8 max-w-4xl mx-auto">
      {chrome(scoreline)}
      {modesLink}

      {/* Wrong-guess alert — clear, persistent, explains why */}
      {result == null && lastWrong && (
        lastWrong.skipped ? (
          <div className={`w-full max-w-lg mb-3 rounded-xl border border-border-strong bg-surface/60 px-5 py-3 text-center ${shake ? 'shake' : ''}`}>
            <div className="text-secondary text-sm font-semibold">{t('tictactoe.playerSkipped', { mark: MARK[lastWrong.by] })}</div>
            <div className="text-muted text-xs mt-0.5">{t('tictactoe.turnPasses', { mark: MARK[turn] })}</div>
          </div>
        ) : (
          <div className={`w-full max-w-lg mb-3 rounded-xl border border-danger/50 bg-danger/10 px-5 py-3 text-center ${shake ? 'shake' : ''}`}>
            <div className="text-danger-bright text-sm font-semibold">
              {t('tictactoe.wrongGuess', { mark: MARK[lastWrong.by], text: lastWrong.text })}
            </div>
            <div className="text-danger-bright/80 text-xs mt-0.5">
              {t('tictactoe.wrongDetail', { text: lastWrong.text, why: lastWrong.why, mark: MARK[turn] })}
            </div>
          </div>
        )
      )}

      {/* Turn / result banner */}
      <div className="w-full max-w-lg mb-4">
        {result == null ? (
          <div className={`bg-card border border-border-strong border-l-4 ${MARK_EDGE[turn]} rounded-xl px-4 py-3`}>
            <div className="text-sm flex items-center gap-2">
              <Mark mark={turn} size={18} />
              <span>
                <span className={`font-bold ${MARK_COLOR[turn]}`}>{t('tictactoe.playerTurn', { mark: MARK[turn] })}</span>
                <span className="text-secondary">{t('tictactoe.claimSquare')}</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border-strong rounded-xl px-4 py-4 text-center">
            {result === 'draw' ? (
              <div className="text-primary font-bold">{t('tictactoe.draw')}</div>
            ) : (
              <div className={`font-bold text-lg inline-flex items-center gap-2 ${MARK_COLOR[result.mark]}`}>
                <Mark mark={result.mark} size={20} />{t('tictactoe.wins', { mark: MARK[result.mark] })}
              </div>
            )}
            <div className="mt-3 flex items-center justify-center gap-3">
              <button onClick={playAgain} className="bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-5 py-2 transition-colors">
                {t('tictactoe.playAgain')}
              </button>
              <button onClick={toSetup} className="border border-border-strong text-secondary hover:bg-surface text-sm font-medium rounded-lg px-5 py-2 transition-colors">
                {t('tictactoe.newGridBtn')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid — headers sit outside the board as neutral chips */}
      <div className="w-full max-w-lg mb-5 overflow-x-auto">
        <div className="grid gap-1.5 mx-auto" style={{ gridTemplateColumns: `minmax(70px, 1fr) repeat(3, minmax(90px, 1fr))`, width: 'fit-content', minWidth: '100%' }}>
          <div />
          {grid.colCategories.map((cat, i) => (
            <div key={`col-${i}`} className="flex flex-col items-center justify-center text-center gap-1 rounded-lg bg-surface/60 border border-border px-1 py-2 text-[10px] sm:text-xs font-bold text-secondary leading-tight">
              <CategoryIcon category={cat} size={22} />
              <span>{categoryLabel(cat, t)}</span>
            </div>
          ))}
          {[0, 1, 2].map(r => (
            <Fragment key={r}>
              <div className="flex flex-col items-center justify-center text-center gap-1 rounded-lg bg-surface/60 border border-border px-1 py-2 text-[10px] sm:text-xs font-bold text-secondary leading-tight">
                <CategoryIcon category={grid.rowCategories[r]} size={22} />
                <span>{categoryLabel(grid.rowCategories[r], t)}</span>
              </div>
              {[0, 1, 2].map(c => {
                const idx = r * 3 + c
                const owner = owners[idx]
                const isSelected = selectedCell === idx
                const inWin = winningLine.includes(idx)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => selectCell(idx)}
                    disabled={result != null || !!owner}
                    className={`aspect-square w-full rounded-lg border flex flex-col items-center justify-center text-center px-1 transition-colors ${
                      owner
                        ? `${inWin ? 'border-success bg-success/15' : owner === 'X' ? 'border-mark-x/40 bg-mark-x/10' : 'border-mark-o/40 bg-mark-o/10'} cell-reveal`
                        : isSelected
                          ? 'border-accent ring-2 ring-accent/40 bg-[color-mix(in_srgb,var(--accent)_12%,#100e1c)]'
                          : 'border-border-strong bg-board hover:border-muted'
                    }`}
                  >
                    {owner ? (
                      <>
                        <Mark mark={owner} size={28} />
                        <span className="text-[10px] sm:text-xs font-medium text-secondary leading-tight mt-1 line-clamp-2">{cellPlayers[idx]}</span>
                      </>
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

      {/* Input */}
      {active && (
        <>
          <div className="w-full max-w-lg mb-2 flex items-center justify-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2 py-0.5 font-medium text-secondary">
              <CategoryIcon category={grid.rowCategories[Math.floor(selectedCell / 3)]} size={13} />
              {categoryLabel(grid.rowCategories[Math.floor(selectedCell / 3)], t)}
            </span>
            <span className="text-faint font-black">+</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2 py-0.5 font-medium text-secondary">
              <CategoryIcon category={grid.colCategories[selectedCell % 3]} size={13} />
              {categoryLabel(grid.colCategories[selectedCell % 3], t)}
            </span>
          </div>
          <form onSubmit={handleSubmit} className={`relative w-full max-w-lg ${shake ? 'shake' : ''}`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('tictactoe.vsPlaceholder', { mark: MARK[turn] })}
              autoFocus
              role="combobox"
              aria-expanded={visibleSuggestions.length > 0}
              aria-controls="ttt-vs-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={highlightedIndex >= 0 ? `ttt-vs-option-${highlightedIndex}` : undefined}
              className="w-full bg-surface border border-border-strong focus:border-accent rounded-xl px-4 py-3.5 text-primary placeholder-faint text-base outline-none transition-colors"
              autoComplete="off" autoCorrect="off" spellCheck="false"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-inert border-t-accent rounded-full animate-spin" />
              </div>
            )}
            {visibleSuggestions.length > 0 && (
              <div ref={dropdownRef} id="ttt-vs-suggestions" role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-strong rounded-xl overflow-hidden z-10 shadow-2xl">
                {visibleSuggestions.map((item, i) => (
                  <button
                    key={item.name}
                    type="button"
                    id={`ttt-vs-option-${i}`}
                    role="option"
                    aria-selected={i === highlightedIndex}
                    onMouseDown={e => { e.preventDefault(); submitGuess(item.name) }}
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
          <button type="button" onClick={() => setSelectedCell(null)} className="mt-2 text-xs text-muted hover:text-secondary transition-colors">
            {t('common.cancel')}
          </button>
        </>
      )}

      {result == null && selectedCell == null && (
        <p className="text-faint text-xs mt-1">{t('tictactoe.tapEmpty')}</p>
      )}

      {result == null && (
        <>
          <button
            type="button"
            onClick={skipTurn}
            className="mt-3 w-full max-w-lg border border-border-strong text-secondary hover:bg-surface hover:text-primary text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            {t('tictactoe.skipGo', { mark: MARK[turn] })}
          </button>
          <button
            type="button"
            onClick={toSetup}
            className="mt-2 text-xs text-muted hover:text-secondary transition-colors"
          >
            {t('tictactoe.newGridLink')}
          </button>
        </>
      )}

      {/* Finish card — round scoreline instead of daily stats */}
      <ResultModal game="tictactoe" open={showResult} onClose={() => setShowResult(false)}>
        <div className="w-full flex flex-col items-center text-center">
          {result === 'draw' ? (
            <div className="flex items-center gap-1.5 mb-2"><Mark mark="X" size={34} /><Mark mark="O" size={34} /></div>
          ) : (
            <Mark mark={result?.mark ?? 'X'} size={44} className="mb-2" />
          )}
          <h2 className={`score-number text-4xl mb-1 ${result === 'draw' ? 'text-primary' : MARK_COLOR[result?.mark ?? 'X']}`}>
            {result === 'draw' ? t('tictactoe.draw') : t('tictactoe.wins', { mark: MARK[result?.mark ?? 'X'] })}
          </h2>
          <div className="score-number text-2xl text-secondary tabular-nums mt-1 mb-2 inline-flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 ${MARK_COLOR.X}`}><Mark mark="X" size={18} /> {scores.X}</span>
            <span className="text-faint">—</span>
            <span className={`inline-flex items-center gap-1.5 ${MARK_COLOR.O}`}>{scores.O} <Mark mark="O" size={18} /></span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-1">
          <button onClick={playAgain} className="bg-border/60 hover:bg-border border border-border-strong text-primary text-sm font-bold rounded-lg px-6 py-2.5 transition-colors">
            {t('tictactoe.playAgain')}
          </button>
          <button onClick={toSetup} className="border border-border-strong text-secondary hover:bg-surface text-sm font-medium rounded-lg px-6 py-2.5 transition-colors">
            {t('tictactoe.newGridBtn')}
          </button>
        </div>
      </ResultModal>
    </div>
    </div>
  )
}
