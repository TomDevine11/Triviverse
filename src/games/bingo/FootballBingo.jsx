import { useState, useEffect, useMemo, useRef } from 'react'
import { getBingoForDay, getRandomBingo, categoryLabel, pruneQueue, moveOn, strandedSquares, COLS, ROWS, CARD_SIZE, TIME_LIMIT_S, WRONG_PENALTY_S } from '../../data/bingo'
import { todayIndex, recordResult, matchdayNumber } from '../../data/dailyStats'
import { loadDailyProgress, saveDailyProgress } from '../../data/dailyProgress'
import { useQa } from '../../dev/qa'
import QaBar from '../../dev/QaBar'
import ModeToggle from '../../components/ModeToggle'
import ResultModal from '../../components/ResultModal'
import { shortTitle } from '../../components/nextGames'
import CategoryIcon from '../../components/CategoryIcon'
import GameChrome from '../../components/GameChrome'
import GameMotif from '../../components/GameMotif'
import { accentVars } from '../../design/accents'
import { ShareCard, RESULT_SECONDARY_BTN } from '../../components/ShareCard'
import { useI18n } from '../../i18n'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

const getDailyBingo = () => getBingoForDay(todayIndex())
// Signature that identifies today's card in storage — if the generator changes,
// the saved game no longer matches and the player gets the new card rather than
// a half-filled ghost of the old one.
// v3 = timed with decoys (the deal changed shape); older saves are discarded.
const signature = (card) => 'v3|' + card.squares.map(s => `${s.type}:${s.value}`).join('|')

