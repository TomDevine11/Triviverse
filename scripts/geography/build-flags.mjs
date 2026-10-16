// Triviverse Geography — bundles national flags at their official proportions for
// Unfurl (src/geography/flags/*.svg + flags.generated.json: file + aspect ratio).
//
//   npm run build:geography-flags
//
// Source: hampusborgos/country-flags — SVGs from Wikimedia Commons; national flags
// are public domain. Only the countries in the shared answer pool
// (countries.generated.json) are fetched; nothing is requested at runtime.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'

const SRC = 'https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg'
const OUT_DIR = 'src/geography/flags'
const META = 'src/geography/data/flags.generated.json'

const { countries } = JSON.parse(readFileSync('src/geography/data/countries.generated.json', 'utf8'))
const pool = countries.filter(c => c.answer).map(c => c.code)
rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })
// Opaque file names, so an <img src> doesn't spell out the answer at a glance.
const fileOf = (code) => `f${createHash('sha1').update(`triviverse-flag-${code}`).digest('hex').slice(0, 10)}.svg`

// Aspect ratio from the root <svg>: viewBox if present, else width/height.
function ratioOf(svg) {
  const root = svg.match(/<svg[^>]*>/)[0]
  const vb = root.match(/viewBox="([^"]+)"/)
  if (vb) { const [, , w, h] = vb[1].trim().split(/[\s,]+/).map(Number); return w / h }
  const w = parseFloat(root.match(/\swidth="([\d.]+)/)?.[1]), h = parseFloat(root.match(/\sheight="([\d.]+)/)?.[1])
  return w / h
}

// Light, safe clean-up: drop XML prolog, comments, metadata and editor cruft.
const tidy = (svg) => svg
  .replace(/<\?xml[^>]*\?>/g, '').replace(/<!DOCTYPE[^>]*>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<metadata[\s\S]*?<\/metadata>/g, '').replace(/<title>[\s\S]*?<\/title>/g, '').replace(/\n\s*/g, '\n').trim()

const meta = {}
// Identical artwork (New Caledonia flies the French tricolour) is flagged `same`, so a
// game never asks for a flag that belongs equally to another answer.
const missing = []
for (const code of pool) {
  const res = await fetch(`${SRC}/${code.toLowerCase()}.svg`)
  if (!res.ok) { missing.push(code); continue }
  let svg = tidy(await res.text())
  const ratio = ratioOf(svg)
  // Ensure a viewBox so the flag scales cleanly into any box.
  if (!/viewBox=/.test(svg.match(/<svg[^>]*>/)[0])) {
    const root = svg.match(/<svg[^>]*>/)[0]
    const w = parseFloat(root.match(/\swidth="([\d.]+)/)[1]), h = parseFloat(root.match(/\sheight="([\d.]+)/)[1])
    svg = svg.replace(root, root.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`))
  }
  writeFileSync(`${OUT_DIR}/${fileOf(code)}`, svg)
  meta[code] = { file: fileOf(code), ratio: +ratio.toFixed(4), hash: createHash('sha1').update(svg).digest('hex').slice(0, 12) }
}
const byHash = {}
for (const [code, m] of Object.entries(meta)) (byHash[m.hash] ||= []).push(code)
for (const codes of Object.values(byHash)) if (codes.length > 1) for (const c of codes.slice(1)) meta[c].same = codes[0]
for (const m of Object.values(meta)) delete m.hash
writeFileSync(META, JSON.stringify({ meta: { source: 'hampusborgos/country-flags (Wikimedia Commons, public domain)', generatedAt: new Date().toISOString().slice(0, 10) }, flags: meta }))
console.log(`${Object.keys(meta).length} flags → ${OUT_DIR}; missing: ${missing.join(', ') || 'none'}`)
