// SEO relations engine — builds the "players who played for both X and Y" pages from
// a CURATED launch allowlist (scripts/seo/pairs.config.mjs), not an exhaustive sweep.
//
// Inclusion rule (fixed, honest): a player qualifies for a pair iff they have ≥1
// appearance for BOTH clubs' exact canonical ids, counted across our six top-flight
// competitions (Big-5 domestic leagues + Champions League). The registry's clubApps
// map already sums apps/goals over exactly those competitions per club id, so
// clubApps.get(cid).apps ≥ 1 is precisely "≥1 top-flight league or CL appearance for
// that club". 1–2 appearances are FLAGGED (low_apps_*), never excluded.
//
// Output: src/data/seo/relations.generated.json. Schema is a superset of the previous
// one (adds ids, per-club apps/goals, aliases, surname keys, per-player flags, tier,
// warnings, coverageNote) so src/seo/relations.js keeps working unchanged; the richer
// fields drive the interactive game (D3), matcher (pairMatch.js) and QC gate (D2).
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadRegistry } from '../qgen/registry.mjs'
import { CLUBS, PAIRS, PLAYER_ALIASES, COVERAGE_NOTE } from './pairs.config.mjs'
import { normName as norm, surnameKey } from '../../src/seo/pairMatch.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const R = loadRegistry()
const reco = (id) => R.players.get(id)?.reco || 0

const STAR = 55            // reco ≥ STAR → a "famous", readily-nameable player (framing only)
const NOTABLE = 45         // reco ≥ NOTABLE → notable (softer)
const LOW_APPS = 2         // ≤ this many apps at a club → QC flag (kept, not excluded)
const RELATED_MAX = 8

// ── Build the curated pages ──────────────────────────────────────────────────
const pages = []
for (const { a: aKey, b: bKey, tier } of PAIRS) {
  const A = CLUBS[aKey], B = CLUBS[bKey]
  if (!A || !B) throw new Error(`pairs.config: unknown club key ${aKey}/${bKey}`)
  // canonical alphabetical order by slug → stable URL, no A-and-B / B-and-A duplicates
  const [x, y] = A.slug < B.slug ? [A, B] : [B, A]

  const mx = R.clubMembers.get(x.id) || new Set()
  const my = R.clubMembers.get(y.id) || new Set()
  const [small, big] = mx.size < my.size ? [mx, my] : [my, mx]
  const sharedIds = []
  for (const id of small) if (big.has(id)) sharedIds.push(id)

  const players = sharedIds.map((id) => {
    const p = R.players.get(id)
    const ax = p.clubApps.get(x.id) || { apps: 0, goals: 0 }
    const ay = p.clubApps.get(y.id) || { apps: 0, goals: 0 }
    const flags = []
    if (ax.apps <= LOW_APPS) flags.push('low_apps_a')
    if (ay.apps <= LOW_APPS) flags.push('low_apps_b')
    return {
      id, n: p.name, s: reco(id) >= STAR,
      a: { apps: ax.apps, goals: ax.goals },   // a = x (first, alphabetical) club
      b: { apps: ay.apps, goals: ay.goals },   // b = y (second) club
      surname: surnameKey(p.name),
      aliases: (PLAYER_ALIASES[id] || []).map(norm),
      flags,
    }
  // Default order = combined appearances at the two clubs (desc), name tiebreak. This
  // is deterministic and uses existing data; it puts genuine mainstays (Figo, Luis
  // Enrique) first and sinks 1-app academy cases — avoiding the decayed-reco ordering
  // that wrongly ranked Marcos Alonso/Saviola ahead of Figo/Ronaldo. No new fame model.
  }).sort((p, q) => (q.a.apps + q.b.apps) - (p.a.apps + p.b.apps) || p.n.localeCompare(q.n))

  const famous = players.filter((p) => p.s).length
  const notable = players.filter((p) => reco(p.id) >= NOTABLE).length

  // QC warnings (non-fatal here; the D2 gate decides what blocks a launch)
  const warnings = []
  if (tier === 'rich' && players.length < 8) warnings.push(`rich tier but only ${players.length} qualifying players`)
  const doubleLow = players.filter((p) => p.flags.includes('low_apps_a') && p.flags.includes('low_apps_b'))
  if (doubleLow.length) warnings.push(`${doubleLow.length} player(s) with ≤${LOW_APPS} apps at BOTH clubs: ${doubleLow.map((p) => p.n).join(', ')}`)

  pages.push({
    slug: `${x.slug}-and-${y.slug}`,
    aName: x.name, bName: y.name, aSlug: x.slug, bSlug: y.slug, aId: x.id, bId: y.id,
    tier,
    total: players.length, totalQualifying: players.length, famous, notable,
    players,
    coverageNote: COVERAGE_NOTE,
    externalVerified: false,
    warnings,
  })
}

// ── Internal-link graph: link pairs that share a club (+ hub link added in relations.js) ──
const clubPages = new Map()
pages.forEach((p, i) => { for (const cs of [p.aSlug, p.bSlug]) { if (!clubPages.has(cs)) clubPages.set(cs, []); clubPages.get(cs).push(i) } })
for (const p of pages) {
  const rel = new Set()
  for (const cs of [p.aSlug, p.bSlug]) for (const idx of clubPages.get(cs)) { const q = pages[idx]; if (q.slug !== p.slug) rel.add(q.slug) }
  p.related = [...rel].map((s) => pages.find((q) => q.slug === s)).sort((a, b) => b.famous - a.famous).slice(0, RELATED_MAX).map((q) => q.slug)
}

const hubClubs = [...new Set(pages.flatMap((p) => [[p.aSlug, p.aName], [p.bSlug, p.bName]].map(JSON.stringify)))]
  .map((s) => JSON.parse(s)).map(([slug, name]) => ({ slug, name, pages: clubPages.get(slug).length }))
  .sort((a, b) => a.name.localeCompare(b.name))

const outDir = path.join(__dirname, '..', '..', 'src', 'data', 'seo')
mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, 'relations.generated.json'), JSON.stringify({
  meta: {
    generatedAt: new Date().toISOString().slice(0, 10),
    pages: pages.length, clubs: hubClubs.length,
    definition: COVERAGE_NOTE,
    inclusion: '>=1 appearance for each club across Big-5 top-flight leagues + Champions League',
  },
  clubs: hubClubs, pages,
}, null, 2) + '\n')

console.log(`relations: ${pages.length} curated "played for both" pages`)
for (const p of pages) {
  console.log(`  ${p.slug.padEnd(40)} ${String(p.total).padStart(3)} players (${p.famous}★, ${p.tier})` +
    (p.warnings.length ? `  ⚠ ${p.warnings.length}` : ''))
}
