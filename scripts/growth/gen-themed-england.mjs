// Generate the England Football Quiz pool by joining Career Path club data to
// the fame-scored registry. Raw-JSON only (plain Node) — writes a small, stable,
// prerenderable artifact the client + prerender both read.
//
// Learning worth keeping: the fame registry ranks 13.8k players, but a *guessing*
// game needs clue data (career clubs), which exists for ~70 England players — all
// reasonably notable. So this is an honest "England football quiz" (test your
// depth from stars to squad players), not an "obscure players" gimmick.
import { createRequire } from 'module'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const require = createRequire(import.meta.url)
const careers = require('../../src/data/careers.generated.json')
const recog = require('../../src/data/canonical/players.recognisable.generated.json')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

const byName = new Map()
for (const p of Object.values(recog)) {
  const k = norm(p.displayName)
  const prev = byName.get(k)
  if (!prev || (p.fame || 0) > (prev.fame || 0)) byName.set(k, p)
}

const players = []
for (const p of careers.players) {
  if ((p.clubs?.length || 0) < 5) continue
  const r = byName.get(norm(p.name))
  if (!r || !(r.nationalities || []).includes('England')) continue
  players.push({ name: p.name, fame: r.fame || 0, clubs: p.clubs })
}
// Fame descending: harder (less famous) players sort to the back; the game can
// tier or shuffle from this.
players.sort((a, b) => b.fame - a.fame)

const outDir = path.join(__dirname, '..', '..', 'src', 'data', 'themed')
mkdirSync(outDir, { recursive: true })
const artifact = {
  meta: { theme: 'england', label: 'England Football Quiz', generatedAt: new Date().toISOString().slice(0, 10), count: players.length, source: 'careers × fame registry (nationality=England, 5+ clubs)' },
  players,
}
writeFileSync(path.join(outDir, 'england.generated.json'), JSON.stringify(artifact, null, 2))
console.log(`Wrote england.generated.json — ${players.length} players (fame ${players[players.length - 1].fame}–${players[0].fame})`)
