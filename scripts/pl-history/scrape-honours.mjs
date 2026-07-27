#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// TM-HISTORY SCRAPER — HONOURS   RFC-001 C11 (part 1)
//
// Fetches each player's honours (/erfolge/spieler/{id}) and caches trophies won.
// Canonicalisation into canonical Honour facts + the trophy categories that let
// C12 delete wikidata.generated is a separate OFFLINE build (build-honours.mjs).
//
// Universe: the RECOGNISABLE player set (recognisability >= MIN_RECOG) rather than
// all 42k — honours matter for players fans know, and trophy winners (Ballon d'Or,
// World Cup) are all highly recognisable, so this captures them while keeping the
// run tractable. Resumable + idempotent.
//
// RUN LOCALLY (Transfermarkt prefers residential IPs).
//
//   # PROBE FIRST (saves HTML so the honours parser can be confirmed):
//   node scripts/pl-history/scrape-honours.mjs --limit 20 --save-html
//
//   # FULL RUN (resumable):
//   npm run scrape:honours
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchHtml, parseHonours } from './lib.mjs'
import { DIR, DELAY_MS, BASE } from './config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const CACHE = path.join(DIR.root, 'cache', 'honours')
const HTML_DIR = path.join(CACHE, '_html')
const MIN_RECOG = 15 // scope to recognisable players (captures all trophy winners)

const args = process.argv.slice(2)
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : Infinity })()
const SAVE_HTML = args.includes('--save-html')
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const nameSlug = (name = '') => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'spieler'

// Universe: recognisable ids, with names for the URL slug.
function universe() {
  if (process.env.PLAYERS) return process.env.PLAYERS.split(',').map(s => ({ id: s.trim(), name: '' })).filter(p => p.id)
  const recog = JSON.parse(readFileSync(path.join(ROOT, 'src/data/recognisability.generated.json'), 'utf8')).byId
  const name = new Map()
  for (const c of ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']) for (const p of JSON.parse(readFileSync(path.join(ROOT, 'src/data/football501', `history.${c}.generated.json`), 'utf8')).players) if (!name.has(p.id)) name.set(p.id, p.name)
  return Object.entries(recog).filter(([, s]) => s >= MIN_RECOG).map(([id]) => ({ id, name: name.get(id) || '' }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
}

async function run() {
  mkdirSync(CACHE, { recursive: true })
  if (SAVE_HTML) mkdirSync(HTML_DIR, { recursive: true })
  const players = universe()
  const already = new Set(readdirSync(CACHE).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')))
  const todo = players.filter(p => !already.has(p.id)).slice(0, LIMIT)
  console.error(`Data source: transfermarkt.com (honours; recognisability >= ${MIN_RECOG})`)
  console.error(`Universe ${players.length} recognisable players — ${already.size} cached, ${todo.length} to fetch.\n`)

  const t0 = Date.now()
  let done = 0, withHonours = 0, failed = 0
  for (const p of todo) {
    try {
      const html = fetchHtml(`${BASE}/${nameSlug(p.name)}/erfolge/spieler/${p.id}`)
      const honours = parseHonours(html)
      if (SAVE_HTML) writeFileSync(path.join(HTML_DIR, `${p.id}.html`), html)
      writeFileSync(path.join(CACHE, `${p.id}.json`), JSON.stringify({ id: p.id, name: p.name, honours, fetchedAt: new Date().toISOString().slice(0, 10) }) + '\n')
      if (honours.length) withHonours++
    } catch (e) { failed++; console.error(`  ! ${p.id} (${p.name}): ${e.message.split('\n')[0]}`) }
    done++
    if (done % 25 === 0 || done === todo.length) {
      const rate = done / ((Date.now() - t0) / 1000), eta = rate > 0 ? Math.round((todo.length - done) / rate / 60) : 0
      console.error(`  ${done}/${todo.length}  (${withHonours} with honours, ${failed} failed)  ~${eta}m left`)
    }
    await sleep(DELAY_MS)
  }
  console.error(`\nDone. Fetched ${done} players (${withHonours} with honours, ${failed} failed). Cache: ${path.relative(process.cwd(), CACHE)}`)
  if (SAVE_HTML) console.error(`Probe HTML in ${path.relative(process.cwd(), HTML_DIR)} — inspect to confirm the parser.`)
}

run().catch(e => { console.error(e); process.exit(1) })