const EMPTY = () => new Array(CARD_SIZE).fill(null)
const fullQueue = (card) => card.deal.map((_, i) => i)
const nowMs = () => Date.now() // read in event handlers/effects only
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function FootballBingo() {
  const { t } = useI18n()
  const qa = useQa('Bingo')

  const [saved] = useState(() => loadDailyProgress('bingo', signature(getDailyBingo())))
  const restoredDone = !!saved?.done

  const [mode, setMode] = useState(qa.active ? 'unlimited' : 'daily')
  const [card, setCard] = useState(() => getDailyBingo())
  const [placed, setPlaced] = useState(() => saved?.placed ?? EMPTY())   // per square: { id, name } | null
  const [queue, setQueue] = useState(() => saved?.queue ?? fullQueue(getDailyBingo())) // deal indices still to come; [0] is in hand
  // The clock is wall time, so a refresh or a closed tab never pauses it.
  const [startedAt, setStartedAt] = useState(() => saved?.startedAt ?? null)
  const [penalty, setPenalty] = useState(() => saved?.penalty ?? 0)     // seconds lost to wrong squares
  const [endedAt, setEndedAt] = useState(() => saved?.endedAt ?? null)
  const [now, setNow] = useState(() => Date.now())
  const [message, setMessage] = useState('')
  const [wrongSquare, setWrongSquare] = useState(-1)
  const [showResult, setShowResult] = useState(restoredDone)
  const finished = useRef(restoredDone)

  const filled = placed.filter(Boolean).length
  const won = filled === CARD_SIZE
  const elapsed = startedAt ? ((endedAt ?? now) - startedAt) / 1000 + penalty : 0
  const remaining = Math.max(0, TIME_LIMIT_S - elapsed)
  // Unreachable by construction (several candidates per square, see bingo.js),
  // but if the queue can no longer fill an open square the card is over.
  const stranded = !won && startedAt != null && strandedSquares(queue, card.deal, placed).length > 0
  const timeUp = !won && startedAt != null && remaining <= 0
  const over = won || timeUp || stranded
  const running = startedAt != null && !over
  const current = running ? card.deal[queue[0]] ?? null : null
  const dailyLocked = mode === 'daily' && over

  // Recorded exactly once per card, from whichever path ends it.
  const finish = (didWin) => {
    if (finished.current) return
    finished.current = true
    if (mode === 'daily') recordResult('bingo', didWin)
  }

  // Tick while the clock runs; when it hits zero (or the card strands), end it.
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])
  /* eslint-disable react-hooks/set-state-in-effect -- the clock running out is an external event */
  useEffect(() => {
    if (!(timeUp || stranded) || endedAt != null) return
    setEndedAt(timeUp ? startedAt + (TIME_LIMIT_S - penalty) * 1000 : Date.now())
    finish(false)
  }, [timeUp, stranded]) // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (mode !== 'daily' || startedAt == null) return
    saveDailyProgress('bingo', { placed, queue, startedAt, penalty, endedAt }, over, signature(card))
  }, [mode, placed, queue, startedAt, penalty, endedAt, over, card])

  useEffect(() => {
    if (!over) return
    const id = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS)
    return () => clearTimeout(id)
  }, [over])

  const resetTo = (next, m) => {
    setMode(m); setCard(next); setPlaced(EMPTY()); setQueue(fullQueue(next))
    setStartedAt(null); setPenalty(0); setEndedAt(null); setMessage(''); setWrongSquare(-1)
    setShowResult(false); finished.current = false
  }
  const startUnlimited = () => resetTo(getRandomBingo(), 'unlimited')
  const restoreDaily = () => {
    const c = getDailyBingo()
    const s = loadDailyProgress('bingo', signature(c))
    setMode('daily'); setCard(c)
    setPlaced(s?.placed ?? EMPTY()); setQueue(s?.queue ?? fullQueue(c))
    setStartedAt(s?.startedAt ?? null); setPenalty(s?.penalty ?? 0); setEndedAt(s?.endedAt ?? null); setNow(Date.now())
    setMessage(''); setWrongSquare(-1); setShowResult(!!s?.done); finished.current = !!s?.done
  }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())

  /* eslint-disable react-hooks/set-state-in-effect -- intentional dev-only QA loader */
  useEffect(() => {
    if (!qa.active) return
    resetTo(getBingoForDay(qa.index), 'unlimited')
  }, [qa.active, qa.index])
  /* eslint-enable react-hooks/set-state-in-effect */

  const start = () => { const t0 = Date.now(); setStartedAt(t0); setNow(t0) }

  const place = (i) => {
    if (!current || placed[i]) return
    setMessage('')
    if (!current.fits.includes(i)) {
      // Wrong square: the clock pays and play moves on to the next player (a real
      // one comes back round later; a decoy is gone).
      setPenalty(p => p + WRONG_PENALTY_S)
      setWrongSquare(i)
      setMessage(t(current.decoy ? 'bingo.wrongDecoy' : 'bingo.wrong', { name: current.name, category: categoryLabel(card.squares[i], t), pen: WRONG_PENALTY_S }))
      setQueue(moveOn(queue, card.deal, placed))
      setTimeout(() => setWrongSquare(-1), 600)
      return
    }
    const nextPlaced = placed.map((v, j) => (j === i ? { id: current.id, name: current.name } : v))
    setPlaced(nextPlaced)
    setQueue(pruneQueue(queue.slice(1), card.deal, nextPlaced))
    setWrongSquare(-1)
    if (nextPlaced.every(Boolean)) { setEndedAt(nowMs()); finish(true) }
  }

  // Unlimited skips: a real player goes to the back of the queue and comes round
  // again; a decoy is discarded — and spotting one gets a nod.
  const skip = () => {
    if (!current) return
    setMessage(current.decoy ? t('bingo.goodSkip', { name: current.name }) : '')
    setQueue(moveOn(queue, card.deal, placed)); setWrongSquare(-1)
  }

  const shareRows = useMemo(() => {
    const rows = []
    for (let r = 0; r < ROWS; r++) {
      rows.push(placed.slice(r * COLS, r * COLS + COLS).map(p => (p ? '#14b8a6' : '#3a3846')))
    }
    return rows
  }, [placed])

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('bingo')}>
      {qa.active && <QaBar gameId="Bingo" index={qa.index} onPrev={qa.prev} onNext={qa.next}
        meta={{ squares: card.squares.map(s => s.value).join(' · '), deal: card.deal.length }} />}
      <div className="flex flex-col items-center px-4 pb-8 max-w-4xl mx-auto">
        <div className="w-full"><GameChrome
          motifId="football-bingo"
          title={t('bingo.wordmark')}
          right={
            <span className="inline-flex items-center gap-2.5">
              <b className={`tabular-nums font-black ${running && remaining <= 30 ? 'text-danger-bright animate-pulse' : 'text-primary'}`}
                role="timer" aria-label={t('bingo.timerLabel', { time: clock(remaining) })}>
                ⏱ {clock(Math.ceil(remaining))}
              </b>
              <b className="text-secondary tabular-nums">{filled}/{CARD_SIZE}</b>
            </span>
          }
        /></div>

        <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-4" />

        <div className="w-full max-w-lg lg:max-w-[46rem] space-y-2.5">
          <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3">
            <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">
              {(mode === 'daily' ? t('common.daily') : t('common.unlimited')).toUpperCase()} · {COLS} × {ROWS}{dailyLocked ? ` · ${t('common.complete')}` : ''}
            </div>
            <div className="text-primary font-bold text-sm mt-0.5">{dailyLocked ? t('common.dailyDone') : t('bingo.intro')}</div>
            <div className="text-muted text-xs mt-0.5">{dailyLocked ? t('common.comeBackTomorrow') : t('bingo.introSub')}</div>
          </div>

          {/* The dealt player — the question. Kept above the card so the eye goes
              player → squares, which is the order the decision is actually made in. */}
          {startedAt == null && (
            <div className="bg-surface border border-border-strong rounded-xl px-4 py-4 text-center">
              <p className="text-secondary text-sm mb-3">{t('bingo.startSub', { time: clock(TIME_LIMIT_S), pen: WRONG_PENALTY_S })}</p>
              <button onClick={start} className="bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-8 py-3 transition-colors">{t('bingo.start')}</button>
            </div>
          )}
          {current && (
            <div className="bg-surface border border-border-strong rounded-xl px-4 py-4 text-center" aria-live="polite">
              <div className="text-[0.55rem] font-black tracking-[0.18em] text-muted uppercase">{t('bingo.placeThis')}</div>
              <div className="score-number text-[clamp(1.6rem,6vw,2.4rem)] leading-none mt-1.5 text-primary">{current.name}</div>
            </div>
          )}

          {/* The card */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
            {card.squares.map((sq, i) => {
              const p = placed[i]
              const isWrong = wrongSquare === i
              const clickable = !!current && !p
              return (
                <button
                  key={`${sq.type}:${sq.value}`}
                  type="button"
                  onClick={() => place(i)}
                  disabled={!clickable}
                  aria-label={categoryLabel(sq, t)}
                  className={`relative rounded-xl border px-2 py-3 min-h-[5.5rem] flex flex-col items-center justify-center gap-1 text-center transition-[transform,border-color,background-color] duration-fast ${
                    p
                      ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_14%,#16151f)] cell-reveal'
                      : isWrong
                        ? 'border-danger bg-danger/10 shake'
                        : clickable
                          ? 'border-border-strong bg-surface hover:border-accent hover:-translate-y-0.5 cursor-pointer'
                          : 'border-border-strong bg-surface opacity-60'
                  }`}
                >
                  <CategoryIcon category={sq} size={16} />
                  <span className={`text-[0.66rem] sm:text-xs font-bold leading-tight ${p ? 'text-accent-bright' : 'text-secondary'}`}>
                    {sq.value}
                  </span>
                  {p
                    ? <span className="text-[0.6rem] text-primary font-semibold leading-tight">{p.name}</span>
                    : <span className="text-[0.55rem] text-faint uppercase tracking-[0.1em] leading-tight">{t(`bingo.type.${sq.type}`)}</span>}
                </button>
              )
            })}
          </div>

          {message && <div className={`text-center text-sm font-semibold ${message.startsWith('✓') ? 'text-success-bright' : 'text-warn'}`}>{message}</div>}

          {running && (
            <div className="flex gap-3 pt-1">
              <button
                onClick={skip}
                className="flex-1 border border-border-strong text-secondary hover:bg-surface text-sm font-medium rounded-xl py-3 transition-colors"
              >
                {t('bingo.skip')}
              </button>
            </div>
          )}
        </div>

        {mode === 'unlimited' && over && (
          <button onClick={startUnlimited} className="mt-5 w-full max-w-lg lg:max-w-[46rem] bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">{t('bingo.newCard')}</button>
        )}
        {mode === 'daily' && over && !showResult && (
          <button onClick={() => setShowResult(true)} className="mt-5 text-sm text-brand-bright hover:text-primary font-medium transition-colors">{t('common.seeResult')}</button>
        )}

        <ResultModal game="bingo" open={showResult && mode === 'daily'} onClose={() => setShowResult(false)}>
          <div className="w-full flex flex-col items-center text-center">
            <GameMotif id="football-bingo" className={`w-11 h-11 mb-2 ${won ? 'text-accent-bright' : 'text-dim'}`} />
            <h2 className={`score-number text-4xl mb-1 ${won ? 'text-success-bright' : 'text-danger-bright'}`}>
              {won ? t('bingo.bingo') : t('bingo.outOf', { n: filled })}
            </h2>
            <p className="text-muted text-sm mb-1">
              {won ? t('bingo.wonSub', { time: clock(Math.floor(remaining)) }) : t('bingo.timeUp')}
            </p>
          </div>

          <div className="w-full space-y-1 mb-1 max-h-44 overflow-y-auto">
            {card.squares.map((sq, i) => (
              <div key={`${sq.type}:${sq.value}`} className={`rounded-lg border px-3 py-1.5 flex items-center justify-between gap-2 text-left ${placed[i] ? 'border-accent/50 bg-[color-mix(in_srgb,var(--accent)_10%,#16151f)]' : 'border-border bg-surface'}`}>
                <span className="text-[0.7rem] font-bold text-secondary truncate">{categoryLabel(sq, t)}</span>
                <span className={`text-[0.7rem] shrink-0 ${placed[i] ? 'text-accent-bright font-semibold' : 'text-faint'}`}>{placed[i]?.name ?? '—'}</span>
              </div>
            ))}
          </div>

          <ShareCard card={{
            gameId: 'bingo',
            daily: mode === 'daily',
            won,
            score: { v: filled, of: CARD_SIZE },
            title: 'Football Bingo',
            challenge: t('games.football-bingo.tagline'),
            result: won ? `${t('bingo.bingo')} · ${t('bingo.spare', { time: clock(Math.floor(remaining)) })}` : t('bingo.outOf', { n: filled }),
            rows: shareRows,
            matchday: matchdayNumber(),
          }} />
          <button onClick={startUnlimited} className={RESULT_SECONDARY_BTN}>{t('common.unlimitedGame', { name: shortTitle(t, 'football-bingo') })}</button>
        </ResultModal>
      </div>
    </div>
  )
}
