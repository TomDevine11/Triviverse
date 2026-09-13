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
