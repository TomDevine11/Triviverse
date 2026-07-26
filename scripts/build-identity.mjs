#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD PLAYER IDENTITY  (Phase 0 of the Player Identity Refactor)
//
// Creates and validates the identity FOUNDATION. It does NOT change any game
// behaviour — it only emits two new artifacts that later phases will consume:
//
//   src/data/canonical/players.registry.json   canonical records (one per person)
//   src/data/canonical/players.crosswalk.json  lookup indices (byRef / byAlias / retired)
//
// Rules (from docs/player-identity-refactor.md):
//   • internal player id is the PRIMARY identity; minted once, then persisted
//   • ids are NEVER recomputed from display names on a later build
//   • Transfermarkt ids / Wikidata QIDs are EXTERNAL references, not keys
//   • aliases are for INPUT MATCHING only; displayName is the canonical UI name
//   • reconciliation order: byRef → byAlias → deterministic normalized name → mint
//   • NEVER fuzzy-auto-merge. Fuzzy look-alikes go to a review report instead.
//     (False-positive merges are worse than duplicate identities.)
//
// Run:  node scripts/build-identity.mjs
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
// Reuse the ONE shared normaliser — never duplicate identity-critical logic.
import { normalize } from '../src/data/canonical/normalize.js'
import { fixName } from '../src/data/canonical/nameFixes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CANON = path.join(ROOT, 'src/data/canonical')
const REGISTRY_PATH = path.join(CANON, 'players.registry.json')
const CROSSWALK_PATH = path.join(CANON, 'players.crosswalk.json')
const AUDIT_PATH = path.join(ROOT, 'docs/player-identity-audit.md')

const SCHEMA = 1
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Curated ambiguity — mirrors the existing (un-exported) AMBIGUOUS_ALIASES in
// resolve.js / PLAYER_ALIASES in facts.js. This build becomes the source of
// truth for it in a later phase; for now it is the seed that proves the
// mechanism. A bare token here is NEVER minted as a single player; it resolves
// to the SET of real people it could mean.
export const SEED_AMBIGUOUS = {
  ronaldo: ['Cristiano Ronaldo', 'Ronaldo Nazário'],
}

// ── id helpers ──────────────────────────────────────────────────────────────
export function slugify(name) {
  return normalize(name).replace(/\s+/g, '-').replace(/^-|-$/g, '')
}
const natSlug = nats => (nats && nats[0] ? slugify(nats[0]) : '')

// ── fuzzy key (REVIEW ONLY — never used to merge) ────────────────────────────
// surname + first-3-of-first-name. Collisions become review candidates.
function fuzzyKey(name) {
  const parts = normalize(name).split(' ').filter(Boolean)
  return `${parts[parts.length - 1] || ''}|${(parts[0] || '').slice(0, 3)}`
}

