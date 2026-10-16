// Triviverse Geography — builds the country statistics Outrank (geography higher or
// lower) compares: src/geography/data/stats.generated.json.
//
//   npm run build:geography-stats
//
// Source: the World Bank's World Development Indicators API (CC BY 4.0,
// https://datacatalog.worldbank.org/public-licenses). Every figure is for ONE
// reference year (YEAR below), from one publisher, so no comparison ever mixes
// years or definitions. Nothing is fetched at runtime: the output is a committed
// artefact, like every other *.generated.json.
//
//   population   SP.POP.TOTL     midyear, de facto (UN World Population Prospects / NSOs)
//   area         AG.LND.TOTL.K2  land area, km², excluding inland water (FAO)
//   density      EN.POP.DNST     people per km² of land area, as published
//   life         SP.DYN.LE00.IN  life expectancy at birth, years (UN WPP / NSOs)
//
// Density is the World Bank's own published series rather than population ÷ area
// recomputed here: for Georgia and Moldova the published population excludes
// Abkhazia/South Ossetia and Transnistria while the land area does not, and the
// published density divides by the matching (government-controlled) land area. For
// every other country the two agree to within rounding — the build checks that.
//
// Inclusion policy (documented on the page's methodology section too):
//   • an economy must appear in both the World Bank list and the geography country
//     set (src/geography/data/countries.generated.json), which supplies names + flags;
//   • sovereign states, plus Palestine and Kosovo (World Bank economies), are
//     'country'; dependent territories are 'territory' and kept only with at least
//     TERRITORY_MIN_POP people (Hong Kong, Macau, Puerto Rico) — tiny territories'
//     area and density figures make for trivia about edge cases, not geography;
//   • a country takes part in a statistic only if the World Bank publishes that
//     statistic for YEAR. Missing values are left out, never filled in.
// Not covered by the World Bank (so not in the game): Taiwan, Vatican City, Western
// Sahara, Jersey and Guernsey (reported jointly as the Channel Islands).

import { readFileSync, writeFileSync } from 'node:fs'

const YEAR = 2024
const OUT = 'src/geography/data/stats.generated.json'
const GEO = 'src/geography/data/countries.generated.json'
const API = 'https://api.worldbank.org/v2'
const TERRITORY_MIN_POP = 500_000

// Non-sovereign economies in the World Bank list (ISO 3166-1 alpha-2).
const TERRITORIES = new Set(['AS', 'AW', 'BM', 'VG', 'KY', 'CW', 'FO', 'PF', 'GI', 'GL', 'GU', 'HK', 'IM', 'MO', 'MF', 'NC', 'MP', 'PR', 'SX', 'TC', 'VI', 'JG'])

const INDICATORS = {
  population: 'SP.POP.TOTL',
  area: 'AG.LND.TOTL.K2',
  density: 'EN.POP.DNST',
  life: 'SP.DYN.LE00.IN',
}

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const body = await res.json()
  if (!Array.isArray(body) || !Array.isArray(body[1])) throw new Error(`Unexpected response from ${url}: ${JSON.stringify(body).slice(0, 200)}`)
  return body
}

const economies = (await getJson(`${API}/country?format=json&per_page=400`))[1]
  .filter(c => c.region?.value !== 'Aggregates')
const wbCodes = new Set(economies.map(c => c.iso2Code))

const values = {}
const lastUpdated = {}
for (const [key, id] of Object.entries(INDICATORS)) {
  const [meta, rows] = await getJson(`${API}/country/all/indicator/${id}?format=json&per_page=20000&date=${YEAR}`)
  lastUpdated[key] = meta.lastupdated
  values[key] = new Map(rows.filter(r => r.value != null && Number.isFinite(r.value) && r.value > 0).map(r => [r.country.id, r.value]))
  console.error(`  ${id}: ${values[key].size} values for ${YEAR} (updated ${meta.lastupdated})`)
}

const geo = JSON.parse(readFileSync(GEO, 'utf8')).countries
const countries = []
const dropped = []
for (const c of geo) {
  if (!wbCodes.has(c.code)) continue
  const kind = TERRITORIES.has(c.code) ? 'territory' : 'country'
  const pop = values.population.get(c.code)
  if (!pop) { dropped.push(`${c.name} (no population)`); continue }
  if (kind === 'territory' && pop < TERRITORY_MIN_POP) { dropped.push(`${c.name} (territory under ${TERRITORY_MIN_POP.toLocaleString('en-GB')})`); continue }
  const row = { code: c.code, kind }
  for (const key of Object.keys(INDICATORS)) {
    const v = values[key].get(c.code)
    if (v != null) row[key] = key === 'population' ? Math.round(v) : +v.toPrecision(8)
  }
  countries.push(row)
}

// Sanity: published density ≈ population ÷ land area, except the documented cases.
const DENSITY_EXCEPTIONS = new Set(['GE', 'MD'])
for (const r of countries) {
  if (!r.area || !r.density) continue
  const off = Math.abs(r.population / r.area / r.density - 1)
  if (off > 0.01 && !DENSITY_EXCEPTIONS.has(r.code)) throw new Error(`Density for ${r.code} is ${(off * 100).toFixed(1)}% off population ÷ area — check the source before shipping`)
}

countries.sort((a, b) => (a.code < b.code ? -1 : 1))
const out = {
  meta: {
    year: YEAR,
    source: 'World Bank, World Development Indicators',
    license: 'CC BY 4.0',
    url: 'https://data.worldbank.org',
    indicators: INDICATORS,
    lastUpdated,
  },
  countries,
}
writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n{') + '\n')
const missing = Object.keys(INDICATORS).map(k => `${k}: ${countries.filter(r => r[k] == null).map(r => r.code).join(', ') || '—'}`)
console.error(`✓ ${OUT}: ${countries.length} countries/territories (${YEAR})`)
console.error(`  missing → ${missing.join(' · ')}`)
console.error(`  left out → ${dropped.length}: ${dropped.join('; ')}`)
