import { Link } from 'react-router-dom'
import Seo from './Seo'
import BrandMark from '../components/BrandMark'
import { routeByPath } from './seoConfig'
import { accentVars } from '../design/accents'
import { useI18n } from '../i18n'
import EnglandQuiz from '../games/themed/EnglandQuiz'

// A generated, data-derived SEO landing page that IS a playable game: land from
// "england football quiz", play immediately. The crawlable copy comes from the
// route config (about/FAQ) + the player list baked by the prerender; the
// interactive quiz hydrates on top.
export default function ThemedEnglandPage({ path }) {
  const { locale, lp } = useI18n()
  const r = routeByPath(path, locale)
  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('careers')}>
      <Seo path={path} />
      <div className="max-w-2xl mx-auto px-4 pb-20">
        <header className="flex items-center justify-between gap-3 py-3">
          <Link to={lp('/')} className="flex items-center gap-2 text-[0.62rem] sm:text-[0.7rem] font-black tracking-[0.12em] hover:opacity-80 transition-opacity">
            <BrandMark className="w-3.5 h-3.5 text-brand-bright" />
            <span className="text-primary">TRIVIVERSE</span>
            <span className="text-brand-bright">FOOTBALL</span>
          </Link>
          <Link to={lp('/')} className="text-[0.6rem] font-black tracking-[0.12em] text-secondary hover:text-primary transition-colors">ALL GAMES →</Link>
        </header>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-4 mb-2">{r.h1}</h1>
        {r.tagline && <p className="text-secondary text-sm mb-3">{r.tagline}</p>}
        {r.about && <p className="text-muted text-sm leading-relaxed mb-6">{r.about}</p>}

        <div className="bg-card/40 border border-border rounded-2xl px-4 py-5 sm:px-6 mb-8">
          <EnglandQuiz />
        </div>

        {r.faq?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-black tracking-tight mb-3">FAQ</h2>
            <dl className="space-y-3">
              {r.faq.map((f, i) => (
                <div key={i}>
                  <dt className="text-primary text-sm font-medium">{f.q}</dt>
                  <dd className="text-muted text-sm mt-0.5">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <footer className="mt-6 pt-6 border-t border-border flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to={lp('/career-path')} className="font-bold text-brand-bright hover:text-brand transition-colors">More: Guess the Footballer by Career Path →</Link>
          <Link to={lp('/')} className="font-bold text-secondary hover:text-primary transition-colors">All games</Link>
        </footer>
      </div>
    </div>
  )
}
