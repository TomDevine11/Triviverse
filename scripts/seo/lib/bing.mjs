// Bing Webmaster Tools API (Priority 2). Simple apikey auth (no OAuth). Bing +
// DuckDuckGo/Ecosia share this index, so it's a useful second opinion on demand
// and a place where a young site often ranks before Google. Inert without a key.

import { config } from './config.mjs'

const BASE = 'https://ssl.bing.com/webmaster/api.svc/json'

export function bingAvailable() { return !!config.bing.apiKey }

async function call(method, params = {}) {
  if (!config.bing.apiKey) return null
  const qs = new URLSearchParams({ apikey: config.bing.apiKey, siteUrl: config.bing.siteUrl, ...params })
  const res = await fetch(`${BASE}/${method}?${qs}`)
  const json = await res.json()
  return json?.d ?? json
}

export const bing = {
  // Clicks/impressions/rank over time for the whole site.
  rankAndTraffic: () => call('GetRankAndTrafficStats'),
  // Top query stats (impressions, clicks, avg position) from Bing search.
  queryStats: () => call('GetQueryStats'),
  // Top pages by Bing search traffic.
  pageStats: () => call('GetPageStats'),
  // FREE keyword volume (impression estimate) for a term — Bing's answer to Keyword Planner.
  keyword: (q) => call('GetKeyword', { q, country: 'gb', language: 'en-GB' }),
  // Related keyword ideas for a seed term.
  keywordIdeas: (q) => call('GetRelatedKeywords', { q, country: 'gb', language: 'en-GB' }),
}

// Normalise a Bing Webmaster stats payload into a common shape.
//
// `labelKeys` are tried in order against each row (the API uses PascalCase —
// `Query`, `Url` — but we accept lowercase too). It is REST, not a single
// parameter: passing one array-less string and then spreading it inside would
// spread the *characters* of the key ('Q','u','e','r','y'), which silently
// turned every label into '(unknown)'. Guard: test/bing-stats.test.js.
export function normalizeStats(rows, ...labelKeys) {
  const val = (row, ...names) => { for (const n of names) if (row?.[n] != null) return row[n]; return 0 }
  return (Array.isArray(rows) ? rows : []).map((r) => {
    const impressions = val(r, 'Impressions', 'impressions')
    const clicks = val(r, 'Clicks', 'clicks')
    return {
      label: String(val(r, ...labelKeys) || '(unknown)'),
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position: val(r, 'AvgImpressionPosition', 'Position', 'position'),
    }
  }).sort((a, b) => b.clicks - a.clicks)
}
