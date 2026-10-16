#!/usr/bin/env node
// Triviverse Geography — builds Postcard's photo library.
//
//   npm run build:postcards            fetch, verify, optimise, write manifest
//   npm run build:postcards -- --sheet also write a contact sheet for eyeballing
//
// Input: scripts/geography/postcards.source.mjs (Wikipedia article per place).
// For each place:
//   1. English Wikipedia → the article's primary coordinates (the answer), its lead
//      photo (unless the entry pins a Commons `file`) and a two-sentence summary.
//   2. Wikimedia Commons → the photo's licence, author and source page. Only CC0,
//      public domain, CC BY and CC BY-SA photos are accepted; anything flagged
//      non-free, under another licence, too small or not a JPEG/PNG photo is
//      rejected and reported. Nothing is assumed reusable just for being hosted there.
//   3. sharp → one WebP, at most 1280×1024, metadata stripped, quality stepped down
//      until it fits the size budget. Named by content hash (cache-forever, and the
//      file name says nothing about the answer).
//
// Output (committed artefacts, nothing fetched at runtime):
//   public/geography/postcards/<hash>.webp
//   src/geography/data/postcards.generated.json
// Downloads are cached in .cache/postcards so re-runs don't hit Wikimedia again.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { POSTCARDS } from './postcards.source.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = path.join(ROOT, 'public/geography/postcards')
const OUT_JSON = path.join(ROOT, 'src/geography/data/postcards.generated.json')
const CACHE = path.join(ROOT, '.cache/postcards')
const UA = 'TriviverseBuild/1.0 (https://triviverse.com; build-time photo curation)'
const MAX_W = 1280, MAX_H = 1024
const MIN_SRC_W = 1200
const BUDGET = 180 * 1024 // bytes; quality steps down until the file fits
const QUALITIES = [76, 72, 68, 64, 60, 56]
const SHEET = process.argv.includes('--sheet')

// The licences we accept, matched against Commons' LicenseShortName.
const OK_LICENCE = /^(cc0|cc[- ]by(-sa)?[- ]\d(\.\d)?([- ][a-z-]+)?|public domain|pd[- ]?\w*)$/i

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function api(host, params) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params })
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) return res.json()
    await sleep(1500 * (attempt + 1))
  }
  throw new Error(`API failed: ${url}`)
}
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))

const slug = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
const plain = (html = '') => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

// Two sentences of the article's lead, without the pronunciation/etymology brackets.
function blurb(extract = '') {
  let s = extract.replace(/\s*\([^()]*\)/g, '').replace(/\s*\([^()]*\)/g, '').replace(/\s+([,.;])/g, '$1').replace(/\s+/g, ' ').trim()
  const sentences = s.match(/[^.!?]+[.!?]+(\s|$)/g) || [s]
  let out = ''
  for (const x of sentences) { if ((out + x).length > 240 && out) break; out += x }
  return out.trim()
}

// 1. Wikipedia: coordinates, lead image, summary (extracts cap at 20 titles a call).
async function fetchArticles() {
  const byTitle = new Map()
  for (const batch of chunks(POSTCARDS, 20)) {
    const data = await api('en.wikipedia.org', {
      redirects: '1', prop: 'pageimages|coordinates|extracts|info', inprop: 'url',
      piprop: 'name', exintro: '1', explaintext: '1', exlimit: '20', colimit: 'max',
      titles: batch.map(p => p.t).join('|'),
    })
    const alias = new Map()
    for (const n of [...(data.query.normalized || []), ...(data.query.redirects || [])]) alias.set(n.to, n.from)
    for (const page of data.query.pages) {
      let title = page.title
      while (alias.has(title)) title = alias.get(title)
      byTitle.set(title, page)
    }
    await sleep(250)
  }
  return byTitle
}

// 2. Commons: licence + author + a thumbnail URL for each file.
async function fetchFiles(files) {
  const byFile = new Map()
  for (const batch of chunks([...new Set(files)], 40)) {
    const data = await api('commons.wikimedia.org', {
      prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1920',
      iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit|NonFree|AttributionRequired',
      titles: batch.map(f => `File:${f}`).join('|'),
    })
    const alias = new Map((data.query.normalized || []).map(n => [n.to, n.from]))
    for (const page of data.query.pages) {
      const key = (alias.get(page.title) || page.title).replace(/^File:/, '').replace(/ /g, '_')
      byFile.set(key, page)
    }
    await sleep(250)
  }
  return byFile
}

async function download(url, file) {
  mkdirSync(CACHE, { recursive: true })
  const dest = path.join(CACHE, createHash('sha1').update(file).digest('hex').slice(0, 16) + path.extname(file).toLowerCase())
  if (existsSync(dest)) return readFileSync(dest)
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      writeFileSync(dest, buf)
      await sleep(400)
      return buf
    }
    await sleep(2000 * (attempt + 1))
  }
  throw new Error(`download failed (${url})`)
}

