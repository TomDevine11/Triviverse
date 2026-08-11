import { useState, useRef, useEffect, useMemo } from 'react'
import { usePlayerSuggestions } from '../tictactoe/usePlayerSuggestions'
import Crest from '../../components/Crest'
import { accentVars } from '../../design/accents'
import { englandPool, roundFor, matchesTarget, ENGLAND_COUNT } from '../../data/themed/englandQuiz'

// Themed "guess the England footballer by his clubs" quiz. Reuses Career Path's
// clue-reveal timeline, player autosuggest and name matcher, but as a continuous
// scored session (no daily stats/streaks) — the right shape for an SEO landing
// page whose whole job is "land here, play immediately".
export default function EnglandQuiz() {
  const pool = useMemo(() => englandPool(), [])
  const [index, setIndex] = useState(0)
  const target = useMemo(() => roundFor(pool[index]), [pool, index])
  const [revealed, setRevealed] = useState(1)
  const [guesses, setGuesses] = useState([])
  const [input, setInput] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dismissed, setDismissed] = useState(false)
  const [shake, setShake] = useState(false)
  const [phase, setPhase] = useState('playing')
  const [score, setScore] = useState({ correct: 0, played: 0 })
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const active = phase === 'playing'
  const maxClues = target.clues.length
  const usedNames = useMemo(() => new Set(), [])
  const { suggestions, isSearching } = usePlayerSuggestions(input, active, usedNames)
  useEffect(() => { setHighlightedIndex(-1); setDismissed(false) }, [input])
  const visibleSuggestions = dismissed ? [] : suggestions

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return; setDismissed(true) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const submitGuess = (text, selectedId = null) => {
    if (!active || !text.trim()) return
    setInput('')
    const correct = (selectedId != null && target.id != null) ? selectedId === target.id : matchesTarget(target.name, text)
    if (correct) {
      setGuesses(g => [...g, { text, correct: true }])
      setPhase('won'); setScore(s => ({ correct: s.correct + 1, played: s.played + 1 }))
      return
    }
    setGuesses(g => [...g, { text, correct: false }])
    setShake(true); setTimeout(() => setShake(false), 400)
    if (revealed < maxClues) setRevealed(r => r + 1)
    else { setPhase('lost'); setScore(s => ({ ...s, played: s.played + 1 })) }
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!active) return
    if (highlightedIndex >= 0 && visibleSuggestions[highlightedIndex]) { const s = visibleSuggestions[highlightedIndex]; submitGuess(s.name, s.id); return }
    if (input.trim()) submitGuess(input.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setDismissed(true); setHighlightedIndex(-1); return }
    if (!visibleSuggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, visibleSuggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, -1)) }
  }

  const skip = () => {
    if (!active) return
    setInput('')
    setGuesses(g => [...g, { text: 'Skipped', correct: false, skipped: true }])
    if (revealed < maxClues) setRevealed(r => r + 1)
    else { setPhase('lost'); setScore(s => ({ ...s, played: s.played + 1 })) }
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const next = () => {
    setIndex(i => (i + 1) % pool.length)
    setRevealed(1); setGuesses([]); setInput(''); setPhase('playing'); setHighlightedIndex(-1); setDismissed(false)
  }

  const cluesToShow = phase === 'playing' ? revealed : maxClues
  const guessesLeft = maxClues - guesses.length
  const lastGuess = active && guessesLeft <= 1
  const leftTone = guessesLeft <= 1 ? 'text-danger-bright' : guessesLeft <= 2 ? 'text-warn' : 'text-muted'

  return (
    <div style={accentVars('careers')} className="w-full">
      <div className="flex items-center justify-between mb-4 text-[0.62rem] font-black tracking-[0.12em] uppercase">
        <span className="text-faint">{ENGLAND_COUNT} England players · guess by clubs</span>
        <span className="text-secondary tabular-nums">Score {score.correct}/{score.played}</span>
      </div>

      <div className="mb-5">
        <div className="text-[0.56rem] text-faint uppercase tracking-[0.18em] mb-3 font-black px-1">Played for…</div>
        <ol className="relative">
          {target.clues.slice(0, cluesToShow).map((clue, i) => {
            const isLatest = phase === 'playing' && i === cluesToShow - 1
            const isLast = i === cluesToShow - 1
            return (
              <li key={i} className="relative flex items-stretch gap-3 pb-2.5 last:pb-0 clue-reveal">
                <div className="relative flex flex-col items-center w-3 shrink-0">
                  <span className={`mt-5 w-3 h-3 rounded-full z-10 shrink-0 ${isLatest ? 'bg-accent ring-4 ring-[color:var(--accent-tint)]' : 'bg-inert'}`} aria-hidden="true" />
                  {!isLast && <span className="flex-1 w-px bg-border-strong" aria-hidden="true" />}
                </div>
                <div className={`flex-1 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${isLatest ? 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,#16151f)]' : 'border-border-strong bg-card'}`}>
                  <Crest name={clue.club} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-primary text-sm font-bold truncate">{clue.club}</div>
                    {clue.years && <div className="text-muted text-xs tabular-nums">{clue.years}</div>}
                  </div>
                  <span className="text-faint text-[0.66rem] font-black tabular-nums shrink-0">{i + 1}</span>
                </div>
              </li>
            )
          })}
        </ol>
        {phase === 'playing' && revealed < maxClues && (
          <div className="text-center text-faint text-xs pt-2.5">{maxClues - revealed} more club{maxClues - revealed === 1 ? '' : 's'} if you miss</div>
        )}
      </div>

      {active && (
        <form onSubmit={handleSubmit} className={`relative w-full ${shake ? 'shake' : ''}`}>
          <input
            ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Which England player is this?" autoFocus role="combobox" aria-expanded={visibleSuggestions.length > 0}
            aria-controls="england-suggestions" aria-autocomplete="list" aria-label="Guess the England player"
            className="w-full bg-surface border border-border-strong focus:border-accent rounded-xl px-4 py-3.5 text-primary placeholder-faint text-base outline-none transition-colors"
            autoComplete="off" autoCorrect="off" spellCheck="false"
          />
          {isSearching && (<div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-inert border-t-accent rounded-full animate-spin" /></div>)}
          {visibleSuggestions.length > 0 && (
            <div ref={dropdownRef} id="england-suggestions" role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-strong rounded-xl overflow-hidden z-dropdown shadow-float">
              {visibleSuggestions.map((item, i) => (
                <button key={item.name} type="button" role="option" aria-selected={i === highlightedIndex}
                  onMouseDown={e => { e.preventDefault(); submitGuess(item.name, item.id) }} onMouseEnter={() => setHighlightedIndex(i)}
                  className={`w-full text-left px-4 py-2.5 transition-colors border-b border-border/50 last:border-0 ${i === highlightedIndex ? 'bg-border' : 'hover:bg-border/60'}`}>
                  <div className="flex items-center gap-2">{item.flag && <span className="text-base shrink-0">{item.flag}</span>}<span className="text-primary text-sm font-medium truncate">{item.name}</span></div>
                </button>
              ))}
            </div>
          )}
        </form>
      )}

      {active && (
        <>
          <div className={`w-full mt-3 text-center text-xs font-semibold ${leftTone}`}>{guessesLeft} {guessesLeft === 1 ? 'guess' : 'guesses'} left</div>
          <button type="button" onClick={skip}
            className={`mt-2 w-full border text-sm font-medium rounded-xl px-4 py-2.5 transition-colors ${lastGuess ? 'border-danger/40 text-danger-bright hover:bg-danger/10 hover:border-danger/70' : 'border-border-strong text-secondary hover:bg-surface hover:text-primary'}`}>
            {lastGuess ? 'Skip (ends the round)' : 'Skip / reveal next club'}
          </button>
        </>
      )}

      {!active && (
        <div className="w-full mt-1 flex flex-col items-center gap-3 text-center">
          <p className={`text-2xl font-black ${phase === 'won' ? 'text-success-bright' : 'text-danger-bright'}`}>{phase === 'won' ? 'Correct!' : 'Out of guesses'}</p>
          <p className="text-muted text-sm">It was <span className="text-primary font-bold">{target.name}</span>{phase === 'won' && guesses.length > 0 ? ` — in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}` : ''}.</p>
          <button onClick={next} className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">Next England player →</button>
        </div>
      )}
    </div>
  )
}
