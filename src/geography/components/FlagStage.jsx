import { flagOf, TILES } from '../data/unfurl'
import { flagUrl } from '../data/flagAssets'
import { t } from '../strings'

// Unfurl's centrepiece: the day's flag at its official proportions under a 2×3
// grid of tiles. Tiles that open on this render flip away (staggered when several
// open at once, as on the final reveal); tiles already open on load simply aren't
// drawn, so a refresh never replays the sequence.


export default function FlagStage({ code, order, open, animateFrom, outcome }) {
  const ratio = flagOf(code)?.ratio || 1.5
  const opened = new Set(order.slice(0, open))
  const rank = (i) => order.indexOf(i)
  const label = outcome ? t('unfurl.flagDone', { name: '' }).trim() : t('unfurl.flagAria', { n: open })
  return (
    <div key={code} className="uf-enter relative h-full w-full flex items-center justify-center">
      <div
        className={`uf-flag relative max-w-full ${outcome === 'won' ? 'uf-won' : ''} ${outcome === 'lost' ? 'uf-lost' : ''}`}
        style={{ aspectRatio: String(ratio), width: `min(100%, calc(var(--uf-h) * ${ratio}))` }}
        role="img"
        aria-label={label}
      >
        <img src={flagUrl(code)} alt="" draggable="false" className="absolute inset-0 w-full h-full object-fill select-none" />
        <div className="uf-tiles absolute inset-0 grid grid-cols-3 grid-rows-2" aria-hidden="true">
          {Array.from({ length: TILES }).map((_, i) => {
            const r = rank(i)
            if (opened.has(i) && r < animateFrom) return <span key={i} />
            const flipping = opened.has(i)
            return (
              <span key={i}
                className={`uf-tile ${flipping ? 'uf-tile-open' : ''}`}
                style={flipping ? { animationDelay: `calc(var(--duration-base) * ${r - animateFrom} * 0.55)` } : undefined} />
            )
          })}
        </div>
        {outcome === 'won' && <span className="uf-sheen absolute inset-0 pointer-events-none" aria-hidden="true" />}
      </div>
    </div>
  )
}
