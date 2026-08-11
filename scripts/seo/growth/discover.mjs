// `npm run growth-discover [-- --limit=N]`
// ─────────────────────────────────────────────────────────────────────────
// THE BRAIN — autonomous content-opportunity discovery for Triviverse.
//
// The thesis of the growth engine is "point it at the product, it decides what
// to build — no questionnaire, no keyword research handed in." This script is
// that, end to end:
//
//   1. Reads the canonical data directly (competitions, the Tenable question
//      bank, and the fame-scored player registry) — the product IS the input.
//   2. Enumerates the content pages that data can support, via a small set of
//      content templates (extensible — add a template, get new candidates).
//   3. Scores every candidate against LIVE Google demand using autosuggest
//      (the same free popularity proxy the rest of scripts/seo/ trusts).
//   4. Prints a ranked, evidence-backed content roadmap and writes a snapshot.
//
// Zero human input beyond "here's the repo". The output is a strategy, not a
// checklist: each row is a page worth building, the exact query it targets, the
// demand evidence, and which data already backs it.
// ─────────────────────────────────────────────────────────────────────────

import { createRequire } from 'module'
import { autosuggest } from '../lib/demand.mjs'
import { heading, table, num, writeReport } from '../lib/format.mjs'

const require = createRequire(import.meta.url)
const tenable = require('../../../src/data/tenable.generated.json')
const competitions = require('../../../src/data/canonical/competitions.generated.json')
const recognisable = require('../../../src/data/canonical/players.recognisable.generated.json')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const norm = (s) => s.toLowerCase().replace(/[–—-]/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity

// ── 1–2. Candidate generation: what content can the data support? ────────────
function candidates() {
  const out = []

  // Template A — Tenable questions. Each is already a structured "top 10 [topic]"
  // list with sourced answers: the exact shape AI answer engines and "top 10 …"
  // searchers want. 380 ready-made list pages hiding in the question bank.
  for (const q of tenable.questions) {
    out.push({
      template: 'tenable-list',
      title: q.title,
      query: norm(q.title),
      pageType: 'AEO list / answers page',
      source: `Tenable Q ${q.id} · ${q.answers.length} sourced answers`,
      ready: q.answers.length >= 10,
    })
  }

  // Template B — Competition all-time top-scorer leaderboards. Evergreen,
  // high-intent, and already backed by the sourced stat leaderboards.
  for (const c of competitions.competitions) {
    out.push({
      template: 'leaderboard',
      title: `${c.name} — All-Time Top Scorers`,
      query: `${norm(c.name)} all time top scorers`,
      pageType: 'evergreen leaderboard',
      source: `Competition ${c.id} (from ${c.firstSeason}) · stats leaderboard`,
      ready: true,
    })
  }

  // Template C — Fame-derived "hardest [nation] players". Difficulty computed
  // from the proprietary fame scores (no usage telemetry needed) — content that
  // is original because it comes from our data model, not written to rank.
  const byNation = new Map()
  for (const p of Object.values(recognisable)) {
    for (const nat of p.nationalities || []) {
      const arr = byNation.get(nat) || []
      arr.push(p.fame || 0)
      byNation.set(nat, arr)
    }
  }
  const topNations = [...byNation.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 15)
  for (const [nat, fames] of topNations) {
    out.push({
      template: 'fame-nation',
      title: `Hardest ${nat} Footballers to Guess`,
      query: `${norm(nat)} football quiz`,
      pageType: 'fame-ranked quiz page',
      source: `${fames.length} ${nat} players fame-scored`,
      ready: true,
    })
  }

  return out
}

// ── 3. Demand scoring against live Google autosuggest ────────────────────────
// Autosuggest returns completions ordered by real popularity. A candidate earns
// points for: breadth of completions (interest), completions that actually match
// the target query (this query is really searched), and quiz/answer/list intent
// modifiers (it maps to content we can serve, not just a name lookup).
function scoreDemand(query, suggestions) {
  const q = norm(query)
  const words = q.split(' ').filter((w) => w.length > 3)
  const sug = suggestions.map(norm)
  const matches = sug.filter((s) => s.includes(q) || (words.length && words.every((w) => s.includes(w))))
  const intent = sug.filter((s) => /(quiz|answers?|list|top 10|top ten|who scored|game|hardest|obscure)/.test(s))
  const score = Math.min(suggestions.length, 10) + matches.length * 3 + intent.length * 2
  return { score, matches: matches.length, breadth: suggestions.length, intent: intent.length, topCompletions: suggestions.slice(0, 4) }
}

// ── run ──────────────────────────────────────────────────────────────────────
const all = candidates()
const toScore = all.slice(0, LIMIT === Infinity ? all.length : LIMIT)
console.log(heading('TRIVIVERSE GROWTH BRAIN — autonomous content opportunities'))
console.log(`  ${all.length} candidates generated from the data (scoring ${toScore.length} against live demand)…\n`)

const scored = []
for (let i = 0; i < toScore.length; i++) {
  const c = toScore[i]
  const suggestions = await autosuggest(c.query)
  scored.push({ ...c, ...scoreDemand(c.query, suggestions) })
  if (i % 25 === 24) process.stderr.write(`  …scored ${i + 1}/${toScore.length}\n`)
  await sleep(140) // be gentle with autosuggest
}

scored.sort((a, b) => b.score - a.score)
const strong = scored.filter((s) => s.score > 0 && s.matches > 0)

console.log(heading('TOP OPPORTUNITIES (ranked by live demand × data readiness)'))
console.log(table(
  strong.slice(0, 25).map((s) => ({
    score: s.score,
    page: s.title.length > 42 ? s.title.slice(0, 41) + '…' : s.title,
    query: s.query.length > 34 ? s.query.slice(0, 33) + '…' : s.query,
    autocompletes: s.topCompletions[0] ? (s.topCompletions[0].length > 32 ? s.topCompletions[0].slice(0, 31) + '…' : s.topCompletions[0]) : '—',
    ready: s.ready ? '✓' : '·',
  })),
  [
    { key: 'score', label: 'Score', align: 'right' },
    { key: 'page', label: 'Page to build' },
    { key: 'query', label: 'Target query' },
    { key: 'autocompletes', label: 'Google autocompletes to' },
    { key: 'ready', label: 'Data' },
  ],
  { max: 25 },
))

// Roadmap summary by template — where the wins concentrate.
console.log(heading('WHERE THE WINS ARE (by content template)'))
const byT = {}
for (const s of strong) { (byT[s.template] ??= []).push(s.score) }
console.log(table(
  Object.entries(byT).sort((a, b) => b[1].length - a[1].length).map(([t, arr]) => ({
    template: t,
    strong: arr.length,
    topScore: Math.max(...arr),
  })),
  [{ key: 'template', label: 'Content template' }, { key: 'strong', label: 'Strong opps', align: 'right' }, { key: 'topScore', label: 'Best score', align: 'right' }],
))

const path = writeReport('growth-opportunities', {
  generated: all.length, scored: toScore.length, strong: strong.length,
  opportunities: strong.map((s) => ({ template: s.template, title: s.title, query: s.query, score: s.score, matches: s.matches, breadth: s.breadth, intent: s.intent, topCompletions: s.topCompletions, source: s.source, pageType: s.pageType, ready: s.ready })),
})
console.log(`\n  ${num(strong.length)} opportunities with proven demand. Snapshot: ${path.replace(process.cwd() + '/', '')}`)
