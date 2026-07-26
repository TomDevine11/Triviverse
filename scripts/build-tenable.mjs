#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// BUILD TENABLE — generate bounded "name the top 10" questions from the
// the canonical Performance career-rollup (history.*, == rollup of performance.*,
// RFC-001 C5/C6) — the SAME trusted Transfermarkt data 501 uses.
//
// Philosophy (see the architecture review): Tenable AMPLIFIES data errors — a
// single missing or misranked name breaks the whole question — so we only
// generate BOUNDED, verifiable lists and gate them hard:
//
//   • club-scoped     → "Premier League — Top Goalscorers for Arsenal"
//   • nationality-scoped → "La Liga — Top Argentine Goalscorers"
//
// Phase 2: the six marquee COMPETITION-WIDE lists (PL / La Liga / Bundesliga /
// Serie A top scorers, PL appearances, Champions League top scorers) are ALSO
// generated here now (see COMPETITION_WIDE) — replacing the frozen hand-curated
// copies so they refresh with the data instead of drifting. Cutoff ties are
// handled via tiePool (not rejected), so every tied record-holder counts.
// Everything else in tenable.js stays hand-authored (awards, trophies,
// international goals, etc. — no canonical source yet).
//
//   npm run build:tenable   (after the 501 fact tables are built)
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { demonym } from '../src/data/football501/spec.js'
import { players as FAMOUS_PLAYERS } from '../src/data/players.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'src', 'data', 'football501')
const OUT = path.join(ROOT, 'src', 'data', 'tenable.generated.json')

// ── Quality gate ───────────────────────────────────────────────────────────
// A generated list only ships if it clears these. The value FLOOR is the real
// quality lever: requiring the 10th name to still be a meaningful contributor
// is what keeps out obscure clubs / minor footballing nations whose tail is a
// string of players nobody could name.
const MIN_POOL = 10        // need at least a full top-10
const FLOOR = { goals: 20, apps: 100 } // the 10th name must clear this
const STATS = [
  { key: 'goals', unit: 'goals', noun: 'goals' },
  { key: 'apps', unit: 'apps', noun: 'appearances' },
]

// ── Competition-wide top-10s (Phase 2) ──────────────────────────────────────
// The six marquee lists formerly hand-curated in tenable.js, now generated from
// the same fact tables. Titles are pinned to the previous exact wording so the
// daily allow-list (tenable-daily-questions.txt) still matches by title.
const COMPETITION_WIDE = {
  GB1: { goals: 'Premier League — All-Time Top Goalscorers', apps: 'Premier League — Most Appearances All-Time' },
  ES1: { goals: 'La Liga — All-Time Top Goalscorers' },
  IT1: { goals: 'Serie A — All-Time Top Goalscorers' },
  L1: { goals: 'Bundesliga — All-Time Top Goalscorers' },
  CL: { goals: 'UEFA Champions League — All-Time Top Goalscorers' },
}

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim()
const lastName = (s) => norm(s).split(' ').pop()

// ── Daily recognisability gate ──────────────────────────────────────────────
// A question only enters DAILY rotation if enough of its top-10 are household
// names — otherwise you'd need to know the *exact* ordering of players nobody
// can name (the classic "top 10 Ghanaian Serie A apps" trap). Unlimited still
// serves everything; this only trims Daily. "Famous" = the curated player list
// (used for autocomplete) + every hand-authored Tenable answer (all A-listers).
// Appearance lists are intrinsically harder than goal lists (journeymen top the
// apps charts), so they need a higher bar.
// How many of the top-10 must be recognisable for DAILY. Tightened now that the
// "famous" set is broadened with the canonical fame data (a much wider, graded
// popularity signal — the same one Football 501's daily uses). Apps lists keep a
// higher bar than goal lists (journeymen top the apps charts).
const DAILY_FAME = { goals: 6, apps: 7 }
const FAME_BAR = 30
function buildFamousSet() {
  const set = new Set()
  const add = (name) => { set.add(norm(name)); set.add(lastName(name)) }
  for (const p of FAMOUS_PLAYERS) add(p.name)                       // curated autocomplete list
  try {
    const src = readFileSync(path.join(DATA_DIR, '..', 'tenable.js'), 'utf8')
    for (const m of src.matchAll(/text: *'([^']+)'/g)) add(m[1])    // hand-authored answer names
  } catch { /* fall back to the curated list alone */ }
  try {
    const wd = JSON.parse(readFileSync(path.join(DATA_DIR, '..', 'canonical', 'wikidata.generated.json'), 'utf8'))
    for (const g of ['clubs', 'nationalities', 'trophies']) for (const arr of Object.values(wd[g])) for (const p of arr) if ((p.fame || 0) >= FAME_BAR) add(p.name)
  } catch { /* canonical facts optional */ }
  return set
}

