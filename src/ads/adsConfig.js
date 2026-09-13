// ─────────────────────────────────────────────────────────────────────────
// AD CONFIG — single switch for monetisation.
//
// Ads are intentionally OFF until the site has meaningful traffic (see
// docs/LAUNCH.md → Monetisation). While ADS_ENABLED is false, every <AdSlot />
// renders NOTHING — no scripts, no layout space, zero performance/SEO impact.
//
// To turn ads on later:
//   1. Get a Google AdSense account and your publisher id (ca-pub-…).
//   2. Add the AdSense script tag to index.html (see LAUNCH.md).
//   3. Set ADSENSE_CLIENT + the slot ids below, and flip ADS_ENABLED to true.
// ─────────────────────────────────────────────────────────────────────────

export const ADS_ENABLED = false

export const ADSENSE_CLIENT = 'ca-pub-2277295336282027'

// Named ad placements → AdSense ad-unit slot ids (create these in AdSense).
export const AD_SLOTS = {
  'hub-footer': '0000000000',
  'game-footer': '0000000000',
}
