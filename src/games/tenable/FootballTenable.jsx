import { useState, useRef, useEffect, useMemo } from 'react'
import { getDailyTenableQuestion, getRandomTenableQuestion } from '../../data/tenable'
import QuestionBuilder from '../football501/QuestionBuilder'
import { players as localPlayers } from '../../data/players'
import { clubs } from '../../data/clubs'
import { refineSuggestions, searchRegistry, resolveNameToId } from '../../data/canonical/resolve.js'
import { normalize, answerMatches } from './match.js'
import { getFlagFromNationality } from '../../utils/flags'
import { ShareCard } from '../../components/ShareCard'
import DailyStats from '../../components/DailyStats'
import ModeToggle from '../../components/ModeToggle'
import ResultModal from '../../components/ResultModal'
import CategoryIcon from '../../components/CategoryIcon'
import GameChrome from '../../components/GameChrome'
import UpNext from '../../components/UpNext'
import GameMotif from '../../components/GameMotif'
import { accentVars } from '../../design/accents'
import { recordResult, matchdayNumber } from '../../data/dailyStats'
import { loadDailyProgress, saveDailyProgress } from '../../data/dailyProgress'
import { TILE } from '../../utils/shareImage'
import { useI18n } from '../../i18n'
import { RESULT_REVEAL_DELAY_MS } from '../../utils/motion'

// Maps each question to the club crest / league logo / flag / trophy icon that
// represents its subject (shown on the question card). Questions with no natural
// icon (transfers, all-international) keep their emoji.
const QUESTION_ICON = {
  'wc-top-scorers': { type: 'trophy', value: 'FIFA World Cup' },
  'pl-top-scorers': { type: 'league', value: 'Premier League' },
  'ucl-top-scorers': { type: 'trophy', value: 'UEFA Champions League' },
  'ballon-dor-most-wins': { type: 'trophy', value: "Ballon d'Or" },
  'england-top-scorers': { type: 'nationality', value: 'England' },
  'ecl-most-titles': { type: 'trophy', value: 'UEFA Champions League' },
  'laliga-top-scorers': { type: 'league', value: 'La Liga' },
  'pl-most-appearances': { type: 'league', value: 'Premier League' },
  'pl-most-hattricks': { type: 'league', value: 'Premier League' },
  'brazil-top-scorers': { type: 'nationality', value: 'Brazil' },
  'real-madrid-top-scorers': { type: 'club', value: 'Real Madrid' },
  'pl-titles-clubs': { type: 'league', value: 'Premier League' },
  'pl-assists': { type: 'league', value: 'Premier League' },
  'pl-clean-sheets': { type: 'league', value: 'Premier League' },
  'bundesliga-top-scorers': { type: 'league', value: 'Bundesliga' },
  'pl-red-cards': { type: 'league', value: 'Premier League' },
  'france-top-scorers': { type: 'nationality', value: 'France' },
  'liverpool-top-scorers': { type: 'club', value: 'Liverpool' },
  'barcelona-top-scorers': { type: 'club', value: 'FC Barcelona' },
  'man-utd-top-scorers': { type: 'club', value: 'Manchester United' },
  'serie-a-top-scorers': { type: 'league', value: 'Serie A' },
}

const MAX_LIVES = 3

const TSDB = 'https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p='
const EXCLUDE_SPORTS = new Set(['basketball','american football','baseball','ice hockey','tennis','golf','cricket','rugby','swimming','athletics','motorsport','cycling','boxing','mma'])

// The tower, top to bottom: rank 1 is the apex rung, rank 10 the base.
// One rank per rung so the reveal pulse climbs rung by rung.
const ROWS = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]]
// Rung width: narrow apex widening to the full base (the Tenable triangle).
const rungWidth = (rank) => 38 + (rank - 1) * (62 / 9)


