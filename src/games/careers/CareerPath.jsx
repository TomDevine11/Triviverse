import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getRandomTarget, getDailyTarget, getTargetForDay, matchesTarget } from '../../data/careers'
import { useQa } from '../../dev/qa'
import QaBar from '../../dev/QaBar'
import { usePlayerSuggestions } from '../tictactoe/usePlayerSuggestions'
import { ShareCard } from '../../components/ShareCard'
import Crest from '../../components/Crest'
import DailyStats from '../../components/DailyStats'
import ModeToggle from '../../components/ModeToggle'
import ResultModal from '../../components/ResultModal'
import GameChrome from '../../components/GameChrome'
import GameMotif from '../../components/GameMotif'
import UpNext from '../../components/UpNext'
import { accentVars } from '../../design/accents'
import { useI18n } from '../../i18n'
import { recordResult, matchdayNumber } from '../../data/dailyStats'
import { loadDailyProgress, saveDailyProgress } from '../../data/dailyProgress'
import { TILE } from '../../utils/shareImage'
import { SITE_URL } from '../../utils/site'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

export default function CareerPath() {
  const { t, lp } = useI18n()
  const qa = useQa('CareerPath') // dev-only; inert for normal players
  // Today's daily state, if any: resume it, or lock a finished one to its result.
  const [saved] = useState(() => loadDailyProgress('careers', getDailyTarget().name))
  const restoredDone = !!saved?.done

  const [mode, setMode] = useState(qa.active ? 'unlimited' : 'daily')        // 'daily' | 'unlimited'
  const [target, setTarget] = useState(() => getDailyTarget())
  const [revealed, setRevealed] = useState(() => saved?.revealed ?? 1)
  const [guesses, setGuesses] = useState(() => saved?.guesses ?? [])
  const [input, setInput] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dismissed, setDismissed] = useState(false)
  const [phase, setPhase] = useState(() => saved?.phase ?? 'playing') // 'playing' | 'won' | 'lost'
  const [shake, setShake] = useState(false)
  const [dailyStats, setDailyStats] = useState(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const active = phase === 'playing'
  // The whole career is in play — the number of clues (and tries) is however
  // many clubs this player had, not a fixed cap.
  const maxClues = target.clues.length
  // Only Daily mode records stats/streaks.
  useEffect(() => {
    if (phase !== 'playing' && mode === 'daily') setDailyStats(recordResult('careers', phase === 'won'))
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
  // false-accepts like selecting a different "…Ronaldo"). Free-typed text with
  // no id, or an ambiguous target, still uses the name matcher.
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
    if (revealed < maxClues) setRevealed(r => r + 1)
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

  // Skip this go: reveal the next club but still use one of your tries.
  const skip = () => {
    if (!active) return
    setInput('')
    setGuesses(g => [...g, { text: 'Skipped', correct: false, skipped: true }])
    if (revealed < maxClues) setRevealed(r => r + 1)
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
    saveDailyProgress('careers', { revealed, guesses, phase }, phase !== 'playing', target.name)
  }, [mode, revealed, guesses, phase])

  // Leave the daily untouched; start a fresh, replayable Unlimited round.
  const startUnlimited = () => {
    setMode('unlimited'); setTarget(getRandomTarget())
    setRevealed(1); setGuesses([]); setInput(''); setPhase('playing'); setHighlightedIndex(-1); setDailyStats(null); setShowResult(false)
  }
  // Return to the daily: rehydrate today's saved state (locked, resumed, or fresh).
  const restoreDaily = () => {
    const s = loadDailyProgress('careers', getDailyTarget().name)
    setMode('daily'); setTarget(getDailyTarget())
    setRevealed(s?.revealed ?? 1); setGuesses(s?.guesses ?? []); setInput(''); setPhase(s?.phase ?? 'playing')
    setHighlightedIndex(-1); setDailyStats(null); setShowResult(!!s?.done)
  }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())
  /* eslint-disable react-hooks/set-state-in-effect -- intentional dev-only QA loader */
  // QA mode (dev-only): load the generated mystery player at the cursor index in
  // practice mode. Runs on mount + on Skip; nothing recorded, daily untouched.
  useEffect(() => {
    if (!qa.active) return
    setMode('unlimited'); setTarget(getTargetForDay(qa.index))
    setRevealed(1); setGuesses([]); setInput(''); setPhase('playing'); setHighlightedIndex(-1); setDailyStats(null); setShowResult(false)
  }, [qa.active, qa.index])
  /* eslint-enable react-hooks/set-state-in-effect */

  const cluesToShow = phase === 'playing' ? revealed : maxClues
  const guessesLeft = maxClues - guesses.length
  const lastGuess = active && guessesLeft <= 1        // next wrong guess / skip ends it
  const leftTone = guessesLeft <= 1 ? 'text-danger-bright' : guessesLeft <= 2 ? 'text-warn' : 'text-muted'

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('careers')}>
      {qa.active && <QaBar gameId="Career Path" index={qa.index} onPrev={qa.prev} onNext={qa.next}
        meta={{ mysteryPlayer: target.name, clubs: target.clubs?.length }} />}
    <div className="flex flex-col items-center px-4 pb-8 max-w-3xl mx-auto">
      <div className="w-full"><GameChrome
        motifId="career-path"
        title={t('careers.wordmark')}
        right={<b className={`tabular-nums ${active ? leftTone : 'text-secondary'}`}>{active ? t('teammates.left', { n: guessesLeft }) : ''}</b>}
      /></div>

      {/* Mode toggle centred; the all-games link is a satellite. */}
      <div className="relative w-full max-w-lg flex justify-center mt-1 mb-4">
        <Link to={lp('/')} className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-secondary transition-colors">{t('common.allGames')}</Link>
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>

      {/* Intro card (or the locked-daily banner once today's round is finished) */}
      <div className="w-full max-w-lg mb-5">
        <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3">
          <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">{(mode === 'daily' ? t('common.daily') : t('common.unlimited')).toUpperCase()}{dailyLocked ? ` · ${t('common.complete')}` : ''}</div>
          <div className="text-primary font-bold text-sm mt-0.5">{dailyLocked ? t('common.dailyDone') : t('careers.intro')}</div>
          <div className="text-muted text-xs mt-0.5">{dailyLocked ? t('common.comeBackTomorrow') : t('careers.introSub', { max: maxClues })}</div>
        </div>
      </div>

      {/* The career — clubs revealed one at a time on a transfer timeline */}
      <div className="w-full max-w-lg mb-5">
        <div className="text-[0.56rem] text-faint uppercase tracking-[0.18em] mb-3 font-black px-1">{t('careers.playedFor')}</div>
        <ol className="relative">
          {target.clues.slice(0, cluesToShow).map((clue, i) => {
            const isLatest = phase === 'playing' && i === cluesToShow - 1
            const isLast = i === cluesToShow - 1
            return (
              <li key={i} className="relative flex items-stretch gap-3 pb-2.5 last:pb-0 clue-reveal">
                {/* timeline rail: node + connector down to the next club */}
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
          <div className="text-center text-faint text-xs pt-2.5">{t('careers.moreClubs', { n: maxClues - revealed })}</div>
        )}
      </div>

      {active && (
        <form onSubmit={handleSubmit} className={`relative w-full max-w-lg ${shake ? 'shake' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('careers.placeholder')}
            autoFocus
            role="combobox"
            aria-expanded={visibleSuggestions.length > 0}
            aria-controls="careers-suggestions"
            aria-autocomplete="list"
            aria-label={t('careers.placeholder')}
            className="w-full bg-surface border border-border-strong focus:border-accent rounded-xl px-4 py-3.5 text-primary placeholder-faint text-base outline-none transition-colors"
            autoComplete="off" autoCorrect="off" spellCheck="false"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-inert border-t-accent rounded-full animate-spin" />
            </div>
          )}
          {visibleSuggestions.length > 0 && (
            <div ref={dropdownRef} id="careers-suggestions" role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-strong rounded-xl overflow-hidden z-dropdown shadow-float">
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
        <>
          <div className={`w-full max-w-lg mt-3 text-center text-xs font-semibold ${leftTone}`}>
            {t('careers.guessesLeft', { n: guessesLeft })}
          </div>
          <button
            type="button"
            onClick={skip}
            className={`mt-2 w-full max-w-lg border text-sm font-medium rounded-xl px-4 py-2.5 transition-colors ${
              lastGuess
                ? 'border-danger/40 text-danger-bright hover:bg-danger/10 hover:border-danger/70'
                : 'border-border-strong text-secondary hover:bg-surface hover:text-primary'
            }`}
          >
            {lastGuess ? t('careers.skipLast') : t('careers.skip')}
          </button>
        </>
      )}

      {/* Unlimited: reveal the player in place (the path only shows clubs), then a replay button. */}
      {mode === 'unlimited' && phase !== 'playing' && (
        <div className="w-full max-w-lg mt-1 mb-4 flex flex-col items-center gap-3 text-center">
          <p className="text-muted text-sm">{t('teammates.mysteryWas')} <span className="text-primary font-bold">{target.name}</span></p>
          <button onClick={startUnlimited} className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">{t('careers.newPlayer')}</button>
        </div>
      )}

      {mode === 'daily' && phase !== 'playing' && !showResult && (
        <button onClick={() => setShowResult(true)} className="mt-1 mb-4 text-sm text-brand-bright hover:text-primary font-medium transition-colors">{t('common.seeResult')}</button>
      )}

      <ResultModal open={showResult && mode === 'daily'} onClose={() => setShowResult(false)}>
        <div className="w-full flex flex-col items-center text-center">
          <GameMotif id="career-path" className={`w-11 h-11 mb-2 ${phase === 'won' ? 'text-accent-bright' : 'text-dim'}`} />
          <h2 className={`score-number text-4xl mb-1 ${phase === 'won' ? 'text-success-bright' : 'text-danger-bright'}`}>
            {phase === 'won' ? t('teammates.correct') : t('teammates.outOf')}
          </h2>
          <p className="text-muted text-sm mb-1">
            {t('teammates.mysteryWas')} <span className="text-primary font-bold">{target.name}</span>
            {phase === 'won' && guesses.length > 0 && <> — {t('teammates.inN', { n: guesses.length })}</>}.
          </p>
          {dailyLocked && <p className="text-[0.62rem] font-black tracking-[0.14em] uppercase text-faint mb-1">{t('common.dailyDone')}</p>}
        </div>
        {mode === 'daily' && <DailyStats game="careers" stats={dailyStats} />}
        <ShareCard
          text={[
            phase === 'won'
              ? t('share.careersWon', { n: guesses.length, max: maxClues })
              : t('share.careersLost'),
            SITE_URL,
          ].join('\n\n')}
          card={{
            gameId: 'careers',
            title: t('careers.wordmark'),
            challenge: t('games.career-path.tagline'),
            result: phase === 'won' ? t('teammates.correct') : t('teammates.outOf'),
            rows: [guesses.map(g => g.correct ? TILE.hit : g.skipped ? TILE.near : TILE.miss)],
            matchday: matchdayNumber(),
          }}
        />
        <button onClick={startUnlimited} className="mt-2 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-6 py-2.5 transition-colors">{t('common.playUnlimited')}</button>
        <UpNext exclude="careers" />
      </ResultModal>

      {guesses.length > 0 && (
        <div className="w-full max-w-lg mt-4">
          <div className="text-[0.56rem] text-faint uppercase tracking-[0.18em] mb-2 font-black px-1">{t('teammates.yourGuesses')}</div>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/40">
            {guesses.map((g, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${g.correct ? 'flash-valid' : g.skipped ? '' : 'flash-invalid'}`}>
                <span className={`text-sm truncate ${g.skipped ? 'text-muted italic' : 'text-primary'}`}>{g.text}</span>
                <span className={`text-xs font-semibold shrink-0 ${g.correct ? 'text-success-bright' : g.skipped ? 'text-muted' : 'text-danger-bright'}`}>{g.correct ? '✓' : g.skipped ? '↷' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