// 3. One WebP per photo, inside the size budget.
// Very detailed photos (foliage, crowds, surf) that still don't fit at the lowest
// quality step down in size instead, so no photo ever ships over budget.
async function optimise(buf) {
  let out
  sizes: for (const scale of [1, 0.88, 0.76, 0.64]) {
    const base = sharp(buf).rotate().resize({ width: Math.round(MAX_W * scale), height: Math.round(MAX_H * scale), fit: 'inside', withoutEnlargement: true })
    for (const quality of QUALITIES) {
      out = await base.clone().webp({ quality, effort: 6, smartSubsample: true }).toBuffer({ resolveWithObject: true })
      if (out.data.length <= BUDGET) break sizes
    }
  }
  const { dominant } = await sharp(out.data).stats()
  const hex = '#' + [dominant.r, dominant.g, dominant.b].map(v => Math.round(v * 0.55).toString(16).padStart(2, '0')).join('')
  return { data: out.data, w: out.info.width, h: out.info.height, tone: hex }
}

async function main() {
  const articles = await fetchArticles()
  const files = POSTCARDS.map(p => (p.file || articles.get(p.t)?.pageimage || '').replace(/ /g, '_')).filter(Boolean)
  const commons = await fetchFiles(files)

  mkdirSync(OUT_DIR, { recursive: true })
  const out = [], rejected = [], seen = new Set()
  for (const p of POSTCARDS) {
    const id = slug(p.name)
    const reject = (why) => rejected.push(`${p.name}: ${why}`)
    if (seen.has(id)) { reject('duplicate id'); continue }
    const page = articles.get(p.t)
    if (!page || page.missing) { reject(`no article "${p.t}"`); continue }
    const co = page.coordinates?.find(c => c.primary) || page.coordinates?.[0]
    const [lat, lon] = p.ll || (co ? [co.lat, co.lon] : [])
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) { reject('no usable coordinates'); continue }
    const file = (p.file || page.pageimage || '').replace(/ /g, '_')
    if (!file) { reject('no lead image'); continue }
    const info = commons.get(file)?.imageinfo?.[0]
    if (!info) { reject(`"${file}" is not on Commons (likely a local non-free file)`); continue }
    const meta = info.extmetadata || {}
    const licence = plain(meta.LicenseShortName?.value)
    if (meta.NonFree?.value || !OK_LICENCE.test(licence)) { reject(`licence "${licence || 'unknown'}" not accepted`); continue }
    if (!/^image\/(jpeg|png)$/.test(info.mime)) { reject(`not a photo (${info.mime})`); continue }
    if (info.width < MIN_SRC_W) { reject(`too small (${info.width}px wide)`); continue }
    const artist = (plain(meta.Artist?.value) || plain(meta.Credit?.value) || 'Unknown author').slice(0, 90)

    let img
    try {
      img = await optimise(await download(info.thumburl || info.url, file))
    } catch (e) { reject(e.message); continue }
    const hash = createHash('sha256').update(img.data).digest('hex').slice(0, 12)
    writeFileSync(path.join(OUT_DIR, `${hash}.webp`), img.data)
    seen.add(id)
    out.push({
      id,
      img: `/geography/postcards/${hash}.webp`,
      w: img.w, h: img.h, tone: img.tone, kb: Math.round(img.data.length / 1024),
      name: p.name, place: p.place,
      lat: +lat.toFixed(5), lon: +lon.toFixed(5),
      blurb: blurb(page.extract),
      wiki: page.fullurl,
      credit: {
        artist,
        licence,
        licenceUrl: meta.LicenseUrl?.value || null,
        source: info.descriptionurl,
        file,
      },
    })
    process.stderr.write(`  ✓ ${p.name} (${Math.round(img.data.length / 1024)} KB, ${licence})\n`)
  }

  // Drop photos no longer in the manifest.
  const keep = new Set(out.map(o => path.basename(o.img)))
  for (const f of readdirSync(OUT_DIR)) if (!keep.has(f)) unlinkSync(path.join(OUT_DIR, f))

  const totalKb = out.reduce((s, o) => s + o.kb, 0)
  writeFileSync(OUT_JSON, JSON.stringify({
    meta: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString().slice(0, 10),
      source: 'Photos: Wikimedia Commons (licence per entry). Coordinates and summaries: English Wikipedia (CC BY-SA 4.0).',
      count: out.length, totalKb,
    },
    postcards: out.map(({ kb, ...o }) => o),
  }, null, 1) + '\n')

  console.error(`\n${out.length} postcards · ${(totalKb / 1024).toFixed(1)} MB · avg ${Math.round(totalKb / out.length)} KB`)
  if (rejected.length) console.error(`\nRejected ${rejected.length}:\n  ` + rejected.join('\n  '))

  if (SHEET) {
    const cell = 240, cols = 10, rows = Math.ceil(out.length / cols)
    const tiles = await Promise.all(out.map(async (o, i) => ({
      input: await sharp(path.join(ROOT, 'public', o.img)).resize(cell, Math.round(cell * 0.66), { fit: 'cover' }).toBuffer(),
      left: (i % cols) * cell, top: Math.floor(i / cols) * Math.round(cell * 0.66),
    })))
    const sheet = path.join(CACHE, 'contact-sheet.jpg')
    await sharp({ create: { width: cols * cell, height: rows * Math.round(cell * 0.66), channels: 3, background: '#000' } }).composite(tiles).jpeg({ quality: 80 }).toFile(sheet)
    console.error(`\nContact sheet: ${sheet}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