// ─────────────────────────────────────────────────────────────────────────
// CORE: pure, deterministic reconciliation. Given prior state + sources +
// external-id index, produce { registry, crosswalk, report }. Order-stable.
// Exported so tests can drive it with synthetic inputs.
//
//   sources: [{ displayName, source, curated?, fame?, nationalities?, positions?, refs? }]
//   tmIndex: { normName -> [tmId, …] }   (external-ref enrichment; optional)
//   prior:   { registry: [...], crosswalk: {...} } | null
//   seedAmbiguous: { token -> [displayName, …] }
// ─────────────────────────────────────────────────────────────────────────
export function buildIdentity({ sources = [], tmIndex = {}, tmPositions = {}, wpPositions = {}, prior = null, seedAmbiguous = SEED_AMBIGUOUS } = {}) {
  const byId = new Map()        // id -> record
  const byAlias = new Map()     // normalized spelling -> id  (single) — mutated as we go
  const byRefLocal = new Map()  // "src:value" -> id
  const retired = { ...(prior?.crosswalk?.retired || {}) }
  const ambiguousTokens = new Map() // token -> Set(id)  (built at the end)

  const report = {
    sourcePlayerRows: 0,
    distinctInputNames: new Set(),
    minted: 0,
    reusedFromPrior: 0,
    tmAttached: 0,
    tmSkippedAmbiguous: new Set(),   // name -> multiple TM ids
    tmDroppedConflict: new Set(),    // TM id -> multiple identities
    normalizedCollisions: [],        // deterministic merges worth a human glance
    duplicateCandidates: [],         // fuzzy look-alikes (NOT merged)
    ambiguousStandalone: new Set(),  // bare ambiguous token seen as a whole name
  }

  const ambiguousSet = new Set(Object.keys(seedAmbiguous).map(normalize))

  // ── seed from prior build (stability spine) ────────────────────────────────
  if (prior?.registry) {
    for (const rec of prior.registry) {
      const r = { ...rec, aliases: [...(rec.aliases || [])], nationalities: [...(rec.nationalities || [])], positions: [...(rec.positions || [])] }
      byId.set(r.id, r)
      for (const a of r.aliases) byAlias.set(normalize(a), r.id)
      byAlias.set(normalize(r.displayName), r.id)
      for (const [k, v] of Object.entries(r.refs || {})) if (v != null) byRefLocal.set(`${k}:${v}`, r.id)
    }
  }

  const addAlias = (rec, spelling) => {
    const n = normalize(spelling)
    if (!n) return
    if (!rec.aliases.some(a => normalize(a) === n)) rec.aliases.push(spelling)
    if (!byAlias.has(n)) byAlias.set(n, rec.id)
  }

  const markAmbiguousToken = (rec, token) => {
    rec.ambiguousTokens = rec.ambiguousTokens || []
    if (!rec.ambiguousTokens.includes(token)) rec.ambiguousTokens.push(token)
  }

  // ── mint a brand-new identity (only when nothing matched) ──────────────────
  const mint = (displayName, seed) => {
    let id = slugify(displayName)
    if (byId.has(id)) {
      // Different person, identical slug → stable discriminator (frozen at mint).
      const disc = natSlug(seed.nationalities)
      let cand = disc ? `${id}-${disc}` : `${id}-2`
      let n = 2
      while (byId.has(cand)) cand = disc ? `${id}-${disc}-${n++}` : `${id}-${n++}`
      id = cand
    }
    const rec = {
      id,
      displayName,
      refs: { tm: null, qid: null, tsdb: null, wp: null, ...(seed.refs || {}) },
      aliases: [],
      fame: seed.fame || 0,
      curated: !!seed.curated,
      nationalities: [...(seed.nationalities || [])],
      positions: [...(seed.positions || [])],
    }
    // normalise null-vs-absent on refs
    for (const k of ['tm', 'qid', 'tsdb', 'wp']) if (rec.refs[k] === undefined) rec.refs[k] = null
    byId.set(id, rec)
    addAlias(rec, displayName)
    report.minted++
    return rec
  }

  // ── resolve one incoming player to a record (byRef → byAlias/name → mint) ──
  const resolve = (entry) => {
    const { displayName } = entry
    const n = normalize(displayName)
    if (!n) return null

    // A bare token that is curated-ambiguous is NOT one player → don't mint/merge.
    if (ambiguousSet.has(n)) { report.ambiguousStandalone.add(n); return null }

    // 1. external reference match (stable across renames & rebuilds)
    for (const [k, v] of Object.entries(entry.refs || {})) {
      if (v == null) continue
      const hit = byRefLocal.get(`${k}:${v}`)
      if (hit) return byId.get(hit)
    }
    // 2/3. alias / deterministic normalized-name match
    if (byAlias.has(n)) {
      const rec = byId.get(byAlias.get(n))
      if (rec) {
        // Deterministic SPLIT (not fuzzy): if the incoming row carries an external
        // ref that conflicts with the matched record's same-type ref, they are
        // different people who happen to share a name → mint a discriminated id
        // and mark the shared token ambiguous. (In the real build, name sources
        // carry no refs at ingest, so this only fires for ref-bearing inputs.)
        let conflict = false
        for (const [k, v] of Object.entries(entry.refs || {})) {
          if (v == null) continue
          if (rec.refs[k] != null && String(rec.refs[k]) !== String(v)) { conflict = true; break }
        }
        if (!conflict) {
          if (normalize(rec.displayName) !== n && report.normalizedCollisions.length < 5000)
            report.normalizedCollisions.push([n, rec.displayName, displayName])
          return rec
        }
        markAmbiguousToken(rec, n)
        const fresh = mint(displayName, entry)
        markAmbiguousToken(fresh, n)
        return fresh
      }
    }
    // 4. mint
    return mint(displayName, entry)
  }

  // ── ingest all sources in priority order ───────────────────────────────────
  for (const entry of sources) {
    if (!entry?.displayName) continue
    report.sourcePlayerRows++
    report.distinctInputNames.add(normalize(entry.displayName))
    const rec = resolve(entry)
    if (!rec) continue
    // merge facts / provenance onto the (possibly pre-existing) record
    if ((entry.fame || 0) > rec.fame) rec.fame = entry.fame
    if (entry.curated) rec.curated = true
    for (const nat of entry.nationalities || []) if (!rec.nationalities.includes(nat)) rec.nationalities.push(nat)
    for (const pos of entry.positions || []) if (!rec.positions.includes(pos)) rec.positions.push(pos)
    for (const [k, v] of Object.entries(entry.refs || {})) {
      if (v == null) continue
      if (rec.refs[k] == null) { rec.refs[k] = v; byRefLocal.set(`${k}:${v}`, rec.id) }
    }
    addAlias(rec, entry.displayName)
    for (const a of entry.aliases || []) addAlias(rec, a)
  }
  report.reusedFromPrior = prior?.registry ? prior.registry.length : 0

  // ── curated ambiguity: ensure targets exist, wire up the ambiguous token ──
  for (const [token, displayNames] of Object.entries(seedAmbiguous)) {
    const ids = []
    for (const dn of displayNames) {
      let rec = byId.get(byAlias.get(normalize(dn)))
      if (!rec) rec = mint(dn, { curated: true })  // stub so the ambiguity has real targets
      ids.push(rec.id)
    }
    ambiguousTokens.set(normalize(token), new Set(ids))
    for (const id of ids) {
      const rec = byId.get(id)
      rec.ambiguousTokens = rec.ambiguousTokens || []
      if (!rec.ambiguousTokens.includes(normalize(token))) rec.ambiguousTokens.push(normalize(token))
    }
  }

  // ── external-reference (Transfermarkt) enrichment — unambiguous only ───────
  // Order-INDEPENDENT: attach a tm id to a record iff exactly ONE tm id matches
  // its normalized name AND exactly ONE record wants that tm id AND no record
  // already owns it. A tm id wanted by >1 identity means the same TM player is
  // spelled two ways across our sources → a duplicate candidate, not a merge.
  const owned = new Set()
  for (const rec of byId.values()) if (rec.refs.tm != null) owned.add(rec.refs.tm)
  const want = new Map() // tmId -> [recId, …]  (built in sorted id order → deterministic)
  for (const rec of [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    if (rec.refs.tm != null) continue
    const cands = tmIndex[normalize(rec.displayName)]
    if (!cands || cands.length === 0) continue
    if (cands.length > 1) { report.tmSkippedAmbiguous.add(normalize(rec.displayName)); continue }
    const tmId = cands[0]
    if (!want.has(tmId)) want.set(tmId, [])
    want.get(tmId).push(rec.id)
  }
  for (const [tmId, recIds] of want) {
    if (owned.has(tmId) || recIds.length > 1) {
      report.tmDroppedConflict.add(tmId)
      if (recIds.length > 1) report.duplicateCandidates.push({ fuzzyKey: `tm:${tmId}`, ids: recIds.slice().sort(), names: recIds.map(i => byId.get(i).displayName) })
      continue
    }
    const rec = byId.get(recIds[0])
    rec.refs.tm = tmId
    byRefLocal.set(`tm:${tmId}`, rec.id)
    report.tmAttached++
  }

  // Backfill missing positions: Transfermarkt first (covers modern players),
  // then Wikidata P413 (covers pre-Transfermarkt legends known only via a
  // national team) — so the games' position badges are populated everywhere.
  for (const rec of byId.values()) {
    if (rec.positions.length) continue
    if (rec.refs.tm != null && tmPositions[rec.refs.tm]) { rec.positions = [tmPositions[rec.refs.tm]]; continue }
    const wp = wpPositions[normalize(rec.displayName)]
    if (wp) rec.positions = [wp]
  }

  // ── DUPLICATE CANDIDATES (review only — never merged) ──────────────────────
  const byFuzzy = new Map()
  for (const rec of byId.values()) {
    const f = fuzzyKey(rec.displayName)
    if (!byFuzzy.has(f)) byFuzzy.set(f, [])
    byFuzzy.get(f).push(rec.id)
  }
  for (const [f, ids] of byFuzzy) {
    if (ids.length > 1) report.duplicateCandidates.push({ fuzzyKey: f, ids: ids.slice().sort(), names: ids.map(i => byId.get(i).displayName) })
  }
  report.duplicateCandidates.sort((a, b) => a.fuzzyKey.localeCompare(b.fuzzyKey))

  // Names that Transfermarkt says are shared by >1 person but we merged into one
  // identity → flag the merged record for human review (possible namesake merge).
  for (const rec of byId.values()) {
    const cands = tmIndex[normalize(rec.displayName)]
    if (cands && cands.length > 1) { rec.reviewFlags = rec.reviewFlags || []; if (!rec.reviewFlags.includes('possible-namesake')) rec.reviewFlags.push('possible-namesake') }
  }

  // ── finalise deterministic, sorted outputs ─────────────────────────────────
  const registry = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
  for (const rec of registry) {
    rec.aliases.sort((a, b) => a.localeCompare(b))
    rec.nationalities.sort(); rec.positions.sort()
    if (rec.ambiguousTokens) rec.ambiguousTokens.sort()
    if (rec.reviewFlags) rec.reviewFlags.sort()
  }

  // byAlias: single id, OR array when a normalized token maps to >1 identity.
  const aliasToIds = new Map()
  for (const rec of registry) for (const a of new Set([rec.displayName, ...rec.aliases].map(normalize))) {
    if (!a) continue
    if (!aliasToIds.has(a)) aliasToIds.set(a, new Set())
    aliasToIds.get(a).add(rec.id)
  }
  for (const [token, ids] of ambiguousTokens) { // curated ambiguity wins
    if (!aliasToIds.has(token)) aliasToIds.set(token, new Set())
    for (const id of ids) aliasToIds.get(token).add(id)
  }
  const byAliasOut = {}
  for (const [a, ids] of [...aliasToIds].sort((x, y) => x[0].localeCompare(y[0]))) {
    byAliasOut[a] = ids.size === 1 ? [...ids][0] : [...ids].sort()
  }
  const byRefOut = {}
  for (const rec of registry) for (const [k, v] of Object.entries(rec.refs)) if (v != null) byRefOut[`${k}:${v}`] = rec.id

  const crosswalk = {
    meta: { schema: SCHEMA, generatedAt: new Date().toISOString().slice(0, 10), count: registry.length },
    byRef: sortKeys(byRefOut),
    byAlias: byAliasOut,
    retired: sortKeys(retired),
  }

  return { registry, crosswalk, report }
}

function sortKeys(obj) {
  return Object.fromEntries(Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0])))
}

