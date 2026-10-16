#!/usr/bin/env node
// Triviverse Geography — builds Milestone's question library.
//
//   npm run build:milestones
//
// Reads scripts/geography/milestones.source.mjs, looks up each question's `site`
// article on English Wikipedia and takes its primary coordinates as the answer. The
// curated `ll` must agree with them to within max(25 km, 2r): a disagreement means
// the clue, the article or our reading is wrong, and the build stops so a human
// looks. If an article has no coordinates the curated `ll` stands (reported).
// Writes src/geography/data/milestones.generated.json — views resolved to explicit
// [lat, lon, zoom], sources as article URLs. Nothing is fetched at runtime.
import { writeFileSync } from 'node:fs'
import { MILESTONES, VIEWS } from './milestones.source.mjs'

const OUT = 'src/geography/data/milestones.generated.json'
const UA = 'TriviverseBuild/1.0 (https://triviverse.com; build-time fact checking)'
const CATS = new Set(['science', 'invention', 'firsts', 'history', 'exploration', 'engineering', 'sport', 'culture', 'archaeology', 'nature'])
const wiki = (t) => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const R = Math.PI / 180
const km = ([a, b], [c, d]) => 2 * 6371 * Math.asin(Math.sqrt(Math.sin((c - a) * R / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin((d - b) * R / 2) ** 2))

async function coords(titles) {
  const out = new Map()
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40)
    const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', redirects: '1', prop: 'coordinates', colimit: 'max', titles: batch.join('|'),
    })
    const data = await (await fetch(url, { headers: { 'User-Agent': UA } })).json()
    const alias = new Map()
    for (const n of [...(data.query.normalized || []), ...(data.query.redirects || [])]) alias.set(n.to, n.from)
    for (const p of data.query.pages) {
      let t = p.title
      while (alias.has(t)) t = alias.get(t)
      const c = p.coordinates?.find(x => x.primary) || p.coordinates?.[0]
      out.set(t, p.missing ? 'missing' : c ? [c.lat, c.lon] : null)
    }
    await sleep(250)
  }
  return out
}

const errors = [], notes = [], ids = new Set()
const found = await coords([...new Set(MILESTONES.map(m => m.site))])
const out = []
for (const m of MILESTONES) {
  const fail = (why) => errors.push(`${m.id}: ${why}`)
  if (ids.has(m.id)) { fail('duplicate id'); continue }
  ids.add(m.id)
  if (!CATS.has(m.cat)) fail(`unknown category ${m.cat}`)
  const v = typeof m.v === 'string' ? VIEWS[m.v] : m.v
  if (!v) { fail(`unknown view ${m.v}`); continue }
  const got = found.get(m.site)
  if (got === 'missing' || got === undefined) { fail(`no article "${m.site}"`); continue }
  let ll = m.ll
  if (got) {
    const d = km(got, m.ll)
    if (d > Math.max(25, 2 * m.r)) { fail(`"${m.site}" is ${Math.round(d)} km from the curated point`); continue }
    ll = got
  } else notes.push(`${m.id}: "${m.site}" has no coordinates — curated point used`)
  out.push({
    id: m.id, cat: m.cat, year: m.year, q: m.q, a: m.a, place: m.place,
    lat: +ll[0].toFixed(4), lon: +ll[1].toFixed(4),
    view: v, r: m.r, d: m.d, why: m.why,
    src: [m.site, ...(m.refs || [])].map(wiki),
  })
}

if (notes.length) console.error(notes.join('\n'))
if (errors.length) { console.error(`\n${errors.length} problem(s):\n  ${errors.join('\n  ')}`); process.exit(1) }
writeFileSync(OUT, JSON.stringify({
  meta: { schemaVersion: 1, generatedAt: new Date().toISOString().slice(0, 10), source: 'Curated questions; answer coordinates from the English Wikipedia article for each site.', count: out.length },
  questions: out,
}, null, 1) + '\n')
console.error(`${out.length} questions → ${OUT}`)
