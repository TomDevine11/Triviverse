#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD CLUB-BADGE INDEX  →  src/data/badges.generated.json
//
// Every club we hold is keyed by its Transfermarkt id, and Transfermarkt serves
// a crest for that id at a deterministic URL:
//     https://tmssl.akamaized.net/images/wappen/head/<id>.png
// So instead of fuzzy-searching a third party by name (the old TheSportsDB build
// — slow, rate-limited, 192/208 coverage), we just map every club NAME our games
// display → its TM id. Crest lookup is then id-derived + ~100% coverage, from the
// same source as our facts. A missing badge 404s → the <Crest>/<CategoryIcon>
// onError handler shows a monogram, so the tail still degrades gracefully.
//
// Names come in three styles for the same club (careers short "Leeds", category
// clean "Leeds United", canonical full "Leeds United FC"), so we index BOTH the
// canonical names (clubs.index) and the careers short names (transfers.clubs),
// under a normalisation that strips club-type words — callers resolve either way.
//
//   node scripts/build-badges.mjs
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))

// MUST match the runtime clubKey (src/data/clubBadges.js) exactly.
export const clubKey = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[.'’]/g, '')                 // collapse initialisms first: a.s.→as, s.s.c.→ssc
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(fc|afc|cf|ac|ssc|as|cd|sc|sl|cp|ud|sd|sk|fk|club|de)\b/g, ' ')
  .replace(/\s+/g, ' ').trim()

const numId = (id) => String(id).replace(/^tm:/, '')

const clubsIndex = J('src/data/football501/clubs.index.generated.json').clubs || {}
const transferClubs = J('src/data/football501/transfers.generated.json').clubs || {}
const topIds = new Set(Object.keys(clubsIndex))

// key → id. Top-flight clubs (clubs.index) win; the long careers-only tail
// (transfers.clubs) fills remaining keys, smallest id first for determinism.
const map = {}
const put = (name, id, force) => {
  const k = clubKey(name)
  if (!k) return
  if (force) { map[k] = numId(id); return }
  if (map[k] == null) map[k] = numId(id)
}
for (const [id, c] of Object.entries(clubsIndex)) put(c.name, id, true)
for (const id of [...Object.keys(transferClubs)].sort((a, b) => (topIds.has(b) - topIds.has(a)) || (+a - +b))) {
  put(transferClubs[id], id, false)
}

writeFileSync(path.join(ROOT, 'src/data/badges.generated.json'),
  JSON.stringify({ meta: { source: 'transfermarkt (club id → crest)', generatedAt: new Date().toISOString().slice(0, 10), keys: Object.keys(map).length }, clubs: map }) + '\n')

// ── Coverage report against the names the games actually display ──────────
const resolves = (name) => map[clubKey(name)] != null
const report = (label, names) => {
  const uniq = [...new Set(names.filter(Boolean))]
  const hit = uniq.filter(resolves)
  const miss = uniq.filter((n) => !resolves(n))
  process.stderr.write(`  ${label}: ${hit.length}/${uniq.length} (${Math.round(100 * hit.length / uniq.length)}%)` +
    (miss.length ? `  — misses: ${miss.slice(0, 12).join(', ')}${miss.length > 12 ? ` …+${miss.length - 12}` : ''}` : '') + '\n')
}
const careers = J('src/data/careers.generated.json').players.flatMap((p) => p.clubs.map((c) => c.name))
const cats = J('src/data/categories.generated.json')
process.stderr.write(`Wrote badges.generated.json: ${Object.keys(map).length} keys\n`)
report('careers clubs', careers)
report('category clubs', Object.keys(cats.clubs || {}))
