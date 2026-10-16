// Triviverse Geography — builds the country dataset every geography game reads
// (src/geography/data/countries.generated.json) from Natural Earth. Independent of
// the football pipeline: no football data in, no football data out.
//
//   npm run build:geography [-- path/to/ne_10m_admin_0_countries.geojson]
//
// Source: Natural Earth 1:10m Admin 0 – Countries (public domain,
// https://www.naturalearthdata.com/about/terms-of-use/). Without a path the file is
// downloaded from the nvkelso/natural-earth-vector repo. Nothing is fetched at runtime:
// the output is a committed artefact, like every other *.generated.json.
//
// Also writes world.generated.json: every country on one shared world Mercator,
// for map boards (Overland). Neighbours (`n`) are derived from shared land borders.
//
// Per country we keep the parts that belong to the recognisable shape (overseas
// territories thousands of km away — French Guiana, the Azores, Easter Island — would
// shrink the mainland to a dot), project them with Mercator rotated onto the country's
// own longitude (the familiar map shape, and it heals antimeridian splits for Russia and
// Fiji), fit them into a 1000×1000 box, simplify (Douglas–Peucker) and encode a compact
// SVG path. The centre (spherical centroid of the kept parts) drives distance/direction.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { geoMercator, geoCentroid, geoArea, geoDistance, geoStream } from 'd3-geo'

const SRC_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson'
const OUT = 'src/geography/data/countries.generated.json'
const MAP_OUT = 'src/geography/data/world.generated.json'
const BOX = 1000
const PAD = 30
const TOLERANCE = 1.1 // simplification, in box units
const MIN_RING = 3 // drop specks smaller than this many square box units
const EARTH_KM = 6371

// Display names where Natural Earth's NAME is abbreviated or not the common English one.
const NAMES = {
  CN: 'China', BS: 'Bahamas', GM: 'Gambia', US: 'United States', GB: 'United Kingdom', CD: 'DR Congo', CG: 'Republic of the Congo',
  CF: 'Central African Republic', DO: 'Dominican Republic', BA: 'Bosnia and Herzegovina',
  SS: 'South Sudan', GQ: 'Equatorial Guinea', CZ: 'Czechia', MK: 'North Macedonia',
  SB: 'Solomon Islands', KP: 'North Korea', KR: 'South Korea', LA: 'Laos', CI: "Côte d'Ivoire",
  SZ: 'Eswatini', TL: 'Timor-Leste', VA: 'Vatican City', AE: 'United Arab Emirates',
  FK: 'Falkland Islands', TF: 'French Southern Lands', HM: 'Heard and McDonald Islands',
  PS: 'Palestine', EH: 'Western Sahara', AG: 'Antigua and Barbuda', KN: 'Saint Kitts and Nevis',
  VC: 'Saint Vincent and the Grenadines', ST: 'São Tomé and Príncipe', MH: 'Marshall Islands',
  FM: 'Micronesia', VG: 'British Virgin Islands', VI: 'US Virgin Islands', KY: 'Cayman Islands',
  TC: 'Turks and Caicos Islands', PM: 'Saint Pierre and Miquelon', WF: 'Wallis and Futuna',
  MP: 'Northern Mariana Islands', AS: 'American Samoa', CK: 'Cook Islands', PN: 'Pitcairn Islands',
  SH: 'Saint Helena', IO: 'British Indian Ocean Territory', GS: 'South Georgia',
  BL: 'Saint Barthélemy', MF: 'Saint Martin', SX: 'Sint Maarten', CW: 'Curaçao',
  FO: 'Faroe Islands', AX: 'Åland', PF: 'French Polynesia', NC: 'New Caledonia',
}