// ─────────────────────────────────────────────────────────────────────────
// INTEGRITY CHECKS — throw with a clear message on any violation.
//   referencedIds: optional Set of ids that generated datasets point at.
// ─────────────────────────────────────────────────────────────────────────
export function runIntegrityChecks(registry, crosswalk, { referencedIds = null } = {}) {
  const errors = []
  const ids = new Set()

  // 1. duplicate internal ids
  for (const rec of registry) {
    if (ids.has(rec.id)) errors.push(`Duplicate internal id: ${rec.id}`)
    ids.add(rec.id)
  }
  // 4. invalid ids
  for (const rec of registry) if (!ID_RE.test(rec.id)) errors.push(`Invalid id format: "${rec.id}"`)

  // 2. one external id → multiple players
  const refOwner = new Map()
  for (const rec of registry) for (const [k, v] of Object.entries(rec.refs || {})) {
    if (v == null) continue
    const key = `${k}:${v}`
    if (refOwner.has(key) && refOwner.get(key) !== rec.id) errors.push(`External ref ${key} maps to multiple players: ${refOwner.get(key)} and ${rec.id}`)
    refOwner.set(key, rec.id)
  }

  // 3. alias resolves to multiple players WITHOUT ambiguity metadata
  const ambiguousRegistered = new Set()
  for (const rec of registry) for (const t of rec.ambiguousTokens || []) ambiguousRegistered.add(t)
  for (const [alias, target] of Object.entries(crosswalk.byAlias || {})) {
    if (Array.isArray(target) && target.length > 1 && !ambiguousRegistered.has(alias))
      errors.push(`Alias "${alias}" resolves to ${target.length} players but has no ambiguity metadata`)
  }

  // crosswalk internal consistency: every referenced id exists
  for (const [k, v] of Object.entries(crosswalk.byRef || {})) if (!ids.has(v)) errors.push(`byRef ${k} points at missing id ${v}`)
  for (const [k, v] of Object.entries(crosswalk.byAlias || {})) for (const id of (Array.isArray(v) ? v : [v])) if (!ids.has(id)) errors.push(`byAlias ${k} points at missing id ${id}`)
  for (const [oldId, newId] of Object.entries(crosswalk.retired || {})) if (!ids.has(newId)) errors.push(`retired ${oldId} points at missing id ${newId}`)

  // 5. generated datasets reference missing player ids
  if (referencedIds) for (const id of referencedIds) if (!ids.has(id)) errors.push(`Dataset references missing player id: ${id}`)

  if (errors.length) {
    const msg = `Identity integrity checks FAILED (${errors.length}):\n  - ${errors.join('\n  - ')}`
    const e = new Error(msg)
    e.errors = errors
    throw e
  }
  return true
}

