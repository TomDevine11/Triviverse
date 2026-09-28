import { useState, useRef, useEffect, useMemo } from 'react'
import { getRandomTarget, getDailyTarget, matchesTarget, MAX_CLUES } from '../../data/teammates'
import { usePlayerSuggestions } from '../tictactoe/usePlayerSuggestions'
import { ShareCard, RESULT_SECONDARY_BTN } from '../../components/ShareCard'
import DailyStats from '../../components/DailyStats'
import ModeToggle from '../../components/ModeToggle'
import ResultModal from '../../components/ResultModal'
import { shortTitle } from '../../components/nextGames'
import ResultAnswer from '../../components/ResultAnswer'
import GameChrome from '../../components/GameChrome'
import GameMotif from '../../components/GameMotif'
import { accentVars } from '../../design/accents'
import { useI18n } from '../../i18n'
import { recordResult, matchdayNumber } from '../../data/dailyStats'
import { loadDailyProgress, saveDailyProgress } from '../../data/dailyProgress'
import { TILE } from '../../utils/shareImage'
import { SITE_URL } from '../../utils/site'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

export default function GuessByTeammates() {
  const { t } = useI18n()
  // Today's daily state, if any: resume it, or lock a finished one to its result.
  const [saved] = useState(() => loadDailyProgress('teammates', getDailyTarget().name))
  const restoredDone = !!saved?.done

  const [mode, setMode] = useState('daily')        // 'daily' | 'unlimited'
  const [target, setTarget] = useState(() => getDailyTarget())
  const [revealed, setRevealed] = useState(() => saved?.revealed ?? 1)      // clues shown so far (1..MAX_CLUES)
  const [guesses, setGuesses] = useState(() => saved?.guesses ?? [])       // { text, correct }
  const [input, setInput] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dismissed, setDismissed] = useState(false)
  const [phase, setPhase] = useState(() => saved?.phase ?? 'playing')    // 'playing' | 'won' | 'lost'
  const [shake, setShake] = useState(false)
  const [dailyStats, setDailyStats] = useState(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const active = phase === 'playing'
  // Only Daily mode records stats/streaks.
  useEffect(() => {
    if (phase !== 'playing' && mode === 'daily') setDailyStats(recordResult('teammates', phase === 'won'))
  }, [phase, mode])
  const usedNames = useMemo(() => new Set(), [])
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

  // Phase 3: a picked suggestion is authoritative by player id (fixes namesake
  // false-accepts). Free-typed text with no id, or an ambiguous target, still
  // uses the name matcher.
  const submitGuess = (text, selectedId = null) => {
    if (!active || !text.trim()) return
    setInput('')
    const correct = (selectedId != null && target.id != null)
      ? selectedId === target.id
      : matchesTarget(target.name, text)
    if (correct) {
      setGuesses(g => [...g, { text, correct: true }])
      setPhase('won')
      return
    }
    setGuesses(g => [...g, { text, correct: false }])
    setShake(true); setTimeout(() => setShake(false), 400)
    if (revealed < MAX_CLUES) setRevealed(r => r + 1)
    else setPhase('lost')
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

  // Skip this go: reveal the next clue but still use one of your tries.
  const skip = () => {
    if (!active) return
    setInput('')
    setGuesses(g => [...g, { text: 'Skipped', correct: false, skipped: true }])
    if (revealed < MAX_CLUES) setRevealed(r => r + 1)
    else setPhase('lost')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const [showResult, setShowResult] = useState(restoredDone)
  useEffect(() => {
    if (phase === 'playing') return
    const t = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS)
    return () => clearTimeout(t)
  }, [phase])

  // A finished daily is locked to its result and offers Unlimited.
  const dailyLocked = mode === 'daily' && phase !== 'playing'

  // Persist the daily as it's played so a refresh resumes it and a finished
  // round stays locked (no bailing out to reset tries).
  useEffect(() => {
    if (mode !== 'daily') return
    if (guesses.length === 0 && phase === 'playing') return
    saveDailyProgress('teammates', { revealed, guesses, phase }, phase !== 'playing', target.name)
  }, [mode, revealed, guesses, phase])

  // Leave the daily untouched; start a fresh, replayable Unlimited round.
  const startUnlimited = () => {
    setMode('unlimited'); setTarget(getRandomTarget())
    setRevealed(1); setGuesses([]); setInput(''); setPhase('playing'); setHighlightedIndex(-1); setDailyStats(null); setShowResult(false)
  }
  // Return to the daily: rehydrate today's saved state (locked, resumed, or fresh).
  const restoreDaily = () => {
    const s = loadDailyProgress('teammates', getDailyTarget().name)
    setMode('daily'); setTarget(getDailyTarget())
    setRevealed(s?.revealed ?? 1); setGuesses(s?.guesses ?? []); setInput(''); setPhase(s?.phase ?? 'playing')
    setHighlightedIndex(-1); setDailyStats(null); setShowResult(!!s?.done)
  }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())

  const cluesToShow = phase === 'playing' ? revealed : MAX_CLUES
  const guessesLeft = MAX_CLUES - guesses.length

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('teammates')}>
    <div className="flex flex-col items-center px-4 pb-8 max-w-3xl mx-auto">
      <div className="w-full"><GameChrome
        motifId="teammates"
        title={t('teammates.wordmark')}
        right={phase === 'playing' ? <b className="text-secondary tabular-nums">{t('teammates.left', { n: guessesLeft })}</b> : null}
      /></div>

      <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-4" />

      {/* Intro card (or the locked-daily banner once today's round is finished) */}
      <div className="w-full max-w-lg mb-3">
        <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3">
          <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">{(mode === 'daily' ? t('common.daily') : t('common.unlimited')).toUpperCase()}{dailyLocked ? ` · ${t('common.complete')}` : ''}</div>
          <div className="text-primary font-bold text-sm mt-0.5">{dailyLocked ? t('common.dailyDone') : t('teammates.intro')}</div>
          <div className="text-muted text-xs mt-0.5">{dailyLocked ? t('common.comeBackTomorrow') : t('teammates.introSub', { max: MAX_CLUES })}</div>
        </div>
      </div>

      {/* The mystery entry — pinned above the sheet */}
      <div className="w-full max-w-lg mb-3">
        <div className="flex items-center gap-3 bg-[linear-gradient(120deg,var(--accent-tint),transparent_55%)] bg-card border border-border-strong rounded-xl px-4 py-3">
          <span className="w-10 h-10 shrink-0 rounded-lg bg-canvas border border-dashed border-[color-mix(in_srgb,var(--accent)_55%,transparent)] flex items-center justify-center text-lg font-black text-accent-bright" aria-hidden="true">?</span>
          <div className="min-w-0">
            <div className="text-[0.62rem] font-black tracking-[0.14em] text-primary">{t('teammates.intro').toUpperCase()}</div>
            <div className="text-muted text-xs mt-0.5">{phase === 'playing' ? t('teammates.left', { n: guessesLeft }) : target.name}</div>
          </div>
        </div>
      </div>

      {/* The team sheet — numbered rows filling in teammate by teammate */}
      <div className="w-full max-w-lg mb-4">
        <div className="text-[0.58rem] text-faint uppercase tracking-[0.18em] mb-2 font-black px-1">{t('teammates.playedWith')}</div>
        <div className="rounded-xl border border-border overflow-hidden">
          {Array.from({ length: MAX_CLUES + 3 }).map((_, i) => {
            const clue = i < cluesToShow ? target.clues[i] : null
            if (i >= target.clues.length && !clue) return null
            return clue ? (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 last:border-0 bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] clue-reveal">
                <span className="text-faint text-[0.66rem] font-black w-4 tabular-nums shrink-0">{i + 1}</span>
                {clue.flag && <span className="text-lg shrink-0">{clue.flag}</span>}
                <div className="flex-1 min-w-0">
                  <div className="text-primary text-sm font-bold truncate">{clue.name}</div>
                  {phase !== 'playing' && <div className="text-muted text-xs truncate">{clue.team}</div>}
                </div>
                <span className="text-[0.5rem] font-black tracking-[0.12em] text-[color-mix(in_srgb,var(--accent-bright)_70%,transparent)] shrink-0">{t('teammates.playedWith').toUpperCase()}</span>
              </div>
            ) : (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 last:border-0">
                <span className="text-faint text-[0.66rem] font-black w-4 tabular-nums shrink-0">{i + 1}</span>
                <span className="text-inert text-xs font-bold tracking-[0.12em]">{t('teammates.hiddenRow')}</span>
              </div>
            )
          })}
        </div>
        {phase === 'playing' && revealed < MAX_CLUES && (
          <div className="text-center text-faint text-xs pt-2">{t('teammates.moreClues', { n: MAX_CLUES - revealed })}</div>
        )}
      </div>

      {/* Input */}
      {active && (
        <form onSubmit={handleSubmit} className={`relative w-full max-w-lg ${shake ? 'shake' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('teammates.placeholder')}
            autoFocus
            className="w-full bg-surface border border-border-strong focus:border-brand rounded-xl px-4 py-3.5 text-primary placeholder-muted text-base outline-none transition-colors"
            autoComplete="off" autoCorrect="off" spellCheck="false"
            role="combobox" aria-expanded={visibleSuggestions.length > 0} aria-autocomplete="list" aria-label={t('teammates.placeholder')}
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-border-strong border-t-brand rounded-full animate-spin" />
            </div>
          )}
          {visibleSuggestions.length > 0 && (
            <div ref={dropdownRef} role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-strong rounded-xl overflow-hidden z-dropdown shadow-float">
              {visibleSuggestions.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  role="option"
                  aria-selected={i === highlightedIndex}
                  onMouseDown={e => { e.preventDefault(); submitGuess(item.name, item.id) }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={`w-full text-left px-4 py-2.5 transition-colors border-b border-border/50 last:border-0 ${i === highlightedIndex ? 'bg-border' : 'hover:bg-border/60'}`}
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

      {active && (
        <button
          type="button"
          onClick={skip}
          className="mt-3 w-full max-w-lg border border-border-strong text-muted hover:bg-surface hover:text-secondary text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
        >
          {t('teammates.skip')}
        </button>
      )}

      {/* Unlimited: the team sheet + mystery entry reveal the answer in place — just a replay button. */}
      {mode === 'unlimited' && phase !== 'playing' && (
        <button onClick={startUnlimited} className="mt-1 mb-4 w-full max-w-lg bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">{t('teammates.newPlayer')}</button>
      )}

      {/* Result */}
      {mode === 'daily' && phase !== 'playing' && !showResult && (
        <button onClick={() => setShowResult(true)} className="mt-1 mb-4 text-sm text-brand-bright hover:text-primary font-medium transition-colors">{t('common.seeResult')}</button>
      )}

      <ResultModal game="teammates" open={showResult && mode === 'daily'} onClose={() => setShowResult(false)}>
        <div className="w-full flex flex-col items-center text-center">
          <GameMotif id="teammates" className={`w-12 h-12 mb-2 ${phase === 'won' ? 'text-accent-bright' : 'text-dim'}`} />
          <h2 className={`score-number text-3xl mb-1 ${phase === 'won' ? 'text-success-bright' : 'text-danger-bright'}`}>
            {phase === 'won' ? t('teammates.correct') : t('teammates.outOf')}
          </h2>
          <ResultAnswer label={t('teammates.mysteryWas')} detail={phase === 'won' && guesses.length > 0 ? t('teammates.inN', { n: guesses.length }) : null}>{target.name}</ResultAnswer>
          {mode === 'daily' && <DailyStats game="teammates" stats={dailyStats} />}
          <ShareCard
            text={[
              phase === 'won'
                ? t('share.teammatesWon', { n: guesses.length, max: MAX_CLUES })
                : t('share.teammatesLost'),
              SITE_URL,
            ].join('\n\n')}
            card={{
              gameId: 'teammates',
              title: t('teammates.wordmark'),
              challenge: t('games.teammates.tagline'),
              result: phase === 'won' ? t('teammates.correct') : t('teammates.outOf'),
              rows: [guesses.map(g => g.correct ? TILE.hit : g.skipped ? TILE.near : TILE.miss)],
              matchday: matchdayNumber(),
            }}
          />
          <button onClick={startUnlimited} className={RESULT_SECONDARY_BTN}>{t('common.unlimitedGame', { name: shortTitle(t, 'teammates') })}</button>
          {mode === 'daily' && <p className="text-faint text-xs mt-3">{t('common.comeBackTomorrow')}</p>}
        </div>
      </ResultModal>

      {/* Guess history */}
      {guesses.length > 0 && (
        <div className="w-full max-w-lg mt-4">
          <div className="text-[0.58rem] text-faint uppercase tracking-[0.18em] mb-2 font-black px-1">{t('teammates.yourGuesses')}</div>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/40">
            {guesses.map((g, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${g.correct ? 'flash-valid' : g.skipped ? '' : 'flash-invalid'}`}>
                <span className={`text-sm truncate ${g.skipped ? 'text-muted italic' : 'text-primary'}`}>{g.text}</span>
                <span className={`text-xs font-semibold shrink-0 ${g.correct ? 'text-success-bright' : g.skipped ? 'text-muted' : 'text-danger'}`}>{g.correct ? '✓' : g.skipped ? '↷' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
