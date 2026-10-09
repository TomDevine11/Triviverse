#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// TM NATIONAL-TEAM RECORDS — all-time most caps + top scorers per nation
//
// Why this exists: international caps used to come only from scrape-intl.mjs, whose
// player universe is "everyone with an appearance in our six competitions". The
// Premier League on Transfermarkt starts in 1992, so England's all-time lists had
// no Peter Shilton (125 caps), Bobby Moore, Bobby Charlton or Billy Wright, and
// Brazil's had no one who never played in Europe. A Tenable question titled
// "England — Most Capped Players" was simply wrong. (docs/BACKLOG.md B-035)
//
// This reads Transfermarkt's own record tables instead ("Record-holding players",
// sorted by caps and by goals), which cover every player who has ever appeared for
// the nation. Top 25 of each, which is enough for a top 10 plus tie handling plus
// a pool of plausible non-answers for the guess autocomplete.
//
// RUN LOCALLY (Transfermarkt blocks datacentre IPs):
//   npm run scrape:intl-records && npm run build:tenable
// Writes src/data/football501/intl-records.generated.json (committed).
// ─────────────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchHtml } from './lib.mjs'
import { BASE, DELAY_MS } from './config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', '..', 'src', 'data', 'football501', 'intl-records.generated.json')
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Transfermarkt national-team ids (the same ids intl.generated.json uses). The
// nations Tenable can ask about, plus the other quiz nationalities.
const NATIONS = {
  3299: 'England', 3262: 'Germany', 3377: 'France', 3375: 'Spain', 3376: 'Italy',
  3439: 'Brazil', 3437: 'Argentina', 3300: 'Portugal', 3379: 'Netherlands',
  3382: 'Belgium', 3384: 'Switzerland', 3556: 'Croatia', 3449: 'Uruguay',
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').trim()
// Fans type "Bobby Charlton", not Transfermarkt's "Sir Bobby Charlton".
const plainName = (s) => decode(s).replace(/^Sir /, '')

// One segment per player, from his name link to the next player's. Inside it the
// centred cells are: flag(s), birth date (sometimes missing for pre-war players),
// then caps, goals, assists… — so caps/goals are the first two cells holding a
// bare integer. Parsing per segment means a missing cell can never shift numbers
// onto the wrong player.
export function parseRecords(html) {
  const link = /<td class=hauptlink><a title="([^"]+)" href="\/[^"]+\/profil\/spieler\/(\d+)">/g
  const hits = [...html.matchAll(link)]
  return hits.map((m, i) => {
    const seg = html.slice(m.index, i + 1 < hits.length ? hits[i + 1].index : html.indexOf('</tbody>', m.index))
    const nums = [...seg.matchAll(/<td class="zentriert">(\d+)<\/td>/g)].map(n => Number(n[1]))
    return { id: m[2], name: plainName(m[1]), caps: nums[0], goals: nums[1] }
  }).filter(r => Number.isFinite(r.caps) && Number.isFinite(r.goals))
}

async function run() {
  const out = { meta: { source: 'transfermarkt rekordspieler', fetchedAt: new Date().toISOString().slice(0, 10) }, nations: {} }
  for (const [tid, nation] of Object.entries(NATIONS)) {
    const slug = nation.toLowerCase()
    const caps = parseRecords(fetchHtml(`${BASE}/${slug}/rekordspieler/verein/${tid}/sort/einsaetze.desc`))
    await sleep(DELAY_MS)
    const goals = parseRecords(fetchHtml(`${BASE}/${slug}/rekordspieler/verein/${tid}/sort/tore.desc`))
    await sleep(DELAY_MS)
    if (caps.length < 10 || goals.length < 10) throw new Error(`${nation}: parsed ${caps.length} caps / ${goals.length} goals rows — page layout changed?`)
    out.nations[tid] = { name: nation, caps, goals }
    console.log(`  ✓ ${nation.padEnd(12)} caps #1 ${caps[0].name} (${caps[0].caps}) · goals #1 ${goals[0].name} (${goals[0].goals})`)
  }
  writeFileSync(OUT, JSON.stringify(out) + '\n')
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) run()
