// Central config + capability detection for the SEO intelligence layer.
// Every data source is OPTIONAL: the layer reports what's wired up and degrades
// gracefully, so `npm run seo-report` is useful even with zero credentials
// (site model + search demand) and gets richer as you connect each source.

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv, SEO_DIR } from './env.mjs'

loadEnv()

const env = process.env

// Resolve the Google service-account credentials from any of the supported
// inputs, in priority order. Returns { credentials } | { keyFile } | null.
export function googleCredentials() {
  // 1. Inline JSON (handy for CI / Render): GA_SERVICE_ACCOUNT_JSON = {...} or base64
  const inline = env.GA_SERVICE_ACCOUNT_JSON || env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (inline) {
    const raw = inline.trim().startsWith('{') ? inline : Buffer.from(inline, 'base64').toString('utf8')
    try { return { credentials: JSON.parse(raw) } } catch { /* fall through */ }
  }
  // 2. Explicit path
  const explicit = env.GOOGLE_APPLICATION_CREDENTIALS
  if (explicit && existsSync(explicit)) return { keyFile: explicit }
  // 3. Convention: scripts/seo/.secrets/service-account.json
  const conventional = resolve(SEO_DIR, '.secrets', 'service-account.json')
  if (existsSync(conventional)) return { keyFile: conventional }
  return null
}

export function serviceAccountEmail() {
  const creds = googleCredentials()
  try {
    if (creds?.credentials) return creds.credentials.client_email
    if (creds?.keyFile) return JSON.parse(readFileSync(creds.keyFile, 'utf8')).client_email
  } catch { /* ignore */ }
  return null
}

export const config = {
  siteUrl: 'https://triviverse.com',
  google: {
    creds: googleCredentials(),
    ga4PropertyId: env.GA4_PROPERTY_ID || null,       // numeric, e.g. 480123456
    gscSiteUrl: env.GSC_SITE_URL || null,             // 'https://triviverse.com/' or 'sc-domain:triviverse.com'
  },
  bing: {
    apiKey: env.BING_API_KEY || null,
    siteUrl: env.BING_SITE_URL || 'https://triviverse.com',
  },
  clarity: {
    token: env.CLARITY_API_TOKEN || null,             // project data-export API token
  },
  keywords: {
    // DataForSEO is the recommended low-cost search-volume source (see SETUP.md).
    dataForSeoLogin: env.DATAFORSEO_LOGIN || null,
    dataForSeoPassword: env.DATAFORSEO_PASSWORD || null,
  },
  defaults: {
    days: Number(env.SEO_LOOKBACK_DAYS || 90),
    country: env.SEO_COUNTRY || null,                 // ISO-3 filter for GSC, optional
  },
}

// A snapshot of which capabilities are live — printed by every report so you
// always know what the analysis is (and isn't) based on.
export function capabilities() {
  const g = config.google
  return {
    ga4: !!(g.creds && g.ga4PropertyId),
    searchConsole: !!(g.creds && g.gscSiteUrl),
    bing: !!config.bing.apiKey,
    clarity: !!config.clarity.token,
    keywords: !!(config.keywords.dataForSeoLogin && config.keywords.dataForSeoPassword),
    autosuggest: true,   // free, no credentials
    siteModel: true,     // reads the repo, always available
  }
}

export function capabilitySummary() {
  const caps = capabilities()
  const label = { ga4: 'Google Analytics 4', searchConsole: 'Search Console', bing: 'Bing Webmaster', clarity: 'Microsoft Clarity', keywords: 'Keyword volume (DataForSEO)', autosuggest: 'Google Autosuggest', siteModel: 'Site model (code)' }
  return Object.entries(caps).map(([k, on]) => `${on ? '✓' : '✗'} ${label[k]}`)
}
