#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// PL-HISTORY — AGGREGATE CACHE → FACT TABLE
//
// Reads the cached club-seasons and sums each player's all-time competition
// Appearances + Goals (with a per-club breakdown for the Club filter), into the
// same fact shape the challenge resolver consumes. Names come from the scrape;
// club display names from the pl-history clubs.csv scaffold; nationality is
// normalised with the shared game normaliser.
//
//   npm run build:pl-history
// ─────────────────────────────────────────────────────────────────────────

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { DIR, OUT_FACTS, COMPETITION } from './config.mjs'
import { normalize, normalizeCountry } from './normalize.mjs'

// Prettify a Transfermarkt club slug → display name ("fc-barcelona" → "FC
// Barcelona"). Used for non-PL clubs, which aren't in the PL scaffold.
const ABBR = new Set(['fc', 'cf', 'ac', 'sc', 'sd', 'rc', 'ud', 'cd', 'ss', 'as', 'us', 'ogc', 'rcd', 'afc', 'sl', 'sv', 'vfb', 'vfl', 'tsg', 'bsc', 'kv', 'rb'])
function slugToName(slug = '') {
  return slug.split('-').filter(Boolean).map(w => {
    if (/^\d+$/.test(w)) return `${w}.`
    if (ABBR.has(w)) return w.toUpperCase()
    return w.charAt(0).toUpperCase() + w.slice(1)
  }).join(' ').trim()
}

// clubId → English display name, scraped from competition pages (all comps).
function loadTmClubNames() {
  const f = path.join(DIR.root, `clubnames.${COMPETITION.id}.json`)
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}
}

// clubId → display name, from the scaffold clubs.csv (covers all PL clubs 1992+).
function loadClubNames() {
  const f = path.join(DIR.root, 'clubs.csv')
  const names = {}
  if (!existsSync(f)) return names
  const lines = readFileSync(f, 'utf8').split('\n')
  const header = lines[0].split(',')
  const iName = header.indexOf('Team Name'), iId = header.indexOf('Team ID')
  for (const line of lines.slice(1)) {
    const c = line.split(',')
    if (c[iId]) names[c[iId].trim()] = (c[iName] || '').replace(/_/g, ' ').trim()
  }
  return names
}

function loadPositions() {
  const f = path.join(DIR.root, 'positions.json')
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}
}

function build() {
  const clubNames = loadClubNames()
  const tmClubNames = loadTmClubNames()
  const positions = loadPositions()
  const files = readdirSync(DIR.cache).filter(f => f.endsWith('.json'))
  if (!files.length) { console.error('No cache found — run `npm run scrape:pl-history` first.'); process.exit(1) }

  const players = new Map() // id → { id, name, nat, natKey, comps }
  const clubIds = new Set()
  const clubSlug = new Map() // clubId → slug (for name fallback)
  const clubLast = new Map() // clubId → most recent season in this competition
  const posCounts = new Map() // id → { GK: n, DEF: n, ... } from scrape-captured position
  let seasons = new Set()

  for (const f of files) {
    const { season, clubId, slug, players: rows } = JSON.parse(readFileSync(path.join(DIR.cache, f), 'utf8'))
    seasons.add(season)
    if (slug && !clubSlug.has(clubId)) clubSlug.set(clubId, slug)
    clubLast.set(clubId, Math.max(clubLast.get(clubId) || 0, Number(season) || 0))
    for (const r of rows) {
      if (!(r.apps > 0)) continue // only real appearances count toward the eligible set
      let p = players.get(r.id)
      if (!p) { p = { id: r.id, name: r.name, natRaw: r.nat, comps: { [COMPETITION.id]: { apps: 0, goals: 0, clubs: {} } } }; players.set(r.id, p) }
      if (r.name && r.name.length > (p.name || '').length) p.name = r.name // prefer fuller name
      if (!p.natRaw && r.nat) p.natRaw = r.nat
      if (r.pos) { const e = posCounts.get(r.id) || {}; e[r.pos] = (e[r.pos] || 0) + 1; posCounts.set(r.id, e) }
      p.last = Math.max(p.last || 0, Number(season) || 0) // most recent season played (for recency weighting)
      const comp = p.comps[COMPETITION.id]
      comp.apps += r.apps; comp.goals += r.goals
      const club = (comp.clubs[clubId] ||= { apps: 0, goals: 0 })
      club.apps += r.apps; club.goals += r.goals
      clubIds.add(clubId)
    }
  }

  // Modal position from the scrape; fall back to positions.json (GB1 scaffold).
  const primaryPos = (id) => {
    const e = posCounts.get(id)
    if (e) return Object.entries(e).sort((a, b) => b[1] - a[1])[0][0]
    return positions[id] || ''
  }

  const out = [...players.values()].map(p => {
    const c = normalizeCountry(p.natRaw || '')
    return { id: p.id, name: p.name, nat: c.display, natKey: c.key, pos: primaryPos(p.id), last: p.last, comps: p.comps }
  }).sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }))

  const clubsIndex = {}
  for (const id of [...clubIds].sort()) {
    const name = tmClubNames[id] || clubNames[id] || slugToName(clubSlug.get(id)) || `#${id}`
    clubsIndex[id] = { name, norm: normalize(name), competitionId: COMPETITION.id, last: clubLast.get(id) || 0 }
  }

  const sorted = [...seasons].sort((a, b) => a - b)
  const meta = {
    source: 'transfermarkt:leistungsdaten (scraped)', competition: COMPETITION,
    seasons: sorted.length ? `${sorted[0]}–${sorted[sorted.length - 1]}` : '', clubSeasons: files.length,
    players: out.length, builtAt: new Date().toISOString().slice(0, 10),
  }
  writeFileSync(OUT_FACTS, JSON.stringify({ meta, players: out, clubs: clubsIndex }, null, 1) + '\n')
  console.error(`✓ ${out.length} players across ${meta.seasons} → ${path.relative(process.cwd(), OUT_FACTS)}`)

  // Quick top-scorer / most-appearances sanity print.
  const cid = COMPETITION.id
  const topG = [...out].sort((a, b) => b.comps[cid].goals - a.comps[cid].goals).slice(0, 5)
  const topA = [...out].sort((a, b) => b.comps[cid].apps - a.comps[cid].apps).slice(0, 5)
  console.error('  top goals:', topG.map(p => `${p.name} ${p.comps[cid].goals}`).join(', '))
  console.error('  top apps: ', topA.map(p => `${p.name} ${p.comps[cid].apps}`).join(', '))
}

build()
