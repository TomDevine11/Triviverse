// `npm run bing-report` — Bing Webmaster Tools deep dive.
//
// Why this exists: GA4 shows Bing-powered search (bing + yahoo + ecosia + duckduckgo)
// delivering roughly as many sessions as Google, yet Search Console only ever reports
// Google. Without this, a third of search traffic has no queries, no rankings and no
// CTR attached to it — and every SEO decision gets made on half the picture.
//
// Needs BING_API_KEY in scripts/seo/.env.seo.local (see SETUP.md). Inert without it.

import { config, capabilities } from './lib/config.mjs'
import { heading, table, num, pct, round, writeReport } from './lib/format.mjs'

if (!capabilities().bing) {
  console.log('Bing Webmaster is not configured.\n')
  console.log('  1. Add and verify the site at https://www.bing.com/webmasters')
  console.log('     (there is a one-click "Import from Google Search Console" option).')
  console.log('  2. Settings → API access → API Key.')
  console.log('  3. Put BING_API_KEY=<key> in scripts/seo/.env.seo.local\n')
  process.exit(0)
}

const { bing } = await import('./lib/bing.mjs')

console.log(heading('BING WEBMASTER TOOLS'))
console.log(`  Site: ${config.bing.siteUrl}`)

const [traffic, queries, pages] = await Promise.all([
  bing.rankAndTraffic().catch(() => null),
  bing.queryStats().catch(() => null),
  bing.pageStats().catch(() => null),
])

// Bing returns .NET-style records; normalise the field names we care about and
// tolerate absent ones rather than crashing a report on a schema wobble.
const pick = (row, ...names) => { for (const n of names) if (row?.[n] != null) return row[n]; return 0 }

if (Array.isArray(queries) && queries.length) {
  const rows = queries.map((r) => {
    const impr = pick(r, 'Impressions', 'impressions')
    const clicks = pick(r, 'Clicks', 'clicks')
    return {
      query: pick(r, 'Query', 'query') || '(unknown)',
      clicks: num(clicks),
      impressions: num(impr),
      ctr: pct(impr ? clicks / impr : 0),
      pos: round(pick(r, 'AvgImpressionPosition', 'Position', 'position')),
      _clicks: clicks,
    }
  }).sort((a, b) => b._clicks - a._clicks)
  console.log('\n  Top Bing queries by clicks:')
  console.log(table(rows, [
    { key: 'query', label: 'Query' },
    { key: 'clicks', label: 'Clicks', align: 'right' },
    { key: 'impressions', label: 'Impr', align: 'right' },
    { key: 'ctr', label: 'CTR', align: 'right' },
    { key: 'pos', label: 'Pos', align: 'right' },
  ], { max: 25 }))
} else {
  console.log('\n  No query data returned yet — Bing needs a few days after verification.')
}

if (Array.isArray(pages) && pages.length) {
  const rows = pages.map((r) => {
    const impr = pick(r, 'Impressions', 'impressions')
    const clicks = pick(r, 'Clicks', 'clicks')
    return {
      page: String(pick(r, 'Query', 'Url', 'url') || '').replace(config.bing.siteUrl, '') || '/',
      clicks: num(clicks),
      impressions: num(impr),
      ctr: pct(impr ? clicks / impr : 0),
      _clicks: clicks,
    }
  }).sort((a, b) => b._clicks - a._clicks)
  console.log('\n  Top Bing pages by clicks:')
  console.log(table(rows, [
    { key: 'page', label: 'Page' },
    { key: 'clicks', label: 'Clicks', align: 'right' },
    { key: 'impressions', label: 'Impr', align: 'right' },
    { key: 'ctr', label: 'CTR', align: 'right' },
  ], { max: 20 }))
}

if (Array.isArray(traffic) && traffic.length) {
  const totals = traffic.reduce((acc, r) => ({
    clicks: acc.clicks + pick(r, 'Clicks', 'clicks'),
    impressions: acc.impressions + pick(r, 'Impressions', 'impressions'),
  }), { clicks: 0, impressions: 0 })
  console.log(`\n  Totals across the returned window: ${num(totals.clicks)} clicks · ${num(totals.impressions)} impressions · CTR ${pct(totals.impressions ? totals.clicks / totals.impressions : 0)}`)
}

const path = writeReport('bing', { site: config.bing.siteUrl, traffic, queries, pages })
console.log(`\n  Snapshot written: ${path.replace(process.cwd() + '/', '')}`)
console.log('\n  Compare against `npm run search-console-report` — the two engines rank this site')
console.log('  very differently, and pages Google ignores can be doing real volume here.\n')
