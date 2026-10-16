#!/usr/bin/env node
// Triviverse Geography — city labels for map boards (Postcard's pin map).
//
//   npm run build:geography-places [-- path/to/ne_10m_populated_places_simple.geojson]
//
// Source: Natural Earth 1:10m Populated Places (public domain). Keeps capitals and
// big cities, projected onto the shared world map, with a tier (0 = shown first)
// that decides how far in you must zoom before a label appears.
// Output: src/geography/data/places.generated.json (committed; nothing at runtime).
import { readFileSync, writeFileSync } from 'node:fs'
import { project } from '../../src/geography/data/world.js'

const SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson'
const OUT = 'src/geography/data/places.generated.json'

const arg = process.argv[2]
const geo = arg ? JSON.parse(readFileSync(arg, 'utf8')) : await (await fetch(SRC)).json()

const rows = geo.features.map(f => f.properties).map(p => ({
  name: p.name, lat: p.latitude, lon: p.longitude, pop: p.pop_max || 0,
  capital: /Admin-0 capital/.test(p.featurecla), rank: p.scalerank,
})).filter(p => p.lat <= 84 && p.lat >= -57 && (p.capital || p.pop >= 750000 || p.rank <= 3))

const tier = (p) => (p.pop >= 5e6 || (p.capital && p.pop >= 1.5e6) ? 0 : p.capital || p.pop >= 2e6 ? 1 : p.pop >= 1e6 ? 2 : 3)
rows.sort((a, b) => tier(a) - tier(b) || b.pop - a.pop)
const places = rows.map(p => { const [x, y] = project(p.lat, p.lon); return [p.name, +x.toFixed(1), +y.toFixed(1), tier(p)] })

writeFileSync(OUT, JSON.stringify({ meta: { source: 'Natural Earth 1:10m Populated Places (public domain)', count: places.length }, places }) + '\n')
console.error(`${places.length} places → ${OUT}`)
