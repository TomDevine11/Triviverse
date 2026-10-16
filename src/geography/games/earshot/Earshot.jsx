import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CLIPS, MAX_TRIES, SKIP, clipById, dailyClip, puzzleNumber, evaluateRound, roundPoints, unlimitedAt,
  shareLine, formatSeconds, stageSeconds,
} from '../../data/earshot'
import { languageById, familyName } from '../../data/languages'
import { loadProgress, saveProgress, loadStats, recordResult } from '../../data/progress'
import { geoDay } from '../../data/day'
import { SITE_URL } from '../../seo'
import { GeoChrome, ModeToggle, ResultModal, ShareButton, StatsBlock, Flag, SECONDARY_BTN } from '../../components/ui'
import { useCountdown } from '../../components/hooks'
import GeoMotif from '../../components/GeoMotif'
import { geoAccentVars } from '../../games'
import { t } from '../../strings'
import { useClipAudio } from './useClipAudio'
import Player from './Player'
import LanguageInput from './LanguageInput'
import '../../geography.css'

// Earshot — hear a real person speaking, name the language.
//
// One recording per puzzle. Guess 1 hears its first 1.5 s; each wrong guess or skip
// unlocks a longer stretch of the same recording (stages on the clip), up to the
// whole clip on guess 6. A wrong guess from the right language family shows amber.
// Daily: one clip per UK day for everyone. Unlimited: clip after clip with a session
// score and streak, today's daily held back. The two keep separate saved state.

const GAME = 'earshot'
const ROUTE = '/geography/earshot'
const MODE_KEY = 'tvg-earshot-mode'
const UNLIMITED_KEY = 'tvg-earshot-unlimited-v1'

const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* unavailable */ } }
const NONE = []
const okGuess = (g) => g === SKIP || !!languageById(g)
const cleanGuesses = (g) => (Array.isArray(g) ? g.filter(okGuess).slice(0, MAX_TRIES) : [])

// Unlimited: { seed, ex: [today's daily id at start], idx: queue position,
//              cur: { id, g } | null (the round on screen), rounds: [{ id, g }] finished }.
function freshSession() {
  return { seed: Math.floor(Math.random() * 2 ** 31), ex: [dailyClip().id], idx: 0, cur: null, rounds: [] }
}
function readSession() {
  const s = readJson(UNLIMITED_KEY)
  if (!s || !Number.isInteger(s.seed) || !Array.isArray(s.ex) || !Number.isInteger(s.idx) || !Array.isArray(s.rounds)) return freshSession()
  const rounds = s.rounds.filter(r => r && clipById(r.id)).map(r => ({ id: r.id, g: cleanGuesses(r.g) }))
  const cur = s.cur && clipById(s.cur.id) ? { id: s.cur.id, g: cleanGuesses(s.cur.g) } : null
  return { seed: s.seed, ex: s.ex.filter(id => typeof id === 'string'), idx: Math.max(0, s.idx), cur, rounds }
}
// The clip a session is on: its live round, else the next in its queue — skipping
// today's daily if the day turned over since the session began.
function sessionClip(s, todayId) {
  if (s.cur) return { clip: clipById(s.cur.id), idx: s.idx }
  let idx = s.idx
  let clip = unlimitedAt(s.seed, idx, s.ex)
  for (let n = 0; clip.id === todayId && n < 3; n++) clip = unlimitedAt(s.seed, ++idx, s.ex)
  return { clip, idx }
}

function sessionStats(rounds) {
  let score = 0, streak = 0, best = 0
  for (const r of rounds) {
    const ev = evaluateRound(clipById(r.id), r.g)
    score += roundPoints(ev)
    streak = ev.won ? streak + 1 : 0
    best = Math.max(best, streak)
  }
  return { score, streak, best, played: rounds.length }
}


const ROW_STYLE = {
  correct: 'border-success/60 bg-success/10',
  close: 'border-[#facc15]/50 bg-[#facc15]/[0.07]',
  wrong: 'border-danger/35 bg-danger/[0.06]',
  skip: 'border-border bg-canvas/40',
}
const ROW_MARK = {
  correct: <span className="w-6 h-6 rounded-full bg-success-strong text-white flex items-center justify-center text-[0.8rem] font-black">✓</span>,
  close: <span className="w-6 h-6 rounded-full bg-[#facc15] text-[#422006] flex items-center justify-center text-[0.8rem] font-black">≈</span>,
  wrong: <span className="w-6 h-6 rounded-full bg-danger/80 text-white flex items-center justify-center text-[0.75rem] font-black">✕</span>,
  skip: <span className="w-6 h-6 rounded-full border border-border-strong text-muted flex items-center justify-center text-[0.7rem] font-black">»</span>,
}