// ─────────────────────────────────────────────────────────────────────────
// SOURCE COLLECTION — read every real dataset into flat ingest tuples.
// Curated first (owns display names), then imports.
// ─────────────────────────────────────────────────────────────────────────
async function collectSources() {
  const J = p => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
  const sources = []
  // Apply curated name fixes at ingest; keep the corrupt form as an alias so it
  // still resolves (careers/teammates/etc. may carry the pre-fix spelling).
  const push = (raw, extra = {}) => {
    if (!raw || typeof raw !== 'string') return
    const displayName = fixName(raw)
    const alias = displayName !== raw ? { aliases: [raw] } : {}
    sources.push({ displayName, ...alias, ...extra })
  }

  // 1. curated membership (owns display names)
  const mem = await import(path.join(CANON, 'membership.js'))
  for (const members of Object.values(mem.CLUB_MEMBERS)) for (const n of members) push(n, { curated: true, source: 'curated:club' })
  for (const [nat, members] of Object.entries(mem.NATIONALITY_MEMBERS)) for (const n of members) push(n, { curated: true, nationalities: [nat], source: 'curated:nat' })
  for (const members of Object.values(mem.TROPHY_MEMBERS)) for (const n of members) push(n, { curated: true, source: 'curated:trophy' })
  for (const members of Object.values(mem.MANAGER_MEMBERS)) for (const n of members) push(n, { curated: true, source: 'curated:mgr' })

  // 2. wikidata clubs / nationalities / trophies
  const wd = J('src/data/canonical/wikidata.generated.json')
  for (const list of Object.values(wd.clubs || {})) for (const p of list) push(p.name, { fame: p.fame, positions: p.positions || [], nationalities: p.nationalities || [], source: 'wikidata:club' })
  for (const [nat, list] of Object.entries(wd.nationalities || {})) for (const p of list) push(p.name, { fame: p.fame, nationalities: [nat], source: 'wikidata:nat' })
  for (const list of Object.values(wd.trophies || {})) for (const p of list) push(p.name, { fame: p.fame, source: 'wikidata:trophy' })

  // 3. five01 stat leaderboards
  const st = J('src/data/canonical/stats.generated.json')
  for (const ch of Object.values(st.challenges || {})) for (const n of Object.keys(ch.players || {})) push(n, { source: 'stats' })

  // 4. careers
  const car = J('src/data/careers.generated.json')
  for (const p of car.players || []) push(p.name, { source: 'careers' })

  // 5. teammates (targets + teammates)
  const tm = J('src/data/teammates.generated.json')
  for (const p of tm.players || []) { push(p.name, { source: 'teammates' }); for (const mate of p.teammates || []) push(mate.name, { fame: mate.fame, nationalities: mate.nationality ? [mate.nationality] : [], source: 'teammates:mate' }) }

  // 6. world cup squads
  const wc = J('src/data/wcsquads.generated.json')
  for (const s of wc.squads || []) for (const n of s.players || []) push(n, { nationalities: [s.nation], source: 'wcsquads' })

  // 7. wordle famous pool
  const fam = await import(path.join(ROOT, 'src/data/famousPlayers.js'))
  for (const p of fam.famousPlayers || []) push(p.name, { nationalities: p.nationality ? [p.nationality] : [], source: 'wordle' })

  return sources
}

