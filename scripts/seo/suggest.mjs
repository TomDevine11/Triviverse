// `npm run seo-suggest [-- "seed phrase"]` — deep search-demand exploration.
//
// With no arg, runs an "alphabet soup" expansion for every game name and reports
// the most common real-world completions (ranked by recurrence) + whether your
// exact name autocompletes. With a seed arg, explores just that phrase. Needs no
// credentials. Adds search volume if DataForSEO is configured.

import { games } from './lib/site.mjs'
import { expand, autosuggest } from './lib/demand.mjs'
import { searchVolume, keywordsAvailable } from './lib/keywords.mjs'
import { heading, table, num, writeReport } from './lib/format.mjs'

const seedArg = process.argv.slice(2).join(' ').trim()
const targets = seedArg
  ? [{ name: seedArg, path: '(custom)' }]
  : games().map(g => ({ name: g.name, path: g.path }))

const out = []
for (const t of targets) {
  const seed = t.name.toLowerCase()
  console.log(heading(`${t.name}  (${t.path})`))
  const nameSug = await autosuggest(seed)
  const suggested = nameSug.some(s => s.toLowerCase().includes(seed))
  console.log(`  Exact-name autocompletes: ${suggested ? 'yes ✓' : 'NO ✗  ← naming/intent gap'}`)

  const expansions = await expand(seed)
  const top = expansions.filter(e => e.suggestion.toLowerCase() !== seed).slice(0, 15)
  console.log('\n  Most common real completions people search:')
  console.log(table(top, [{ key: 'suggestion', label: 'Completion' }, { key: 'hits', label: 'Recurs', align: 'right' }]))

  let volume = null
  if (keywordsAvailable()) {
    const phrases = [seed, ...top.slice(0, 9).map(e => e.suggestion)]
    volume = await searchVolume([...new Set(phrases)])
    if (volume?.length) {
      console.log('\n  Monthly search volume:')
      console.log(table(volume.map(v => ({ k: v.keyword, v: num(v.volume) })), [{ key: 'k', label: 'Keyword' }, { key: 'v', label: 'Volume', align: 'right' }]))
    }
  }
  out.push({ ...t, suggested, completions: expansions, volume })
}

if (!keywordsAvailable()) {
  console.log('\n  Tip: connect DataForSEO (scripts/seo/SETUP.md) to attach real monthly search volume to these.')
}
const path = writeReport('demand', { seed: seedArg || 'all-games', results: out })
console.log(`\n  Snapshot written: ${path.replace(process.cwd() + '/', '')}`)
