import { useEffect } from 'react'
import { ADSENSE_CLIENT, AD_SLOTS } from './adsConfig'

// A placement whose slot id is still the 0000000000 placeholder would render an
// <ins> AdSense can never fill. Skip it individually, so one configured placement
// can go live without waiting for the other.
const slotReady = (name) => /^\d{10}$/.test(AD_SLOTS[name] || '') && AD_SLOTS[name] !== '0000000000'
import { adsConfigured } from './adsInit'

// A reserved ad placement. Until ads are configured it renders nothing at all —
// no DOM, no scripts, no space — so it's a true no-op drop-in. "Configured"
// means ADS_ENABLED *and* a real ca-pub-… id: with the placeholder id still in
// place the AdSense script never loads, so rendering the <ins> would leave a
// permanently blank reserved box on every page.
export default function AdSlot({ name, className = '' }) {
  useEffect(() => {
    if (!adsConfigured() || !slotReady(name)) return
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}) } catch { /* script not loaded */ }
  }, [name])

  if (!adsConfigured() || !slotReady(name)) return null

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
