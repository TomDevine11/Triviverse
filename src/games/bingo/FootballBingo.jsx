import { useState, useEffect, useMemo } from 'react'
import { getBingoForDay, getRandomBingo, categoryLabel, COLS, ROWS, CARD_SIZE, MAX_LIVES, MAX_SKIPS } from '../../data/bingo'
import { todayIndex, recordResult, matchdayNumber } from '../../data/dailyStats'
import { loadDailyProgress, saveDailyProgress } from '../../data/dailyProgress'
import { useQa } from '../../dev/qa'
import QaBar from '../../dev/QaBar'
import DailyStats from '../../components/DailyStats'
import ModeToggle from '../../components/ModeToggle'
import ResultModal from '../../components/ResultModal'
import CategoryIcon from '../../components/CategoryIcon'
import GameChrome from '../../components/GameChrome'
import GameMotif from '../../components/GameMotif'
import UpNext from '../../components/UpNext'
import { accentVars } from '../../design/accents'
import { ShareCard } from '../../components/ShareCard'
import { useI18n } from '../../i18n'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

const getDailyBingo = () => getBingoForDay(todayIndex())
// Signature that identifies today's card in storage — if the generator changes,
// the saved game no longer matches and the player gets the new card rather than
// a half-filled ghost of the old one.
const signature = (card) => card.squares.map(s => `${s.type}:${s.value}`).join('|')

const EMPTY = () => new Array(CARD_SIZE).fill(null)

