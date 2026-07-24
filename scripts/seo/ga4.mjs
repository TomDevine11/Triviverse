// `npm run analytics-report` — Google Analytics 4 deep dive.
// Needs the Google service account + GA4_PROPERTY_ID (scripts/seo/SETUP.md).

import { config, capabilities } from './lib/config.mjs'
import { heading, table, num, pct, round, writeReport } from './lib/format.mjs'

if (!capabilities().ga4) {
  console.log('GA4 Data API is not configured. See scripts/seo/SETUP.md.')
  process.exit(0)
}

const days = config.defaults.days
const { ga4 } = await import('./lib/google.mjs')

console.log(heading(`GOOGLE ANALYTICS 4 — last ${days} days`))
const [landing, engagement, channels, countries, devices, nvr, events] = await Promise.all([
  ga4.topLandingPages(days), ga4.pageEngagement(days), ga4.channels(days), ga4.countries(days), ga4.devices(days), ga4.newVsReturning(days), ga4.events(days),
])

console.log('\n  Top landing pages (where sessions start — which games pull traffic):')
console.log(table(landing.map(r => ({ page: r.landingPagePlusQueryString, sessions: num(r.sessions), engaged: num(r.engagedSessions), dur: `${round(r.averageSessionDuration)}s` })),
  [{ key: 'page', label: 'Landing page' }, { key: 'sessions', label: 'Sessions', align: 'right' }, { key: 'engaged', label: 'Engaged', align: 'right' }, { key: 'dur', label: 'Avg dur', align: 'right' }], { max: 20 }))

console.log('\n  Page engagement (which pages hold attention vs bounce):')
console.log(table(engagement.map(r => ({ page: r.pagePath, views: num(r.screenPageViews), eng: pct(r.engagementRate), bounce: pct(r.bounceRate) })),
  [{ key: 'page', label: 'Page' }, { key: 'views', label: 'Views', align: 'right' }, { key: 'eng', label: 'Engaged', align: 'right' }, { key: 'bounce', label: 'Bounce', align: 'right' }], { max: 20 }))

console.log('\n  Channels:')
console.log(table(channels.map(r => ({ ch: r.sessionDefaultChannelGroup, sessions: num(r.sessions), engaged: num(r.engagedSessions) })),
  [{ key: 'ch', label: 'Channel' }, { key: 'sessions', label: 'Sessions', align: 'right' }, { key: 'engaged', label: 'Engaged', align: 'right' }]))

console.log('\n  Countries / Devices:')
console.log(table(countries.map(r => ({ c: r.country, sessions: num(r.sessions) })), [{ key: 'c', label: 'Country' }, { key: 'sessions', label: 'Sessions', align: 'right' }], { max: 10 }))
console.log(table(devices.map(r => ({ d: r.deviceCategory, sessions: num(r.sessions), eng: pct(r.engagementRate) })), [{ key: 'd', label: 'Device' }, { key: 'sessions', label: 'Sessions', align: 'right' }, { key: 'eng', label: 'Engaged', align: 'right' }]))

console.log('\n  New vs returning / Events:')
console.log(table(nvr.map(r => ({ t: r.newVsReturning, users: num(r.activeUsers) })), [{ key: 't', label: 'Type' }, { key: 'users', label: 'Users', align: 'right' }]))
console.log(table(events.map(r => ({ e: r.eventName, n: num(r.eventCount) })), [{ key: 'e', label: 'Event' }, { key: 'n', label: 'Count', align: 'right' }], { max: 12 }))

const path = writeReport('analytics', { lookbackDays: days, landing, engagement, channels, countries, devices, newVsReturning: nvr, events })
console.log(`\n  Snapshot written: ${path.replace(process.cwd() + '/', '')}`)
