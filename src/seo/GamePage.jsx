import Seo from './Seo'
import SeoContent from './SeoContent'
import AdSlot from '../ads/AdSlot'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { routeByPath } from './seoConfig'
import SiteFooter from '../components/SiteFooter'

// Wraps a game route with its SEO head + (for indexable games) the visible
// how-to / FAQ / internal-link content block, without modifying the game
// components themselves. Also floats the EN/ES switcher on every game screen —
// the games hand-roll their own headers, so this keeps language switching
// available everywhere without editing each one.
export default function GamePage({ path, children }) {
  const route = routeByPath(path)
  return (
    <>
      <Seo path={path} />
      <LanguageSwitcher className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 shadow-lg shadow-black/40" />
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
