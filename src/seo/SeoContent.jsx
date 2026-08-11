import { Link } from 'react-router-dom'
import { routeByPath, indexableRoutes } from './seoConfig'
import { useI18n } from '../i18n'

// Visible, crawlable on-page content for a game route (localized): the page's
// single <h1>, a "How to play" section and an FAQ (which also powers the FAQ
// structured data), plus internal links to the other games. Rendered live in the
// app and mirrored by the prerender for crawlers. Styled with design-system
// tokens (design-tokens.md), not raw Tailwind palette, so it matches the app.
// The "More games" links use each destination's football-qualified <h1> as
// anchor text — anchor text is a ranking signal, so it must carry football
// intent (e.g. "Guess the Footballer by Career Path", not "Career Path").
export default function SeoContent({ path }) {
  const { locale, t, lp } = useI18n()
  const r = routeByPath(path, locale)
  const others = indexableRoutes().filter(o => o.path !== path && o.path !== '/' && !o.hideFromNav)

  return (
    <section className="w-full max-w-lg mx-auto mt-12 mb-4 text-left border-t border-border pt-8">
      <h1 className="text-2xl font-bold text-primary mb-1">{r.h1}</h1>
      <p className="text-secondary text-sm mb-3">{r.tagline}</p>
      {r.about && <p className="text-muted text-sm leading-relaxed mb-6">{r.about}</p>}

      {r.sections?.map((s, i) => (
        <div key={i} className="mb-6">
          <h2 className="text-primary font-semibold text-base mb-2">{s.h2}</h2>
          {s.body.map((p, j) => (
            <p key={j} className="text-muted text-sm leading-relaxed mb-2 last:mb-0">{p}</p>
          ))}
        </div>
      ))}

      {r.howTo?.length > 0 && (
        <>
          <h2 className="text-primary font-semibold text-base mb-2">{t('common.howToPlay', { name: r.name })}</h2>
          <ol className="list-decimal list-inside space-y-1 text-secondary text-sm mb-6">
            {r.howTo.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </>
      )}

      {r.faq?.length > 0 && (
        <>
          <h2 className="text-primary font-semibold text-base mb-2">{t('common.faq')}</h2>
          <dl className="space-y-3 mb-6">
            {r.faq.map((f, i) => (
              <div key={i}>
                <dt className="text-primary text-sm font-medium">{f.q}</dt>
                <dd className="text-muted text-sm mt-0.5">{f.a}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {r.answersPath && (
        <p className="mb-6">
          <Link to={lp(r.answersPath)} className="inline-block bg-surface border border-border rounded-lg px-3 py-2 text-sm font-bold text-brand-bright hover:border-brand transition-colors">
            Past {r.name} answers &amp; solutions →
          </Link>
        </p>
      )}

      {r.themedQuizzes?.length > 0 && (
        <p className="mb-6 flex flex-wrap gap-2">
          {r.themedQuizzes.map(q => (
            <Link key={q.path} to={lp(q.path)} className="inline-block bg-surface border border-border rounded-lg px-3 py-2 text-sm font-bold text-brand-bright hover:border-brand transition-colors">
              {q.label} →
            </Link>
          ))}
        </p>
      )}

      <nav aria-label={t('common.moreGames')}>
        <h2 className="text-primary font-semibold text-base mb-2">{t('common.moreGames')}</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {others.map(o => (
            <li key={o.path}>
              <Link to={lp(o.path)} className="text-brand-bright hover:text-brand transition-colors">{o.h1}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}
