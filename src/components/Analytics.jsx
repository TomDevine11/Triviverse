import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics, pageview } from '../utils/analytics'
import { initAds } from '../ads/adsInit'

// Mounts once at the app root: initialises analytics and ads (both no-ops
// without ids) and sends a page_view on every route change (SPA navigations GA
// can't see). Ads load their consent message before the ad script — see
// ../ads/adsInit.js.
export default function Analytics() {
  const { pathname } = useLocation()
  useEffect(() => { initAnalytics(); initAds() }, [])
  useEffect(() => { pageview(pathname) }, [pathname])
  return null
}