// Extra search terms (the autocomplete also matches NE's formal/long names).
const ALIASES = {
  US: ['USA', 'America'], GB: ['UK', 'Britain', 'Great Britain', 'England'], AE: ['UAE'],
  CD: ['Congo-Kinshasa', 'Zaire'], CG: ['Congo-Brazzaville'], CZ: ['Czech Republic'],
  CI: ['Ivory Coast'], SZ: ['Swaziland'], TL: ['East Timor'], MK: ['Macedonia'],
  MM: ['Burma'], NL: ['Holland'], KP: ['DPRK'], KR: ['Korea'], VA: ['Holy See'],
  CV: ['Cape Verde'], TR: ['Turkey'], RU: ['Russian Federation'],
}

// Dispersed atoll nations: their outlines are scattered specks across thousands of km,
// so they stay guessable but never become the answer.
const NOT_ANSWERS = new Set(['KI', 'MH', 'FM', 'MV', 'TV', 'PF', 'TK', 'PN', 'UM', 'IO', 'HM', 'TF', 'GS', 'AQ', 'CK', 'WF', 'NU', 'NR', 'PW', 'SC', 'TO', 'AS', 'MP', 'KY', 'VI', 'VG'])
// Answer pool = recognisable sovereign states and sizeable territories.
const POOL_TYPES = new Set(['Sovereign country', 'Country', 'Sovereignty', 'Disputed', 'Indeterminate'])
// Natural Earth carves these out of the island/country people know; fold them back in
// so the silhouette is whole (Somalia's north, all of Cyprus, no Baikonur-shaped hole).
const MERGE_INTO = { Somaliland: 'SO', 'N. Cyprus': 'CY', 'Cyprus U.N. Buffer Zone': 'CY', Akrotiri: 'CY', Dhekelia: 'CY', Baikonur: 'KZ', 'USNB Guantanamo Bay': 'CU', 'Brazilian I.': 'BR' }
const MIN_POOL_POP = 40_000
const TYPE_RANK = { 'Sovereign country': 0, Country: 0, Disputed: 1, Dependency: 2, Lease: 3, Indeterminate: 4, Sovereignty: 1 }

const polygonsOf = (geom) => (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates)
const polyFeature = (coords) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } })

// Keep the parts near the main landmass; the reach scales with the country's size.
function mainParts(geom) {
  const parts = polygonsOf(geom).map(c => ({ c, area: geoArea(polyFeature(c)), ctr: geoCentroid(polyFeature(c)) }))
  parts.sort((a, b) => b.area - a.area)
  const main = parts[0]
  const totalKm2 = parts.reduce((s, p) => s + p.area, 0) * EARTH_KM ** 2
  const mainRadius = Math.sqrt(main.area * EARTH_KM ** 2 / Math.PI)
  const reach = Math.max(300, 1.6 * Math.sqrt(totalKm2))
  return parts.filter(p => p === main || geoDistance(p.ctr, main.ctr) * EARTH_KM - mainRadius < reach).map(p => p.c)
}

// Douglas–Peucker on a closed ring of [x, y].
function simplify(pts, tol) {
  if (pts.length < 5) return pts
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  const t2 = tol * tol
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = pts[a], [bx, by] = pts[b]
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy
    let max = -1, idx = -1
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]
      let d2
      if (len2 === 0) d2 = (px - ax) ** 2 + (py - ay) ** 2
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
        d2 = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
      }
      if (d2 > max) { max = d2; idx = i }
    }
    if (max > t2) { keep[idx] = 1; stack.push([a, idx], [idx, b]) }
  }
  return pts.filter((_, i) => keep[i])
}

const ringArea = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(s / 2) }

// Stream a feature through a projection into rings of [x, y].
function project(feature, proj) {
  const rings = []
  let ring = null
  const sink = {
    point(x, y) { ring?.push([x, y]) },
    lineStart() { ring = [] },
    lineEnd() { if (ring?.length > 2) rings.push(ring); ring = null },
    polygonStart() {}, polygonEnd() {}, sphere() {},
  }
  geoStream(feature, proj.stream(sink))
  return rings
}