// Rank a set of {name, value} rows into a validated top-10, or null if the list
// fails the gate. Ties inside the 10 are fine; a tie that straddles the 10/11
// cutoff makes "the top 10" ambiguous, so we reject it (rather than guess).
function topTen(rows, floor) {
  if (rows.length < MIN_POOL) return null
  rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)))
  const top = rows.slice(0, 10)
  if (top[9].value < floor) return null                 // tail too obscure
  if (rows.length > 10 && rows[10].value === top[9].value) return null // ambiguous cutoff
  return top
}

// Validate a competition-wide top-10: exactly 10, ranks 1..10, values
// non-increasing. Throws so a bad fact table can never ship a broken marquee
// question (these are the highest-stakes lists — one misrank breaks them).
function assertRankedTop10(answers, title) {
  if (answers.length !== 10) throw new Error(`"${title}": expected 10 answers, got ${answers.length}`)
  for (let i = 0; i < 10; i++) {
    if (answers[i].rank !== i + 1) throw new Error(`"${title}": bad rank ${answers[i].rank} at index ${i}`)
    if (i > 0 && answers[i].value > answers[i - 1].value) throw new Error(`"${title}": misordered — ${answers[i].text} (${answers[i].value}) above ${answers[i - 1].text} (${answers[i - 1].value})`)
  }
}

// Competition-wide top-10 (all players in the competition, by stat). Unlike the
// bounded club/nat lists, a tie at the 10th value is NOT rejected — the extra
// tied record-holders go into tiePool so any of them counts for the joint slot.
function buildCompetitionWide(fact, cid, stat, unit, noun, compName, title) {
  const rows = fact.players
    .map(p => ({ id: p.id, name: p.name, value: p.comps?.[cid]?.[stat] || 0 }))
    .filter(r => r.value >= 1)
  if (rows.length < MIN_POOL) throw new Error(`"${title}": only ${rows.length} players (< ${MIN_POOL})`)
  rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)))
  const top = rows.slice(0, 10)
  if (top[9].value < FLOOR[stat]) throw new Error(`"${title}": 10th value ${top[9].value} < floor ${FLOOR[stat]}`)
  const answers = top.map((p, i) => ({ rank: i + 1, text: p.name, detail: `${p.value} ${unit}`, value: p.value }))
  assertRankedTop10(answers, title)
  const q = {
    id: `gen-${cid}-${stat}-all`,
    type: 'player',
    scope: 'competition',
    title,
    description: `Name the 10 players with the most ${compName} ${noun} of all time.`,
    icon: { type: 'league', value: compName }, // league logo — matches the removed hand-authored UX
    answers,
  }
  const tied = rows.slice(10).filter(r => r.value === top[9].value)
  if (tied.length) { q.tieValue = top[9].value; q.tiePool = tied.map(r => ({ text: r.name })) }
  return q
}

