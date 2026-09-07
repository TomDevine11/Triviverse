import { Link } from 'react-router-dom'
import Seo from './Seo'
import BrandMark from '../components/BrandMark'
import { routeByPath } from './seoConfig'
import { RELATION_BASE, RELATION_PAGES } from './relations.js'
import { accentVars } from '../design/accents'
import { useI18n } from '../i18n'

// Hub for the "players who played for both X and Y" family — every pair reachable,
// so no page is orphaned, and the whole cluster is crawlable from one place.
export default function RelationHubPage() {
  const { lp } = useI18n()
  const r = routeByPath(RELATION_BASE)
  const pairs = [...RELATION_PAGES].sort((a, b) => b.famous - a.famous || a.aName.localeCompare(b.aName))
  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('careers')}>
      <Seo path={RELATION_BASE} />
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <header className="flex items-center justify-between gap-3 py-3">
          <Link to={lp('/')} className="flex items-center gap-2 text-[0.62rem] sm:text-[0.7rem] font-black tracking-[0.12em] hover:opacity-80 transition-opacity">
            <BrandMark className="w-3.5 h-3.5 text-brand-bright" />
            <span className="text-primary">TRIVIVERSE</span><span className="text-brand-bright">FOOTBALL</span>
          </Link>
          <Link to={lp('/')} className="text-[0.6rem] font-black tracking-[0.12em] text-secondary hover:text-primary transition-colors">ALL GAMES →</Link>
        </header>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 mb-2">{r.h1}</h1>
        <p className="text-secondary text-sm mb-1">{r.tagline}</p>
        <p className="text-muted text-sm leading-relaxed mb-6">{r.about}</p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pairs.map((p) => (
            <li key={p.slug}>
              <Link to={lp(`${RELATION_BASE}/${p.slug}`)} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/40 px-3.5 py-2.5 hover:border-border-strong transition-colors">
                <span className="text-sm font-medium text-primary">{p.aName} &amp; {p.bName}</span>
                <span className="text-[0.62rem] font-bold tabular-nums text-faint shrink-0">{p.total} players</span>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-8 pt-6 border-t border-border flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to={lp('/football-pointless')} className="font-bold text-brand-bright hover:text-brand transition-colors">Play Football Pointless →</Link>
          <Link to={lp('/')} className="font-bold text-secondary hover:text-primary transition-colors">All games</Link>
        </footer>
      </div>
    </div>
  )
}