// Simplify and encode rings as a compact relative-coordinate SVG path (integers).
// `keepBiggest` always keeps the largest ring, however small (micro-states).
function encode(rings, tolerance, minRing, keepBiggest = true) {
  const kept = rings.map(r => simplify([...r, r[0]], tolerance)).filter(r => r.length > 3)
  const biggest = Math.max(...kept.map(ringArea))
  let d = ''
  let cx = 0, cy = 0
  for (const r of kept) {
    if (ringArea(r) < minRing && !(keepBiggest && ringArea(r) === biggest)) continue
    const pts = r.slice(0, -1).map(([x, y]) => [Math.round(x), Math.round(y)])
      .filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1])
    if (pts.length < 3) continue
    // First ring absolute; later rings relative to the previous ring's start (where
    // the pen sits after `z`).
    d += d ? `m${pts[0][0] - cx} ${pts[0][1] - cy}` : `M${pts[0][0]} ${pts[0][1]}`
    cx = pts[0][0]; cy = pts[0][1]
    let seg = 'l'
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1]
      seg += `${i > 1 && dx >= 0 ? ' ' : ''}${dx}${dy >= 0 ? ' ' : ''}${dy}`
    }
    d += `${seg}z`
  }
  return d
}

// The silhouette: Mercator rotated onto the country's own longitude, fitted to the box.
function toPath(feature, center) {
  const proj = geoMercator().rotate([-center[0], 0]).fitExtent([[PAD, PAD], [BOX - PAD, BOX - PAD]], feature)
  return encode(project(feature, proj), TOLERANCE, MIN_RING)
}

// ── The shared world map (Overland's board) ──────────────────────────────────
// One Mercator for every country, seam in the Pacific, cropped to 84°N–57°S.
const MAP_W = 4000
const MAP_TOL = 0.9
const worldProj = geoMercator().rotate([-11, 0]).scale(MAP_W / (2 * Math.PI)).translate([MAP_W / 2, 0])
const MAP_TOP = worldProj([0, 84])[1]
const MAP_H = Math.round(worldProj([0, -57])[1] - MAP_TOP)
worldProj.translate([MAP_W / 2, -MAP_TOP])

function bboxOf(rings) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const r of rings) for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  return [x0, y0, x1, y1].map(Math.round)
}

function frameBox(rings, lp) {
  const big = Math.max(...rings.map(ringArea))
  const near = rings.filter(r => Math.abs(r.reduce((a, [x]) => a + x, 0) / r.length - lp[0]) < MAP_W / 3)
  const main = near.filter(r => ringArea(r) >= big * 0.05)
  return bboxOf(main.length ? main : near.length ? near : rings)
}

// Land borders: two countries are neighbours when their drawn parts share border
// vertices. Natural Earth builds neighbouring polygons from the same border lines,
// so a shared land border shows up as identical coordinates on both sides; a sea
// between them never does. Overseas territories are not drawn, so they don't count
// (France does not border Brazil); exclaves are real land borders and do (Ceuta and
// Melilla: Spain–Morocco; Kaliningrad: Russia–Poland/Lithuania).
function neighbours(partsByCode) {
  const owners = new Map()
  for (const [code, parts] of partsByCode) {
    for (const poly of parts) for (const ring of poly) for (const [x, y] of ring) {
      const k = `${x},${y}`
      const set = owners.get(k)
      if (!set) owners.set(k, new Set([code]))
      else set.add(code)
    }
  }
  const adj = new Map([...partsByCode.keys()].map(c => [c, new Set()]))
  for (const set of owners.values()) {
    if (set.size < 2) continue
    for (const a of set) for (const b of set) if (a !== b) adj.get(a).add(b)
  }
  return adj
}

async function loadSource() {
  const arg = process.argv[2]
  if (arg) return JSON.parse(readFileSync(arg, 'utf8'))
  const res = await fetch(SRC_URL)
  if (!res.ok) throw new Error(`Natural Earth download failed: ${res.status}`)
  return res.json()
}

const src = await loadSource()
const flags = new Set(
  (await import('node:fs')).readdirSync('node_modules/flag-icons/flags/4x3').map(f => f.replace('.svg', '').toUpperCase()),
)