function build() {
  const files = readdirSync(DATA_DIR).filter(f => /^history\..*\.generated\.json$/.test(f))
  if (!files.length) { console.error('No history.*.generated.json fact tables found — build 501 data first.'); process.exit(1) }

  const famous = buildFamousSet()
  const fameOf = (answers) => answers.filter(a => famous.has(norm(a.text)) || famous.has(lastName(a.text))).length

  const questions = []
  const perComp = {}
  let builtAt = new Date().toISOString().slice(0, 10)

  for (const file of files) {
    const fact = JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf8'))
    const comp = fact.meta.competition
    const compName = comp.name
    const cid = comp.id
    if (fact.meta.builtAt) builtAt = fact.meta.builtAt
    let added = 0

    for (const { key: stat, unit, noun } of STATS) {
      const floor = FLOOR[stat]

      // ── Club-scoped: most {stat} for a single club, within this competition.
      const byClub = new Map() // clubId → [{id,name,value}]
      for (const p of fact.players) {
        const clubs = p.comps?.[cid]?.clubs || {}
        for (const [clubId, rec] of Object.entries(clubs)) {
          const value = rec[stat] || 0
          if (value < 1) continue
          ;(byClub.get(clubId) || byClub.set(clubId, []).get(clubId)).push({ id: p.id, name: p.name, value })
        }
      }
      for (const [clubId, rows] of byClub) {
        const top = topTen(rows, floor)
        if (!top) continue
        const clubName = fact.clubs[clubId]?.name || `#${clubId}`
        const answers = top.map((p, i) => ({ rank: i + 1, text: p.name, detail: `${p.value} ${unit}` }))
        questions.push({
          id: `gen-${cid}-${stat}-club-${clubId}`,
          type: 'player',
          scope: 'club',
          title: `${compName} — ${stat === 'goals' ? 'Top Goalscorers' : 'Most Appearances'} for ${clubName}`,
          description: `Name the 10 players with the most ${compName} ${noun} for ${clubName}.`,
          icon: { type: 'club', value: clubName },
          daily: fameOf(answers) >= DAILY_FAME[stat],
          answers,
        })
        added++
      }

      // ── Nationality-scoped: most {stat} in this competition by players of one
      // nationality (whole-competition totals, filtered by nation).
      const byNat = new Map() // natKey → { display, rows:[] }
      for (const p of fact.players) {
        if (!p.natKey) continue
        const rec = p.comps?.[cid]
        const value = rec?.[stat] || 0
        if (value < 1) continue
        const e = byNat.get(p.natKey) || byNat.set(p.natKey, { display: p.nat, rows: [] }).get(p.natKey)
        e.rows.push({ id: p.id, name: p.name, value })
      }
      for (const [natKey, { display, rows }] of byNat) {
        const top = topTen(rows, floor)
        if (!top) continue
        const dem = demonym(natKey, display)
        const answers = top.map((p, i) => ({ rank: i + 1, text: p.name, detail: `${p.value} ${unit}` }))
        questions.push({
          id: `gen-${cid}-${stat}-nat-${slug(natKey)}`,
          type: 'player',
          scope: 'nationality',
          title: `${compName} — ${stat === 'goals' ? `Top ${dem} Goalscorers` : `${dem} Players — Most Appearances`}`,
          description: `Name the 10 ${dem} players with the most ${compName} ${noun}.`,
          icon: { type: 'nationality', value: display },
          daily: fameOf(answers) >= DAILY_FAME[stat],
          answers,
        })
        added++
      }

      // ── Competition-wide: the six marquee lists (Phase 2), now data-driven.
      const cwTitle = COMPETITION_WIDE[cid]?.[stat]
      if (cwTitle) {
        const q = buildCompetitionWide(fact, cid, stat, unit, noun, compName, cwTitle)
        q.daily = fameOf(q.answers) >= DAILY_FAME[stat]
        questions.push(q)
        added++
      }
    }
    perComp[cid] = added
  }

  // Deterministic spread so consecutive daily indexes land on different
  // competitions / scopes rather than a long run of one club's variants.
  questions.sort((a, b) => hash(a.id) - hash(b.id))

  const dailyCount = questions.filter(q => q.daily).length
  writeFileSync(OUT, JSON.stringify({
    meta: { builtAt, count: questions.length, dailyEligible: dailyCount, source: 'football501 fact tables (transfermarkt)', floor: FLOOR, dailyFame: DAILY_FAME },
    questions,
  }, null, 1) + '\n')

  console.error(`✓ ${questions.length} generated Tenable questions (${dailyCount} daily-eligible) → ${path.relative(process.cwd(), OUT)}`)
  console.error(`  ${Object.entries(perComp).map(([k, v]) => `${k}:${v}`).join('  ')}`)
  console.error(`  e.g. ${questions.slice(0, 5).map(q => `"${q.title}"`).join(', ')}`)
}

build()
