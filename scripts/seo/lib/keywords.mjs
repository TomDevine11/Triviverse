// Keyword search-volume via DataForSEO (recommended low-cost source — see
// SETUP.md for why). Pay-as-you-go, ~$0.05 per call, exposes Google Ads volume,
// CPC and competition. Inert (returns null) unless credentials are configured.

import { config } from './config.mjs'

const BASE = 'https://api.dataforseo.com/v3'

function authHeader() {
  const { dataForSeoLogin: u, dataForSeoPassword: p } = config.keywords
  if (!u || !p) return null
  return 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64')
}

export function keywordsAvailable() { return !!authHeader() }

// Monthly search volume (+CPC, competition) for a list of keywords.
export async function searchVolume(keywords, { location = 'United Kingdom', language = 'English' } = {}) {
  const auth = authHeader()
  if (!auth) return null
  const body = [{ keywords, location_name: location, language_name: language }]
  const res = await fetch(`${BASE}/keywords_data/google_ads/search_volume/live`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  const items = json?.tasks?.[0]?.result || []
  return items.map(i => ({
    keyword: i.keyword,
    volume: i.search_volume,
    cpc: i.cpc,
    competition: i.competition,
  })).sort((a, b) => (b.volume || 0) - (a.volume || 0))
}
