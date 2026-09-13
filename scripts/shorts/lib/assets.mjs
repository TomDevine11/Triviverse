// Visual asset layer for shorts: club crests + league logos (Transfermarkt-hosted, fetched once and
// cached to disk) and country flags (local flag-icons SVGs rasterised via sharp). Everything is
// resolved to a base64 PNG data-URI that satori can embed directly in an <img>. Because scene(t) is
// synchronous and called per-frame, callers MUST `await prefetch([...])` before rendering; the sync
// accessors then read from the warmed in-memory map (returning null → caller draws a monogram).
//
// NOTE: crests/league logos are Transfermarkt trademarked images (same source as our in-app badges).
// Rendering them into distributed videos is an explicit, owner-approved choice — kept isolated here
// so it is trivial to disable (set SHORTS_NO_LOGOS=1) if a platform ever objects.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { getFlagFromNationality } from '../../../src/utils/flags.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const CACHE = path.join(ROOT, 'assets', 'shorts', 'img-cache')
mkdirSync(CACHE, { recursive: true })
const LOGOS_OFF = process.env.SHORTS_NO_LOGOS === '1'

const badges = JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', 'badges.generated.json'), 'utf8'))
const CLUBS = badges.clubs || {}
const TM = 'https://tmssl.akamaized.net/images'
const LEAGUE_CODES = { 'Premier League': 'GB1', 'La Liga': 'ES1', 'Serie A': 'IT1', 'Bundesliga': 'L1', 'Ligue 1': 'FR1', 'Champions League': 'CL', 'UEFA Champions League': 'CL' }
const clubKey = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[.'’]/g, '').replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(fc|afc|cf|ac|ssc|as|cd|sc|sl|cp|ud|sd|sk|fk|club|de)\b/g, ' ')
  .replace(/\s+/g, ' ').trim()

const clubBadgeUrl = (name) => { const id = CLUBS[clubKey(name)]; return id ? `${TM}/wappen/head/${id}.png` : null }
const leagueLogoUrl = (league) => { const code = LEAGUE_CODES[league] || LEAGUE_CODES[String(league).replace(/^the /i, '')]; return code ? `${TM}/logo/header/${code.toLowerCase()}.png` : null }

// England/Scotland/Wales/NI use subdivision flag emoji that don't map via regional-indicator letters.
const SUBDIV = { england: 'gb-eng', scotland: 'gb-sct', wales: 'gb-wls', 'northern ireland': 'gb-nir' }
function isoFor(nat) {
  const key = String(nat || '').toLowerCase().trim()
  if (SUBDIV[key]) return SUBDIV[key]
  const emoji = getFlagFromNationality(nat)
  if (!emoji) return null
  const cp = [...emoji].map(c => c.codePointAt(0))
  if (cp.length < 2 || cp[0] < 0x1F1E6 || cp[0] > 0x1F1FF) return null
  return String.fromCharCode(cp[0] - 0x1F1E6 + 97) + String.fromCharCode(cp[1] - 0x1F1E6 + 97)
}

const mem = new Map() // key -> dataURI | null
const uri = (buf) => 'data:image/png;base64,' + buf.toString('base64')

async function fetchLogoPng(url, cacheFile) {
  try {
    if (existsSync(cacheFile)) return readFileSync(cacheFile)
    const r = await fetch(url)
    if (!r.ok) return null
    const raw = Buffer.from(await r.arrayBuffer())
    const out = await sharp(raw).resize(240, 240, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    writeFileSync(cacheFile, out)
    return out
  } catch { return null }
}
async function flagPng(iso) {
  try {
    const svg = path.join(ROOT, 'node_modules', 'flag-icons', 'flags', '4x3', iso + '.svg')
    if (!existsSync(svg)) return null
    const cacheFile = path.join(CACHE, 'flag-' + iso + '.png')
    if (existsSync(cacheFile)) return readFileSync(cacheFile)
    const out = await sharp(readFileSync(svg)).resize(132).png().toBuffer() // 4x3 → 132×99
    writeFileSync(cacheFile, out)
    return out
  } catch { return null }
}

// A blank football-shirt plate (name/number are overlaid as text by satori) — our own SVG art
// rasterised to PNG so satori can size it. Cached per accent colour.
async function jerseyPlate(accent) {
  const cacheFile = path.join(CACHE, 'jersey-' + accent.replace('#', '') + '.png')
  if (existsSync(cacheFile)) return readFileSync(cacheFile)
  const path2 = 'M42 10 L52 18 Q60 22 68 18 L78 10 L100 22 Q114 30 118 46 L104 58 L94 50 L94 124 Q94 128 90 128 L30 128 Q26 128 26 124 L26 50 L16 58 L2 46 Q6 30 20 22 Z'
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 132' width='560' height='616'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${accent}'/><stop offset='1' stop-color='${accent}bb'/></linearGradient></defs><path d='${path2}' fill='url(#g)' stroke='rgba(255,255,255,0.18)' stroke-width='1.4'/><path d='M52 18 Q60 30 68 18 L64 14 Q60 18 56 14 Z' fill='rgba(0,0,0,0.30)'/></svg>`
  const out = await sharp(Buffer.from(svg)).png().toBuffer()
  writeFileSync(cacheFile, out)
  return out
}

async function ensure(it) {
  const key = it.type + ':' + it.name
  if (mem.has(key)) return
  let buf = null
  if (!LOGOS_OFF && it.type === 'crest') { const u = clubBadgeUrl(it.name); if (u) buf = await fetchLogoPng(u, path.join(CACHE, 'crest-' + u.split('/').pop())) }
  else if (!LOGOS_OFF && it.type === 'league') { const u = leagueLogoUrl(it.name); if (u) buf = await fetchLogoPng(u, path.join(CACHE, 'league-' + u.split('/').pop())) }
  else if (it.type === 'flag') { const iso = isoFor(it.name); if (iso) buf = await flagPng(iso) }
  else if (it.type === 'jersey') { buf = await jerseyPlate(it.name) } // it.name = accent colour
  mem.set(key, buf ? uri(buf) : null)
}

// Warm the cache for a batch of asset descriptors: [{type:'crest'|'league'|'flag', name}]
export async function prefetch(items = []) { for (const it of items) if (it && it.name) await ensure(it) }

export const crestUri = (name) => mem.get('crest:' + name) ?? null
export const leagueUri = (name) => mem.get('league:' + name) ?? null
export const flagUri = (nat) => mem.get('flag:' + nat) ?? null
export const jerseyUri = (accent) => mem.get('jersey:' + accent) ?? null
export const hasFlag = (nat) => !!isoFor(nat)
export const hasCrest = (name) => !LOGOS_OFF && !!clubBadgeUrl(name)
