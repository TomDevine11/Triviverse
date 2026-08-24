// SEO relations engine — derives "players who played for both X and Y" pages from
// the canonical football data, with strict quality gates so we never ship thin or
// arbitrary pages. Every page: both clubs are prominent, the shared cohort has real
// famous names, and the answer set is a genuinely useful, complete list.
//
// Output: src/data/seo/relations.generated.json (pages + club hub + internal-link
// graph). Consumed by src/seo/relations.js (routes/meta/schema) and the runtime.
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadRegistry } from '../qgen/registry.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const R = loadRegistry()
const reco = (id) => R.players.get(id)?.reco || 0

// ── Quality thresholds (deliberately conservative) ──────────────────────────
const CLUB_MIN_STARS = 16   // both clubs must be genuinely prominent (high search intent)
const STAR = 55             // a "famous" player
const PAIR_MIN_FAMOUS = 5   // ≥ this many famous players shared → a real, nameable list
const PAIR_MIN_TOTAL = 10   // ≥ this many total shared → a substantial answer set
const RELATED_MAX = 10      // internal links per page

// Clean, readable club name: strip standalone boilerplate tokens (acronyms, years,
// generic words) but keep the distinctive name. Token-based so it can't mangle a
// real name mid-word.
const NOISE = new Set(['ACF', 'AFC', 'RCD', 'RC', 'SSC', 'SS', 'SC', 'SD', 'UC', 'US', 'OGC', 'VfL', 'VfB',
  'TSG', 'SV', 'BSC', 'HSC', 'CA', 'CD', 'FC', 'CF', 'CFC', 'UD', 'AC', 'AS', 'SL', 'KV', 'HB', 'BC', 'SCO', 'LOSC',
  'Calcio', 'Amsterdam', 'Girondins', 'Stade', 'Hamburger', 'Hellas', 'Balompié', 'Alsace', 'Athletic'])
const cleanName = (name) => {
  const toks = name.replace(/^1\.\s?(FC|FSV)\s/i, '').split(/\s+/)
    .filter(tok => !NOISE.has(tok) && !/^\d{2,4}$/.test(tok) && tok !== '1.')
  return (toks.join(' ') || name).trim()
}
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ── Prominent clubs (≥ CLUB_MIN_STARS household names on the roster) ─────────
const clubs = []
for (const [cid, members] of R.clubMembers) {
  const stars = [...members].filter(id => reco(id) >= STAR).length
  if (stars < CLUB_MIN_STARS) continue
  const name = cleanName(R.clubName.get(cid) || '')
  if (!name) continue
  clubs.push({ cid, name, slug: slugify(name), members, stars })
}
// de-dup clubs that clean to the same slug (keep the most prominent)
const bySlug = new Map()
for (const c of clubs.sort((a, b) => b.stars - a.stars)) if (!bySlug.has(c.slug)) bySlug.set(c.slug, c)
const CLUBS = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name))

// ── Pairs → pages ────────────────────────────────────────────────────────────
const pages = []
for (let i = 0; i < CLUBS.length; i++) for (let j = i + 1; j < CLUBS.length; j++) {
  const a = CLUBS[i], b = CLUBS[j]
  const [small, big] = a.members.size < b.members.size ? [a.members, b.members] : [b.members, a.members]
  const shared = []
  for (const id of small) if (big.has(id)) shared.push(id)
  if (shared.length < PAIR_MIN_TOTAL) continue
  const famous = shared.filter(id => reco(id) >= STAR).length
  if (famous < PAIR_MIN_FAMOUS) continue
  // alphabetical club order for a stable, canonical slug (no A-and-B / B-and-A dupes)
  const [x, y] = a.slug < b.slug ? [a, b] : [b, a]
  const players = shared
    .map(id => ({ n: R.players.get(id).name, r: reco(id) }))
    .sort((p, q) => q.r - p.r)
    .slice(0, 80)
    .map(p => ({ n: p.n, s: p.r >= STAR }))
  pages.push({
    slug: `${x.slug}-and-${y.slug}`,
    aName: x.name, bName: y.name, aSlug: x.slug, bSlug: y.slug,
    total: shared.length, famous, notable: shared.filter(id => reco(id) >= 45).length,
    players,
  })
}

// ── Internal-link graph: each page links to other pages sharing a club ──────
const clubPages = new Map() // clubSlug → [page index]
pages.forEach((p, i) => { for (const cs of [p.aSlug, p.bSlug]) { if (!clubPages.has(cs)) clubPages.set(cs, []); clubPages.get(cs).push(i) } })
for (const p of pages) {
  const rel = new Set()
  for (const cs of [p.aSlug, p.bSlug]) for (const idx of clubPages.get(cs)) { const q = pages[idx]; if (q.slug !== p.slug) rel.add(q.slug) }
  // prefer the most substantial related pages
  p.related = [...rel].map(s => pages.find(q => q.slug === s)).sort((a, b) => b.famous - a.famous).slice(0, RELATED_MAX).map(q => q.slug)
}

// Club hub metadata (clubs that actually appear on a page, with their page count)
const hubClubs = CLUBS
  .filter(c => clubPages.has(c.slug))
  .map(c => ({ slug: c.slug, name: c.name, pages: clubPages.get(c.slug).length }))
  .sort((a, b) => a.name.localeCompare(b.name))

const outDir = path.join(__dirname, '..', '..', 'src', 'data', 'seo')
mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, 'relations.generated.json'), JSON.stringify({
  meta: { generatedAt: new Date().toISOString().slice(0, 10), pages: pages.length, clubs: hubClubs.length,
    gates: { CLUB_MIN_STARS, PAIR_MIN_FAMOUS, PAIR_MIN_TOTAL } },
  clubs: hubClubs, pages,
}, null, 2))

console.log(`relations: ${pages.length} "played for both" pages across ${hubClubs.length} clubs`)
console.log('clubs:', CLUBS.map(c => c.name).join(', '))
console.log('sample pages:', pages.slice(0, 5).map(p => `${p.aName}+${p.bName} (${p.total}, ${p.famous}★)`).join('  |  '))
