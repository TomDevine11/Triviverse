import { useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from './Seo'
import BrandMark from '../components/BrandMark'
import { routeByPath } from './seoConfig'
import { accentVars } from '../design/accents'
import { useI18n } from '../i18n'
import { ANSWER_GAMES, buildArchive } from './archiveData'

// Renders one day's answer, by game kind. One-liners for word/player games;
// a numbered list for Tenable; the four solved groups for Connections.
function AnswerBody({ kind, answer }) {
  if (kind === 'word') {
    return (
      <span className="text-primary font-bold">
        {answer.primary}
        {answer.secondary && <span className="text-muted font-medium"> — {answer.secondary} {answer.flag}</span>}
      </span>
    )
  }
  if (kind === 'player') {
    return <span className="text-primary font-bold">{answer.primary}</span>
  }
  if (kind === 'list') {
    return (
      <div>
        <div className="text-primary font-bold mb-2">{answer.primary}</div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 list-decimal list-inside text-sm text-secondary marker:text-accent-bright">
          {answer.list.map((a, i) => (
            <li key={i}>{a.text}{a.detail && <span className="text-faint"> · {a.detail}</span>}</li>
          ))}
        </ol>
      </div>
    )
  }
  if (kind === 'groups') {
    return (
      <div className="space-y-2">
        {answer.groups.map((g, i) => (
          <div key={i}>
            <div className="text-[0.6rem] font-black tracking-[0.14em] text-accent-bright uppercase">{g.label}</div>
            <div className="text-sm text-primary font-medium">{g.players.join(', ')}</div>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function AnswersPage({ path, gamePath }) {
  const { locale, lp } = useI18n()
  const route = routeByPath(path, locale)
  const game = routeByPath(gamePath, locale)
  const { accent } = ANSWER_GAMES[gamePath] || {}
  const { today, past, kind } = buildArchive(gamePath)
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars(accent)}>
      <Seo path={path} />
      <div className="max-w-2xl mx-auto px-4 pb-20">

        {/* chrome */}
        <header className="flex items-center justify-between gap-3 py-3">
          <Link to={lp('/')} className="flex items-center gap-2 text-[0.62rem] sm:text-[0.7rem] font-black tracking-[0.12em] hover:opacity-80 transition-opacity">
            <BrandMark className="w-3.5 h-3.5 text-brand-bright" />
            <span className="text-primary">TRIVIVERSE</span>
            <span className="text-brand-bright">FOOTBALL</span>
          </Link>
          <Link to={lp(gamePath)} className="text-[0.6rem] font-black tracking-[0.12em] text-accent-bright border border-accent/40 rounded-full px-3 py-1 hover:border-accent transition-colors">
            PLAY {game.name.replace(/^Football /, '').toUpperCase()} →
          </Link>
        </header>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-4 mb-2">{route.h1}</h1>
        {route.tagline && <p className="text-secondary text-sm mb-3">{route.tagline}</p>}
        {route.about && <p className="text-muted text-sm leading-relaxed mb-6">{route.about}</p>}

        {/* Today — spoiler-gated so the archive never ruins the live daily */}
        {today && (
          <div className="bg-card border border-border-strong border-l-4 border-l-accent rounded-xl px-4 py-3 mb-8">
            <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright uppercase mb-1">
              Today · Matchday {today.matchday} · {today.date}
            </div>
            {revealed ? (
              <div className="mt-1"><AnswerBody kind={kind} answer={today.answer} /></div>
            ) : (
              <button
                onClick={() => setRevealed(true)}
                className="mt-1 text-sm font-bold text-brand-bright underline underline-offset-2 hover:text-brand transition-colors"
              >
                Reveal today’s answer (spoiler) →
              </button>
            )}
            <div className="mt-3">
              <Link to={lp(gamePath)} className="inline-block bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-5 py-2 transition-colors">
                Play today’s {game.name} instead →
              </Link>
            </div>
          </div>
        )}

        {/* Past answers — the crawlable, growing archive */}
        <h2 className="text-lg font-black tracking-tight mb-3">Past answers</h2>
        <ul className="space-y-3">
          {past.map((e) => (
            <li key={e.dayIndex} className="bg-surface border border-border rounded-xl px-4 py-3">
              <div className="text-[0.58rem] font-black tracking-[0.14em] text-faint uppercase mb-1.5">
                Matchday {e.matchday} · {e.date}
              </div>
              <AnswerBody kind={kind} answer={e.answer} />
            </li>
          ))}
        </ul>

        <footer className="mt-10 pt-6 border-t border-border flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to={lp(gamePath)} className="font-bold text-brand-bright hover:text-brand transition-colors">← Play {game.name}</Link>
          <Link to={lp('/')} className="font-bold text-secondary hover:text-primary transition-colors">All games</Link>
        </footer>
      </div>
    </div>
  )
}
