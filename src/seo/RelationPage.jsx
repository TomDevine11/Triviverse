import { useState, useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from './Seo'
import BrandMark from '../components/BrandMark'
import { ShareIcon } from '../components/ShareCard'
import { routeByPath } from './seoConfig'
import { RELATION_BASE, relationBySlug } from './relations.js'
import { buildMatcher, applyGuess, acceptId } from './pairMatch.js'
import { accentVars } from '../design/accents'
import { useI18n } from '../i18n'

// "Players who played for both X and Y" — the interactive game (D3). You get the two
// clubs; name the players who appeared for both. Deterministic canonical-id matching
// (full name → alias → unique surname; ambiguous surname → disambiguation). Correct
// answers lock as chips showing apps + goals at each club. No timer, no fuzzy matching.
//
// The game consumes the qualifying answer set produced by the builder verbatim — QC
// metadata (low-app / CL-only flags) is for us; unusual-looking qualifiers are still
// valid answers and are never hidden from play.
export default function RelationPage() {
  const { slug } = useParams()
  const { lp } = useI18n()
  const p = relationBySlug(slug)
  const path = `${RELATION_BASE}/${slug}`
  const r = routeByPath(path)

  if (!p) return (
    <div className="tv-scene min-h-dvh text-primary flex flex-col items-center justify-center gap-4 px-4 text-center" style={accentVars('careers')}>
      <p className="text-secondary">That trivia page doesn’t exist.</p>
      <Link to={lp(RELATION_BASE)} className="font-bold text-brand-bright">Browse “played for two clubs” trivia →</Link>
    </div>
  )

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('careers')}>
      <Seo path={path} />
      <div className="max-w-2xl mx-auto px-4 pb-20">
        <header className="flex items-center justify-between gap-3 py-3">
          <Link to={lp('/')} className="flex items-center gap-2 text-[0.62rem] sm:text-[0.7rem] font-black tracking-[0.12em] hover:opacity-80 transition-opacity">
            <BrandMark className="w-3.5 h-3.5 text-brand-bright" />
            <span className="text-primary">TRIVIVERSE</span><span className="text-brand-bright">FOOTBALL</span>
          </Link>
          <Link to={lp('/')} className="text-[0.6rem] font-black tracking-[0.12em] text-secondary hover:text-primary transition-colors">ALL GAMES →</Link>
        </header>

        <nav aria-label="Breadcrumb" className="text-[0.62rem] font-bold tracking-[0.1em] text-faint mb-3">
          <Link to={lp('/')} className="hover:text-secondary">TRIVIVERSE</Link> ›{' '}
          <Link to={lp(RELATION_BASE)} className="hover:text-secondary">PLAYED FOR TWO CLUBS</Link> ›{' '}
          <span className="text-secondary">{p.aName.toUpperCase()} & {p.bName.toUpperCase()}</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">{r.h1}</h1>
        <p className="text-secondary text-sm mb-2">{r.tagline}</p>
        <p className="text-muted text-sm leading-relaxed mb-6">{r.about}</p>

        {/* Keyed by slug: switching/reloading pairs remounts the game → guaranteed clean state. */}
        <PairGame key={slug} p={p} path={path} />

        {/* Full qualifying list — always visible, matches the prerendered crawlable HTML. */}
        <section aria-label="Full list of qualifying players" className="mb-8">
          <h2 className="text-lg font-black tracking-tight mb-1">All {p.total} players who have played for both {p.aName} and {p.bName}</h2>
          <p className="text-faint text-xs leading-relaxed mb-3">{p.coverageNote}</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {p.players.map((pl) => (
              <li key={pl.id} className="rounded-xl px-3 py-2 border border-border bg-card/40">
                <span className="font-bold text-sm text-primary">{pl.n}</span>
                <span className="block text-[0.7rem] text-muted leading-tight"><span className="text-secondary">{p.aName}:</span> {pl.a.apps} app{pl.a.apps === 1 ? '' : 's'} · {pl.a.goals} goal{pl.a.goals === 1 ? '' : 's'}</span>
                <span className="block text-[0.7rem] text-muted leading-tight"><span className="text-secondary">{p.bName}:</span> {pl.b.apps} app{pl.b.apps === 1 ? '' : 's'} · {pl.b.goals} goal{pl.b.goals === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="bg-card/40 border border-border rounded-2xl px-4 py-4 sm:px-6 mb-8 text-center">
          <p className="text-secondary text-sm mb-3">Love this? Play the full games built from the same football data.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link to={lp('/football-pointless')} className="rounded-xl border border-brand bg-brand/10 text-brand-bright font-bold text-sm px-4 py-2 hover:bg-brand/20 transition-colors">Play Football Pointless →</Link>
            <Link to={lp('/tenable')} className="rounded-xl border border-border-strong text-secondary font-bold text-sm px-4 py-2 hover:text-primary transition-colors">Football Tenable →</Link>
          </div>
        </div>

        {r.relatedLinks?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-black tracking-tight mb-3">Related football trivia</h2>
            <ul className="flex flex-wrap gap-2">
              {r.relatedLinks.filter((l) => l.path.startsWith(RELATION_BASE + '/')).map((l, i) => (
                <li key={i}><Link to={lp(l.path)} className="text-sm text-brand-bright hover:text-brand border border-border-strong rounded-lg px-2.5 py-1 transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        )}

        <footer className="mt-6 pt-6 border-t border-border flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to={lp(RELATION_BASE)} className="font-bold text-brand-bright hover:text-brand transition-colors">All “played for two clubs” trivia →</Link>
          <Link to={lp('/')} className="font-bold text-secondary hover:text-primary transition-colors">All games</Link>
        </footer>
      </div>
    </div>
  )
}

function PairGame({ p, path }) {
  const matcher = useMemo(() => buildMatcher(p.players), [p])
  const byId = useMemo(() => new Map(p.players.map((pl) => [pl.id, pl])), [p])

  const [found, setFound] = useState([])          // player ids, in the order named
  const [input, setInput] = useState('')
  const [msg, setMsg] = useState(null)            // { tone: 'correct'|'dupe'|'miss', text }
  const [disambig, setDisambig] = useState(null)  // { candidates, raw } | null
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)

  const total = p.total
  const complete = total > 0 && found.length === total
  const over = complete || revealed

  const applyResult = (res) => {
    setFound(res.found)
    if (res.action === 'add') setMsg({ tone: 'correct', text: `✓ ${byId.get(res.id).n}` })
    else if (res.action === 'dupe') setMsg({ tone: 'dupe', text: `You’ve already named ${byId.get(res.id).n}.` })
    else if (res.action === 'ambiguous') { setDisambig({ candidates: res.candidates, raw: input.trim() }); return }
    else if (res.action === 'miss') { setMsg({ tone: 'miss', text: `“${input.trim()}” isn’t one of the answers — try another.` }); return }
    setDisambig(null)
  }

  const submit = (e) => {
    e.preventDefault()
    const res = applyGuess(found, matcher, input)
    if (res.action === 'empty') return
    applyResult(res)
    if (res.action !== 'ambiguous') { setInput(''); inputRef.current?.focus() }
    else setInput('')
  }

  const chooseDisambig = (id) => { applyResult(acceptId(found, id)); setDisambig(null); inputRef.current?.focus() }

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : `https://triviverse.com${path}`
    const line = complete
      ? `⚽ I named all ${total} players who played for both ${p.aName} & ${p.bName}!`
      : `⚽ I named ${found.length}/${total} players who played for both ${p.aName} & ${p.bName}.`
    const text = `${line} Can you? ${url}`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ text, url }) } catch { /* cancelled */ } return
    }
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* blocked */ }
  }

  const pct = total ? Math.round((found.length / total) * 100) : 0
  const foundNewestFirst = [...found].reverse().map((id) => byId.get(id))

  const StatLine = ({ label, apps, goals }) => (
    <span className="block text-[0.7rem] text-muted leading-tight">
      <span className="text-secondary">{label}:</span> {apps} app{apps === 1 ? '' : 's'} · {goals} goal{goals === 1 ? '' : 's'}
    </span>
  )
  const Chip = ({ pl }) => (
    <li className="rounded-xl px-3 py-2 border bg-brand/10 border-border-strong">
      <span className="font-bold text-sm text-primary">{pl.n}</span>
      <StatLine label={p.aName} apps={pl.a.apps} goals={pl.a.goals} />
      <StatLine label={p.bName} apps={pl.b.apps} goals={pl.b.goals} />
    </li>
  )

  return (
    <>
      <section aria-label="Name the players" className="bg-card/40 border border-border rounded-2xl px-4 py-5 sm:px-6 mb-6">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-sm font-bold text-secondary">{complete ? 'Complete!' : over ? 'Gave up' : 'Name the players'}</span>
          <span className="score-number text-lg font-black tv-wordmark">{found.length}<span className="text-muted text-sm font-bold"> / {total}</span></span>
        </div>
        <div className="h-2 rounded-full bg-card border border-border overflow-hidden mb-4" role="progressbar" aria-valuenow={found.length} aria-valuemin={0} aria-valuemax={total}>
          <div className="h-full bg-brand transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>

        {complete && (
          <div className="rounded-xl border border-brand bg-brand/10 text-center px-4 py-3 mb-4">
            <p className="font-black text-brand-bright">🎉 You named all {total}!</p>
          </div>
        )}

        {!over && (
          <form onSubmit={submit} className="flex gap-2 mb-2">
            <label htmlFor="pair-guess" className="sr-only">Type a player’s name</label>
            <input
              id="pair-guess" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Type a player’s name…" autoComplete="off" autoCapitalize="words" spellCheck="false" enterKeyHint="done"
              className="flex-1 min-w-0 rounded-xl bg-card border border-border-strong px-3.5 py-2.5 text-sm text-primary placeholder:text-faint focus:outline-none focus:border-brand"
            />
            <button type="submit" className="rounded-xl border border-brand bg-brand/10 text-brand-bright font-bold text-sm px-4 py-2.5 hover:bg-brand/20 transition-colors shrink-0">Guess</button>
          </form>
        )}

        {disambig && (
          <div className="rounded-xl border border-border-strong bg-card px-3 py-2.5 mb-2" role="group" aria-label="Which player did you mean?">
            <p className="text-xs text-secondary mb-2">More than one “{disambig.raw}” played for both — which one?</p>
            <div className="flex flex-wrap gap-1.5">
              {disambig.candidates.map((c) => (
                <button key={c.id} onClick={() => chooseDisambig(c.id)} className="text-sm rounded-lg border border-border-strong bg-brand/5 px-2.5 py-1 text-primary hover:bg-brand/15 transition-colors">{c.name}</button>
              ))}
              <button onClick={() => setDisambig(null)} className="text-sm rounded-lg border border-border px-2.5 py-1 text-faint hover:text-secondary transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <p aria-live="polite" className={`text-sm min-h-[1.25rem] ${msg?.tone === 'correct' ? 'text-brand-bright' : msg?.tone === 'miss' ? 'text-red-400' : 'text-muted'}`}>
          {msg?.text || ''}
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          {!over && (
            <button onClick={() => setRevealed(true)} className="rounded-xl border border-border-strong text-secondary font-bold text-sm px-4 py-2 hover:text-primary transition-colors">Give up</button>
          )}
          {(over || found.length > 0) && (
            <button onClick={share} className="flex items-center gap-2 rounded-xl border border-brand bg-brand/10 text-brand-bright font-bold text-sm px-4 py-2 hover:bg-brand/20 transition-colors">
              <ShareIcon /> {copied ? 'Copied!' : 'Share result'}
            </button>
          )}
        </div>
        {revealed && !complete && (
          <p className="text-muted text-sm mt-2">You gave up — the full list of all {total} is below ↓</p>
        )}
      </section>

      {found.length > 0 && (
        <section aria-label="Players you named" className="mb-6">
          <h2 className="text-[0.62rem] font-black tracking-[0.14em] text-brand-bright mb-2">
            {over ? `YOU NAMED ${found.length} OF ${total}` : `NAMED · ${found.length}`}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(over ? found.map((id) => byId.get(id)) : foundNewestFirst).map((pl) => <Chip key={pl.id} pl={pl} />)}
          </ul>
        </section>
      )}
    </>
  )
}
