import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { geoRoute, metaTags, jsonLd, absolute, GEO_ROUTES } from '../seo'
import { GeoFooter } from './ui'

// Head manager for Geography routes: title, meta, canonical and JSON-LD, all
// tagged data-seo (the same convention the prerender uses) so they swap cleanly.
export function GeoHead({ path }) {
  useEffect(() => {
    const route = geoRoute(path)
    document.title = route.title
    document.documentElement.lang = 'en'
    document.querySelectorAll('head [data-seo]').forEach(el => el.remove())
    const add = (tag, attrs, text) => {
      const el = document.createElement(tag)
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.setAttribute('data-seo', '')
      if (text) el.textContent = text
      document.head.appendChild(el)
    }
    add('link', { rel: 'canonical', href: absolute(path) })
    for (const m of metaTags(route)) add('meta', { ...(m.name ? { name: m.name } : { property: m.property }), content: m.content })
    for (const b of jsonLd(route)) add('script', { type: 'application/ld+json' }, JSON.stringify(b))
  }, [path])
  return null
}

// Crawlable copy below the fold: h1, about, how to play, sections, FAQ, links.
export function GeoContent({ path }) {
  const r = geoRoute(path)
  const others = GEO_ROUTES.filter(o => o.path !== path)
  return (
    <div className="max-w-2xl mx-auto px-4 pt-10 pb-4 text-left">
      <h1 className="text-2xl font-bold text-primary mb-1">{r.h1}</h1>
      <p className="text-muted text-sm leading-relaxed mb-6">{r.about}</p>
      {r.howTo && (
        <section className="mb-8">
          <h2 className="text-primary font-semibold text-lg mb-3">How to play {r.name}</h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-muted text-sm leading-relaxed">{r.howTo.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </section>
      )}
      {r.sections?.map((s, i) => (
        <section key={i} id={s.id} className="mb-8 scroll-mt-4">
          <h2 className="text-primary font-semibold text-lg mb-3">{s.h2}</h2>
          {s.body.map((p, j) => <p key={j} className="text-muted text-sm leading-relaxed mb-3 last:mb-0">{p}</p>)}
        </section>
      ))}
      {r.faq?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-primary font-semibold text-lg mb-3">Frequently asked questions</h2>
          <dl className="space-y-4">
            {r.faq.map((f, i) => <div key={i}><dt className="text-primary font-semibold text-sm">{f.q}</dt><dd className="text-muted text-sm leading-relaxed mt-1 ml-0">{f.a}</dd></div>)}
          </dl>
        </section>
      )}
      <nav aria-label="More geography" className="text-sm flex flex-wrap gap-x-5 gap-y-1.5">
        {others.map(o => <Link key={o.path} to={o.path} className="text-brand-bright hover:text-brand transition-colors">{o.name}</Link>)}
      </nav>
      <GeoFooter />
    </div>
  )
}
