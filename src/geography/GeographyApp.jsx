import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import GeoHub from './pages/GeoHub'
import Borderline from './games/borderline/Borderline'
import Overland from './games/overland/Overland'
import Unfurl from './games/unfurl/Unfurl'
import Patchwork from './games/patchwork/Patchwork'
import Postcard from './games/postcard/Postcard'
import Milestone from './games/milestone/Milestone'
import Earshot from './games/earshot/Earshot'
import Outrank from './games/outrank/Outrank'
import { GeoHead, GeoContent } from './components/GeoSeo'
import { GeoLeaguesIndex, GeoLeagueView } from './pages/GeoLeagues'
import GeoBaseCamp from './pages/GeoBaseCamp'
import { bootGeoSocial } from './social/results'

// Triviverse Geography — its own section of the site under /geography, with its
// own data (./data), storage keys, copy, SEO and prerender. Shares only the
// Triviverse design tokens and the brand mark with Triviverse Football.
export default function GeographyApp() {
  // Leagues + Base Camp: log every finished daily, retry anything unsent.
  useEffect(() => { bootGeoSocial() }, [])
  return (
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
  )
}
