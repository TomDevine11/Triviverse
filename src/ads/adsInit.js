// ─────────────────────────────────────────────────────────────────────────
// ADS BOOTSTRAP — loads the consent message BEFORE the ad script, and is
// completely inert until a real publisher id is configured.
//
// Why the consent script comes first: 71% of Triviverse sessions are UK/EEA
// (2,338 of 3,271 over 90 days). Google requires a certified Consent Management
// Platform to serve ads to those users, and serving without one is both a policy
// breach and a legal one. Google's own Privacy & Messaging is certified, is free,
// and is configured in the AdSense console — this only loads it.
//
// Mirrors src/utils/analytics.js: with no id, nothing is ever injected, so the
// build and real users are completely unaffected while ads are off.
// ─────────────────────────────────────────────────────────────────────────
import { ADS_ENABLED, ADSENSE_CLIENT } from './adsConfig'

// The placeholder in adsConfig must be replaced with a real ca-pub-… id. Guarding
// on the shape rather than truthiness stops the placeholder loading a 404 script.
const PUB_ID_RE = /^ca-pub-\d{16}$/
export const adsConfigured = () => ADS_ENABLED && PUB_ID_RE.test(ADSENSE_CLIENT)

let started = false

function inject(src, extra = {}) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  s.crossOrigin = 'anonymous'
  Object.assign(s, extra)
  document.head.appendChild(s)
  return s
}

export function initAds() {
  if (started || typeof window === 'undefined' || !adsConfigured()) return
  started = true

  // 1. Consent first. Google serves the GDPR/UK message configured in the
  //    AdSense console; it gates personalised ads and, where required, ad
  //    serving itself. Loading ads without this reaching EEA users is the
  //    failure mode this ordering exists to prevent.
  const pub = ADSENSE_CLIENT.replace(/^ca-/, '') // fundingchoices wants pub-… not ca-pub-…
  inject(`https://fundingchoicesmessages.google.com/i/${pub}?ers=1`)

  // 2. Then AdSense itself. <AdSlot> pushes to window.adsbygoogle; without this
  //    script those pushes go nowhere and the <ins> elements stay blank — which
  //    is what would have happened if ADS_ENABLED were flipped as things stood.
  inject(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`)
}
