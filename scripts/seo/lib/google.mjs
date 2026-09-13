// Google clients: GA4 Data API + Search Console API. Both authenticate with the
// SAME service account (see SETUP.md). Deps are imported dynamically so the rest
// of the layer works even before `npm install` of the Google libraries.

import { config } from './config.mjs'

const GA_SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']
const GSC_SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']

function requireCreds() {
  if (!config.google.creds) {
    throw new Error('No Google service-account credentials found. See scripts/seo/SETUP.md.')
  }
  return config.google.creds
}

async function loadDep(name) {
  try { return await import(name) } catch {
    throw new Error(`Missing dependency "${name}". Run: npm install`)
  }
}

// ── dates ───────────────────────────────────────────────────────────────────
function ymd(d) { return d.toISOString().slice(0, 10) }
function daysAgo(n) { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d }

// ── GA4 Data API ─────────────────────────────────────────────────────────────
let _ga
async function ga4Client() {
  if (_ga) return _ga
  const { BetaAnalyticsDataClient } = await loadDep('@google-analytics/data')
  _ga = new BetaAnalyticsDataClient(requireCreds())
  return _ga
}

export async function ga4Run({ dimensions = [], metrics = [], days = config.defaults.days, limit = 25, orderBy = null } = {}) {
  const client = await ga4Client()
  const [res] = await client.runReport({
    property: `properties/${config.google.ga4PropertyId}`,
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: dimensions.map(name => ({ name })),
    metrics: metrics.map(name => ({ name })),
    limit,
    orderBys: orderBy ? [orderBy] : undefined,
  })
  const dimH = (res.dimensionHeaders || []).map(h => h.name)
  const metH = (res.metricHeaders || []).map(h => h.name)
  const rows = (res.rows || []).map(r => {
    const o = {}
    dimH.forEach((n, i) => { o[n] = r.dimensionValues[i].value })
    metH.forEach((n, i) => { o[n] = Number(r.metricValues[i].value) })
    return o
  })
  return rows
}

const DESC = (field) => ({ metric: { metricName: field }, desc: true })

// Convenience reports (the ones that actually inform growth decisions).
export const ga4 = {
  topLandingPages: (days) => ga4Run({ dimensions: ['landingPagePlusQueryString'], metrics: ['sessions', 'engagedSessions', 'averageSessionDuration'], days, limit: 30, orderBy: DESC('sessions') }),
  pageEngagement: (days) => ga4Run({ dimensions: ['pagePath'], metrics: ['screenPageViews', 'userEngagementDuration', 'engagementRate', 'bounceRate'], days, limit: 30, orderBy: DESC('screenPageViews') }),
  channels: (days) => ga4Run({ dimensions: ['sessionDefaultChannelGroup'], metrics: ['sessions', 'engagedSessions'], days, orderBy: DESC('sessions') }),
  countries: (days) => ga4Run({ dimensions: ['country'], metrics: ['sessions', 'engagedSessions'], days, limit: 15, orderBy: DESC('sessions') }),
  devices: (days) => ga4Run({ dimensions: ['deviceCategory'], metrics: ['sessions', 'engagementRate'], days, orderBy: DESC('sessions') }),
  newVsReturning: (days) => ga4Run({ dimensions: ['newVsReturning'], metrics: ['activeUsers', 'sessions'], days, orderBy: DESC('sessions') }),
  events: (days) => ga4Run({ dimensions: ['eventName'], metrics: ['eventCount'], days, limit: 30, orderBy: DESC('eventCount') }),
  // Referral sources — surfaces TikTok/social traffic vs organic search vs direct.
  sources: (days) => ga4Run({ dimensions: ['sessionSourceMedium'], metrics: ['sessions', 'engagedSessions'], days, limit: 25, orderBy: DESC('sessions') }),
  // Daily session trend (ascending) — catch fresh cliffs a 90-day total hides.
  daily: (days) => ga4Run({ dimensions: ['date'], metrics: ['sessions', 'totalUsers', 'engagedSessions'], days, limit: 400, orderBy: { dimension: { dimensionName: 'date' }, desc: false } }),
}

// ── Search Console API ───────────────────────────────────────────────────────
let _gsc
async function gscClient() {
  if (_gsc) return _gsc
  const { GoogleAuth } = await loadDep('google-auth-library')
  const searchconsole = (await loadDep('@googleapis/searchconsole')).searchconsole
  const auth = new GoogleAuth({ ...requireCreds(), scopes: GSC_SCOPES })
  _gsc = searchconsole({ version: 'v1', auth })
  return _gsc
}