export default function FootballTenable() {
  const { t } = useI18n()
  // Today's daily state, if any: resume it, or lock a finished one to its result.
  const [saved] = useState(() => loadDailyProgress('tenable', getDailyTenableQuestion().id))
  const restoredDone = !!saved?.done

  const [mode, setMode] = useState('daily') // 'daily' | 'unlimited'
  const [building, setBuilding] = useState(false)
  const [question, setQuestion] = useState(() => getDailyTenableQuestion())
  const [revealed, setRevealed] = useState(() => saved?.revealed ?? {}) // rank -> answer
  const [lives, setLives] = useState(() => saved?.lives ?? MAX_LIVES)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState(() => saved?.history ?? [])
  const [phase, setPhase] = useState(() => saved?.phase ?? 'playing') // 'playing' | 'won' | 'lost'
  const [dailyStats, setDailyStats] = useState(null)
  useEffect(() => {
    // Only Daily mode records stats/streaks (idempotent per day).
    if (phase !== 'playing' && mode === 'daily') setDailyStats(recordResult('tenable', phase === 'won'))
  }, [phase, mode])

  // A finished daily is locked to its result and offers Unlimited.
  const dailyLocked = mode === 'daily' && phase !== 'playing'

  // Leave the daily untouched; start a fresh, replayable Unlimited round.
  const startUnlimited = () => {
    setBuilding(false); setMode('unlimited'); setQuestion(getRandomTenableQuestion())
    setRevealed({}); setLives(MAX_LIVES); setInput(''); setHistory([])
    setPhase('playing'); setDailyStats(null); setGaveUp(false); setShowGiveUpConfirm(false)
    setPendingRank(null); setPendingAnswer(null); setPulseRow(null); setShowResult(false); setResultTab('answers')
  }
  // Build-your-own: play a custom top-10 built in the shared facet builder.
  const startCustom = (p) => {
    setBuilding(false); setMode('build')
    setQuestion({ id: `byo-${Date.now()}`, type: 'player', scope: 'custom', title: p.title, description: p.description, icon: null, answers: p.answers, tiePool: p.tiePool || [] })
    setRevealed({}); setLives(MAX_LIVES); setInput(''); setHistory([])
    setPhase('playing'); setDailyStats(null); setGaveUp(false); setShowGiveUpConfirm(false)
    setPendingRank(null); setPendingAnswer(null); setPulseRow(null); setShowResult(false); setResultTab('answers')
  }
  // Return to the daily: rehydrate today's saved state (locked, resumed, or fresh).
  const restoreDaily = () => {
    const s = loadDailyProgress('tenable', getDailyTenableQuestion().id)
    setBuilding(false); setMode('daily'); setQuestion(getDailyTenableQuestion())
    setRevealed(s?.revealed ?? {}); setLives(s?.lives ?? MAX_LIVES); setInput(''); setHistory(s?.history ?? [])
    setPhase(s?.phase ?? 'playing'); setDailyStats(null); setGaveUp(s?.gaveUp ?? false); setShowGiveUpConfirm(false)
    setPendingRank(null); setPendingAnswer(null); setPulseRow(null); setShowResult(!!s?.done); setResultTab('answers')
  }
  const onModeChange = (m) => (m === 'daily' ? restoreDaily() : m === 'build' ? setBuilding(true) : startUnlimited())
  const [showResult, setShowResult] = useState(restoredDone)
  const [resultTab, setResultTab] = useState('answers')
  useEffect(() => {
    if (phase === 'playing') return
    const t = setTimeout(() => setShowResult(true), RESULT_REVEAL_DELAY_MS) // let the revealed answers show first
    return () => clearTimeout(t)
  }, [phase])
  const [pulseRow, setPulseRow] = useState(null)
  const [pendingRank, setPendingRank] = useState(null)
  const [pendingAnswer, setPendingAnswer] = useState(null) // what to reveal at pendingRank (for tie-pool fills)
  const [shake, setShake] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [gaveUp, setGaveUp] = useState(() => saved?.gaveUp ?? false)
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Persist the daily as it's played so a refresh resumes it and a finished
  // round stays locked (no bailing out to reset lives).
  useEffect(() => {
    if (mode !== 'daily') return
    const started = Object.keys(revealed).length > 0 || history.length > 0 || phase !== 'playing'
    if (!started) return
    saveDailyProgress('tenable', { revealed, lives, history, phase, gaveUp }, phase !== 'playing', question.id)
  }, [mode, revealed, lives, history, phase, gaveUp])

  const answersByRank = Object.fromEntries(question.answers.map(a => [a.rank, a]))

  // Phase 3: id index for player questions — a picked suggestion matches an
  // answer/tie-pool entry by stable player id (fixes surname namesakes). Clubs
  // and unresolved names keep name matching.
  const { idToAnswer, idToPooled } = useMemo(() => {
    const a = new Map(), p = new Map()
    let unresolved = 0
    if (question.type === 'player') {
      for (const ans of question.answers) { const id = resolveNameToId(ans.text); if (id) a.set(id, ans); else unresolved++ }
      for (const pl of question.tiePool || []) { const id = resolveNameToId(pl.text); if (id) p.set(id, pl); else unresolved++ }
    }
    return { idToAnswer: a, idToPooled: p, unresolvedValid: unresolved }
  }, [question])

  // ── Bottom-to-rank "counting" reveal animation ─────────────────
  useEffect(() => {
    if (pendingRank == null) return
    const targetRow = ROWS.findIndex(r => r.includes(pendingRank))
    let step = ROWS.length - 1
    let timer

    const tick = () => {
      setPulseRow(step)
      if (step === targetRow) {
        timer = setTimeout(() => {
          setRevealed(prev => ({ ...prev, [pendingRank]: pendingAnswer || answersByRank[pendingRank] }))
          setPulseRow(null)
          setPendingRank(null)
          setPendingAnswer(null)
        }, 350)
      } else {
        step -= 1
        timer = setTimeout(tick, 100)
      }
    }
    tick()
    return () => clearTimeout(timer)
  }, [pendingRank]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Win / lose checks ────────────────────────────────────────────
  useEffect(() => {
    if (Object.keys(revealed).length === 10 && phase === 'playing') {
      const t = setTimeout(() => setPhase('won'), 500)
      return () => clearTimeout(t)
    }
  }, [revealed, phase])

  useEffect(() => {
    if (lives <= 0 && phase === 'playing') {
      const t = setTimeout(() => setPhase('lost'), 600)
      return () => clearTimeout(t)
    }
  }, [lives, phase])

  // ── Suggestions dropdown ─────────────────────────────────────────
  // Searches the full player/club universe (TheSportsDB + local lists),
  // NOT just this question's answers — otherwise the dropdown would give
  // the puzzle away. Picking from it just disambiguates spelling/surnames.
  const [apiPlayers, setApiPlayers] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (question.type !== 'player' || phase !== 'playing' || pendingRank != null) {
      setApiPlayers([]); setIsSearching(false); return
    }
    if (normalize(input).length < 2) { setApiPlayers([]); setIsSearching(false); return }

    setIsSearching(true)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(TSDB + encodeURIComponent(input), { signal: controller.signal })
        const data = await res.json()
        const players = (data.player || [])
          .filter(p => !EXCLUDE_SPORTS.has((p.strSport || '').toLowerCase()))
          .map(p => ({ name: p.strPlayer, flag: getFlagFromNationality(p.strNationality) }))
        setApiPlayers(players)
      } catch (err) {
        if (err.name !== 'AbortError') setApiPlayers([])
      } finally {
        setIsSearching(false)
      }
    }, 280)
    return () => { clearTimeout(timer); controller.abort(); setIsSearching(false) }
  }, [input, phase, pendingRank, question.type])

  const suggestions = useMemo(() => {
    if (phase !== 'playing' || pendingRank != null) return []
    const norm = normalize(input)
    if (norm.length < 2) return []

    if (question.type === 'club') {
      return clubs
        .filter(c => normalize(c).includes(norm))
        .slice(0, 8)
        .map(name => ({ name }))
    }

    const localMatches = localPlayers
      .filter(p => normalize(p.name).includes(norm))
      .map(p => ({ name: p.name, flag: p.flag }))

    // Sources: the external API, the local list, AND the whole registry (so any
    // valid player is findable by name or surname). Canonicalised + deduped.
    const merged = refineSuggestions([...apiPlayers, ...localMatches, ...searchRegistry(input)])

    const rank = (name) => {
      const n = normalize(name)
      if (n === norm) return 0                                    // exact name / mononym
      if (n.startsWith(norm)) return 1
      if (n.split(' ').some(w => w.startsWith(norm))) return 2    // any word (incl. surname) prefix
      return 3
    }
    merged.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))

    return merged.slice(0, 8)
  }, [input, phase, pendingRank, question.type, apiPlayers])

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

  const submitGuess = (text, selectedId = null) => {
    const norm = normalize(text)
    if (!norm) return
    // A picked suggestion carries a stable id; a typed name resolves to one when
    // unambiguous. Precise id match wins (idToAnswer). Otherwise namesake-safe
    // name/surname matching — so every answer is reachable by surname, while a
    // genuine namesake (different known id, same surname) is still rejected.
    const isPlayer = question.type === 'player'
    const pid = isPlayer ? selectedId : null
    const guessId = pid ?? (isPlayer ? resolveNameToId(norm) : null)
    let match = pid != null ? (idToAnswer.get(pid) || null) : null
    let pooled = !match && pid != null && question.tieValue != null ? (idToPooled.get(pid) || null) : null
    if (!match && !pooled) {
      match = question.answers.find(a => answerMatches(norm, guessId, a, isPlayer))
      // Tie-pool match: a player/club tied at the cutoff value who isn't one of
      // the listed 10 but is equally valid for a joint slot (e.g. any club with
      // 2 European Cups). They fill the lowest unfilled tied slot.
      pooled = !match && question.tieValue != null
        ? (question.tiePool || []).find(p => answerMatches(norm, guessId, p, isPlayer))
        : null
    }
    const alreadyNamed = pooled && Object.values(revealed).some(a => normalize(a.text) === normalize(pooled.text))
    const tieSlot = pooled && !alreadyNamed
      ? question.answers.find(a => a.value === question.tieValue && !revealed[a.rank] && pendingRank !== a.rank)
      : null

    if (match && revealed[match.rank]) {
      setHistory(prev => [...prev, { text, correct: 'duplicate' }])
    } else if (match) {
      setHistory(prev => [...prev, { text, correct: true, rank: match.rank }])
      setPendingRank(match.rank)
    } else if (pooled && (alreadyNamed || !tieSlot)) {
      setHistory(prev => [...prev, { text, correct: 'duplicate' }])
    } else if (tieSlot) {
      setHistory(prev => [...prev, { text, correct: true, rank: tieSlot.rank }])
      setPendingAnswer({ rank: tieSlot.rank, text: pooled.text, detail: tieSlot.detail })
      setPendingRank(tieSlot.rank)
    } else {
      setHistory(prev => [...prev, { text, correct: false }])
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
    if (phase !== 'playing' || pendingRank != null) return

    if (highlightedIndex >= 0 && visibleSuggestions[highlightedIndex]) {
      const s = visibleSuggestions[highlightedIndex]
      submitGuess(s.name, s.id)
      return
    }
    if (!input.trim()) return
    submitGuess(input.trim())
  }

  const handleSelectSuggestion = (item) => submitGuess(item.name, item.id)

  const confirmGiveUp = () => {
    setGaveUp(true)
    setPhase('lost')
    setShowGiveUpConfirm(false)
  }

  const handleKeyDown = (e) => {
    if (!visibleSuggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, visibleSuggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Escape') { setDismissed(true); setHighlightedIndex(-1) }
  }

  const correctCount = Object.keys(revealed).length

  // Build-your-own stays on the SAME page: same chrome + mode toggle (with Build
  // active), the builder rendered where the pyramid normally is. Switching the
  // toggle to Daily/Random leaves build mode.
  if (building) return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('tenable')}>
    <div className="flex flex-col items-center px-4 pb-8 max-w-3xl mx-auto">
      <div className="w-full"><GameChrome motifId="tenable" title="FOOTBALL TENABLE" /></div>
      <ModeToggle mode="build" onChange={onModeChange} className="mt-1 mb-4"
        modes={[['daily', t('common.daily')], ['unlimited', 'Random'], ['build', 'Build your own']]} />
      <QuestionBuilder embedded mode="tenable" onStart={startCustom} />
    </div>
    </div>
  )

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('tenable')}>
    <div className="flex flex-col items-center px-4 pb-8 max-w-3xl mx-auto">
      <div className="w-full"><GameChrome
        motifId="tenable"
        title="FOOTBALL TENABLE"
        right={
          <span className="inline-flex items-center gap-1.5" aria-label={lives === 1 ? t('tenable.lifeLeft', { n: lives }) : t('tenable.livesLeft', { n: lives })}>
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <i key={i} className={`w-2.5 h-2.5 rounded-full ${i < lives ? 'bg-accent' : 'bg-inert'}`} aria-hidden="true" />
            ))}
            <b className="ml-1 text-secondary tabular-nums">{correctCount}/10</b>
          </span>
        }
      /></div>

      <ModeToggle mode={mode} onChange={onModeChange} className="mt-1 mb-4"
        modes={[['daily', t('common.daily')], ['unlimited', 'Random'], ['build', 'Build your own']]} />

      {/* Question card */}
      <div className="w-full max-w-lg mb-4">
        <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3">
          <div className="flex items-start gap-3">
            {question.icon || QUESTION_ICON[question.id]
              ? <CategoryIcon category={question.icon || QUESTION_ICON[question.id]} size={30} className="shrink-0 mt-0.5" />
              : <span className="text-2xl shrink-0">{question.emoji}</span>}
            <div className="min-w-0 flex-1">
              <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright">{mode === 'daily' ? t('common.daily').toUpperCase() : mode === 'build' ? 'BUILD YOUR OWN' : t('common.unlimited').toUpperCase()} · TOP 10{dailyLocked ? ` · ${t('common.complete')}` : ''}</div>
              <div className="text-primary font-bold text-sm mt-0.5">{question.title}</div>
              <div className="text-muted text-xs mt-0.5">{dailyLocked ? t('common.comeBackTomorrow') : question.description}</div>
            </div>
          </div>
        </div>
      </div>

      {/* The tower — triangle cut: apex rank 1, widening to the base */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-1.5 mb-4">
        {ROWS.map((row, rowIdx) => {
          const rank = row[0]
          const answer = revealed[rank]
          const wasFound = !!answer
          const gameOver = phase !== 'playing'
          const displayAnswer = answer || (gameOver ? answersByRank[rank] : null)
          const isPulsing = pulseRow === rowIdx && pendingRank != null
          const value = answersByRank[rank]?.value
          const maxValue = question.answers[0]?.value || 1
          const bar = wasFound && typeof value === 'number' && typeof maxValue === 'number' && maxValue > 0
            ? Math.max(8, Math.round((value / maxValue) * 100)) : 0
          return (
            <div
              key={rank}
              style={{ width: `${rungWidth(rank)}%`, minWidth: '13rem' }}
              className={`relative flex items-center gap-2 rounded-lg border px-3 py-2 overflow-hidden transition-colors ${
                wasFound
                  ? 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-card'
                  : displayAnswer
                    ? 'border-danger/40 bg-danger/5'
                    : 'border-border bg-board'
              } ${isPulsing ? 'pyramid-pulse' : ''} ${wasFound ? 'cell-reveal' : ''}`}
            >
              {bar > 0 && <i aria-hidden="true" className="absolute left-0 top-0 bottom-0 bg-[linear-gradient(90deg,var(--accent-tint),transparent)]" style={{ width: `${bar}%` }} />}
              <b className="relative w-4 text-[0.66rem] text-faint tabular-nums shrink-0">{rank}</b>
              {displayAnswer ? (
                <>
                  {question.type === 'club' && <CategoryIcon category={{ type: 'club', value: displayAnswer.text }} size={16} className="relative shrink-0" />}
                  <span className={`relative text-xs sm:text-sm font-bold truncate ${wasFound ? 'text-primary' : 'text-secondary'}`}>{displayAnswer.text}</span>
                  <span className={`relative ml-auto text-[0.66rem] sm:text-xs font-mono tabular-nums shrink-0 ${wasFound ? 'text-accent-bright' : 'text-danger-bright'}`}>{displayAnswer.detail}</span>
                </>
              ) : (
                <span className="relative text-inert font-black tracking-[0.3em] text-xs">?????</span>
              )}
            </div>
          )
        })}
      </div>

      {phase === 'playing' && (
        <>
          {/* Input */}
          <form onSubmit={handleSubmit} className={`relative w-full max-w-lg ${shake ? 'shake' : ''}`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('tenable.placeholder')}
              autoFocus
              className="w-full bg-surface border border-border-strong focus:border-brand rounded-xl px-4 py-3.5 text-primary placeholder-muted text-base outline-none transition-colors"
              role="combobox" aria-expanded={visibleSuggestions.length > 0} aria-autocomplete="list" aria-label={t('tenable.placeholder')}
              autoComplete="off" autoCorrect="off" spellCheck="false"
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
                    onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(item) }}
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

          <div className="w-full max-w-lg mt-3 flex justify-between items-center text-xs text-muted px-1">
            <span>{t('tenable.found', { n: correctCount })}</span>
            <span>{lives === 1 ? t('tenable.lifeLeft', { n: lives }) : t('tenable.livesLeft', { n: lives })}</span>
          </div>

          {mode === 'unlimited' && (
            <button
              type="button"
              onClick={startUnlimited}
              className="mt-4 w-full max-w-lg border border-border-strong text-muted hover:bg-surface hover:text-secondary text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
            >
              {t('tenable.skip')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowGiveUpConfirm(true)}
            className="mt-4 w-full max-w-lg border border-danger/40 text-danger-bright hover:bg-danger/10 hover:border-danger text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            {t('tenable.giveUp')}
          </button>
        </>
      )}

      {showGiveUpConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-overlay px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-surface border border-border-strong rounded-xl shadow-modal p-5 text-center">
            <p className="text-primary font-bold mb-1">{t('tenable.giveUpTitle')}</p>
            <p className="text-muted text-sm mb-5">{t('tenable.giveUpBody')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowGiveUpConfirm(false)}
                className="flex-1 bg-surface hover:bg-border border border-border-strong text-primary text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmGiveUp}
                className="flex-1 bg-danger-strong hover:bg-danger text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                {t('tenable.giveUpConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlimited: the tower reveals every answer in place — just a replay button. */}
      {mode === 'unlimited' && phase !== 'playing' && (
        <button onClick={startUnlimited} className="mt-2 mb-6 w-full max-w-lg bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors">{t('tenable.newQuestion')}</button>
      )}

      {mode === 'daily' && phase !== 'playing' && !showResult && (
        <button onClick={() => setShowResult(true)} className="mt-2 mb-6 text-sm text-brand-bright hover:text-primary font-medium transition-colors">{t('common.seeResult')}</button>
      )}

      <ResultModal open={showResult && mode === 'daily'} onClose={() => setShowResult(false)}>
        <div className="w-full flex flex-col items-center text-center">
          <GameMotif id="tenable" className={`w-11 h-11 mb-2 ${phase === 'won' ? 'text-accent-bright' : 'text-dim'}`} />
          <h2 className={`score-number text-4xl mb-1 ${phase === 'won' ? 'text-success-bright' : 'text-danger-bright'}`}>
            {phase === 'won' ? t('tenable.pyramidComplete') : gaveUp ? t('tenable.gaveUp') : t('tenable.gameOver')}
          </h2>
          <p className="text-muted text-sm mb-1">
            {phase === 'won'
              ? (lives === 1 ? t('tenable.foundAllLife', { n: lives }) : t('tenable.foundAllLives', { n: lives }))
              : gaveUp ? t('tenable.foundBeforeGaveUp', { n: correctCount }) : t('tenable.foundBeforeLost', { n: correctCount })}
          </p>
        </div>
        {dailyLocked && <p className="text-[0.62rem] font-black tracking-[0.14em] uppercase text-faint mb-1">{t('common.dailyDone')}</p>}
        {mode === 'daily' && <DailyStats game="tenable" stats={dailyStats} />}

        {/* Full answer list, always shown (share is now a single button below). */}
        {resultTab === 'answers' && (
          <div className="w-full rounded-xl border border-border overflow-hidden mb-1">
            <div className="divide-y divide-border/50 max-h-56 overflow-y-auto">
              {question.answers.map(a => (
                <div key={a.rank} className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-muted text-sm font-mono w-5 shrink-0">{a.rank}</span>
                    {question.type === 'club' && <CategoryIcon category={{ type: 'club', value: a.text }} size={20} />}
                    <span className={`text-sm font-medium truncate ${revealed[a.rank] ? 'text-success-bright' : 'text-primary'}`}>{revealed[a.rank] ? '✓ ' : ''}{a.text}</span>
                  </div>
                  <span className="text-muted text-xs shrink-0 ml-2">{a.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <ShareCard card={{
          gameId: 'tenable',
          title: 'Football Tenable',
          challenge: question.title,
          result: phase === 'won' ? t('tenable.pyramidComplete') : gaveUp ? t('tenable.gaveUp') : t('tenable.gameOver'),
          rows: [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]].map(r => r.map(rk => revealed[rk] ? TILE.hit : TILE.miss)),
          matchday: matchdayNumber(),
        }} />
        <button onClick={startUnlimited} className="mt-2 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-6 py-2.5 transition-colors">{t('common.playUnlimited')}</button>
        <UpNext exclude="tenable" />
      </ResultModal>

      {/* Guess history */}
      {history.length > 0 && (
        <div className="w-full max-w-lg mt-2">
          <div className="text-[0.58rem] text-faint uppercase tracking-[0.18em] mb-2 font-black px-1">
            {t('tenable.guesses', { n: history.length })}
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border/40 max-h-56 overflow-y-auto">
              {[...history].reverse().map((g, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${g.correct === true ? 'flash-valid' : g.correct === false ? 'flash-invalid' : ''}`}>
                  <span className="text-sm text-primary truncate">{g.text}</span>
                  {g.correct === true
                    ? <span className="text-success-bright text-xs font-semibold shrink-0">#{g.rank} ✓</span>
                    : g.correct === 'duplicate'
                      ? <span className="text-warn text-xs font-semibold shrink-0">{t('tenable.alreadyFound')}</span>
                      : <span className="text-danger text-xs font-semibold shrink-0">✗</span>}
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