function GuessRows({ rows, clip, live }) {
  return (
    <ol className="m-0 p-0 list-none flex flex-col gap-1.5" aria-label={t('earshot.guesses')}>
      {Array.from({ length: MAX_TRIES }, (_, i) => {
        const r = rows[i]
        if (!r) {
          return (
            <li key={i} className={`h-10 rounded-lg border border-dashed flex items-center px-3 text-[0.7rem] font-bold tabular-nums ${i === rows.length && live ? 'border-[color-mix(in_srgb,var(--accent)_45%,transparent)] text-accent-bright' : 'border-border text-faint'}`}>
              {i + 1}<span className="ml-auto">{formatSeconds(clip.stages[i])}</span>
            </li>
          )
        }
        const note = r.kind === 'skip' ? t('earshot.skipped') : r.kind === 'close' ? t('earshot.close', { fam: familyName(r.lang.fam) }) : r.kind === 'correct' ? t('earshot.correct') : t('earshot.wrong')
        return (
          <li key={i} className={`es-row h-10 rounded-lg border flex items-center gap-2.5 px-2 ${ROW_STYLE[r.kind]}`}>
            {ROW_MARK[r.kind]}
            <span className={`min-w-0 truncate text-[0.88rem] font-bold ${r.kind === 'skip' ? 'text-muted' : 'text-primary'}`}>{r.kind === 'skip' ? '—' : r.lang.name}</span>
            <span className={`ml-auto shrink-0 text-[0.68rem] font-bold ${r.kind === 'close' ? 'text-[#fde047]' : r.kind === 'correct' ? 'text-success-bright' : 'text-muted'}`}>{note}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Reveal({ clip, ev, mode, children }) {
  const l = ev.answer
  return (
    <section className="es-reveal rounded-2xl border border-border-strong bg-card p-4 sm:p-5" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[0.6rem] font-black tracking-[0.18em] uppercase text-muted">{t('earshot.itWas')}</div>
          <div className="mt-1 text-[2rem] sm:text-[2.4rem] font-extrabold leading-none text-primary break-words">{l.end}</div>
          <div className="mt-1.5 text-[0.95rem] font-bold text-secondary">
            {l.name}{clip.variety && <span className="text-muted font-semibold"> · {clip.variety}</span>}
          </div>
        </div>
        <div className={`shrink-0 text-right ${ev.won ? 'text-success-bright' : 'text-muted'}`}>
          <div className="score-number text-[1.7rem] leading-none tabular-nums">{ev.won ? `${ev.tries}/${MAX_TRIES}` : `X/${MAX_TRIES}`}</div>
          {mode === 'unlimited' && <div className="mt-1 text-[0.68rem] font-black tracking-[0.08em] uppercase">{ev.won ? t('earshot.points', { n: roundPoints(ev) }) : t('earshot.noPoints')}</div>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="px-2 py-0.5 rounded-md border border-border-strong text-[0.66rem] font-black tracking-[0.1em] uppercase text-accent-bright">{familyName(l.fam)}</span>
        {l.cc.length ? (
          <span className="flex items-center gap-1.5" aria-label={t('earshot.spokenIn')} title={t('earshot.spokenIn')}>
            {l.cc.slice(0, 6).map(c => <Flag key={c} code={c} className="w-5 h-[0.94rem]" />)}
          </span>
        ) : <span className="text-[0.7rem] text-muted">{t('earshot.noCountry')}</span>}
      </div>
      {l.fact && <p className="m-0 mt-3 text-[0.86rem] leading-relaxed text-secondary">{l.fact}</p>}

      <p className="m-0 mt-3 text-[0.68rem] leading-snug text-faint">
        <span className="font-bold text-muted">{clip.kind === 'read' ? t('earshot.read') : t('earshot.conversation')}</span>
        {' · '}{clip.credit.collection}{' · '}
        <a href={clip.credit.source} target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong hover:text-secondary">{clip.credit.title}</a>
        {' · '}
        {clip.credit.licenceUrl ? <a href={clip.credit.licenceUrl} target="_blank" rel="noopener noreferrer license" className="underline decoration-border-strong hover:text-secondary">{clip.credit.licence}</a> : clip.credit.licence}
      </p>
      {children}
    </section>
  )
}

function Credits({ open, onClose }) {
  const list = useMemo(() => [...CLIPS].sort((a, b) => languageById(a.lang).name.localeCompare(languageById(b.lang).name)), [])
  return (
    <ResultModal open={open} onClose={onClose}>
      <div className="w-full text-left">
        <h2 className="m-0 text-[1.1rem] font-extrabold text-primary">{t('earshot.creditsTitle')}</h2>
        <p className="m-0 mt-2 text-[0.75rem] leading-relaxed text-muted">{t('earshot.creditsIntro')}</p>
        <ul className="m-0 mt-3 p-0 list-none flex flex-col divide-y divide-border max-h-[60vh] overflow-y-auto overscroll-contain">
          {list.map(c => (
            <li key={c.id} className="py-2 text-[0.72rem] leading-snug">
              <span className="font-bold text-primary">{languageById(c.lang).name}</span>
              {c.variety && <span className="text-muted"> · {c.variety}</span>}
              <span className="block text-muted">
                <a href={c.credit.source} target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong hover:text-secondary">{c.credit.title}</a>
                {' · '}{c.credit.author}{' · '}
                {c.credit.licenceUrl ? <a href={c.credit.licenceUrl} target="_blank" rel="noopener noreferrer license" className="underline decoration-border-strong hover:text-secondary">{c.credit.licence}</a> : c.credit.licence}
                {' · '}{c.credit.excerpt}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ResultModal>
  )
}

export default function Earshot() {
  if (!CLIPS.length) {
    return <div className="tv-scene min-h-dvh flex items-center justify-center text-muted text-sm p-6">{t('earshot.error')}</div>
  }
  return <EarshotGame />
}

function EarshotGame() {
  const [day, setDay] = useState(geoDay)
  const today = useMemo(() => dailyClip(day), [day])
  const [mode, setMode] = useState(() => { const m = readJson(MODE_KEY); return m === 'unlimited' ? m : 'daily' })
  const [dailyGuesses, setDailyGuesses] = useState(() => cleanGuesses(loadProgress(GAME, today.id)?.g))
  const [session, setSession] = useState(readSession)
  const [fresh, setFresh] = useState(false) // a round finished on this visit
  const [showResult, setShowResult] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const countdown = useCountdown()

  useEffect(() => { writeJson(MODE_KEY, mode) }, [mode])
  useEffect(() => { writeJson(UNLIMITED_KEY, session) }, [session])

  // Day rollover while the page is open: move to the new daily, exactly as a refresh
  // would (yesterday's saved round no longer loads once the UK day has turned).
  useEffect(() => {
    const check = () => {
      const d = geoDay()
      if (d === day) return
      setDay(d)
      setDailyGuesses(cleanGuesses(loadProgress(GAME, dailyClip(d).id)?.g))
      setShowResult(false)
    }
    const id = setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', check) }
  }, [day])

  const isDaily = mode !== 'unlimited'
  const { clip: uClip, idx: uIdx } = sessionClip(session, today.id)
  const clip = isDaily ? today : uClip
  const guesses = useMemo(() => (isDaily ? dailyGuesses : session.cur?.g || NONE), [isDaily, dailyGuesses, session.cur])
  const ev = evaluateRound(clip, guesses)
  const audio = useClipAudio(clip.src)
  const stats = useMemo(() => loadStats(GAME, MAX_TRIES), [dailyGuesses.length, day]) // eslint-disable-line react-hooks/exhaustive-deps
  const sStats = useMemo(() => sessionStats(session.rounds), [session.rounds])
  const dailyEv = evaluateRound(today, dailyGuesses)

  // Stop the clip when switching puzzle or mode.
  const { pause } = audio
  useEffect(() => () => pause(), [clip.id, pause])

  // A finished daily opens on its result card once per visit.
  const [autoOpened, setAutoOpened] = useState(false)
  if (isDaily && dailyEv.done && !autoOpened && !fresh) { setAutoOpened(true); setShowResult(true) }

  const guess = useCallback((id) => {
    if (ev.done) return
    const next = [...guesses, id]
    const after = evaluateRound(clip, next)
    if (isDaily) {
      setDailyGuesses(next)
      saveProgress(GAME, { g: next }, after.done, clip.id)
      if (after.done) recordResult(GAME, after.won, after.tries, MAX_TRIES, day)
    } else {
      setSession(s => ({ ...s, idx: uIdx, cur: { id: clip.id, g: next } }))
    }
    if (after.done) {
      setFresh(true)
      if (isDaily) setTimeout(() => { setAutoOpened(true); setShowResult(true) }, 1400)
    } else if (audio.status !== 'error') {
      // the newly unlocked stretch plays straight away (this is a user gesture)
      audio.play(stageSeconds(clip, after.tries))
    }
  }, [ev.done, guesses, clip, isDaily, day, uIdx, audio])

  const nextRound = () => {
    setFresh(false)
    setSession(s => ({ ...s, rounds: s.cur ? [...s.rounds, s.cur] : s.rounds, cur: null, idx: uIdx + 1 }))
  }
  const pickMode = (m) => { setMode(m); setFresh(false); setShowResult(false); setConfirmNew(false) }
  const newSession = () => {
    if (!confirmNew && (session.rounds.length || session.cur)) { setConfirmNew(true); return }
    setSession(freshSession()); setFresh(false); setConfirmNew(false)
  }

  // Space plays/stops from anywhere except while typing or on a button.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== ' ' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A' || e.target?.isContentEditable) return
      if (showResult || showCredits) return
      e.preventDefault()
      if (audio.status === 'playing') audio.pause()
      else if (audio.status === 'ready') audio.play(ev.seconds)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [audio, ev.seconds, showResult, showCredits])

  const shareText = [
    `🔊 Earshot #${puzzleNumber(day)} · ${dailyEv.won ? dailyEv.tries : 'X'}/${MAX_TRIES}`,
    `${shareLine(dailyEv)}${dailyEv.won ? ` · ${formatSeconds(dailyEv.heard)}` : ''}`,
    `${SITE_URL}${ROUTE}`,
  ].join('\n')
  const guessed = useMemo(() => new Set(guesses.filter(g => g !== SKIP)), [guesses])
  const nextStage = ev.tries < MAX_TRIES - 1 ? clip.stages[ev.tries + 1] : null

  return (
    <div className="tv-scene min-h-dvh flex flex-col text-primary" style={geoAccentVars(GAME)}>
      <div className="w-full max-w-[42rem] mx-auto px-3 sm:px-5 flex-1 flex flex-col">
        <GeoChrome gameId={GAME} title="EARSHOT" howTo={{ n: MAX_TRIES, first: String(clip.stages[0]) }} right={<span className="tabular-nums">{isDaily ? `#${puzzleNumber(day)}` : '∞'}</span>} />

        <main className="flex-1 flex flex-col gap-3 pb-4">
          <h1 className="sr-only">Earshot — guess the language from a voice</h1>

          {/* mode + status */}
          <div className="flex items-center justify-between gap-3 min-h-9">
            <ModeToggle mode={isDaily ? 'daily' : 'unlimited'} onChange={pickMode} />
            {isDaily ? (
              <span className="text-[0.66rem] font-black tracking-[0.14em] uppercase text-muted">{ev.done ? t('earshot.nextIn') : t('earshot.guessN', { n: Math.min(ev.tries + 1, MAX_TRIES), max: MAX_TRIES })}{ev.done && <b className="ml-1.5 text-primary tabular-nums tracking-normal">{countdown}</b>}</span>
            ) : (
              <div className="flex items-center gap-2.5 text-[0.7rem] text-muted">
                <span className="hidden min-[380px]:inline"><b className="score-number font-normal text-[1.05rem] text-primary tabular-nums">{sStats.score}</b> {t('earshot.score')}</span>
                <span><b className="text-secondary tabular-nums">{sStats.played}</b> {t('earshot.rounds')}</span>
                <span className="text-warn font-black tabular-nums" title={t('earshot.streakShort')}>🔥 {sStats.streak}</span>
                <button type="button" onClick={newSession} onBlur={() => setConfirmNew(false)}
                  className={`h-7 px-2.5 rounded-md text-[0.66rem] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright ${confirmNew ? 'bg-danger/15 border border-danger/50 text-danger-bright' : 'text-muted hover:text-primary border border-border'}`}>
                  {confirmNew ? t('earshot.newConfirm') : t('earshot.newSession')}
                </button>
              </div>
            )}
          </div>

          <div key={`${mode}:${clip.id}`} className="es-round flex flex-col gap-3">
            <Player clip={clip} audio={audio} tries={ev.tries} done={ev.done} rows={ev.rows} />

            {ev.done && (
              <Reveal clip={clip} ev={ev} mode={isDaily ? 'daily' : 'unlimited'}>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  {isDaily ? (
                    <>
                      <button type="button" onClick={() => setShowResult(true)} className="flex-1 h-11 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors">{t('earshot.seeResult')}</button>
                      <button type="button" onClick={() => pickMode('unlimited')} className={`flex-1 ${SECONDARY_BTN.replace('mt-2 w-full ', '')}`}>{t('earshot.playUnlimited')}</button>
                    </>
                  ) : (
                    <button type="button" onClick={nextRound} autoFocus={fresh} className="flex-1 h-12 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright">{t('earshot.nextClip')}</button>
                  )}
                </div>
              </Reveal>
            )}

            {!ev.done && (
              <div className="flex flex-col gap-2">
                <LanguageInput onGuess={guess} guessed={guessed} />
                <div className="flex items-center justify-between gap-3 min-h-8">
                  <span className="text-[0.72rem] text-muted">{nextStage ? t('earshot.nextUnlock', { s: formatSeconds(nextStage) }) : t('earshot.lastChance')}</span>
                  <button type="button" onClick={() => guess(SKIP)}
                    aria-label={nextStage ? t('earshot.skipAria', { s: formatSeconds(nextStage) }) : t('earshot.giveUp')}
                    className="shrink-0 h-8 px-3 rounded-lg border border-border-strong text-[0.72rem] font-black tracking-[0.04em] text-secondary hover:text-primary hover:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
                    {nextStage ? t('earshot.skip', { s: formatSeconds(nextStage - clip.stages[ev.tries]) }) : t('earshot.giveUp')}
                  </button>
                </div>
              </div>
            )}

            <GuessRows rows={ev.rows} clip={clip} live={!ev.done} />
          </div>

          <p className="m-0 mt-1 text-center">
            <button type="button" onClick={() => setShowCredits(true)} className="text-[0.72rem] font-bold text-muted hover:text-secondary underline decoration-border-strong underline-offset-2">{t('earshot.credits')}</button>
          </p>
        </main>
      </div>


      <ResultModal open={showResult && isDaily && dailyEv.done} onClose={() => setShowResult(false)}>
        <div className="w-full flex flex-col items-center text-center">
          <GeoMotif id={GAME} className={`w-10 h-10 mb-1.5 ${dailyEv.won ? 'text-accent-bright' : 'text-dim'}`} />
          <h2 className={`score-number text-4xl m-0 ${dailyEv.won ? 'text-success-bright' : 'text-primary'}`}>{dailyEv.won ? t('earshot.won') : t('earshot.lost')}</h2>
          <div className="mt-2 text-[0.6rem] font-black tracking-[0.18em] uppercase text-muted">{t('earshot.itWas')}</div>
          <div className="text-[1.6rem] font-extrabold leading-tight text-primary">{dailyEv.answer.end}</div>
          <div className="text-[0.85rem] font-bold text-secondary">{dailyEv.answer.name}{today.variety ? ` · ${today.variety}` : ''}</div>
          <div className="mt-3 text-[1.35rem] tracking-[0.12em]" aria-hidden="true">{shareLine(dailyEv)}</div>
          <p className="m-0 mt-1 text-[0.75rem] text-muted">{dailyEv.won ? t('earshot.solvedIn', { n: dailyEv.tries, max: MAX_TRIES, s: formatSeconds(dailyEv.heard) }) : t('earshot.notSolved', { max: MAX_TRIES })}</p>
          <StatsBlock stats={stats} last={dailyEv.won ? dailyEv.tries : null} labels={['1', '2', '3', '4', '5', '6']} />
          <div className="w-full mt-4 text-[0.72rem] text-muted">{t('earshot.nextIn')} <b className="text-primary tabular-nums">{countdown}</b></div>
          <ShareButton text={shareText} primary />
          <button type="button" onClick={() => pickMode('unlimited')} className={SECONDARY_BTN}>{t('earshot.playUnlimited')}</button>
          <Link to="/geography" className="mt-3 text-[0.78rem] font-bold text-brand-bright hover:text-brand">{t('borderline.allGames')} →</Link>
        </div>
      </ResultModal>

      <Credits open={showCredits} onClose={() => setShowCredits(false)} />
    </div>
  )
}