export async function gscQuery({ dimensions = ['query'], days = config.defaults.days, rowLimit = 100, filters = [], type = 'web' } = {}) {
  const client = await gscClient()
  const dimensionFilterGroups = filters.length ? [{ filters }] : undefined
  const { data } = await client.searchanalytics.query({
    siteUrl: config.google.gscSiteUrl,
    requestBody: {
      startDate: ymd(daysAgo(days)),
      endDate: ymd(daysAgo(2)), // GSC data lags ~2 days
      dimensions,
      rowLimit,
      type,
      dimensionFilterGroups,
    },
  })
  return (data.rows || []).map(r => {
    const o = {}
    dimensions.forEach((d, i) => { o[d] = r.keys[i] })
    o.clicks = r.clicks; o.impressions = r.impressions; o.ctr = r.ctr; o.position = r.position
    return o
  })
}

// Explicit-date-range variant (for period-over-period comparison + daily trends).
export async function gscQueryRange({ dimensions = ['query'], startDate, endDate, rowLimit = 100, filters = [], type = 'web' } = {}) {
  const client = await gscClient()
  const { data } = await client.searchanalytics.query({
    siteUrl: config.google.gscSiteUrl,
    requestBody: { startDate, endDate, dimensions, rowLimit, type, dimensionFilterGroups: filters.length ? [{ filters }] : undefined },
  })
  return (data.rows || []).map(r => { const o = {}; dimensions.forEach((d, i) => { o[d] = r.keys[i] }); o.clicks = r.clicks; o.impressions = r.impressions; o.ctr = r.ctr; o.position = r.position; return o })
}

// URL Inspection API — real indexation status per URL (verdict / coverage / canonical / last crawl).
// Needs the service account added as an OWNER of the property; returns { error } gracefully otherwise.
export async function urlInspect(url) {
  const client = await gscClient()
  try {
    const { data } = await client.urlInspection.index.inspect({ requestBody: { inspectionUrl: url, siteUrl: config.google.gscSiteUrl } })
    return data.inspectionResult || {}
  } catch (e) { return { error: e?.errors?.[0]?.message || e?.message || 'inspection failed' } }
}

const totals = (arr) => arr.reduce((s, x) => ({ clicks: s.clicks + x.clicks, impressions: s.impressions + x.impressions }), { clicks: 0, impressions: 0 })

export const gsc = {
  topQueries: (days) => gscQuery({ dimensions: ['query'], days, rowLimit: 200 }),
  topPages: (days) => gscQuery({ dimensions: ['page'], days, rowLimit: 200 }),
  queriesByPage: (days) => gscQuery({ dimensions: ['page', 'query'], days, rowLimit: 2000 }),
  countries: (days) => gscQuery({ dimensions: ['country'], days, rowLimit: 30 }),
  byDevice: (days) => gscQuery({ dimensions: ['device'], days, rowLimit: 10 }),
  byAppearance: async (days) => { try { return await gscQuery({ dimensions: ['searchAppearance'], days, rowLimit: 20 }) } catch { return [] } },
  daily: (days) => gscQuery({ dimensions: ['date'], days, rowLimit: 1000 }),
  // The exact queries a single URL ranks for (position + impressions) — the raw material for lifting
  // that URL's average position.
  pageQueries: (url, days) => gscQuery({ dimensions: ['query'], days, rowLimit: 200, filters: [{ dimension: 'page', operator: 'equals', expression: url }] }),
  // Queries where you rank on page 1-2 but not top 5 — the biggest quick wins.
  striking: async (days) => (await gscQuery({ dimensions: ['query'], days, rowLimit: 1000 }))
    .filter(r => r.position >= 5 && r.position <= 20 && r.impressions >= 20).sort((a, b) => b.impressions - a.impressions),
  // Same, but per page → which URL to push and on what query.
  strikingByPage: async (days) => (await gscQuery({ dimensions: ['page', 'query'], days, rowLimit: 5000 }))
    .filter(r => r.position >= 5 && r.position <= 20 && r.impressions >= 15).sort((a, b) => b.impressions - a.impressions),
  // High impressions, low CTR — a title/description rewrite opportunity.
  lowCtr: async (days) => (await gscQuery({ dimensions: ['query'], days, rowLimit: 1000 }))
    .filter(r => r.impressions >= 50 && r.position <= 10 && r.ctr < 0.02).sort((a, b) => b.impressions - a.impressions),
  // This window vs the window immediately before it (detects fresh regressions/gains).
  compare: async (days) => {
    const A = { start: ymd(daysAgo(days + 2)), end: ymd(daysAgo(2)) }
    const B = { start: ymd(daysAgo(days * 2 + 2)), end: ymd(daysAgo(days + 3)) }
    const [a, b] = await Promise.all([
      gscQueryRange({ dimensions: ['query'], startDate: A.start, endDate: A.end, rowLimit: 2000 }),
      gscQueryRange({ dimensions: ['query'], startDate: B.start, endDate: B.end, rowLimit: 2000 }),
    ])
    return { windowDays: days, current: totals(a), previous: totals(b) }
  },
}
