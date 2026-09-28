import { useState, useEffect, useMemo } from 'react'
import { getDailyWordlePlayer, getRandomWordlePlayer } from '../../data/wordle'
import { SITE_URL } from '../../utils/site'
import { ShareCard, RESULT_SECONDARY_BTN } from '../../components/ShareCard'
import DailyStats from '../../components/DailyStats'
import ModeToggle from '../../components/ModeToggle'
import ResultModal from '../../components/ResultModal'
import { shortTitle } from '../../components/nextGames'
import ResultAnswer from '../../components/ResultAnswer'
import GameChrome from '../../components/GameChrome'
import GameMotif from '../../components/GameMotif'
import { accentVars } from '../../design/accents'
import { recordResult, matchdayNumber } from '../../data/dailyStats'
import { loadDailyProgress, saveDailyProgress } from '../../data/dailyProgress'
import { TILE } from '../../utils/shareImage'
import { useI18n } from '../../i18n'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

const MAX_GUESSES = 6

// Letter-verdict colours — the `tile.*` tokens in tailwind.config.js
// (inline here because the flip keyframe reads them via CSS variables).
const COLORS = {
  green:  { bg: '#16a34a', border: '#16a34a' }, // tile.hit
  yellow: { bg: '#ca8a04', border: '#ca8a04' }, // tile.near
  grey:   { bg: '#26243a', border: '#26243a' }, // tile.miss
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
]

// Standard Wordle scoring: greens first, then yellows against remaining letters.
function evaluateGuess(guess, answer) {
  const result = Array(guess.length).fill('grey')
  const answerLetters = answer.split('')
  const used = Array(answer.length).fill(false)

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answerLetters[i]) {
      result[i] = 'green'
      used[i] = true
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'green') continue
    const idx = answerLetters.findIndex((l, j) => l === guess[i] && !used[j])
    if (idx !== -1) {
      result[i] = 'yellow'
      used[idx] = true
    }
  }
  return result
}

