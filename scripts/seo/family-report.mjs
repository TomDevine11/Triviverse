// SEO family report — the feedback loop for iterating on the page architecture.
// Buckets the indexable URL inventory (from the built sitemap) and the latest
// Search Console snapshot by PAGE FAMILY (home / games / answers / relations), so we
// can see which families earn impressions, which are dead weight, and where the
// striking-distance opportunities are — rather than reading one keyword at a time.
//
// Run after a build. GSC section is skipped gracefully if no snapshot exists.
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(HERE, '..', '..', 'dist')
const SITE = 'https://triviverse.com'

const familyOf = (p) => {
  if (p === '/' || p === '/es') return 'home'
  if (p.startsWith('/players-who-played-for/')) return 'relation-page'
  if (p === '/players-who-played-for') return 'relation-hub'
  if (p.endsWith('/answers')) return 'answers-archive'
  return 'game/landing'
}

// ── Indexable inventory by family (from the built sitemap) ──────────────────
const inv = {}
if (existsSync(path.join(DIST, 'sitemap.xml'))) {
  const sm = readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8')
  for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const p = m[1].replace(SITE, '').replace(/^\/es/, '') || '/'
    inv[familyOf(p)] = (inv[familyOf(p)] || 0) + 1
  }
  console.log('=== INDEXABLE URLs BY FAMILY (sitemap) ===')
  for (const [k, v] of Object.entries(inv).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`)
  console.log(`  ${String(Object.values(inv).reduce((a, b) => a + b, 0)).padStart(4)}  TOTAL`)
} else {
  console.log('(no dist/sitemap.xml — run `npm run build` first)')
}

// ── Performance by family (from the latest GSC snapshot, if present) ─────────
const snap = path.join(HERE, 'reports', 'search-console-latest.json')
if (existsSync(snap)) {
  const d = JSON.parse(readFileSync(snap, 'utf8'))
  const agg = {}
  for (const row of d.topPages || []) {
    const fam = familyOf(row.page.replace(SITE, '').replace(/^\/es/, '') || '/')
    const a = agg[fam] ||= { clicks: 0, impressions: 0, pages: 0, posSum: 0 }
    a.clicks += row.clicks; a.impressions += row.impressions; a.pages++; a.posSum += row.position
  }
  console.log(`\n=== SEARCH CONSOLE BY FAMILY (${d.lookbackDays || '?'}-day, as of ${(d.generatedAt || '').slice(0, 10)}) ===`)
  console.log('  family              pages  clicks   impr   avg-pos')
  for (const [k, a] of Object.entries(agg).sort((x, y) => y[1].clicks - x[1].clicks)) {
    console.log(`  ${k.padEnd(18)} ${String(a.pages).padStart(5)} ${String(a.clicks).padStart(7)} ${String(a.impressions).padStart(6)}   ${(a.posSum / a.pages).toFixed(1)}`)
  }
  console.log('\nNOTE: the relation cluster is brand-new — expect zero GSC data until Google')
  console.log('crawls + indexes it. Re-run after a fresh crawl to see which pairs earn impressions.')
} else {
  console.log('\n(no Search Console snapshot — run `npm run search-console-report` when credentials are configured)')
}