// One feature per ISO code (NE has a few lease/indeterminate areas sharing a parent's code).
const byCode = new Map()
for (const f of src.features) {
  const p = f.properties
  const code = p.ISO_A2_EH
  if (MERGE_INTO[p.NAME]) continue
  if (!code || code === '-99' || code === 'AQ') continue
  const prev = byCode.get(code)
  if (!prev || (TYPE_RANK[p.TYPE] ?? 9) < (TYPE_RANK[prev.properties.TYPE] ?? 9)) byCode.set(code, f)
}

for (const f of src.features) {
  const into = byCode.get(MERGE_INTO[f.properties.NAME])
  if (!into) continue
  into.geometry = { type: 'MultiPolygon', coordinates: [...polygonsOf(into.geometry), ...polygonsOf(f.geometry)] }
}

const sorted = [...byCode].sort(([a], [b]) => a.localeCompare(b))
const partsByCode = new Map(sorted.map(([code, f]) => [code, mainParts(f.geometry)]))
const adj = neighbours(partsByCode)

const countries = []
const map = []
for (const [code, f] of sorted) {
  const p = f.properties
  const parts = partsByCode.get(code)
  const feature = { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: parts } }
  const [lon, lat] = geoCentroid(feature)
  const name = NAMES[code] || p.NAME_EN || p.NAME
  const aliases = [...new Set([...(ALIASES[code] || []), p.NAME, p.NAME_EN, p.NAME_LONG, p.FORMAL_EN].filter(a => a && a !== name))]
  const answer = !NOT_ANSWERS.has(code) && POOL_TYPES.has(p.TYPE) && p.POP_EST >= MIN_POOL_POP
    || (p.TYPE === 'Dependency' && p.POP_EST >= 50_000 && !NOT_ANSWERS.has(code))
  countries.push({
    code,
    name,
    ...(aliases.length ? { aliases } : {}),
    r: p.REGION_UN, // UN region: Africa, Americas, Asia, Europe, Oceania
    lat: +lat.toFixed(3),
    lon: +lon.toFixed(3),
    ...(answer ? { answer: true } : {}),
    flag: flags.has(code),
    d: toPath(feature, [lon, lat]),
    ...(adj.get(code).size ? { n: [...adj.get(code)].sort() } : {}),
  })
  // World-map shape: the drawn parts, plus any remote parts as plain land (so French
  // Guiana is still land on the map, just not France's), and a label point.
  const rings = project(feature, worldProj)
  const rest = polygonsOf(f.geometry).filter(c => !parts.includes(c))
  const restRings = rest.length ? project({ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: rest } }, worldProj) : []
  const lp = worldProj([p.LABEL_X, p.LABEL_Y])
  map.push({
    code,
    d: encode(rings, MAP_TOL, 1.5),
    ...(restRings.length ? { x: encode(restRings, MAP_TOL, 1.5, false) } : {}),
    // Framing box: the substantial parts only — no outlying islets (Aleutians, Hawaii)
    // or slivers wrapped across the Pacific seam (Chukotka, east Fiji).
    bb: frameBox(rings, lp),
    lp: lp.map(Math.round),
  })
}

const out = {
  meta: {
    schemaVersion: 1,
    source: 'Natural Earth 1:10m Admin 0 – Countries (public domain), naturalearthdata.com',
    generatedAt: new Date().toISOString().slice(0, 10),
    countries: countries.length,
    answers: countries.filter(c => c.answer).length,
    box: BOX,
  },
  countries,
}
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out))
console.log(`${OUT}: ${countries.length} countries, ${out.meta.answers} answers, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`)

const mapOut = {
  meta: { schemaVersion: 1, source: out.meta.source, generatedAt: out.meta.generatedAt, projection: 'Mercator, 11°E centre, 84°N–57°S', w: MAP_W, h: MAP_H },
  countries: map,
}
writeFileSync(MAP_OUT, JSON.stringify(mapOut))
console.log(`${MAP_OUT}: ${map.length} shapes, ${(JSON.stringify(mapOut).length / 1024).toFixed(0)} KB`)
