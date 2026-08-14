// `npm run growth-formats` — demand scan for NEW football-game FORMATS.
// Unlike discover.mjs (which scores content from our existing data), this asks
// "which game format has real search demand?" using Google autosuggest as a
// free popularity proxy. Competition is judged separately via web search — this
// gives the DEMAND half of the search-to-competition ratio.
import { autosuggest } from '../lib/demand.mjs'
import { heading, table } from '../lib/format.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

// Candidate formats — each with the query variants people might use. "Missing
// 11" is the one under consideration; the rest are alternatives to compare it to.
const CANDIDATES = [
  { name: 'Missing 11', seeds: ['missing 11', 'football missing 11', 'missing 11 football', 'guess the missing player'] },
  { name: 'Starting 11 / lineup', seeds: ['starting 11 quiz', 'football lineup quiz', 'guess the starting 11', 'guess the lineup football'] },
  { name: 'Badge / crest quiz', seeds: ['football badge quiz', 'guess the football club badge', 'football crest quiz', 'guess the club by badge'] },
  { name: 'Stadium quiz', seeds: ['football stadium quiz', 'guess the football stadium', 'guess the stadium'] },
  { name: 'Emoji quiz', seeds: ['football emoji quiz', 'guess the football club emoji', 'football club emoji'] },
  { name: 'Silhouette / blur', seeds: ['guess the footballer silhouette', 'blurry footballer quiz', 'guess the blurred footballer'] },
  { name: 'Kit / shirt quiz', seeds: ['guess the football kit', 'football shirt quiz', 'guess the football shirt'] },
  { name: 'Weakest Link (TV)', seeds: ['football weakest link', 'weakest link football'] },
  { name: 'Only Connect (TV)', seeds: ['football only connect', 'only connect football'] },
  { name: 'Pointless (TV)', seeds: ['football pointless', 'pointless football quiz'] },
  { name: 'Family Fortunes (TV)', seeds: ['football family fortunes', 'family fortunes football'] },
  { name: 'Transfer quiz', seeds: ['football transfer quiz', 'guess the transfer', 'guess the football transfer'] },
  { name: 'Goal celebration', seeds: ['guess the goal celebration', 'football celebration quiz'] },
  { name: 'Guess the year', seeds: ['guess the football year', 'football guess the season'] },
  { name: 'Odd one out', seeds: ['football odd one out', 'odd one out football quiz'] },
]

const INTENT = /(football|soccer|\bfc\b|club|player|quiz|game|footballer|premier league|unlimited)/

function scoreSeed(seed, sug) {
  const q = norm(seed)
  const n = sug.map(norm)
  const selfMatch = n.some(s => s.includes(q)) // Google autocompletes the term itself → it's really searched
  const intent = n.filter(s => INTENT.test(s)).length
  return { breadth: sug.length, selfMatch, intent, top: sug.slice(0, 3) }
}

console.log(heading('FOOTBALL GAME-FORMAT DEMAND SCAN (autosuggest popularity proxy)'))
const rows = []
for (const c of CANDIDATES) {
  let breadth = 0, intent = 0, self = 0
  const tops = []
  for (const seed of c.seeds) {
    const sug = await autosuggest(seed)
    const s = scoreSeed(seed, sug)
    breadth += s.breadth; intent += s.intent; self += s.selfMatch ? 1 : 0
    if (s.top[0]) tops.push(s.top[0])
    await sleep(140)
  }
  // Demand score: self-matches (term is really searched) weigh most, then
  // football-intent completions, then raw breadth.
  const score = self * 6 + intent * 2 + breadth
  rows.push({ name: c.name, score, self: `${self}/${c.seeds.length}`, intent, breadth, ex: (tops[0] || '—').slice(0, 34) })
}
rows.sort((a, b) => b.score - a.score)
console.log(table(rows, [
  { key: 'score', label: 'Demand', align: 'right' },
  { key: 'name', label: 'Format' },
  { key: 'self', label: 'Autocompletes', align: 'right' },
  { key: 'intent', label: 'Footy hits', align: 'right' },
  { key: 'breadth', label: 'Breadth', align: 'right' },
  { key: 'ex', label: 'Example completion' },
], { max: 20 }))
console.log('\n  "Autocompletes" = how many of the format\'s query variants Google completes with the term itself (strongest demand signal).')
console.log('  Next: judge COMPETITION on the top formats via web search (who already ranks, how strong).')
