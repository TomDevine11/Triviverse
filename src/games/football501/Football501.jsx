import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ShareCard } from '../../components/ShareCard'
import GameChrome from '../../components/GameChrome'
import ModeToggle from '../../components/ModeToggle'
import UpNext from '../../components/UpNext'
import GameMotif from '../../components/GameMotif'
import { useI18n } from '../../i18n'
import { getDailyChallenge, getDailyEntry, getRandomChallenge } from '../../data/football501/game'
import QuestionBuilder from './QuestionBuilder'
import { recordResult, matchdayNumber } from '../../data/dailyStats'
import { loadDailyProgress, saveDailyProgress } from '../../data/dailyProgress'
import { TILE } from '../../utils/shareImage'
import { refineSuggestions, searchRegistry, positionBadge } from '../../data/canonical/resolve.js'
import { accentVars } from '../../design/accents'

const MAX_SCORE    = 501
const CHECKOUT_MIN = -10
const DARTS_MIN    = 1
const DARTS_MAX    = 180

// Position badges use the same GK/DEF/MID/FWD codes as the challenge filter, so
// what a player shows in the dropdown is exactly what the filter tests against.
const POS_BADGE = 'shrink-0 text-[0.6rem] font-bold px-1.5 py-0.5 rounded border border-border-strong bg-surface text-secondary'

const isValidDartsScore = (n) => Number.isInteger(n) && n >= DARTS_MIN && n <= DARTS_MAX

// Score colour keeps its range semantics on the new ladder: checkout range
// glows success, getting close warms up, otherwise the brand wordmark gradient.
function scoreClasses(score) {
  if (score <= 40)  return 'text-success-bright'
  if (score <= 100) return 'text-warn'
  return 'tv-wordmark'
}

function rankSuggestions(list, query) {
  const lower = query.trim().toLowerCase()
  const queryWords = lower.split(/\s+/)
  const lastWord = queryWords[queryWords.length - 1]
  const getScore = (name) => {
    const n = name.toLowerCase()
    const words = n.split(/\s+/)
    let s = 0
    if (n.startsWith(lower)) s += 100
    else if (words.some(w => w.startsWith(lastWord))) s += 60
    else if (queryWords.every(qw => words.some(w => w.startsWith(qw)))) s += 40
    else s += 10
    return s
  }
  return [...list]
    .map(p => ({ p, s: getScore(p.name) }))
    .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
    .map(({ p }) => p)
}

// ── The oche: giant score, the stage of the screen ─────────────────
function ScoreDisplay({ score }) {
  const { t } = useI18n()
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => { setAnimKey(k => k + 1) }, [score])
  return (
    <div className="flex flex-col items-center">
      <div key={animKey} className={`score-number score-pop text-[clamp(4.5rem,16vh,8rem)] font-black ${scoreClasses(score)} leading-none tabular-nums`}>
        {score}
      </div>
      {score <= 40 && score > 0 ? (
        <div className="mt-1 text-success-bright text-[0.66rem] font-extrabold uppercase tracking-[0.2em] animate-pulse">{t('five01.checkoutZone')}</div>
      ) : (
        <div className="mt-1 text-faint text-[0.6rem] font-extrabold uppercase tracking-[0.2em]">{t('five01.ruleCheckout')}</div>
      )}
    </div>
  )
}