// Transfermarkt position label → the registry's position vocabulary.
const TM_POS = {
  Goalkeeper: 'goalkeeper', Defender: 'defender', Midfield: 'midfielder', Attack: 'forward',
  GK: 'goalkeeper', DEF: 'defender', MID: 'midfielder', FWD: 'forward',
}

// Transfermarkt normalized-name → [tmId] index (external-ref enrichment only).
function collectTmIndex() {
  const J = p => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
  const idx = {}
  const add = arr => { for (const p of arr || []) { if (!p?.id || !p?.name) continue; const n = normalize(p.name); (idx[n] ||= new Set()).add(String(p.id)) } }
  for (const c of ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']) add(J(`src/data/football501/history.${c}.generated.json`).players)
  const out = {}
  for (const [n, set] of Object.entries(idx)) out[n] = [...set].sort()
  return out
}

// Wikidata P413 positions (name → registry term), from fetch-positions.mjs.
function collectWpPositions() {
  const p = path.join(ROOT, 'src/data/canonical/wikidata-positions.generated.json')
  if (!existsSync(p)) return {}
  const { positions = {} } = JSON.parse(readFileSync(p, 'utf8'))
  const out = {}
  for (const [name, term] of Object.entries(positions)) { const n = normalize(name); if (!out[n]) out[n] = term }
  return out
}

// Transfermarkt id → registry position term (for backfilling missing positions).
function collectTmPositions() {
  const J = p => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
  const pos = {}
  const add = arr => { for (const p of arr || []) { if (!p?.id) continue; const t = TM_POS[p.pos]; if (t && !pos[p.id]) pos[p.id] = t } }
  for (const c of ['GB1', 'ES1', 'IT1', 'FR1', 'L1', 'CL']) add(J(`src/data/football501/history.${c}.generated.json`).players)
  return pos
}

// ── audit report ─────────────────────────────────────────────────────────────
function renderAudit({ registry, crosswalk, report }) {
  const total = registry.length
  const withTm = registry.filter(r => r.refs.tm != null).length
  const withQid = registry.filter(r => r.refs.qid != null).length
  const noExt = registry.filter(r => r.refs.tm == null && r.refs.qid == null).length
  const aliasCount = registry.reduce((s, r) => s + r.aliases.length, 0)
  const ambiguousTokenList = Object.entries(crosswalk.byAlias).filter(([, v]) => Array.isArray(v) && v.length > 1).map(([k]) => k)
  const ambiguousAliases = ambiguousTokenList.length
  const dupExamples = report.duplicateCandidates.slice(0, 25)
  const pct = n => total ? `${(100 * n / total).toFixed(1)}%` : '0%'

  return `# Player Identity — Phase 0 Audit

_Generated by \`scripts/build-identity.mjs\`. This is a machine-produced report; do not hand-edit._

## Totals

| Metric | Value |
|---|---|
| Source player rows ingested | ${report.sourcePlayerRows} |
| Distinct input names (normalized) | ${report.distinctInputNames.size} |
| **Canonical identities generated** | **${total}** |
| Newly minted this build | ${report.minted} |

## External reference coverage

| Reference | Players | Coverage |
|---|---|---|
| Transfermarkt (\`refs.tm\`) | ${withTm} | ${pct(withTm)} |
| Wikidata QID (\`refs.qid\`) | ${withQid} | ${pct(withQid)} |
| **No external reference** | **${noExt}** | ${pct(noExt)} |

> QID coverage is 0% by design in Phase 0 — no QIDs are stored in the shipped
> data; persisting them is a later phase (Wikidata importer migration).

## Aliases

| Metric | Value |
|---|---|
| Total alias spellings recorded | ${aliasCount} |
| Ambiguous aliases (token → multiple players) | ${ambiguousAliases} |
| Bare ambiguous tokens seen as whole names | ${report.ambiguousStandalone.size} |

Ambiguous tokens: ${ambiguousTokenList.join(', ') || '(none)'}

## Duplicate candidates requiring review (NOT merged)

${report.duplicateCandidates.length} fuzzy look-alike group(s). These are **kept as
distinct identities** — false-positive merges are worse than duplicates. A human
should confirm which (if any) are truly the same person.

${dupExamples.length ? dupExamples.map(d => `- \`${d.fuzzyKey}\` — ${d.names.map(n => `**${n}**`).join('  ≠  ')}`).join('\n') : '_None._'}
${report.duplicateCandidates.length > dupExamples.length ? `\n_…and ${report.duplicateCandidates.length - dupExamples.length} more._` : ''}

