import { useState, useRef, useEffect, useMemo } from 'react'
import GameChrome from '../../components/GameChrome'
import ModeToggle from '../../components/ModeToggle'
import { usePlayerSuggestions } from '../tictactoe/usePlayerSuggestions'
import { accentVars } from '../../design/accents'
import { todayIndex, recordResult } from '../../data/dailyStats'
import { POINTLESS_QUESTIONS, matchAnswer } from '../../data/pointless/pointlessGame'

// Name 5 valid answers, going as obscure as possible. Each scores "how many of
// 100 would name this player for THIS question" (from Transfermarkt apps/goals) —
// low is good; a valid answer nobody would name is a pointless 0.
const MAX_ANSWERS = 5
const N = POINTLESS_QUESTIONS.length
const tone = (p) => (p === 0 ? 'text-success-bright' : p <= 15 ? 'text-success' : p <= 40 ? 'text-warn' : 'text-danger-bright')
const dailyIdx = () => todayIndex() % N
const randomIdx = () => Math.floor(Math.random() * N)

export default function FootballPointless() {
  const [mode, setMode] = useState('daily')            // 'daily' | 'unlimited'
  const [qIndex, setQIndex] = useState(dailyIdx)
  const question = POINTLESS_QUESTIONS[qIndex]
  const [answers, setAnswers] = useState([])
  const [input, setInput] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dismissed, setDismissed] = useState(false)
  const [shake, setShake] = useState(false)
  const [toast, setToast] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const done = answers.length >= MAX_ANSWERS || revealed
  const active = !done
  const usedNames = useMemo(() => new Set(), [qIndex])
  const { suggestions, isSearching } = usePlayerSuggestions(input, active, usedNames)
  useEffect(() => { setHighlightedIndex(-1); setDismissed(false) }, [input])
  const visibleSuggestions = dismissed ? [] : suggestions
  useEffect(() => {
    const h = (e) => { if (dropdownRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return; setDismissed(true) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const total = answers.reduce((s, a) => s + a.p, 0)
  const foundPointless = answers.some(a => a.p === 0)
  // Every valid pointless (0) answer, most recognisable first (answers are stored
  // ascending nameability, so the 0-block reversed = recognisable → obscure).
  const allPointless = useMemo(() => question.answers.filter(a => a.p === 0).reverse(), [question])
  const fullList = useMemo(() => [...question.answers].sort((a, b) => b.p - a.p), [question])
  const verdict = total === 0 ? 'Flawless — pure pointless!' : total <= 40 ? 'Deep cuts. Excellent.' : total <= 120 ? 'Solid — but you named some obvious ones.' : 'Too famous! Dig more obscure.'

  // Record the daily result once when it finishes (won = you found a pointless).
  useEffect(() => {
    if (done && mode === 'daily' && !recorded) { recordResult('pointless', foundPointless, total); setRecorded(true) }
  }, [done, mode, recorded, foundPointless, total])

  const resetRound = () => { setAnswers([]); setInput(''); setRevealed(false); setHighlightedIndex(-1); setDismissed(false); setToast(''); setShowAll(false); setRecorded(false) }
  const startDaily = () => { setMode('daily'); setQIndex(dailyIdx()); resetRound() }
  const startUnlimited = () => { setMode('unlimited'); setQIndex(randomIdx()); resetRound() }
  const onModeChange = (m) => (m === 'daily' ? startDaily() : startUnlimited())
  const nextRandom = () => { let n; do { n = randomIdx() } while (n === qIndex && N > 1); setQIndex(n); resetRound() }

  const flash = (msg) => { setToast(msg); setShake(true); setTimeout(() => setShake(false), 400); setTimeout(() => setToast(''), 1600) }
  const submit = (text) => {
    if (!active || !text.trim()) return
    setInput('')
    const m = matchAnswer(question, text)
    if (!m) { flash('Not a valid answer for this one'); return }
    if (answers.some(a => a.d === m.d)) { flash('Already used'); return }
    setAnswers(a => [...a, m])
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  const handleSubmit = (e) => { e.preventDefault(); if (!active) return; if (highlightedIndex >= 0 && visibleSuggestions[highlightedIndex]) { submit(visibleSuggestions[highlightedIndex].name); return } if (input.trim()) submit(input.trim()) }
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setDismissed(true); setHighlightedIndex(-1); return }
    if (!visibleSuggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, visibleSuggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, -1)) }
  }

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('tenable')}>
      <div className="flex flex-col items-center px-4 pb-10 max-w-lg mx-auto">
        <div className="w-full"><GameChrome motifId="tenable" title="FOOTBALL POINTLESS" right={<b className={`tabular-nums ${total <= 40 ? 'text-success-bright' : 'text-secondary'}`}>{total} pts</b>} /></div>

        <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-4" modes={[['daily', 'Daily'], ['unlimited', 'Practice']]} />

        <div className="w-full bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3 mb-4">
          <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">{mode === 'daily' ? 'DAILY' : 'PRACTICE'} · GO LOW</div>
          <div className="text-primary font-bold text-sm mt-0.5">{question.title}</div>
          <div className="text-muted text-xs mt-0.5">{question.description} The rarer the answer, the fewer points — find a <b className="text-success-bright">pointless (0)</b>.</div>
        </div>

        <div className="w-full space-y-2 mb-4">
          {Array.from({ length: MAX_ANSWERS }).map((_, i) => {
            const a = answers[i]
            return (
              <div key={i} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${a ? 'border-border-strong bg-surface' : 'border-dashed border-border bg-card/40'}`}>
                <span className={`text-sm font-bold ${a ? 'text-primary' : 'text-faint'}`}>{a ? a.d : `Answer ${i + 1}`}</span>
                {a && <span className={`score-number text-xl tabular-nums ${tone(a.p)}`}>{a.p}</span>}
              </div>
            )
          })}
        </div>

        {active && (
          <form onSubmit={handleSubmit} className={`relative w-full ${shake ? 'shake' : ''}`}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Name a valid answer…" autoFocus
              role="combobox" aria-expanded={visibleSuggestions.length > 0} aria-autocomplete="list" aria-label="Name a valid answer"
              className="w-full bg-surface border border-border-strong focus:border-accent rounded-xl px-4 py-3.5 text-primary placeholder-faint text-base outline-none transition-colors" autoComplete="off" autoCorrect="off" spellCheck="false" />
            {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-inert border-t-accent rounded-full animate-spin" /></div>}
            {visibleSuggestions.length > 0 && (
              <div ref={dropdownRef} role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-strong rounded-xl overflow-hidden z-dropdown shadow-float">
                {visibleSuggestions.map((item, i) => (
                  <button key={item.name} type="button" role="option" aria-selected={i === highlightedIndex}
                    onMouseDown={e => { e.preventDefault(); submit(item.name) }} onMouseEnter={() => setHighlightedIndex(i)}
                    className={`w-full text-left px-4 py-2.5 transition-colors border-b border-border/50 last:border-0 ${i === highlightedIndex ? 'bg-border' : 'hover:bg-border/60'}`}>
                    <div className="flex items-center gap-2">{item.flag && <span className="text-base shrink-0">{item.flag}</span>}<span className="text-primary text-sm font-medium truncate">{item.name}</span></div>
                  </button>
                ))}
              </div>
            )}
          </form>
        )}
        {toast && <div className="text-danger-bright text-xs font-semibold mt-2">{toast}</div>}
        {active && <button onClick={() => setRevealed(true)} className="mt-3 text-xs text-muted hover:text-secondary transition-colors">Finish early &amp; reveal the pointless answers →</button>}

        {done && (
          <div className="w-full mt-4 text-center">
            <div className={`score-number text-4xl mb-1 ${total <= 40 ? 'text-success-bright' : 'text-primary'}`}>{total} pts</div>
            <div className="text-secondary text-sm">{verdict}</div>
            {foundPointless && <div className="text-success-bright text-xs font-black tracking-[0.14em] uppercase mt-1">★ Pointless answer found ★</div>}

            {/* every pointless answer, recognisable first */}
            <div className="mt-5 text-left">
              <div className="text-[0.56rem] text-faint uppercase tracking-[0.18em] mb-2 font-black">All {allPointless.length} pointless (0) answers</div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
                {allPointless.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span className="text-secondary truncate mr-2">{a.d}</span>
                    <span className="score-number text-success-bright tabular-nums shrink-0">0</span>
                  </div>
                ))}
              </div>
            </div>

            {/* full scored list — testing */}
            <button onClick={() => setShowAll(v => !v)} className="mt-4 text-[0.62rem] font-black tracking-[0.14em] uppercase text-faint hover:text-secondary transition-colors">
              {showAll ? 'Hide' : 'Show'} all answers &amp; scores (test)
            </button>
            {showAll && (
              <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-border divide-y divide-border/50 text-left">
                {fullList.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="text-secondary truncate mr-2">{a.d}</span>
                    <span className={`tabular-nums font-bold shrink-0 ${tone(a.p)}`}>{a.p}</span>
                  </div>
                ))}
              </div>
            )}

            {mode === 'unlimited'
              ? <button onClick={nextRandom} className="w-full mt-6 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">New question →</button>
              : <button onClick={startUnlimited} className="w-full mt-6 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">Practice more →</button>}
          </div>
        )}
      </div>
    </div>
  )
}
