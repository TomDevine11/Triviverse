#!/usr/bin/env node
// Dump EVERY question/answer each generator would currently produce, to a single txt catalogue.
//   node scripts/shorts/catalogue.mjs [outfile]
import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as careerPath from './generators/career-path.mjs'
import * as whoAmI from './generators/who-am-i.mjs'
import * as playedAlongside from './generators/played-alongside.mjs'
import * as guessTheClub from './generators/guess-the-club.mjs'
import * as winnerStaysOn from './generators/winner-stays-on.mjs'
import * as footballPointless from './generators/football-pointless.mjs'
import * as playerBetweenClubs from './generators/player-between-clubs.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const BIG = 100000
const L = []
const line = (s = '') => L.push(s)
const section = (title, n) => { line(''); line('='.repeat(74)); line(`  ${title}  —  ${n} questions`); line('='.repeat(74)) }

// ---- CAREER PATH ----
{
  const specs = careerPath.generate(BIG, {}, null)
  section('CAREER PATH', specs.length)
  specs.forEach((s, i) => { line(`${i + 1}. ${s.render.rows.map(r => r.text).join(' → ')}`); line(`     → ${s.answer}`) })
}
// ---- GUESS THE CLUB ----
{
  const specs = guessTheClub.generate(BIG, {}, null)
  section('GUESS THE CLUB', specs.length)
  specs.forEach((s, i) => { line(`${i + 1}. ${s.question}  [${s.render.rows.map(r => r.text).join(' → ')}]`); line(`     → ${s.answer}`) })
}
// ---- WHO AM I ----
{
  const specs = whoAmI.generate(BIG, {}, null)
  section('WHO AM I?', specs.length)
  specs.forEach((s, i) => { line(`${i + 1}. ${s.render.rows.map(r => `${r.label}: ${r.text}`).join(' | ')}`); line(`     → ${s.answer}`) })
}
// ---- PLAYED ALONGSIDE ----
{
  const specs = playedAlongside.generate(BIG, {}, null)
  section('PLAYED ALONGSIDE', specs.length)
  specs.forEach((s, i) => { line(`${i + 1}. Who played with ALL of: ${s.render.rows.map(r => `${r.text} (${r.crest || '?'})`).join(', ')}`); line(`     → ${s.answer}`) })
}
// ---- WINNER STAYS ON ----
{
  const specs = winnerStaysOn.generate(BIG, {}, null)
  section('WINNER STAYS ON', specs.length)
  specs.forEach((s, i) => {
    line(`${i + 1}. [${s.render.catLabel}]  streak of ${s.render.rounds.length}`)
    s.render.rounds.forEach(r => line(`     ${r.a} (${r.aVal}) vs ${r.b} (${r.bVal})  → ${r.winner} stays`))
    line(`     FINAL SURVIVOR → ${s.answer}`)
  })
}
// ---- FOOTBALL POINTLESS ----
{
  const specs = footballPointless.generate(BIG, {}, null)
  section('FOOTBALL POINTLESS', specs.length)
  specs.forEach((s, i) => {
    line(`${i + 1}. ${s.render.header.overline} ${s.render.header.bName ? s.render.header.aName + ' & ' + s.render.header.bName : s.render.header.aName}   (${s.render.count} pointless-tier answers)`)
    line(`     60 SHOWN (most gettable of the obscure): ${s.render.board.map(b => b.name).join(', ')}`)
    line(`     DEEPEST CUT → ${s.render.rarest}`)
  })
}
// ---- PLAYER BETWEEN CLUBS ----
{
  const specs = playerBetweenClubs.generate(BIG, {}, null)
  section('PLAYER BETWEEN CLUBS', specs.length)
  specs.forEach((s, i) => {
    line(`${i + 1}. ${s.render.header.aName} & ${s.render.header.bName}   (${s.render.count} players)`)
    line(`     ALL: ${s.render.board.map(b => b.name).join(', ')}`)
  })
}

const out = process.argv[2] || path.join(ROOT, 'output', 'shorts', 'question-catalogue.txt')
const header = `TRIVIVERSE SHORT-FORM — FULL QUESTION CATALOGUE\nGenerated ${new Date().toISOString()}\nEvery question/answer each generator would produce right now.\n`
writeFileSync(out, header + L.join('\n') + '\n')
console.log(`wrote ${out}\n${L.filter(x => /^\d+\./.test(x)).length} total questions`)
