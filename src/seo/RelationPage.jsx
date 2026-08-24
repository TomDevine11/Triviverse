import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from './Seo'
import BrandMark from '../components/BrandMark'
import { routeByPath } from './seoConfig'
import { RELATION_BASE, relationBySlug } from './relations.js'
import { accentVars } from '../design/accents'
import { useI18n } from '../i18n'

// "Players who played for both X and Y" — a data-derived football-trivia page.
// Land from search, try to name the players, reveal the complete list, then play a
// full game. The crawlable list + metadata come from the route config (baked by the
// prerender); this hydrates the interactive "how many can you name?" experience.
export default function RelationPage() {
  const { slug } = useParams()
  const { lp } = useI18n()
  const p = relationBySlug(slug)
  const path = `${RELATION_BASE}/${slug}`
  const r = routeByPath(path)
  const [revealed, setRevealed] = useState(false)

  if (!p) return (
    <div className="tv-scene min-h-dvh text-primary flex flex-col items-center justify-center gap-4 px-4 text-center" style={accentVars('careers')}>
      <p className="text-secondary">That trivia page doesn’t exist.</p>
      <Link to={lp(RELATION_BASE)} className="font-bold text-brand-bright">Browse “played for two clubs” trivia →</Link>
    </div>
  )

  const famous = p.players.filter(x => x.s)
  const rest = p.players.filter(x => !x.s)
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
        <p className="text-secondary text-sm mb-1">{r.tagline}</p>
        <p className="text-muted text-sm leading-relaxed mb-6">{r.about}</p>

        <div className="bg-card/40 border border-border rounded-2xl px-4 py-5 sm:px-6 mb-6 text-center">
          <div className="score-number text-4xl font-black tv-wordmark leading-none">{p.total}</div>
          <div className="text-secondary text-sm mt-1 mb-4">players have played for both {p.aName} and {p.bName}</div>
          {!revealed
            ? <button onClick={() => setRevealed(true)} className="rounded-xl border border-brand bg-brand/10 text-brand-bright font-bold text-sm px-5 py-2 hover:bg-brand/20 transition-colors">How many can you name? Reveal the list →</button>
            : (
              <div className="text-left">
                {famous.length > 0 && <>
                  <h2 className="text-[0.62rem] font-black tracking-[0.14em] text-brand-bright mb-2">BEST KNOWN</h2>
                  <ul className="flex flex-wrap gap-1.5 mb-4">{famous.map((x, i) => <li key={i} className="text-sm bg-brand/10 border border-border-strong rounded-lg px-2.5 py-1">{x.n}</li>)}</ul>
                </>}
                {rest.length > 0 && <>
                  <h2 className="text-[0.62rem] font-black tracking-[0.14em] text-faint mb-2">DEEPER CUTS</h2>
                  <ul className="flex flex-wrap gap-1.5">{rest.map((x, i) => <li key={i} className="text-sm bg-card border border-border rounded-lg px-2.5 py-1 text-secondary">{x.n}</li>)}</ul>
                </>}
              </div>
            )}
        </div>

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
              {r.relatedLinks.filter(l => l.path.startsWith(RELATION_BASE + '/')).map((l, i) => (
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
