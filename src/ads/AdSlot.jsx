import { useEffect } from 'react'
import { ADSENSE_CLIENT, AD_SLOTS } from './adsConfig'
import { adsConfigured } from './adsInit'

// A reserved ad placement. Until ads are configured it renders nothing at all —
// no DOM, no scripts, no space — so it's a true no-op drop-in. "Configured"
// means ADS_ENABLED *and* a real ca-pub-… id: with the placeholder id still in
// place the AdSense script never loads, so rendering the <ins> would leave a
// permanently blank reserved box on every page.
export default function AdSlot({ name, className = '' }) {
  useEffect(() => {
    if (!adsConfigured()) return
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}) } catch { /* script not loaded */ }
  }, [])

  if (!adsConfigured()) return null

  return (
    <div className={`w-full max-w-3xl mx-auto my-8 ${className}`}>
      <div className="text-[10px] uppercase tracking-widest text-gray-700 text-center mb-1">Advertisement</div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={AD_SLOTS[name]}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
