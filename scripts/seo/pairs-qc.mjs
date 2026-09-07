#!/usr/bin/env node
// D2 — QC pipeline for the curated player-pair pilot. A FIRST-CLASS, deterministic
// gate, not a manual afterthought. It:
//   1. Independently recomputes each pair's qualifying set straight from the raw
//      history files (Big-5 leagues + CL), with a per-club league-vs-CL split, and
//      cross-checks it against the generated relations.json (catches builder bugs).
//   2. Emits, per pair: total qualifying, every player's canonical id + apps at both
//      clubs, low-app flags, CL-only flags, ambiguous-surname / duplicate-name notes,
//      B-team/entity-contamination checks, suspicious-total warnings, and the external
//      verification status.
//   3. Applies tier-appropriate severity and exits non-zero if anything BLOCKS launch.
//
// Definition (must match build-relations.mjs exactly): a player qualifies for a pair
// iff they have >=1 appearance for BOTH clubs' exact ids across GB1/ES1/IT1/L1/FR1/CL.
//
//   npm run pairs-qc            human report + JSON snapshot; non-zero exit on blockers
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { CLUBS, PAIRS } from './pairs.config.mjs'
import { normName, surnameKey } from '../../src/seo/pairMatch.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(HERE, '..', '..', 'src', 'data', 'football501')
const LEAGUE = ['GB1', 'ES1', 'IT1', 'L1', 'FR1']
const COMPS = [...LEAGUE, 'CL']
const LOW_APPS = 2
const RICH_FLOOR = 8   // a "rich" pair below this many qualifying players is suspicious

const gen = JSON.parse(readFileSync(path.join(HERE, '..', '..', 'src', 'data', 'seo', 'relations.generated.json'), 'utf8'))
const ext = JSON.parse(readFileSync(path.join(HERE, 'external-verification.json'), 'utf8')).pairs
const genBySlug = new Map(gen.pages.map((p) => [p.slug, p]))

// ── Independent recompute from raw comp files: (playerId,cid) → {lg, cl} apps ──
const club = new Map()      // cid → set of playerIds with >=1 app there
const split = new Map()     // `${id}|${cid}` → { lg, cl }
const nameOf = new Map()    // playerId → name
const clubEntity = new Map()// cid → club display name (from raw data)
for (const comp of COMPS) {
  const h = JSON.parse(readFileSync(path.join(DATA, `history.${comp}.generated.json`), 'utf8'))
  for (const [cid, c] of Object.entries(h.clubs || {})) if (!clubEntity.has(cid)) clubEntity.set(cid, c.name)
  const kind = comp === 'CL' ? 'cl' : 'lg'
  for (const pl of h.players) {
    if (pl.name && !nameOf.has(pl.id)) nameOf.set(pl.id, pl.name)
    const clubs = pl.comps?.[comp]?.clubs || {}
    for (const [cid, cv] of Object.entries(clubs)) {
      const apps = cv.apps || 0
      if (apps <= 0) continue
      const k = `${pl.id}|${cid}`
      const s = split.get(k) || { lg: 0, cl: 0 }
      s[kind] += apps; split.set(k, s)
      let set = club.get(cid); if (!set) club.set(cid, set = new Set())
      set.add(pl.id)
    }
  }
}
const appsAt = (id, cid) => { const s = split.get(`${id}|${cid}`) || { lg: 0, cl: 0 }; return { ...s, total: s.lg + s.cl } }

// ── Per-pair QC ──
const BTEAM = /\b(castilla|reserv|amateure?|youth|academy|\bii\b|\bb\b|b-team|feyenoord b)\b/i
const report = []
let blockers = 0, warns = 0

