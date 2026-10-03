import { useState } from 'react'
import { useI18n } from '../i18n'
import { track } from '../utils/analytics'
import ResultSocial from './social/ResultSocial'
import { ShareIcon } from './social/SharePanel'
import { rowsToEmoji } from '../social/shareText'
import { routeOf } from '../social/games'

export { ShareIcon }

// The finish card's quiet button style (Play Unlimited and friends): the next-game
// CTA in NextFixture is the card's only brand-filled button.
export const RESULT_SECONDARY_BTN = 'mt-2 w-full h-11 bg-border/60 hover:bg-border border border-border-strong text-primary text-sm font-bold rounded-lg px-6'

// Every game's result card renders this. Two shapes:
//
//   Daily (card.daily)  → the full social block (components/social/ResultSocial):
//     head-to-head, global percentile, league standing, streak, and a
//     pasteable challenge. The card must carry `won` and `score` (see
//     social/scoring.js) so results can be compared across players.
//
//   Practice / 1v1      → a single share button: the result text + the game link
//     (nothing to compare against, so no challenge).
export function ShareCard({ card, className, text }) {
  if (card?.daily) return <ResultSocial card={card} />
  return <PracticeShare card={card} className={className} text={text} />
}

function PracticeShare({ card, className, text }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}${routeOf(card?.gameId)}` : ''
  const body = text || [`⚽ ${card?.title || 'Triviverse'}${card?.result ? ` — ${card.result}` : ''}`, rowsToEmoji(card?.rows), url].filter(Boolean).join('\n')

  const handleShare = async () => {
    const canNative = typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)').matches
    track('share', { game: card?.gameId, method: canNative ? 'native' : 'copy', practice: true })
    if (canNative) {
      try { await navigator.share({ text: body }) } catch { /* cancelled */ }
      return
    }
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center justify-center gap-2 transition-colors ${className || RESULT_SECONDARY_BTN}`}>
      <ShareIcon /> {copied ? t('share.copied') : t('share.share')}
    </button>
  )
}
