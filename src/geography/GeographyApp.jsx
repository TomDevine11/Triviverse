import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { GeoHead, GeoContent } from './components/GeoSeo'
import { bootGeoSocial } from './social/results'

// Each page is its own chunk, so a game downloads only its own data: Borderline
// needs the country silhouettes, not the photos, voices, milestones and stats
// the other games carry (one 1.28 MB chunk before this split).
const GeoHub = lazy(() => import('./pages/GeoHub'))
const Borderline = lazy(() => import('./games/borderline/Borderline'))
const Overland = lazy(() => import('./games/overland/Overland'))
const Unfurl = lazy(() => import('./games/unfurl/Unfurl'))
const Patchwork = lazy(() => import('./games/patchwork/Patchwork'))
const Postcard = lazy(() => import('./games/postcard/Postcard'))
const Milestone = lazy(() => import('./games/milestone/Milestone'))
const Earshot = lazy(() => import('./games/earshot/Earshot'))
const Outrank = lazy(() => import('./games/outrank/Outrank'))
const GeoLeaguesIndex = lazy(() => import('./pages/GeoLeagues').then(m => ({ default: m.GeoLeaguesIndex })))
const GeoLeagueView = lazy(() => import('./pages/GeoLeagues').then(m => ({ default: m.GeoLeagueView })))
const GeoBaseCamp = lazy(() => import('./pages/GeoBaseCamp'))

const Loading = () => <div className="min-h-screen bg-canvas" aria-busy="true" />

// Triviverse Geography — its own section of the site under /geography, with its
// own data (./data), storage keys, copy, SEO and prerender. Shares only the
// Triviverse design tokens and the brand mark with Triviverse Football.
export default function GeographyApp() {
  // Leagues + Base Camp: log every finished daily, retry anything unsent.
  useEffect(() => { bootGeoSocial() }, [])
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<GeoHub />} />
        <Route path="borderline" element={<><GeoHead path="/geography/borderline" /><Borderline /><GeoContent path="/geography/borderline" /></>} />
        <Route path="overland" element={<><GeoHead path="/geography/overland" /><Overland /><GeoContent path="/geography/overland" /></>} />
        <Route path="unfurl" element={<><GeoHead path="/geography/unfurl" /><Unfurl /><GeoContent path="/geography/unfurl" /></>} />
        <Route path="patchwork" element={<><GeoHead path="/geography/patchwork" /><Patchwork /><GeoContent path="/geography/patchwork" /></>} />
        <Route path="postcard" element={<><GeoHead path="/geography/postcard" /><Postcard /><GeoContent path="/geography/postcard" /></>} />
        <Route path="milestone" element={<><GeoHead path="/geography/milestone" /><Milestone /><GeoContent path="/geography/milestone" /></>} />
        <Route path="earshot" element={<><GeoHead path="/geography/earshot" /><Earshot /><GeoContent path="/geography/earshot" /></>} />
        <Route path="outrank" element={<><GeoHead path="/geography/outrank" /><Outrank /><GeoContent path="/geography/outrank" /></>} />
        <Route path="leagues" element={<GeoLeaguesIndex />} />
        <Route path="leagues/:code" element={<GeoLeagueView />} />
        <Route path="basecamp" element={<GeoBaseCamp />} />
        <Route path="*" element={<GeoHub />} />
      </Routes>
    </Suspense>
  )
}
