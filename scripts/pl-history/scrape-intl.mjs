#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// TM-HISTORY SCRAPER — INTERNATIONAL (national-team caps + goals)   RFC-001 C7
//
// Fetches each player's Transfermarkt national-team page and caches caps + goals
// per national team. This is the extraction step; canonicalisation into
// performance.intl + national Teams is a separate offline build (build-intl.mjs),
// so this script only reaches the network and writes the raw cache.
//
// Player universe: the union of ids in the committed history.<comp> fact tables
// (everyone with a real club appearance). Resumable + idempotent: a player whose
// cache file already exists is skipped, so you can Ctrl-C and re-run freely.
//
// RUN LOCALLY (Transfermarkt prefers residential IPs; it blocks datacentre IPs).
//
//   # 1) PROBE FIRST — 20 players, also saves raw HTML so the parser can be
//   #    confirmed before the long run:
//   node scripts/pl-history/scrape-intl.mjs --limit 20 --save-html
//
//   # 2) FULL RUN (resumable; ~cache/intl/<id>.json per player):
//   npm run scrape:intl
//
//   # optional: target specific players →  PLAYERS=8198,28003 npm run scrape:intl
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchHtml, parseNationalTeam } from './lib.mjs'
import { DIR, DELAY_MS, BASE } from './config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const COMPS = ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']
const CACHE = path.join(DIR.root, 'cache', 'intl')
const HTML_DIR = path.join(CACHE, '_html')

const args = process.argv.slice(2)
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : Infinity })()
const SAVE_HTML = args.includes('--save-html')
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// name → TM url slug (cosmetic; TM resolves by id and curl -L follows the redirect).
const nameSlug = (name = '') => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'spieler'
const playerUrl = (id, name) => `${BASE}/${nameSlug(name)}/nationalmannschaft/spieler/${id}`
const cacheFile = (id) => path.join(CACHE, `${id}.json`)

// Build the player universe (id → best display name) from the committed facts.
function universe() {
  if (process.env.PLAYERS) return process.env.PLAYERS.split(',').map(s => ({ id: s.trim(), name: '' })).filter(p => p.id)
  const byId = new Map()
  for (const c of COMPS) {
    const j = JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', 'football501', `history.${c}.generated.json`), 'utf8'))
    for (const p of j.players) { const cur = byId.get(p.id); if (!cur || (p.name || '').length > cur.length) byId.set(p.id, p.name || '') }
  }
  return [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
}

async function run() {
  mkdirSync(CACHE, { recursive: true })
  if (SAVE_HTML) mkdirSync(HTML_DIR, { recursive: true })
  const players = universe()
  const already = new Set(readdirSync(CACHE).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')))
  const todo = players.filter(p => !already.has(p.id)).slice(0, LIMIT)
  console.error(`Data source: transfermarkt.com (national team)`)
  console.error(`Universe ${players.length} players — ${already.size} cached, ${todo.length} to fetch${LIMIT !== Infinity ? ` (limit ${LIMIT})` : ''}.\n`)

  const t0 = Date.now()
  let done = 0, withData = 0, failed = 0
  for (const p of todo) {
    try {
      const html = fetchHtml(playerUrl(p.id, p.name))
      const nt = parseNationalTeam(html)
      if (SAVE_HTML) writeFileSync(path.join(HTML_DIR, `${p.id}.html`), html)
      writeFileSync(cacheFile(p.id), JSON.stringify({ id: p.id, name: p.name, ...nt, fetchedAt: new Date().toISOString().slice(0, 10) }) + '\n')
      if (nt.caps > 0 || nt.team) withData++
    } catch (e) {
      failed++
      console.error(`  ! ${p.id} (${p.name}): ${e.message.split('\n')[0]}`)
    }
    done++
    if (done % 25 === 0 || done === todo.length) {
      const rate = done / ((Date.now() - t0) / 1000)
      const eta = rate > 0 ? Math.round((todo.length - done) / rate / 60) : 0
      console.error(`  ${done}/${todo.length}  (${withData} with NT data, ${failed} failed)  ~${eta}m left`)
    }
    await sleep(DELAY_MS)
  }
  console.error(`\nDone. Fetched ${done} players (${withData} with national-team data, ${failed} failed). Cache: ${path.relative(process.cwd(), CACHE)}`)
  if (SAVE_HTML) console.error(`Probe HTML saved to ${path.relative(process.cwd(), HTML_DIR)} — inspect to confirm the parser.`)
}

run().catch(e => { console.error(e); process.exit(1) })
