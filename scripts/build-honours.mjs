#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD HONOURS  →  src/data/football501/honours.generated.json   (RFC-001 C11)
//
// Canonicalises the honours cache into canonical Honour facts: per player the
// trophies won (name + count), plus a trophy → winners index. Feeds the trophy
// CATEGORIES that let C12 drop wikidata.generated (build-categories reads this),
// and future "most decorated" gameplay.
//
//   node scripts/build-honours.mjs   (offline; reads the honours cache)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CACHE = path.join(ROOT, 'data', 'pl-history', 'cache', 'honours')
const OUT = path.join(ROOT, 'src', 'data', 'football501', 'honours.generated.json')

if (!existsSync(CACHE)) { console.error(`No honours cache — skipping (run \`npm run scrape:honours\`).`); process.exit(0) }

const byId = {}          // playerId → [[trophy, count]]
const trophies = {}      // trophy name → [playerId]  (winners index)
for (const f of readdirSync(CACHE).filter(f => f.endsWith('.json'))) {
  const j = JSON.parse(readFileSync(path.join(CACHE, f), 'utf8'))
  const id = String(j.id)
  const hs = (j.honours || []).filter(h => h.trophy)
  if (!hs.length) continue
  byId[id] = hs.map(h => [h.trophy, h.count || 1])
  for (const h of hs) (trophies[h.trophy] ||= []).push(id)
}

const meta = {
  schemaVersion: 1, source: 'transfermarkt:erfolge (scraped)',
  players: Object.keys(byId).length, trophyTypes: Object.keys(trophies).length,
  generatedAt: new Date().toISOString().slice(0, 10),
}
writeFileSync(OUT, JSON.stringify({ meta, byId, trophies }) + '\n')
const top = Object.entries(trophies).sort((a, b) => b[1].length - a[1].length).slice(0, 4).map(([t, w]) => `${t} (${w.length})`)
console.error(`✓ honours: ${Object.keys(byId).length} players, ${Object.keys(trophies).length} trophy types. Top: ${top.join(', ')}`)
