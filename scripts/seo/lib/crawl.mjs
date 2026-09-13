// Free on-page + internal-link crawler. Fetches our own live pages (what Google actually indexes,
// since each route is server-prerendered) and extracts the on-page signals that drive ranking: title,
// meta description, canonical, robots, headings, word count, internal links (out + inbound), and
// schema types. No third-party API, no cost — just HTTP GETs to our own site. Powers seo-audit.
import * as cheerio from 'cheerio'
import { config } from './config.mjs'

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()

export function analyze(html, path) {
  const $ = cheerio.load(html)
  const title = clean($('title').first().text())
  const desc = $('meta[name="description"]').attr('content') || ''
  const robots = (($('meta[name="robots"]').attr('content')) || '').toLowerCase()
  const canonical = $('link[rel="canonical"]').attr('href') || ''
  const h1 = $('h1').map((_, e) => clean($(e).text())).get().filter(Boolean)
  const h2Count = $('h2').length
  const schema = []
  $('script[type="application/ld+json"]').each((_, e) => {
    try { const j = JSON.parse($(e).contents().text()); for (const x of (Array.isArray(j) ? j : [j])) if (x && x['@type']) schema.push(x['@type']) } catch { /* ignore */ }
  })
  const internalOut = new Set()
  $('a[href]').each((_, e) => { const h = $(e).attr('href'); if (h && h.startsWith('/') && !h.startsWith('//')) internalOut.add(h.split('#')[0].split('?')[0]) })
  $('script, style, noscript').remove()
  const words = clean($('main').text() || $('body').text()).split(' ').filter(Boolean).length
  return { path, title, titleLen: title.length, desc, descLen: desc.length, canonical, noindex: robots.includes('noindex'), h1, h2Count, words, schema: [...new Set(schema)], internalOut: [...internalOut] }
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'TriviverseSEO/1.0' } })
    return { status: res.status, html: await res.text() }
  } catch (e) { return { error: e.message } }
}

// Crawl the given paths against the live site; returns per-page analysis + inbound-link counts.
export async function crawlSite(paths, { base = config.siteUrl, concurrency = 8 } = {}) {
  const out = [], queue = [...paths]
  const worker = async () => {
    while (queue.length) {
      const p = queue.shift()
      const r = await fetchPage(base + p)
      out.push(r.html ? { ...analyze(r.html, p), status: r.status } : { path: p, error: r.error })
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  const inbound = {}
  for (const r of out) for (const t of (r.internalOut || [])) (inbound[t] ||= new Set()).add(r.path)
  for (const r of out) r.internalIn = inbound[r.path]?.size || 0
  return out
}
