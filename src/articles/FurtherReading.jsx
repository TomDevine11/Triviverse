import { articlesForGame } from './index.js'

// Editorial articles that use this game's data (src/articles). Plain anchors:
// the articles are static pages, not app routes.
export default function FurtherReading({ path, className = 'mb-6' }) {
  const list = articlesForGame(path)
  if (!list.length) return null
  return (
    <div className={className}>
      <h2 className="text-primary font-semibold text-base mb-2">Further reading</h2>
      <ul className="space-y-1 text-sm">
        {list.map(a => (
          <li key={a.slug}>
            <a href={`/articles/${a.slug}`} className="text-brand-bright hover:text-brand transition-colors">{a.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
