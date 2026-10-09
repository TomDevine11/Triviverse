import Seo from './Seo'
import SeoContent from './SeoContent'
import AdSlot from '../ads/AdSlot'
import { routeByPath } from './seoConfig'
import SiteFooter from '../components/SiteFooter'

// Wraps a game route with its SEO head + (for indexable games) the visible
// how-to / FAQ / internal-link content block, without modifying the game
// components themselves.
export default function GamePage({ path, children }) {
  const route = routeByPath(path)
  return (
    <>
      <Seo path={path} />
      {children}
      {!route.noindex && (
        <div className="px-4 pb-16">
          <SeoContent path={path} />
          <AdSlot name="game-footer" />
          <SiteFooter />
        </div>
      )}
    </>
  )
}
