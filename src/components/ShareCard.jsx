import { useState } from 'react'
import { buildShareUrl } from '../utils/shareUrl'
import { useI18n } from '../i18n'
import { track } from '../utils/analytics'

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  )
}

// A single Share button, styled like the Play-Unlimited CTA. It shares ONE link
// that unfurls into the result image and opens the game — no emoji-grid text.
// On desktop (no native share sheet) it copies that link instead. Pass
// `className` to override the visual style for a specific button row.
export function ShareCard({ card, className }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const handleShare = async () => {
    const shareUrl = buildShareUrl(card)
    track('share', { game: card?.gameId, method: canNativeShare ? 'native' : 'copy' })
    if (canNativeShare) {
      try { await navigator.share({ url: shareUrl }) } catch { /* cancelled */ }
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center justify-center gap-2 transition-colors ${className || 'mt-2 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg px-6 py-2.5'}`}>
      <ShareIcon /> {copied ? t('share.copied') : t('share.share')}
    </button>
  )
}