## Unresolved conflicts

| Conflict | Count |
|---|---|
| Names Transfermarkt shares across >1 person (possible namesake merge) | ${registry.filter(r => r.reviewFlags?.includes('possible-namesake')).length} |
| Names skipped for TM ref (name → multiple TM ids) | ${report.tmSkippedAmbiguous.size} |
| TM ids dropped (id → multiple identities) | ${report.tmDroppedConflict.size} |

Records flagged \`possible-namesake\` carry a \`reviewFlags\` field in the registry
for follow-up in the Phase 1 manual review.
`
}

// ── main ─────────────────────────────────────────────────────────────────────
function loadPrior() {
  if (!existsSync(REGISTRY_PATH) || !existsSync(CROSSWALK_PATH)) return null
  return { registry: JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')), crosswalk: JSON.parse(readFileSync(CROSSWALK_PATH, 'utf8')) }
}

const POS_BADGE = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' }
const POSITIONS_PATH = path.join(CANON, 'players.positions.generated.json')

async function main() {
  const prior = loadPrior()
  const sources = await collectSources()
  const tmIndex = collectTmIndex()
  const tmPositions = collectTmPositions()
  const wpPositions = collectWpPositions()
  const { registry, crosswalk, report } = buildIdentity({ sources, tmIndex, tmPositions, wpPositions, prior })

  runIntegrityChecks(registry, crosswalk) // throws → non-zero exit on violation

  // Compact internal-id → position-badge map for the games' dropdowns.
  const positions = {}
  for (const rec of registry) { const b = POS_BADGE[rec.positions[0]]; if (b) positions[rec.id] = b }

  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 1) + '\n')
  writeFileSync(CROSSWALK_PATH, JSON.stringify(crosswalk, null, 1) + '\n')
  writeFileSync(POSITIONS_PATH, JSON.stringify(positions) + '\n')
  writeFileSync(AUDIT_PATH, renderAudit({ registry, crosswalk, report }))

  const withPos = registry.filter(r => r.positions.length).length
  process.stderr.write(
    `identity: ${registry.length} identities  (${report.minted} minted, ` +
    `${registry.filter(r => r.refs.tm != null).length} with TM ref, ` +
    `${withPos} with a position, ${report.duplicateCandidates.length} duplicate-candidate groups)\n`,
  )
}

// Run only when invoked directly (not when imported by tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { process.stderr.write((e.stack || e.message) + '\n'); process.exit(1) })
}