export default function FootballBingo() {
  const { t } = useI18n()
  const qa = useQa('Bingo')

  const [saved] = useState(() => loadDailyProgress('bingo', signature(getDailyBingo())))
  const restoredDone = !!saved?.done

  const [mode, setMode] = useState(qa.active ? 'unlimited' : 'daily')
  const [card, setCard] = useState(() => getDailyBingo())
  const [placed, setPlaced] = useState(() => saved?.placed ?? EMPTY())   // per square: { id, name } | null
  const [dealIndex, setDealIndex] = useState(() => saved?.dealIndex ?? 0)
  const [lives, setLives] = useState(() => saved?.lives ?? MAX_LIVES)
  const [skips, setSkips] = useState(() => saved?.skips ?? MAX_SKIPS)
  const [message, setMessage] = useState('')
  const [wrongSquare, setWrongSquare] = useState(-1)
  const [showResult, setShowResult] = useState(restoredDone)

  const filled = placed.filter(Boolean).length
  const current = card.deal[dealIndex] ?? null
  const outOfPlayers = !current
  const won = filled === CARD_SIZE
  const lost = !won && (lives <= 0 || outOfPlayers)
  const over = won || lost
  const dailyLocked = mode === 'daily' && over

  const [dailyStats, setDailyStats] = useState(null)
  // Recorded at the moment the card ends rather than from an effect watching
  // `over`: the transition is knowable synchronously from the move that caused
  // it, so this fires exactly once and never on a re-render.
  const finish = (didWin) => { if (mode === 'daily') setDailyStats(recordResult('bingo', didWin)) }

  useEffect(() => {
    if (mode !== 'daily') return
    if (filled === 0 && dealIndex === 0 && !over) return
    saveDailyProgress('bingo', { placed, dealIndex, lives, skips }, over, signature(card))
  }, [mode, placed, dealIndex, lives, skips, over, card, filled])

  useEffect(() => {
    if (!over) return
    const id = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS)
    return () => clearTimeout(id)
  }, [over])

  const resetTo = (next, m) => {
    setMode(m); setCard(next); setPlaced(EMPTY()); setDealIndex(0)
    setLives(MAX_LIVES); setSkips(MAX_SKIPS); setMessage(''); setWrongSquare(-1)
    setDailyStats(null); setShowResult(false)
  }
  const startUnlimited = () => resetTo(getRandomBingo(), 'unlimited')
  const restoreDaily = () => {
    const c = getDailyBingo()
    const s = loadDailyProgress('bingo', signature(c))
    setMode('daily'); setCard(c)
    setPlaced(s?.placed ?? EMPTY()); setDealIndex(s?.dealIndex ?? 0)
    setLives(s?.lives ?? MAX_LIVES); setSkips(s?.skips ?? MAX_SKIPS)
    setMessage(''); setWrongSquare(-1); setDailyStats(null); setShowResult(!!s?.done)
  }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : startUnlimited())

  /* eslint-disable react-hooks/set-state-in-effect -- intentional dev-only QA loader */
  useEffect(() => {
    if (!qa.active) return
    resetTo(getBingoForDay(qa.index), 'unlimited')
  }, [qa.active, qa.index])
  /* eslint-enable react-hooks/set-state-in-effect */

  const place = (i) => {
    if (over || !current || placed[i]) return
    setMessage('')
    const correct = current.fits.includes(i)
    const nextPlaced = correct ? placed.map((v, j) => (j === i ? { id: current.id, name: current.name } : v)) : placed
    const nextLives = correct ? lives : lives - 1
    const nextIndex = dealIndex + 1

    if (correct) {
      setPlaced(nextPlaced)
      setWrongSquare(-1)
    } else {
      setLives(nextLives)
      setWrongSquare(i)
      setMessage(t('bingo.wrong', { name: current.name, category: categoryLabel(card.squares[i], t) }))
      setTimeout(() => setWrongSquare(-1), 600)
    }
    setDealIndex(nextIndex)

    const nextFilled = nextPlaced.filter(Boolean).length
    const didWin = nextFilled === CARD_SIZE
    if (didWin || nextLives <= 0 || nextIndex >= card.deal.length) finish(didWin)
  }

  const skip = () => {
    if (over || !current || skips <= 0) return
    const nextIndex = dealIndex + 1
    setSkips(n => n - 1); setDealIndex(nextIndex); setMessage(''); setWrongSquare(-1)
    // Skipping can exhaust the deal, which ends the card just as surely as lives.
    if (nextIndex >= card.deal.length) finish(false)
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
            <span className="inline-flex items-center gap-1.5" aria-label={t('bingo.livesLabel', { n: lives })}>
              {Array.from({ length: MAX_LIVES }, (_, i) => (
                <i key={i} className={`w-2.5 h-2.5 rounded-full ${i < lives ? 'bg-accent' : 'bg-inert'}`} aria-hidden="true" />
              ))}
              <b className="ml-1 text-secondary tabular-nums">{filled}/{CARD_SIZE}</b>
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
          {!over && current && (
            <div className="bg-surface border border-border-strong rounded-xl px-4 py-4 text-center" aria-live="polite">
              <div className="text-[0.55rem] font-black tracking-[0.18em] text-muted uppercase">{t('bingo.placeThis')}</div>
              <div className="score-number text-[clamp(1.6rem,6vw,2.4rem)] leading-none mt-1.5 text-primary">{current.name}</div>
              <div className="text-faint text-[0.7rem] mt-1.5 tabular-nums">
                {t('bingo.remaining', { n: Math.max(0, card.deal.length - dealIndex - 1) })}
              </div>
            </div>
          )}

          {/* The card */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
            {card.squares.map((sq, i) => {
              const p = placed[i]
              const isWrong = wrongSquare === i
              const clickable = !over && current && !p
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

          {message && <div className="text-center text-sm text-warn font-semibold">{message}</div>}

          {!over && (
            <div className="flex gap-3 pt-1">
              <button
                onClick={skip}
                disabled={skips <= 0}
                className="flex-1 border border-border-strong text-secondary hover:bg-surface disabled:opacity-40 text-sm font-medium rounded-xl py-3 transition-colors"
              >
                {t('bingo.skip', { n: skips })}
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

        <ResultModal open={showResult && mode === 'daily'} onClose={() => setShowResult(false)}>
          <div className="w-full flex flex-col items-center text-center">
            <GameMotif id="football-bingo" className={`w-11 h-11 mb-2 ${won ? 'text-accent-bright' : 'text-dim'}`} />
            <h2 className={`score-number text-4xl mb-1 ${won ? 'text-success-bright' : 'text-danger-bright'}`}>
              {won ? t('bingo.bingo') : t('bingo.outOf', { n: filled })}
            </h2>
            <p className="text-muted text-sm mb-1">
              {won ? t('bingo.wonSub', { n: MAX_LIVES - lives }) : t('common.comeBackTomorrow')}
            </p>
          </div>
          {dailyLocked && <p className="text-[0.62rem] font-black tracking-[0.14em] uppercase text-faint mb-1">{t('common.dailyDone')}</p>}
          {mode === 'daily' && <DailyStats game="bingo" stats={dailyStats} />}

          <div className="w-full space-y-1 mb-1 max-h-56 overflow-y-auto">
            {card.squares.map((sq, i) => (
              <div key={`${sq.type}:${sq.value}`} className={`rounded-lg border px-3 py-1.5 flex items-center justify-between gap-2 text-left ${placed[i] ? 'border-accent/50 bg-[color-mix(in_srgb,var(--accent)_10%,#16151f)]' : 'border-border bg-surface'}`}>
                <span className="text-[0.7rem] font-bold text-secondary truncate">{categoryLabel(sq, t)}</span>
                <span className={`text-[0.7rem] shrink-0 ${placed[i] ? 'text-accent-bright font-semibold' : 'text-faint'}`}>{placed[i]?.name ?? '—'}</span>
              </div>
            ))}
          </div>

          <ShareCard card={{
            gameId: 'bingo',
            title: 'Football Bingo',
            challenge: t('games.football-bingo.tagline'),
            result: won ? t('bingo.bingo') : t('bingo.outOf', { n: filled }),
            rows: shareRows,
            matchday: matchdayNumber(),
          }} />
          <button onClick={startUnlimited} className="mt-2 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-6 py-2.5 transition-colors">{t('common.playUnlimited')}</button>
          <UpNext exclude="bingo" />
        </ResultModal>
      </div>
    </div>
  )
}