for (const { a: aKey, b: bKey, tier } of PAIRS) {
  const A = CLUBS[aKey], B = CLUBS[bKey]
  const [x, y] = A.slug < B.slug ? [A, B] : [B, A]   // canonical alphabetical (a=x, b=y)
  const slug = `${x.slug}-and-${y.slug}`
  const g = genBySlug.get(slug)
  const issues = []            // { sev: 'BLOCK'|'WARN'|'INFO', msg }
  const add = (sev, msg) => issues.push({ sev, msg })

  // independent qualifying set
  const mx = club.get(x.id) || new Set(), my = club.get(y.id) || new Set()
  const qualified = [...mx].filter((id) => my.has(id))
    .map((id) => ({ id, name: nameOf.get(id), a: appsAt(id, x.id), b: appsAt(id, y.id) }))
    .filter((p) => p.a.total >= 1 && p.b.total >= 1)
    .sort((p, q) => (q.a.total + q.b.total) - (p.a.total + p.b.total) || String(p.name).localeCompare(String(q.name)))

  // (1) cross-check independent recompute vs the generated file
  if (!g) add('BLOCK', `no generated page for ${slug}`)
  else {
    const genIds = new Set(g.players.map((p) => String(p.id)))
    const qIds = new Set(qualified.map((p) => String(p.id)))
    const onlyGen = [...genIds].filter((id) => !qIds.has(id))
    const onlyQc = [...qIds].filter((id) => !genIds.has(id))
    if (onlyGen.length || onlyQc.length) add('BLOCK', `builder/QC mismatch — genOnly:[${onlyGen.join(',')}] qcOnly:[${onlyQc.join(',')}]`)
    if (g.total !== qualified.length) add('BLOCK', `total mismatch — generated ${g.total} vs recomputed ${qualified.length}`)
  }

  // (2) B-team / entity contamination on the configured club ids
  for (const c of [x, y]) {
    const ent = clubEntity.get(c.id) || ''
    if (BTEAM.test(ent)) add('BLOCK', `club id ${c.id} looks like a B-team/reserve entity: "${ent}"`)
  }

  // (3) definition invariant + low-apps + CL-only per player
  const lowApps = [], clOnly = []
  for (const p of qualified) {
    if (p.a.total < 1 || p.b.total < 1) add('BLOCK', `${p.name} (${p.id}) violates >=1-app rule: a=${p.a.total} b=${p.b.total}`)
    if (p.a.total <= LOW_APPS || p.b.total <= LOW_APPS) lowApps.push(`${p.name} [${x.name} ${p.a.total} / ${y.name} ${p.b.total}]`)
    const clFlags = []
    if (p.a.cl >= 1 && p.a.lg === 0) clFlags.push(x.name)
    if (p.b.cl >= 1 && p.b.lg === 0) clFlags.push(y.name)
    if (clFlags.length) clOnly.push(`${p.name} (CL-only at ${clFlags.join(' & ')})`)
  }

  // (4) canonical-id / duplicate-name / ambiguous-surname checks
  const byId = {}; for (const p of qualified) (byId[p.id] ??= []).push(p.name)
  for (const [id, ns] of Object.entries(byId)) if (ns.length > 1) add('BLOCK', `duplicate id ${id} appears ${ns.length}× — ${ns.join('/')}`)
  const byFull = {}; for (const p of qualified) (byFull[normName(p.name)] ??= []).push(p.id)
  for (const [nm, ids] of Object.entries(byFull)) if (ids.length > 1) add('WARN', `duplicate full name "${nm}" → ids ${ids.join(',')} (matcher will ask to disambiguate)`)
  const bySur = {}; for (const p of qualified) (bySur[surnameKey(p.name)] ??= []).push(p.name)
  const ambigSur = Object.entries(bySur).filter(([, ns]) => ns.length > 1)
  for (const [s, ns] of ambigSur) add('INFO', `ambiguous surname "${s}" → ${ns.join(' / ')} (disambiguation required)`)

  // (5) suspicious total for rich tier
  if (tier === 'rich' && qualified.length < RICH_FLOOR) add('WARN', `rich tier but only ${qualified.length} qualifying (< ${RICH_FLOOR})`)

  // (6) external verification gate — tier-appropriate severity
  const e = ext[slug] || { status: 'pending' }
  const verified = e.status === 'verified'
  if (Array.isArray(e.missingButQualifying) && e.missingButQualifying.length)
    add('BLOCK', `external check lists ${e.missingButQualifying.length} player(s) who qualify under our definition but are missing: ${e.missingButQualifying.join(', ')} — fix data before publish`)
  if (!verified) {
    if (tier === 'rich' || tier === 'scarcity') add('BLOCK', `external verification ${e.status} (${tier} tier requires it before launch)`)
    else add('WARN', `external verification ${e.status} (${tier} tier)`)
  }

  const sev = issues.some((i) => i.sev === 'BLOCK') ? 'BLOCK' : issues.some((i) => i.sev === 'WARN') ? 'WARN' : 'OK'
  if (sev === 'BLOCK') blockers++; else if (sev === 'WARN') warns++
  report.push({ slug, tier, aName: x.name, bName: y.name, total: qualified.length, verified, lowApps, clOnly, ambiguousSurnames: ambigSur.map(([s]) => s), issues, sev, players: qualified.map((p) => ({ id: p.id, name: p.name, a: p.a, b: p.b })) })
}

// ── Print deterministic human report ──
const S = { BLOCK: '⛔', WARN: '⚠️ ', OK: '✅', INFO: '·', undefined: ' ' }
console.log(`\n━━ PLAYER-PAIR QC — ${report.length} pilot pairs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  Definition: >=1 Big-5 top-flight league OR Champions League appearance for BOTH clubs.\n`)
for (const r of report) {
  console.log(`${S[r.sev]} ${r.aName} & ${r.bName}  (${r.slug})`)
  console.log(`     tier ${r.tier} · ${r.total} qualifying · external ${r.verified ? 'verified' : 'PENDING'}`)
  if (r.lowApps.length) console.log(`     low-apps (kept, not excluded): ${r.lowApps.join('; ')}`)
  if (r.clOnly.length) console.log(`     CL-only: ${r.clOnly.join('; ')}`)
  for (const i of r.issues) console.log(`     ${S[i.sev]} ${i.sev}: ${i.msg}`)
  console.log('')
}
console.log(`━━ SUMMARY ━━  ${report.length - blockers - warns} OK · ${warns} warn · ${blockers} BLOCKED`)
if (blockers) console.log(`  ${blockers} pair(s) cannot launch until blockers clear (expected: external verification is D6).`)

// ── JSON snapshot ──
const outDir = path.join(HERE, 'reports'); mkdirSync(outDir, { recursive: true })
const snap = { generatedAt: new Date().toISOString(), definition: gen.meta?.definition, blockers, warns, pairs: report }
writeFileSync(path.join(outDir, 'pairs-qc-latest.json'), JSON.stringify(snap, null, 2) + '\n')
console.log(`\n  Snapshot → ${path.relative(process.cwd(), path.join(outDir, 'pairs-qc-latest.json'))}\n`)

process.exit(blockers ? 1 : 0)
