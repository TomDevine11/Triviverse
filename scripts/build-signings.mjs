#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// Build signings.generated.json — each club's most expensive incoming transfers,
// slimmed from the 18 MB transfers table into a small client asset (the browser
// never sees the raw transfer history). Powers the "Record signings" population.
//
// We keep EVERY incoming transfer with a real fee (fee > 0) — a €35 m signing is
// as valid an answer as a €100 m one — deduped to a player's highest fee at that
// club, fees rounded to whole millions.
//   node scripts/build-signings.mjs
// ─────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'football501')
const d = JSON.parse(readFileSync(path.join(DATA, 'transfers.generated.json'), 'utf8'))

const byClub = {} // toTeamId → Map(playerId → highest fee in €m)
for (const [pid, , to, , feeEur] of d.transfers) {
  if (!feeEur || feeEur <= 0) continue
  const feeM = feeEur / 1e6
  const m = byClub[to] || (byClub[to] = new Map())
  if ((m.get(pid) || 0) < feeM) m.set(pid, feeM)
}

const clubs = {}, byClubOut = {}
for (const [id, m] of Object.entries(byClub)) {
  const arr = [...m.entries()].map(([pid, fee]) => [pid, Math.round(fee)]).filter(x => x[1] >= 1)
    .sort((a, b) => b[1] - a[1])
  if (arr.length < 8) continue
  byClubOut[id] = arr
  clubs[id] = { name: d.clubs[id]?.name || d.clubs[id] || id, total: arr.reduce((s, x) => s + x[1], 0) }
}

const out = {
  meta: { schemaVersion: 1, source: 'slim of transfers.generated.json (incoming, fee>0, top 60/club)', clubs: Object.keys(clubs).length, generatedAt: new Date().toISOString().slice(0, 10) },
  clubs, byClub: byClubOut,
}
const dest = path.join(DATA, 'signings.generated.json')
writeFileSync(dest, JSON.stringify(out))
console.error(`✓ signings: ${Object.keys(clubs).length} clubs, ${(readFileSync(dest).length / 1e6).toFixed(2)} MB`)
