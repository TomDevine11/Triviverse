#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// TM-HISTORY SCRAPER — WORLD CUP WINNING SQUADS   RFC-001 C9
//
// Fetches each World-Cup-winning nation's tournament squad (kader) page from
// Transfermarkt and caches the roster (player id + name). This REPLACES the
// Wikidata/Wikipedia importer (scripts/wikidata/import-wc-squads.mjs) — the last
// Wikipedia network dependency — so WC squads come from the one canonical source.
//
// One page per winning tournament (15 total, 1966–2022). The squad table is a
// tournament-scoped kader page:
//   /weltmeisterschaft/kader/pokalwettbewerb/WM{yy}/saison_id/{year}/verein/{natId}
// Transfermarkt resolves by the competition id (WM66 … WM22) + national-team
// verein id; the leading slug is cosmetic and the -L redirect follows it.
//
// Extraction only: canonicalisation into wcsquads.generated.json is a separate
// offline build (build-wcsquads.mjs). Resumable + idempotent — a tournament whose
// cache file already exists is skipped, so you can Ctrl-C and re-run freely.
//
// RUN LOCALLY (Transfermarkt prefers residential IPs; it blocks datacentre IPs).
//
//   # 1) PROBE FIRST — 2 tournaments, saves raw HTML so the parser can be
//   #    confirmed before the full run:
//   node scripts/pl-history/scrape-wcsquads.mjs --limit 2 --save-html
//
//   # 2) FULL RUN (resumable; cache/wcsquads/<year>-<nation>.json per squad):
//   npm run scrape:wcsquads
// ─────────────────────────────────────────────────────────────────────────

import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchHtml, parseWcSquad } from './lib.mjs'
import { DIR, DELAY_MS, BASE } from './config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE = path.join(DIR.root, 'cache', 'wcsquads')
const HTML_DIR = path.join(CACHE, '_html')

// The 15 winning tournaments → winning nation + its Transfermarkt national-team
// (verein) id. West Germany's 1974/1990 wins are filed under Germany (id 3262) on
// Transfermarkt, which keeps one continuous German NT record.
const NAT_ID = {
  Argentina: 3437, Brazil: 3439, France: 3377, Germany: 3262,
  'West Germany': 3262, Italy: 3376, Spain: 3375, England: 3299,
}
const YEAR_WINNER = {
  1966: 'England', 1970: 'Brazil', 1974: 'West Germany', 1978: 'Argentina',
  1982: 'Italy', 1986: 'Argentina', 1990: 'West Germany', 1994: 'Brazil',
  1998: 'France', 2002: 'Brazil', 2006: 'Italy', 2010: 'Spain',
  2014: 'Germany', 2018: 'France', 2022: 'Argentina',
}

const args = process.argv.slice(2)
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : Infinity })()
const SAVE_HTML = args.includes('--save-html')
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const comp = (year) => `WM${String(year % 100).padStart(2, '0')}`
const squadUrl = (year, natId) =>
  `${BASE}/weltmeisterschaft/kader/pokalwettbewerb/${comp(year)}/saison_id/${year}/verein/${natId}`
const slug = (nation) => nation.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const cacheFile = (year, nation) => path.join(CACHE, `${year}-${slug(nation)}.json`)

function universe() {
  return Object.entries(YEAR_WINNER)
    .map(([year, nation]) => ({ year: Number(year), nation, natId: NAT_ID[nation] }))
    .sort((a, b) => b.year - a.year)
}

async function run() {
  mkdirSync(CACHE, { recursive: true })
  if (SAVE_HTML) mkdirSync(HTML_DIR, { recursive: true })
  const squads = universe()
  const already = new Set(readdirSync(CACHE).filter(f => f.endsWith('.json')))
  const todo = squads.filter(s => !already.has(path.basename(cacheFile(s.year, s.nation)))).slice(0, LIMIT)
  console.error('Data source: transfermarkt.com (World Cup tournament squads)')
  console.error(`${squads.length} winning squads — ${already.size} cached, ${todo.length} to fetch${LIMIT !== Infinity ? ` (limit ${LIMIT})` : ''}.\n`)

  let done = 0, withData = 0, failed = 0
  for (const s of todo) {
    try {
      const html = fetchHtml(squadUrl(s.year, s.natId))
      const players = parseWcSquad(html)
      if (SAVE_HTML) writeFileSync(path.join(HTML_DIR, `${s.year}-${slug(s.nation)}.html`), html)
      writeFileSync(cacheFile(s.year, s.nation),
        JSON.stringify({ year: s.year, nation: s.nation, natId: s.natId, comp: comp(s.year), players, fetchedAt: new Date().toISOString().slice(0, 10) }) + '\n')
      const n = players.length
      if (n) withData++
      console.error(`  ${s.year} ${s.nation}: ${n} players${n && (n < 11 || n > 30) ? '  ⚠ unexpected count — check' : ''}`)
    } catch (e) {
      failed++
      console.error(`  ! ${s.year} ${s.nation}: ${e.message.split('\n')[0]}`)
    }
    done++
    await sleep(DELAY_MS)
  }
  console.error(`\nDone. Fetched ${done} squads (${withData} with players, ${failed} failed). Cache: ${path.relative(process.cwd(), CACHE)}`)
  if (SAVE_HTML) console.error(`Probe HTML saved to ${path.relative(process.cwd(), HTML_DIR)} — inspect to confirm the parser.`)
}

run().catch(e => { console.error(e); process.exit(1) })
