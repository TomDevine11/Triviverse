#!/usr/bin/env node
// Summarise docs/seo/serp-observations.json into the competitor register.
//
// The log is captured by hand (see .claude/skills/triviverse-serp); this turns
// it into the three things worth knowing across observations rather than within
// one: who keeps beating us, where exact-match domains sit, and how often an AI
// Overview hands our term to someone else.
//
//   npm run serp-log
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { heading, table, pct } from './lib/format.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const LOG = path.join(HERE, '..', '..', 'docs', 'seo', 'serp-observations.json')

const { observations } = JSON.parse(readFileSync(LOG, 'utf8'))
const domainOf = (u) => String(u).split('/')[0].replace(/^www\./, '')

console.log(heading('SERP OBSERVATION LOG'))
const dates = [...new Set(observations.map(o => o.date))].sort()
console.log(`  ${observations.length} observations · ${dates[0]} → ${dates[dates.length - 1]}\n`)

// Who ranks above us, and how often.
const seen = new Map()
for (const o of observations) {
  for (const url of o.above) {
    const d = domainOf(url)
    const e = seen.get(d) || { domain: d, count: 0, queries: [], best: 99 }
    e.count++
    e.queries.push(o.query)
    e.best = Math.min(e.best, o.above.indexOf(url) + 1)
    seen.set(d, e)
  }
}
const register = [...seen.values()].sort((a, b) => b.count - a.count)
console.log('  Competitors ranking above Triviverse:')
console.log(table(register.filter(r => r.count > 1).map(r => ({
  d: r.domain, n: `${r.count}/${observations.length}`, best: `#${r.best}`, q: r.queries.slice(0, 3).join(', '),
})), [
  { key: 'd', label: 'Domain' }, { key: 'n', label: 'SERPs', align: 'right' },
  { key: 'best', label: 'Best', align: 'right' }, { key: 'q', label: 'Seen on' },
], { max: 20 }))
console.log(`  ${register.filter(r => r.count === 1).length} further domains seen once.`)

// Exact-match domains — the strongest predictor of us being absent.
const withEmd = observations.filter(o => o.exactMatchDomains?.length)
console.log('\n  Exact-match domains present:')
console.log(table(withEmd.map(o => ({
  q: `${o.query} (${o.engine})`, emd: o.exactMatchDomains.join(', '),
  us: o.triviversePosition ? `#${o.triviversePosition}` : 'absent',
})), [{ key: 'q', label: 'Query' }, { key: 'emd', label: 'Exact-match domains' }, { key: 'us', label: 'Triviverse', align: 'right' }]))

// AI Overview capture.
const withAio = observations.filter(o => o.aiOverview?.present)
const captured = withAio.filter(o => o.aiOverview.creditsCompetitor)
console.log('\n  AI Overviews:')
console.log(`    present on ${withAio.length}/${observations.length} observations`)
console.log(`    crediting a competitor: ${captured.length}/${withAio.length}${withAio.length ? ` (${pct(captured.length / withAio.length)})` : ''}`)
for (const o of captured) console.log(`      • "${o.query}" → ${o.aiOverview.cites.join(', ')}`)

// SERP features suppressing organic.
const feat = new Map()
for (const o of observations) for (const f of o.features || []) feat.set(f, (feat.get(f) || 0) + 1)
console.log('\n  SERP features observed:')
for (const [f, n] of [...feat.entries()].sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(2)} × ${f}`)

console.log(heading('DONE'))
