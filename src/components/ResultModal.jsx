import NextFixture from './NextFixture'

// Completion popup shown when a game ends — holds the result, stats, share,
// play-again and "try another game" so the post-game actions are front-and-centre
// instead of hidden below the board. Closable (X or backdrop) to review the board.
//
// Daily only: the daily end screen and the locked "already played today" state.
// Unlimited never opens this — the board reveals its own answers in place and
// offers a plain replay button, so practice isn't interrupted by a popup.
//
// Scroll structure: the fixed overlay scrolls, and an inner min-h-full flex
// wrapper centres the card when it fits but lets it grow and scroll from the top
// when the content is taller than the viewport (avoids the classic flex-centre
// top-clipping bug).
//
// `game` (the dailyStats key) turns on the cross-sell layout: the result on the
// left, NextFixture on the right (stacked below on mobile) — the next daily is
// the card's primary action, so the post-game moment leads into another game.
export default function ResultModal({ open, onClose, game, practice = false, children }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-modal bg-black/70 backdrop-blur-sm overflow-y-auto result-modal-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`result-card relative w-full bg-surface border border-border-strong rounded-2xl shadow-modal ${game ? 'max-w-md md:max-w-[58rem] overflow-hidden md:grid md:grid-cols-[22.5rem_minmax(0,1fr)]' : 'max-w-md px-5 py-6 flex flex-col items-center'}`}
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-primary hover:bg-border transition-colors text-lg leading-none"
          >
            ✕
          </button>
          {game ? (
            <>
              <div className="px-5 pt-7 pb-5 md:px-7 md:py-8 flex flex-col items-center md:justify-center md:border-r border-border">{children}</div>
              <div className="bg-board border-t md:border-t-0 border-border px-4 py-5 md:px-8 md:py-8">
                <NextFixture exclude={game} countCurrent={!practice} />
              </div>
            </>
          ) : children}
        </div>
      </div>
    </div>
  )
}
