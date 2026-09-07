// qgen/registry — the "what is TRUE" layer.
//
// One unified, build-time player model assembled from the canonical/derived
// artefacts (all Transfermarkt-sourced). Nothing here decides what is a good
// question — it only exposes complete, canonical facts about every player so the
// predicate engine can compute VALIDATION-complete answer sets. Recognisability
// is carried as an ATTRIBUTE (a soft signal for generation), never as a filter on
// membership. This module deliberately does not import anything from src/data/*.js
// runtime code — it reads the generated JSON directly, like the other build scripts.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const COMPS = ['GB1', 'ES1', 'IT1', 'L1', 'FR1', 'CL']
export const LEAGUE_COMPS = ['GB1', 'ES1', 'IT1', 'L1', 'FR1'] // domestic leagues (CL is cross-league)
export const COMP_NAME = {
  GB1: 'the Premier League', ES1: 'La Liga', IT1: 'Serie A',
  L1: 'the Bundesliga', FR1: 'Ligue 1', CL: 'the Champions League',
}

const D = '../../src/data/football501/'

// Assemble the registry once. Returns plain data structures (Maps/Sets) so the
// predicate layer can do fast set algebra over player-id strings.
export function loadRegistry() {
  const players = new Map()   // id -> Player
  const clubName = new Map()  // cid -> display name
  const clubLeague = new Map()// cid -> domestic COMP (prefer league over CL)

  const getP = (id, name, pos, last, nat) => {
    let p = players.get(id)
    if (!p) {
      p = {
        id, name, pos: pos || null, last: last || 0,
        comps: {},                 // COMP -> { apps, goals }
        clubApps: new Map(),       // cid -> { apps, goals } (summed across comps)
        leagues: new Set(),        // COMPs actually appeared in
        nats: new Set(),           // nationality display names
        trophies: new Map(),       // trophy name -> count
        caps: new Map(),           // national-team id -> { caps, goals }
        reco: 0,
      }
      players.set(id, p)
    }
    if (name && !p.name) p.name = name
    if (pos) p.pos = pos
    if ((last || 0) > p.last) p.last = last
    if (nat) p.nats.add(nat)
    return p
  }

  for (const comp of COMPS) {
    const h = require(`${D}history.${comp}.generated.json`)
    for (const [cid, c] of Object.entries(h.clubs || {})) {
      if (!clubName.has(cid)) clubName.set(cid, c.name)
      // domestic league wins over CL for a club's "home" competition label
      if (comp !== 'CL' && !clubLeague.has(cid)) clubLeague.set(cid, comp)
    }
    for (const raw of h.players) {
      const p = getP(raw.id, raw.name, raw.pos, raw.last, raw.nat)
      const cc = raw.comps?.[comp]
      if (!cc) continue
      const prev = p.comps[comp] || { apps: 0, goals: 0 }
      p.comps[comp] = { apps: prev.apps + (cc.apps || 0), goals: prev.goals + (cc.goals || 0) }
      if ((cc.apps || 0) >= 1) p.leagues.add(comp)
      for (const [cid, cv] of Object.entries(cc.clubs || {})) {
        const cur = p.clubApps.get(cid) || { apps: 0, goals: 0 }
        p.clubApps.set(cid, { apps: cur.apps + (cv.apps || 0), goals: cur.goals + (cv.goals || 0) })
      }
    }
  }

  // Honours (won trophies) — complete canonical membership.
  const honours = require(`${D}honours.generated.json`)
  for (const [id, list] of Object.entries(honours.byId || {})) {
    const p = players.get(id)
    if (!p) continue // only attach to players who appear in our 6 competitions
    for (const [trophy, count] of list) p.trophies.set(trophy, count)
  }

  // International caps/goals.
  const intl = require(`${D}intl.generated.json`)
  const nationName = new Map(Object.entries(intl.teams || {}))
  for (const [id, tid, caps, goals] of intl.intl || []) {
    const p = players.get(id)
    if (!p) continue
    p.caps.set(tid, { caps: caps || 0, goals: goals || 0 })
  }

  // Recognisability (contemporary fan fame, 0-100) — a soft attribute only.
  const reco = require('../../src/data/recognisability.generated.json')
  for (const [id, score] of Object.entries(reco.byId || {})) {
    const p = players.get(id)
    if (p) p.reco = score
  }

  // Club roster sizes (appearance-based membership) for family enumeration.
  const clubMembers = new Map() // cid -> Set(playerId)
  for (const p of players.values()) {
    for (const cid of p.clubApps.keys()) {
      let s = clubMembers.get(cid); if (!s) clubMembers.set(cid, s = new Set())
      s.add(p.id)
    }
  }

  return {
    players, clubName, clubLeague, clubMembers, nationName,
    comps: COMPS,
    // convenience: trophies index name -> Set(playerId) restricted to our universe
    trophyIndex: buildTrophyIndex(players),
    natIndex: buildNatIndex(players),
  }
}

function buildTrophyIndex(players) {
  const idx = new Map()
  for (const p of players.values()) {
    for (const trophy of p.trophies.keys()) {
      let s = idx.get(trophy); if (!s) idx.set(trophy, s = new Set())
      s.add(p.id)
    }
  }
  return idx
}
function buildNatIndex(players) {
  const idx = new Map()
  for (const p of players.values()) {
    for (const nat of p.nats) {
      let s = idx.get(nat); if (!s) idx.set(nat, s = new Set())
      s.add(p.id)
    }
  }
  return idx
}

// Recency multiplier shared by scoring (matches the existing Pointless curve).
export const recency = (last) => 0.6 + 0.4 * Math.min(1, Math.max(0, (last - 1992) / (2026 - 1992)))

export const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