// Per-player marker colours on the descent rail + scoreboard (P1 keeps the 501
// red). One hue each, up to the 5 supported players.
const PLAYER_DOTS = ['#f87171', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa']

// ── The descent rail: the countdown drawn as a fall from 501 to checkout ──
// Each player has a coloured marker that falls as their score drops (the player
// to throw is emphasised); solo also trails a dot on every score landed on. The
// zone at the bottom is the 0..−10 checkout window (drawn oversized — to scale
// it would be 2% of the rail and invisible).
function DescentRail({ players, currentPlayerIndex, stops }) {
  const pos = v => `${Math.min(97, Math.max(0, ((MAX_SCORE - v) / (MAX_SCORE - CHECKOUT_MIN)) * 100))}%`
  const solo = players.length === 1
  const zoneHot = players.some(p => !p.finished && p.score <= 0 && p.score >= CHECKOUT_MIN)
  return (
    <div className="flex flex-col items-center gap-1.5 h-full" aria-hidden="true">
      <span className="text-[0.6rem] font-black text-faint tabular-nums">501</span>
      <div className="relative flex-1 w-2.5 rounded-full bg-gradient-to-b from-border-strong via-surface to-surface">
        {solo && stops.map((v, i) => (
          <i key={`s${i}`} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-success" style={{ top: pos(v) }} />
        ))}
        {players.map((p, i) => {
          const isCurrent = i === currentPlayerIndex && !p.finished
          const inZone = solo && p.score <= 0 && p.score >= CHECKOUT_MIN
          const s = solo ? 16 : isCurrent ? 15 : 11
          return (
            <i
              key={`p${i}`}
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas transition-[top] duration-slow ease-out ${isCurrent || solo ? 'shadow-glow z-10' : ''}`}
              style={{ top: pos(p.score), width: s, height: s, background: inZone ? '#22c55e' : PLAYER_DOTS[i % PLAYER_DOTS.length], opacity: p.finished ? 0.5 : 1 }}
            />
          )
        })}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-10 rounded-lg border ${zoneHot ? 'bg-success/30 border-success' : 'bg-success/10 border-success/40'}`} />
      </div>
      <span className="text-[0.55rem] font-black text-success-bright tracking-[0.08em] text-center leading-tight">0<br/>−10</span>
    </div>
  )
}

// ── PDC split scoreboard (local multiplayer) ───────────────────────
function Scoreboard({ players, currentPlayerIndex }) {
  const { t } = useI18n()
  if (players.length <= 1) return null
  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-2 mb-1">
      {players.map((p, i) => {
        const active = i === currentPlayerIndex && !p.finished
        return (
          <div key={i} className={`rounded-xl border px-3 py-2 text-center transition-colors bg-card ${active ? 'border-brand shadow-glow' : 'border-border-strong'}`}>
            <div className="flex items-center justify-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PLAYER_DOTS[i % PLAYER_DOTS.length] }} aria-hidden="true" />
              <div className="text-[0.6rem] font-black tracking-[0.1em] text-secondary truncate uppercase">{p.name}</div>
            </div>
            <div className={`score-number text-2xl tabular-nums ${p.finished ? 'text-success-bright' : 'text-primary'}`}>{p.score}</div>
            {p.finished && <div className="text-[0.55rem] text-success font-black uppercase tracking-[0.1em]">FT</div>}
            {active && <div className="text-[0.55rem] text-brand-bright font-black uppercase tracking-[0.1em] animate-pulse">{t('five01.yourTurn')}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ── Win screen: the tabbed match report ───────────────────────────
// One centred card that fits the viewport: verdict on top, the bulk behind
// tabs (route/scores · all answers · share), actions + UP NEXT pills below.
// Only the answer list scrolls, inside its own panel.

function WinScreen({ history, players, challenge, gaveUp, onPlayAgain, onExit, playAgainLabel }) {
  const { t } = useI18n()
  const [tab, setTab] = useState('route')
  const isSolo = players.length === 1
  const valid = history.filter(g => g.valid)
  const usedNames = new Set(valid.map(g => g.resolvedName))
  const lastValid = valid[valid.length - 1]
  const answers = challenge.answersList()

  // Finishing position (give up = remaining score; checkout = score before the last dart).
  const soloScore = players[0].finalScore
  const fs = (p) => (p.finalScore ?? -Infinity)
  const ranked = players.map((p, i) => ({ ...p, idx: i })).sort((a, b) => fs(b) - fs(a))
  const winnerScore = fs(ranked[0])
  const winners = ranked.filter(p => p.finished && fs(p) === winnerScore)
  const finishingScore = isSolo
    ? (gaveUp ? soloScore : (lastValid ? lastValid.scoreAtTime : MAX_SCORE))
    : (lastValid ? lastValid.scoreAtTime : MAX_SCORE)
  const perfect = answers.filter(a => a.value === finishingScore)

  const headline = isSolo
    ? (gaveUp ? t('five01.gaveUpTitle') : t('five01.checkoutTitle'))
    : (winners.length > 1 ? t('five01.tie') : t('five01.wins', { name: winners[0].name }))
  const headlineCls = isSolo && gaveUp ? 'text-secondary' : 'text-success-bright'
  const subline = isSolo
    ? (gaveUp ? t('five01.gaveUpOn', { score: soloScore, n: valid.length }) : t('five01.finishedOn', { score: soloScore, n: valid.length }))
    : t('five01.closestWins')

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)}
      className={`text-[0.6rem] font-black tracking-[0.12em] rounded-full px-3 py-1.5 border transition-colors ${tab === id ? 'bg-brand border-brand text-white' : 'border-border text-muted hover:text-secondary'}`}>
      {label}
    </button>
  )

  return (
    <div className="relative w-full max-h-full min-h-0 bg-surface border border-border-strong rounded-2xl px-5 py-5 flex flex-col shadow-modal">
        <button
          type="button"
          onClick={onExit}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-primary hover:bg-border transition-colors text-lg leading-none"
        >
          ✕
        </button>
        <div className="text-center">
          <GameMotif id="501" className={`w-10 h-10 mx-auto mb-1.5 ${isSolo && gaveUp ? 'text-dim' : 'text-accent-bright'}`} />
          <h2 className={`score-number text-4xl sm:text-5xl ${headlineCls}`}>{headline}</h2>
          <p className="text-muted text-sm mt-1 leading-snug">
            {challenge.title}{isSolo && <> (<span className="text-secondary">{challenge.statLabel}</span>)</>}<br />
            <b className="text-secondary font-semibold">{subline}</b>
          </p>
        </div>

        <div className="flex gap-1.5 justify-center my-3.5 flex-wrap">
          {tabBtn('route', isSolo ? t('five01.yourRoute').toUpperCase() : t('five01.finalScores').toUpperCase())}
          {tabBtn('answers', t('five01.allAnswers', { n: answers.length }).toUpperCase())}
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {tab === 'route' && (
            <>
              <div className="flex justify-between items-center bg-success/10 border border-success/30 rounded-lg px-3 py-2 mb-2">
                <span className="text-[0.56rem] font-black tracking-[0.14em] text-success-bright">{t('five01.perfectFrom', { score: finishingScore }).toUpperCase()}</span>
                <span className="text-xs font-bold text-primary truncate ml-3">
                  {perfect.length ? perfect.map(a => a.name).join(', ') : <span className="text-muted font-normal">{t('five01.noExact', { score: finishingScore })}</span>}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto border border-border rounded-lg divide-y divide-border/40">
                {isSolo ? (
                  valid.length ? valid.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span>{g.player.flag}</span>
                      <span className="flex-1 font-medium text-primary truncate">{g.player.name}</span>
                      <span className="text-danger-bright font-mono">−{g.scoreDeducted}</span>
                      <span className={`w-10 text-right font-bold font-mono tabular-nums ${g.isCheckout ? 'text-success-bright' : 'text-secondary'}`}>{g.newScore}</span>
                    </div>
                  )) : <div className="px-3 py-4 text-xs text-muted text-center">—</div>
                ) : (
                  ranked.map((pl, i) => (
                    <div key={pl.idx} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span className="text-muted font-mono w-5">{i + 1}</span>
                      <span className="flex-1 font-medium text-primary truncate">{pl.name}</span>
                      {pl.finished && fs(pl) === winnerScore && <span className="text-warn" aria-hidden="true">★</span>}
                      {pl.finished
                        ? <span className="font-bold tabular-nums text-success-bright">{pl.finalScore}</span>
                        : <span className="text-muted text-xs">{t('five01.noCheckout')}</span>}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
          {tab === 'answers' && (
            <div className="flex-1 min-h-0 overflow-y-auto border border-border rounded-lg divide-y divide-border/40">
              {answers.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                  <span className={usedNames.has(a.name) ? 'text-success-bright font-medium' : 'text-secondary'}>{usedNames.has(a.name) ? '✓ ' : ''}{a.name}</span>
                  <span className="text-muted text-xs font-mono tabular-nums">{a.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center mt-3.5">
          <ShareCard
            className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg"
            card={{
              gameId: '501',
              title: 'Football 501',
              challenge: `${challenge.title} · ${challenge.statLabel}`,
              result: isSolo
                ? (gaveUp ? t('five01.gaveUpOn', { score: soloScore, n: valid.length }) : t('five01.finishedOn', { score: soloScore, n: valid.length }))
                : headline,
              rows: [history.map(g => g.valid ? TILE.hit : TILE.miss)],
              matchday: matchdayNumber(),
            }}
          />
          <button onClick={onPlayAgain} className="px-4 py-2.5 bg-surface hover:bg-border border border-border-strong text-primary text-sm font-bold rounded-lg transition-colors">{playAgainLabel || t('five01.playAgain')}</button>
          <button onClick={onExit} className="px-4 py-2.5 text-muted hover:text-secondary border border-border text-sm font-bold rounded-lg transition-colors">{t('five01.menuBtn')}</button>
        </div>
        <UpNext exclude="501" />
    </div>
  )
}

// ── Guess history — the ticker ─────────────────────────────────────
// Two-line rows so names never truncate away: name + deduction on top,
// running score / reason underneath. Empty state keeps the desktop rail
// balanced before the first dart (hidden on mobile, where it would be noise).
function GuessHistory({ history, showPlayer, className = '' }) {
  const { t } = useI18n()
  if (!history.length) return (
    <div className={`w-full ${className}`}>
      <div className="text-[0.58rem] text-faint uppercase tracking-[0.18em] mb-2 font-black px-1">{t('five01.history', { n: 0 })}</div>
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-faint leading-relaxed">{t('five01.historyEmpty')}</div>
    </div>
  )
  return (
    <div className={`w-full h-full min-h-0 flex flex-col ${className}`}>
      <div className="shrink-0 text-[0.58rem] text-faint uppercase tracking-[0.18em] mb-2 font-black px-1">{t('five01.history', { n: history.length })}</div>
      <div className="flex-1 min-h-0 rounded-xl border border-border overflow-hidden">
        <div className="divide-y divide-border/40 max-h-full overflow-y-auto">
          {[...history].reverse().map((g, i) => (
            <div key={i} className={`px-3 py-2.5 ${g.valid ? 'flash-valid' : 'flash-invalid'}`}>
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0">{g.player.flag}</span>
                {showPlayer && <span className="text-xs text-muted shrink-0">{g.playerName}:</span>}
                <span className="text-sm font-medium text-primary truncate flex-1">{g.player.name}</span>
                {g.player.position && <span className={POS_BADGE}>{g.player.position}</span>}
                {g.valid
                  ? <span className="text-danger-bright text-sm font-mono shrink-0">−{g.scoreDeducted}</span>
                  : g.statScore != null
                    ? <span className="text-warn text-xs font-semibold tabular-nums shrink-0">{t('five01.bustTag', { n: g.statScore })}</span>
                    : <span className="text-danger text-xs font-semibold shrink-0">✗</span>}
              </div>
              <div className="mt-0.5 pl-7 text-xs">
                {g.valid
                  ? <span className="text-muted font-mono tabular-nums">{g.scoreAtTime} → <b className={g.isCheckout ? 'text-success-bright' : 'text-secondary'}>{g.newScore}</b></span>
                  : <span className="text-danger-bright truncate block">{g.reason}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Entry: the mode select ─────────────────────────────────────────
// ── Unlimited setup: pick a challenge, then player count ───────────
const InfoBox = ({ label, value, tone }) => (
  <div className="bg-surface border border-border rounded-lg px-2 py-2 text-center">
    <div className={`score-number text-2xl tabular-nums ${tone === 'green' ? 'text-success-bright' : tone === 'amber' ? 'text-warn' : 'text-primary'}`}>{value}</div>
    <div className="text-[0.55rem] text-muted uppercase tracking-[0.1em] font-extrabold mt-0.5 leading-tight">{label}</div>
  </div>
)

function CountPicker({ title, sub, onPick, onBack, embedded = false }) {
  const { t } = useI18n()
  return (
    <div className={embedded ? 'w-full max-w-2xl mx-auto' : 'max-w-2xl mx-auto px-4 pb-12'}>
      {!embedded && <GameChrome motifId="501" title={t('five01.wordmark')} />}
      {!embedded && <button onClick={onBack} className="text-muted hover:text-secondary text-sm transition-colors mt-4">{t('common.back')}</button>}
      <div className={`${embedded ? 'mb-8' : 'mt-6 mb-8'} text-center`}>
        <h2 className="score-number text-[clamp(2rem,5vw,2.6rem)] tv-wordmark leading-none mb-2">{title.toUpperCase()}</h2>
        {sub && <div className="text-secondary text-sm">{sub}</div>}
        <div className="text-muted text-xs mt-1 font-bold tracking-[0.12em] uppercase">{t('five01.howManyPlayers')}</div>
        <div className="text-faint text-[0.7rem] mt-1">1 = solo · 2+ = pass-and-play local multiplayer</div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => onPick(n)}
            className="group bg-card border border-border-strong hover:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] rounded-xl py-6 text-center transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
            <span className="score-number text-4xl text-primary group-hover:text-accent-bright transition-colors">{n}</span>
            <span className="block mt-1 text-[0.5rem] font-black tracking-[0.12em] text-faint">{n === 1 ? 'SOLO' : t('five01.players').toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function Football501() {
  const { t } = useI18n()
  const [phase, setPhase] = useState('entry')   // entry | random | build | playing | won
  const [mode, setMode] = useState('daily')     // which pill segment is live: daily | unlimited | build
  const [challenge, setChallenge] = useState(null)
  const [isDaily, setIsDaily] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)
  // Lets the result card be dismissed (X) to reveal the finished board beneath,
  // without changing `phase` away from 'won' (which would reopen it / lose the
  // locked daily). Reset on every game entry so a fresh finish shows the card.
  const [resultDismissed, setResultDismissed] = useState(false)
  const [loading, setLoading] = useState(true) // boots straight into the daily
  const [players, setPlayers] = useState([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [history, setHistory] = useState([])
  const [numPlayers, setNumPlayers] = useState(1)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const score = players[currentPlayerIndex]?.score ?? MAX_SCORE
  const usedNames = new Set(history.map(g => g.player.name))

  // Live strategy boxes: highest available deduction, checkout & perfect counts.
  const insights = useMemo(() => {
    if (phase !== 'playing' || !challenge) return null
    const used = new Set(history.filter(g => g.valid).map(g => g.resolvedName))
    return challenge.insights(score, used)
  }, [challenge, score, history, phase])

  // Record the daily result (solo daily only; recordResult is idempotent per day).
  useEffect(() => {
    if (phase !== 'won' || !isDaily || players.length !== 1) return
    recordResult('501', !gaveUp)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist the solo daily board as it's played, so leaving mid-checkout and
  // coming back resumes the same attempt (no bailing out to farm a better
  // finish) and a finished daily stays locked to its result. The challenge is
  // deterministic (getDailyChallenge) so it's re-derived on resume, not stored.
  const soloDaily = isDaily && players.length === 1
  useEffect(() => {
    if (!soloDaily || (phase !== 'playing' && phase !== 'won')) return
    saveDailyProgress('501', { players, history, currentPlayerIndex, gaveUp }, phase === 'won', getDailyEntry().id)
  }, [soloDaily, players, history, currentPlayerIndex, gaveUp, phase])

  // ── Player search (canonical registry) ────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    if (input.trim().length < 2) { setSuggestions([]); return }

    // The registry is the single player universe — 501 only validates
    // Transfermarkt players anyway, so a third-party API only added spelling
    // duplicates. Searches ALL players, not this challenge's answer, so it never
    // gives the target away.
    const refined = refineSuggestions(searchRegistry(input), usedNames)
    // Prefer OUR competition position (by id first — exact — then by name) so the
    // badge never lies; then the identity registry's position (~88% coverage).
    const ranked = rankSuggestions(refined, input)
      .map(p => ({ ...p, position: (challenge && (challenge.badgeForId(p.id) || challenge.badgeFor(p.name))) || positionBadge(p.id) || p.position || null }))
      // A position-less suggestion is a non-TM player that can never be valid —
      // drop it so the list isn't padded with names that can never be right.
      .filter(p => p.position)
      .slice(0, 10)
    setSuggestions(ranked)
  }, [input, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start / reset ─────────────────────────────────────────────
  const startGame = (ch, count, daily) => {
    setChallenge(ch)
    setIsDaily(!!daily)
    setGaveUp(false)
    setNumPlayers(count)
    setPlayers(Array.from({ length: count }, (_, i) => ({ name: count === 1 ? t('five01.you') : t('five01.playerN', { n: i + 1 }), score: MAX_SCORE, finished: false, finalScore: null })))
    setCurrentPlayerIndex(0)
    setHistory([]); setInput(''); setSuggestions([]); setHighlightedIndex(-1)
    setPhase('playing')
    setTimeout(() => inputRef.current?.focus(), 100)
  }
  // A challenge may need its competition's fact table loaded first (async).
  const startFrom = async (challengePromise, count, daily) => {
    setLoading(true); setResultDismissed(false)
    try { startGame(await challengePromise, count, daily) }
    finally { setLoading(false) }
  }
  const playDaily = () => { setMode('daily'); return startFrom(getDailyChallenge(), 1, true) }
  // Return to today's daily: a finished one opens locked to its result (phase
  // 'won'), an in-progress one resumes mid-checkout. The board is restored from
  // the snapshot; the challenge is re-derived deterministically.
  const resumeDaily = async () => {
    setMode('daily'); setResultDismissed(false)
    const snap = loadDailyProgress('501', getDailyEntry().id)
    if (!snap) { playDaily(); return }
    setLoading(true)
    try {
      const ch = await getDailyChallenge()
      setChallenge(ch); setIsDaily(true); setNumPlayers(1)
      setPlayers(snap.players); setHistory(snap.history)
      setCurrentPlayerIndex(snap.currentPlayerIndex ?? 0); setGaveUp(!!snap.gaveUp)
      setInput(''); setSuggestions([]); setHighlightedIndex(-1)
      setPhase(snap.done ? 'won' : 'playing')
      if (!snap.done) setTimeout(() => inputRef.current?.focus(), 100)
    } finally { setLoading(false) }
  }
  // Route the entry Daily card: fresh, resume, or locked result.
  const onDailyCard = () => (loadDailyProgress('501', getDailyEntry().id) ? resumeDaily() : playDaily())
  // Open straight on the daily (like Tenable) — the menu is a step back, not a step in.
  useEffect(() => { onDailyCard() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // The top-of-game pill: switch between today's daily, an unlimited random, and the builder.
  const onPill = (m) => {
    // The active pill follows the current screen, not just the play `mode` (build
    // and the count-picker are their own phases), so the guard must too.
    const cur = phase === 'build' ? 'build' : phase === 'random' ? 'unlimited' : mode
    if (m === cur) return
    if (m === 'daily') onDailyCard(); else if (m === 'unlimited') setPhase('random'); else setPhase('build')
  }
  const playAgain = () => startFrom(isDaily ? getDailyChallenge() : getRandomChallenge(numPlayers), numPlayers, isDaily)
  const skipQuestion = () => startFrom(getRandomChallenge(numPlayers), numPlayers, false) // endless: new question
  const giveUp = () => {
    setPlayers(ps => ps.map((p, i) => i === currentPlayerIndex ? { ...p, finished: true, finalScore: p.score } : p))
    setGaveUp(true)
    setPhase('won')
  }

  // ── Submit a guess ────────────────────────────────────────────
  const submitGuess = useCallback((player) => {
    setInput(''); setSuggestions([]); setHighlightedIndex(-1)

    const playerIdx = currentPlayerIndex
    const playerName = players[playerIdx].name
    const scoreAtTime = players[playerIdx].score

    const recordAndAdvance = (entry, newScore = null, isCheckout = false) => {
      setHistory(prev => [...prev, { ...entry, playerIdx, playerName }])
      const next = players.map((p, i) => {
        if (i !== playerIdx || newScore === null) return p
        return isCheckout ? { ...p, score: newScore, finished: true, finalScore: newScore } : { ...p, score: newScore }
      })
      setPlayers(next)
      // End of game. In 2-player, player 2 (index 1) has the "last word": the
      // game ends the moment they check out — either they beat player 1 to it
      // (win), or they're responding to player 1's finish (closest to 0 wins,
      // both 0 = draw). Player 1 checking out never ends it; player 2 always
      // gets their response. For 3+ players it ends when everyone's checked out.
      const gameEnds = isCheckout && (players.length === 2 ? playerIdx === 1 : next.every(p => p.finished))
      if (gameEnds) { setTimeout(() => setPhase('won'), 500); return }
      let idx = playerIdx
      do { idx = (idx + 1) % next.length } while (next[idx].finished)
      setCurrentPlayerIndex(idx)
    }

    const result = challenge.validate(player.name, player.id)
    if (result.status !== 'valid') {
      const reason = result.status === 'ambiguous'
        ? t('five01.ambiguous', { options: result.options.join(' / ') })
        : t('five01.notValidAnswer', { name: player.name })
      recordAndAdvance({ player, valid: false, statScore: null, reason, scoreAtTime })
      return
    }

    const statScore = result.value
    // Recognised answer, but over a darts visit (>180) → bust, shown with value.
    if (statScore > DARTS_MAX) {
      recordAndAdvance({ player, valid: false, statScore, reason: t('five01.over180', { n: statScore }), scoreAtTime })
      return
    }
    if (!isValidDartsScore(statScore)) {
      recordAndAdvance({ player, valid: false, statScore, reason: t('five01.cantDeduct', { n: statScore }), scoreAtTime })
      return
    }

    const newScore = scoreAtTime - statScore
    const isCheckout = newScore >= CHECKOUT_MIN && newScore <= 0
    if (newScore < CHECKOUT_MIN) {
      recordAndAdvance({ player, valid: false, statScore, reason: t('five01.bustsDetail', { n: statScore, score: scoreAtTime, result: newScore }), scoreAtTime })
      return
    }

    recordAndAdvance({ player, valid: true, resolvedName: result.name, scoreDeducted: statScore, scoreAtTime, newScore, isCheckout, breakdown: result.breakdown }, newScore, isCheckout)
  }, [players, currentPlayerIndex, challenge, t])

  const handleKeyDown = (e) => {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const tgt = highlightedIndex >= 0 ? suggestions[highlightedIndex] : suggestions.length === 1 ? suggestions[0] : null
      if (tgt) submitGuess(tgt)
    } else if (e.key === 'Escape') { setSuggestions([]); setHighlightedIndex(-1) }
  }

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return
      setSuggestions([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Render ────────────────────────────────────────────────────
  const shell = (content) => (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('501')}>{content}</div>
  )
  // Build-your-own and the count-picker render on the SAME page as play: same
  // chrome + mode toggle (active pill = the current screen), with the panel
  // where the board normally sits. Switching the toggle leaves the screen.
  const modeShell = (active, content) => shell(
    <div className="max-w-4xl mx-auto px-4 pb-6 min-h-dvh flex flex-col">
      <GameChrome motifId="501" title={t('five01.wordmark')} />
      <div className="flex flex-col items-center gap-1 mb-6 shrink-0">
        <ModeToggle mode={active} onChange={onPill} modes={[['daily', t('common.daily')], ['unlimited', 'Unlimited'], ['build', 'Build your own']]} />
        <div className="text-faint text-[0.62rem] text-center leading-tight">Unlimited = random questions · Build your own = custom · solo or up to 5 players</div>
      </div>
      {content}
    </div>
  )

  if (loading) return shell(
    <div className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="w-8 h-8 border-2 border-border-strong border-t-brand rounded-full animate-spin mb-4" />
      <div className="text-muted text-sm">{t('five01.loading')}</div>
    </div>
  )
  if (phase === 'entry') return shell(<div className="min-h-dvh flex items-center justify-center"><div className="w-8 h-8 border-2 border-border-strong border-t-brand rounded-full animate-spin" /></div>)
  if (phase === 'random') return modeShell('unlimited', <CountPicker embedded title={t('five01.randomTitle')} sub={t('five01.randomSub')} onPick={(n) => { setMode('unlimited'); startFrom(getRandomChallenge(n), n, false) }} />)
  if (phase === 'build') return modeShell('build', <QuestionBuilder embedded mode="501" onStart={(challenge, count) => { setMode('build'); startFrom(challenge, count, false) }} />)

  const validCount = history.filter(g => g.valid).length
  const currentPlayer = players[currentPlayerIndex]

  // The board stays mounted under the result overlay so the report card
  // floats over a dimmed, still-visible oche (the product's modal contract).
  const overlay = phase === 'won' && !resultDismissed && (
    <div className="fixed inset-0 z-modal bg-black/70 backdrop-blur-sm result-modal-in flex items-center justify-center p-4 sm:p-6">
      <div className="result-card w-full max-w-2xl max-h-[88dvh] flex">
        <WinScreen
          history={history} players={players} challenge={challenge} gaveUp={gaveUp}
          onPlayAgain={soloDaily ? () => setPhase('random') : playAgain}
          playAgainLabel={soloDaily ? t('common.playUnlimited') : t('five01.playAgain')}
          onExit={() => setResultDismissed(true)}
        />
      </div>
    </div>
  )

  return shell(
    <div className="max-w-4xl mx-auto px-4 pb-3 h-dvh flex flex-col">
      <GameChrome
        motifId="501"
        title={t('five01.wordmark')}
        right={<span className="text-muted text-xs tabular-nums">{t('five01.dartsCount', { n: validCount })}</span>}
      />
      <div className="flex flex-col items-center gap-1 mb-1 shrink-0">
        <ModeToggle mode={mode} onChange={onPill} modes={[['daily', t('common.daily')], ['unlimited', 'Unlimited'], ['build', 'Build your own']]} />
        <div className="text-faint text-[0.62rem] text-center leading-tight">Unlimited = random questions · Build your own = custom · solo or up to 5 players</div>
      </div>

      {/* One page: stage centre-top (rail on its left shoulder, absolutely
          positioned so it never shifts the centreline), history filling the
          remaining viewport below with its own scroll. */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* the stage — centre top */}
        <div className="relative shrink-0 flex flex-col gap-3 w-full max-w-2xl mx-auto pt-1">
          <div className="hidden lg:flex absolute -left-20 top-1 bottom-1 w-12 justify-center">
            <DescentRail
              players={players}
              currentPlayerIndex={currentPlayerIndex}
              stops={[MAX_SCORE, ...history.filter(g => g.valid && g.playerIdx === currentPlayerIndex).map(g => g.newScore)]}
            />
          </div>
          {/* question card — red spine, possible answers, skip (non-daily) */}
          <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">{isDaily ? t('five01.dailyChallenge').toUpperCase() : t('five01.unlimited').toUpperCase()}</div>
              <div className="text-primary font-bold text-sm mt-0.5">{challenge.title}</div>
              <div className="text-muted text-xs mt-0.5">{t('five01.possibleAnswers', { n: challenge.answers })}</div>
            </div>
            {!isDaily && (
              <button onClick={skipQuestion} className="shrink-0 text-xs text-muted hover:text-secondary border border-border-strong hover:border-muted rounded-lg px-2.5 py-1 transition-colors">{t('five01.skip')}</button>
            )}
          </div>

          <Scoreboard players={players} currentPlayerIndex={currentPlayerIndex} />
          {numPlayers > 1 && <div className="text-center text-[0.66rem] font-extrabold text-brand-bright uppercase tracking-[0.2em] animate-pulse">{t('five01.turnOf', { name: currentPlayer.name })}</div>}

          <ScoreDisplay score={score} />

          {/* Input */}
          <div className="relative w-full">
            <input
              ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={t('five01.typePlayer')} autoFocus disabled={phase !== 'playing'}
              className="w-full bg-surface border border-border-strong focus:border-brand rounded-xl px-4 py-3.5 text-primary placeholder-muted text-base outline-none transition-colors"
              autoComplete="off" autoCorrect="off" spellCheck="false"
              role="combobox" aria-expanded={suggestions.length > 0} aria-autocomplete="list" aria-label={t('five01.typePlayer')}
            />
            {suggestions.length > 0 && (
              <div ref={dropdownRef} role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-strong rounded-xl overflow-hidden z-dropdown shadow-float">
                {suggestions.map((player, i) => (
                  <button key={player.name} role="option" aria-selected={i === highlightedIndex}
                    onMouseDown={e => { e.preventDefault(); submitGuess(player) }} onMouseEnter={() => setHighlightedIndex(i)}
                    className={`w-full text-left px-4 py-2.5 transition-colors border-b border-border/50 last:border-0 ${i === highlightedIndex ? 'bg-border' : 'hover:bg-border/60'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl shrink-0">{player.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-primary text-sm font-medium truncate">{player.name}</div>
                        <div className="text-muted text-xs">{player.nationality}{player.dob ? ` · ${player.dob}` : ''}</div>
                      </div>
                      {player.position && <span className={POS_BADGE}>{player.position}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between text-[0.62rem] text-muted px-1">
            <span>{t('five01.ruleValid')}</span><span>{t('five01.ruleCheckout')}</span><span>{t('five01.ruleBust')}</span>
          </div>

          {/* Live strategy boxes — highest left · checkouts · perfect finishes */}
          {insights && (
            <div className="grid grid-cols-3 gap-2">
              <InfoBox label={t('five01.highestLeft')} value={insights.highest || '—'} />
              <InfoBox label={t('five01.checkouts')} value={score <= 180 ? insights.checkouts : '—'} tone="green" />
              <InfoBox label={t('five01.perfectFinish')} value={score <= 180 ? insights.perfect : '—'} tone="amber" />
            </div>
          )}

          {/* Give up (solo) — end the round from here and reveal the answers */}
          {numPlayers === 1 && phase === 'playing' && (
            <button type="button" onClick={giveUp}
              className="w-full border border-danger/40 text-danger-bright hover:bg-danger/10 hover:border-danger text-sm font-medium rounded-xl px-4 py-2.5 transition-colors">
              {t('five01.giveUpReveal')}
            </button>
          )}
          {/* Result card dismissed to see the board — offer it back. */}
          {phase === 'won' && resultDismissed && (
            <button type="button" onClick={() => setResultDismissed(false)}
              className="w-full border border-border-strong text-secondary hover:bg-surface hover:text-primary text-sm font-medium rounded-xl px-4 py-2.5 transition-colors">
              {t('common.seeResult')}
            </button>
          )}
        </div>
        {/* history — under the main content, scrolling inside the page */}
        <div className="flex-1 min-h-[5rem] w-full max-w-2xl mx-auto pt-4 pb-1">
          <GuessHistory history={history} showPlayer={numPlayers > 1} />
        </div>
      </div>
      {overlay}
    </div>
  )
}
