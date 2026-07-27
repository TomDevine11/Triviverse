#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// TM-HISTORY SCRAPER — TRANSFERS   RFC-001 C10 (part 1)
//
// Fetches each player's transfer history from Transfermarkt's structured JSON
// endpoint (/ceapi/transferHistory/list/{id}) and caches the RAW response. This
// is the extraction step only — canonicalisation into canonical Transfer facts
// is a separate OFFLINE build (build-transfers.mjs) written against the cached
// JSON, so no HTML/JSON parsing is guessed here.
//
// Player universe: the union of ids in the committed history.<comp> fact tables.
// Resumable + idempotent: a player whose cache file exists is skipped, so you can
// Ctrl-C and re-run freely.
//
// RUN LOCALLY (Transfermarkt prefers residential IPs).
//
//   # 1) PROBE FIRST — 20 players, confirms the endpoint returns transfer JSON:
//   node scripts/pl-history/scrape-transfers.mjs --limit 20
//
//   # 2) FULL RUN (resumable):
//   npm run scrape:transfers
//
//   # optional: target specific players →  PLAYERS=8198,28003 npm run scrape:transfers
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DIR, DELAY_MS, UA, RETRIES } from './config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const COMPS = ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']
const CACHE = path.join(DIR.root, 'cache', 'transfers')
const BASE = 'https://www.transfermarkt.com/ceapi/transferHistory/list'

const args = process.argv.slice(2)
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : Infinity })()
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const cacheFile = (id) => path.join(CACHE, `${id}.json`)

// Fetch the transfer-history JSON for a player id (curl works where node fetch is
// blocked). Returns the raw response text (validated as JSON before caching).
function fetchJson(id) {
  let lastErr
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const txt = execFileSync('curl', ['-s', '-L', '-m', '30', '-A', UA, '-H', 'Accept: application/json', `${BASE}/${id}`],
        { maxBuffer: 16 * 1024 * 1024, encoding: 'utf8' })
      JSON.parse(txt) // validate; throws → retry
      return txt
    } catch (e) { lastErr = e }
  }
  throw new Error(`fetch failed after ${RETRIES} tries: ${id} — ${lastErr?.message?.split('\n')[0] || ''}`)
}

function universe() {
  if (process.env.PLAYERS) return process.env.PLAYERS.split(',').map(s => s.trim()).filter(Boolean)
  const ids = new Set()
  for (const c of COMPS) for (const p of JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', 'football501', `history.${c}.generated.json`), 'utf8')).players) ids.add(p.id)
  return [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

async function run() {
  mkdirSync(CACHE, { recursive: true })
  const players = universe()
  const already = new Set(readdirSync(CACHE).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')))
  const todo = players.filter(id => !already.has(id)).slice(0, LIMIT)
  console.error(`Data source: transfermarkt.com (transferHistory)`)
  console.error(`Universe ${players.length} players — ${already.size} cached, ${todo.length} to fetch${LIMIT !== Infinity ? ` (limit ${LIMIT})` : ''}.\n`)

  const t0 = Date.now()
  let done = 0, withTransfers = 0, failed = 0
  for (const id of todo) {
    try {
      const txt = fetchJson(id)
      writeFileSync(cacheFile(id), txt.endsWith('\n') ? txt : txt + '\n')
      const n = JSON.parse(txt)?.transfers?.length || 0
      if (n) withTransfers++
    } catch (e) { failed++; console.error(`  ! ${id}: ${e.message}`) }
    done++
    if (done % 25 === 0 || done === todo.length) {
      const rate = done / ((Date.now() - t0) / 1000)
      const eta = rate > 0 ? Math.round((todo.length - done) / rate / 60) : 0
      console.error(`  ${done}/${todo.length}  (${withTransfers} with transfers, ${failed} failed)  ~${eta}m left`)
    }
    await sleep(DELAY_MS)
  }
  console.error(`\nDone. Fetched ${done} players (${withTransfers} with transfers, ${failed} failed). Cache: ${path.relative(process.cwd(), CACHE)}`)
}

run().catch(e => { console.error(e); process.exit(1) })