export default function FootballWordle() {
  const { t } = useI18n()
  // Today's daily state, if any: resume it, or lock a finished one to its result.
  const [saved] = useState(() => loadDailyProgress('wordle', getDailyWordlePlayer().surname))
  const restoredDone = !!saved?.done

  const [mode, setMode] = useState('daily') // 'daily' | 'unlimited'
  const [question, setQuestion] = useState(() => getDailyWordlePlayer())
  const answer = question.surname

  const [guesses, setGuesses] = useState(() => saved?.guesses ?? [])
  const [current, setCurrent] = useState('')
  const [phase, setPhase] = useState(() => saved?.phase ?? 'playing') // 'playing' | 'won' | 'lost'
  const [dailyStats, setDailyStats] = useState(null)
  useEffect(() => {
    // Only Daily mode records stats/streaks (idempotent per day).
    if (phase !== 'playing' && mode === 'daily') setDailyStats(recordResult('wordle', phase === 'won'))
  }, [phase, mode])

  // A finished daily is locked to its result and offers Unlimited.
  const dailyLocked = mode === 'daily' && phase !== 'playing'

  // Persist the daily as it's played so a refresh resumes it and a finished
  // round stays locked (guesses + phase; a half-typed word isn't kept).
  useEffect(() => {
    if (mode !== 'daily') return
    if (guesses.length === 0 && phase === 'playing') return
    saveDailyProgress('wordle', { guesses, phase }, phase !== 'playing', question.surname)
  }, [mode, guesses, phase])

  const [showResult, setShowResult] = useState(restoredDone)
  useEffect(() => {
    if (phase === 'playing') return
    const t = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS) // let the board settle first
    return () => clearTimeout(t)
  }, [phase])

  // Leave the daily untouched; start a fresh, replayable Unlimited round.
  const startUnlimited = () => {
    setMode('unlimited'); setQuestion(getRandomWordlePlayer())
    setGuesses([]); setCurrent(''); setPhase('playing'); setDailyStats(null); setShowResult(false)
  }
  // Return to the daily: rehydrate today's saved state (locked, resumed, or fresh).
  const restoreDaily = () => {
    const s = loadDailyProgress('wordle', getDailyWordlePlayer().surname)
    setMode('daily'); setQuestion(getDailyWordlePlayer())
    setGuesses(s?.guesses ?? []); setCurrent(''); setPhase(s?.phase ?? 'playing')
    setDailyStats(null); setShowResult(!!s?.done)
  }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())
  const [shake, setShake] = useState(false)
  const [flippingRow, setFlippingRow] = useState(null)
  const [bounceRow, setBounceRow] = useState(null)
  const [poppedIndex, setPoppedIndex] = useState(-1)

  const submitGuess = () => {
    const guess = current
    const row = guesses.length
    const win = guess === answer

    setGuesses(prev => [...prev, guess])
    setCurrent('')
    setFlippingRow(row)

    const revealDelay = answer.length * 100 + 500
    setTimeout(() => {
      setFlippingRow(null)
      if (win) {
        setBounceRow(row)
        setPhase('won')
        setTimeout(() => setBounceRow(null), 700)
      } else if (row + 1 >= MAX_GUESSES) {
        setPhase('lost')
      }
    }, revealDelay)
  }

  const handleKey = (key) => {
    if (phase !== 'playing' || flippingRow != null) return

    if (key === 'ENTER') {
      if (current.length !== answer.length) {
        setShake(true)
        setTimeout(() => setShake(false), 400)
        return
      }
      submitGuess()
    } else if (key === 'BACKSPACE') {
      setCurrent(c => c.slice(0, -1))
    } else if (/^[A-Z]$/.test(key) && current.length < answer.length) {
      const idx = current.length
      setCurrent(c => c + key)
      setPoppedIndex(idx)
      setTimeout(() => setPoppedIndex(-1), 100)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toUpperCase()
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        e.preventDefault()
        handleKey(key)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, flippingRow, current, guesses]) // eslint-disable-line react-hooks/exhaustive-deps

  const letterStatuses = useMemo(() => {
    const map = {}
    const rank = { grey: 0, yellow: 1, green: 2 }
    for (const guess of guesses) {
      const result = evaluateGuess(guess, answer)
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i]
        const status = result[i]
        if (!(letter in map) || rank[status] > rank[map[letter]]) map[letter] = status
      }
    }
    return map
  }, [guesses, answer])

  const shareGrid = guesses
    .map(g => evaluateGuess(g, answer).map(s => s === 'green' ? '🟩' : s === 'yellow' ? '🟨' : '⬜').join(''))
    .join('\n')

  const shareText = [
    t('share.wordleTitle'),
    phase === 'won' ? t('share.wordleWon', { n: guesses.length, max: MAX_GUESSES }) : t('share.wordleLost', { max: MAX_GUESSES }),
    ...(phase === 'won' && dailyStats?.currentStreak ? [t('share.dayStreak', { n: dailyStats.currentStreak })] : []),
    '',
    shareGrid,
    '',
    SITE_URL,
  ].join('\n')

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('wordle')}>
    <div className="flex flex-col items-center px-4 pb-8 max-w-3xl mx-auto">
      <div className="w-full"><GameChrome
        motifId="wordle"
        title="FOOTBALL WORDLE"
        right={<b className="text-secondary tabular-nums">{guesses.length}/{MAX_GUESSES}</b>}
      /></div>

      <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-4" />

      {/* Hint card (or the locked-daily banner once today's round is finished) */}
      <div className="w-full max-w-lg mb-5">
        <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3">
          <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">{(mode === 'daily' ? t('common.daily') : t('common.unlimited')).toUpperCase()}{dailyLocked ? ` · ${t('common.complete')}` : ''}</div>
          <div className="text-primary font-bold text-sm mt-0.5">{dailyLocked ? t('common.dailyDone') : mode === 'daily' ? t('wordle.guessToday') : t('wordle.guessAny')}</div>
          <div className="text-muted text-xs mt-0.5">{dailyLocked ? t('common.comeBackTomorrow') : t('wordle.hint', { n: answer.length, max: MAX_GUESSES })}</div>
        </div>
      </div>

      {/* Grid — responsive: tiles shrink to fit long surnames on any screen */}
      <div className="w-full flex flex-col items-center gap-1.5 mb-6 mx-auto" style={{ maxWidth: `${Math.min(answer.length * 3.5, 30)}rem` }}>
        {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
          const guess = guesses[rowIdx]
          const isCurrent = rowIdx === guesses.length && phase === 'playing'
          const result = guess ? evaluateGuess(guess, answer) : null
          const isFlipping = flippingRow === rowIdx
          const isBouncing = bounceRow === rowIdx

          return (
            <div key={rowIdx} className={`grid gap-1.5 w-full ${isCurrent && shake ? 'shake' : ''}`} style={{ gridTemplateColumns: `repeat(${answer.length}, minmax(0, 1fr))` }}>
              {Array.from({ length: answer.length }).map((_, colIdx) => {
                let letter = ''
                let status = null
                if (guess) { letter = guess[colIdx]; status = result[colIdx] }
                else if (isCurrent) letter = current[colIdx] || ''

                const colors = status ? COLORS[status] : null
                const style = {}
                if (colors) {
                  if (isFlipping) {
                    style['--tile-bg'] = colors.bg
                    style['--tile-border'] = colors.border
                  } else {
                    style.backgroundColor = colors.bg
                    style.borderColor = colors.border
                  }
                }
                if (isFlipping) style.animationDelay = `${colIdx * 100}ms`
                else if (isBouncing) style.animationDelay = `${colIdx * 60}ms`
                style.fontSize = `clamp(0.8rem, ${(50 / answer.length).toFixed(1)}vw, 1.5rem)`

                return (
                  <div
                    key={colIdx}
                    style={style}
                    className={`w-full aspect-square border-2 rounded-md bg-board flex items-center justify-center font-black uppercase text-primary select-none
                      ${!colors ? (letter ? 'border-muted' : 'border-border-strong') : ''}
                      ${isFlipping ? 'tile-flip' : ''}
                      ${isBouncing ? 'tile-bounce' : ''}
                      ${isCurrent && poppedIndex === colIdx ? 'tile-pop' : ''}`}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* On-screen keyboard */}
      <div className="w-full max-w-lg flex flex-col gap-1.5 mb-6">
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i} className="flex gap-1.5 justify-center">
            {row.map(key => {
              const status = letterStatuses[key]
              const isWide = key === 'ENTER' || key === 'BACKSPACE'
              const bg = status === 'green'
                ? 'bg-tile-hit text-white'
                : status === 'yellow'
                  ? 'bg-tile-near text-white'
                  : status === 'grey'
                    ? 'bg-board text-faint'
                    : 'bg-border hover:bg-border-strong text-primary'
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKey(key)}
                  disabled={phase !== 'playing'}
                  className={`${isWide ? 'px-2.5 text-[10px] sm:text-xs' : 'w-8 sm:w-10 text-sm'} h-12 ${bg} font-bold rounded-md flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright`}
                >
                  {key === 'BACKSPACE' ? '⌫' : key === 'ENTER' ? 'ENTER' : key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Unlimited: no result card — reveal the answer in place, then a replay button. */}
      {mode === 'unlimited' && phase !== 'playing' && (
        <div className="w-full max-w-lg mb-6 flex flex-col items-center gap-3 text-center">
          <p className="text-muted text-sm">{t('wordle.itWas')} <span className="text-primary font-bold">{question.fullName}</span> {question.flag}</p>
          <button onClick={startUnlimited} className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">{t('wordle.newWord')}</button>
        </div>
      )}

      {mode === 'daily' && phase !== 'playing' && !showResult && (
        <button onClick={() => setShowResult(true)} className="mb-6 text-sm text-brand-bright hover:text-primary font-medium transition-colors">{t('common.seeResult')}</button>
      )}

      <ResultModal game="wordle" open={showResult && mode === 'daily'} onClose={() => setShowResult(false)}>
        {phase === 'won' && (
          <div className="w-full flex flex-col items-center text-center">
            <GameMotif id="wordle" className="w-12 h-12 text-accent-bright mb-3" />
            <h2 className="score-number text-4xl text-success-bright mb-2">{t('wordle.correct')}</h2>
            <ResultAnswer label={t('wordle.itWas')} detail={<>{t('wordle.solvedIn')} <span className="text-primary font-bold">{guesses.length}</span>/{MAX_GUESSES}</>}>{question.fullName} {question.flag}</ResultAnswer>
          </div>
        )}
        {phase === 'lost' && (
          <div className="w-full flex flex-col items-center text-center">
            <GameMotif id="wordle" className="w-12 h-12 text-dim mb-3" />
            <h2 className="score-number text-4xl text-danger-bright mb-2">{t('wordle.gameOver')}</h2>
            <ResultAnswer label={t('wordle.itWas')}>{question.fullName} {question.flag}</ResultAnswer>
          </div>
        )}
        {dailyLocked && <p className="text-[0.62rem] font-black tracking-[0.14em] uppercase text-faint mb-1">{t('common.dailyDone')}</p>}
        {mode === 'daily' && <DailyStats game="wordle" stats={dailyStats} />}
        <ShareCard text={shareText} card={{
          gameId: 'wordle',
          title: 'Football Wordle',
          challenge: t('games.wordle.tagline'),
          result: phase === 'won' ? `${t('wordle.solvedIn')} ${guesses.length}/${MAX_GUESSES}` : t('wordle.gameOver'),
          rows: guesses.map(g => evaluateGuess(g, answer).map(s => s === 'green' ? TILE.hit : s === 'yellow' ? TILE.near : TILE.miss)),
          matchday: matchdayNumber(),
        }} />
        <button onClick={startUnlimited} className={RESULT_SECONDARY_BTN}>{t('common.unlimitedGame', { name: shortTitle(t, 'wordle') })}</button>
      </ResultModal>
    </div>
    </div>
  )
}
