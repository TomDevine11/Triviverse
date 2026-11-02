#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// ARTICLES: renders the editorial section (/articles and /articles/<slug>)
// into dist/ as plain static HTML, and adds those URLs to the sitemap.
//
// Why it exists: AdSense rejected Triviverse twice for "low-value content".
// Every other page on the site is a game plus a guide to playing it. These
// pages are standalone reading built from the same Transfermarkt, Natural Earth
// and World Bank data the games use, so each one has something new to say.
//
// The article text lives in src/articles/content/*.js and is never bundled into
// the app. The app imports only the lightweight index (src/articles/index.js)
// for "Further reading" links. Runs after both prerenders, before
// cloudflare-pages.mjs flattens dist/articles/x/index.html into dist/articles/x.html.
// ─────────────────────────────────────────────────────────────────────────

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ARTICLES, AUTHOR, CATEGORIES } from '../../src/articles/content/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', '..', 'dist')
const SITE = 'https://triviverse.com'
const PUB_ID = 'ca-pub-2277295336282027'

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Inline markup in article text: [label](/path) links and *emphasis*. Applied
// after escaping, so nothing else in the copy can become HTML.
export function inline(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

const fmtDate = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const words = a => a.body.map(b => [b.p, b.h2, b.note, ...(b.ul || []), ...(b.ol || []), ...((b.table?.rows || []).flat())].filter(Boolean).join(' ')).join(' ').split(/\s+/).length
const readMins = a => Math.max(3, Math.round(words(a) / 220))

function block(b) {
  if (b.h2) return `<h2 id="${esc(b.id || b.h2.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}">${inline(b.h2)}</h2>`
  if (b.p) return `<p>${inline(b.p)}</p>`
  if (b.note) return `<p class="note">${inline(b.note)}</p>`
  if (b.ul) return `<ul>${b.ul.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`
  if (b.ol) return `<ol>${b.ol.map(i => `<li>${inline(i)}</li>`).join('')}</ol>`
  if (b.table) {
    const t = b.table
    const num = (t.numeric || [])
    const cell = (tag, v, i) => `<${tag}${num.includes(i) ? ' class="n"' : ''}>${inline(String(v))}</${tag}>`
    return `<div class="tbl"><table>${t.caption ? `<caption>${inline(t.caption)}</caption>` : ''}`
      + `<thead><tr>${t.head.map((h, i) => cell('th', h, i)).join('')}</tr></thead>`
      + `<tbody>${t.rows.map(r => `<tr>${r.map((v, i) => cell('td', v, i)).join('')}</tr>`).join('')}</tbody></table></div>`
  }
  if (b.cta) return `<p class="cta"><a href="${b.cta.href}">${esc(b.cta.label)} →</a></p>`
  throw new Error(`Unknown article block: ${JSON.stringify(b).slice(0, 80)}`)
}

const CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0b0a14; color: #e9e7f2; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.7; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 40px 16px 96px; }
  header.site { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .logo { font-weight: 800; letter-spacing: 2px; color: #a78bfa; text-decoration: none; font-size: 15px; }
  header.site nav a { color: #8c89a3; text-decoration: none; font-size: 14px; margin-left: 16px; }
  .crumbs { margin-top: 28px; font-size: 14px; color: #8c89a3; }
  .crumbs a { color: #8c89a3; }
  h1 { font-size: clamp(28px, 6vw, 38px); margin: 10px 0 10px; line-height: 1.15; letter-spacing: -0.01em; }
  .dek { font-size: 19px; color: #c9c6d6; margin: 0 0 14px; }
  .byline { color: #8c89a3; font-size: 14px; margin-bottom: 30px; }
  h2 { font-size: 22px; margin: 40px 0 8px; color: #fff; line-height: 1.25; }
  p, li { color: #c9c6d6; font-size: 17px; }
  li { margin-bottom: 6px; }
  a { color: #a78bfa; }
  em { color: #e9e7f2; }
  .note { font-size: 15px; color: #9b98ad; border-left: 3px solid #3b3552; padding-left: 14px; }
  .tbl { overflow-x: auto; margin: 18px 0 22px; -webkit-overflow-scrolling: touch; }
  table { border-collapse: collapse; width: 100%; font-size: 15px; }
  caption { text-align: left; color: #8c89a3; font-size: 14px; padding-bottom: 8px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.08); color: #c9c6d6; white-space: nowrap; }
  th { color: #fff; font-weight: 600; font-size: 14px; }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
  .cta a { display: inline-block; margin-top: 6px; padding: 12px 20px; border-radius: 999px; background: #7c3aed; color: #fff; text-decoration: none; font-weight: 700; font-size: 16px; }
  .cards { list-style: none; padding: 0; margin: 0; }
  .cards li { padding: 18px 0; border-bottom: 1px solid rgba(255,255,255,0.08); margin: 0; }
  .cards a.t { color: #fff; font-size: 19px; font-weight: 700; text-decoration: none; line-height: 1.3; }
  .cards a.t:hover { color: #c4b5fd; }
  .cards p { margin: 6px 0 4px; font-size: 16px; }
  .meta { color: #8c89a3; font-size: 13px; }
  .tag { display: inline-block; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #a78bfa; margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 44px 0 28px; }
  footer p { font-size: 14px; color: #8c89a3; }
  footer a { color: #8c89a3; margin-right: 14px; }
`

function page({ title, description, canonical, body, jsonLd, ogType = 'website' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="google-adsense-account" content="${PUB_ID}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="theme-color" content="#0b0a14" />
<link rel="canonical" href="${canonical}" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<meta property="og:type" content="${ogType}" />
<meta property="og:site_name" content="Triviverse" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${SITE}/og/default.png" />
<meta name="twitter:card" content="summary_large_image" />
${jsonLd.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
<style>${CSS}</style>
</head>
<body>
  <div class="wrap">
    <header class="site"><a class="logo" href="/">TRIVIVERSE</a><nav><a href="/articles">Articles</a><a href="/geography">Geography</a></nav></header>
${body}
    <hr />
    <footer>
      <p><a href="/">Football games</a><a href="/geography">Geography games</a><a href="/articles">Articles</a><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></p>
      <p>Triviverse is an independent site of free daily trivia games. Found a mistake in an article? <a href="/contact">Tell us</a> and it will be corrected.</p>
    </footer>
  </div>
</body>
</html>
`
}

const card = (a, tag = true) => `<li>${tag ? `<span class="tag">${esc(CATEGORIES[a.category])}</span><br />` : ''}<a class="t" href="/articles/${a.slug}">${esc(a.h1)}</a><p>${esc(a.dek)}</p><span class="meta">${fmtDate(a.published)} · ${readMins(a)} min read</span></li>`

// Newest first; articles published the same day keep their order in the content files.
const byDate = [...ARTICLES].sort((a, b) => b.published.localeCompare(a.published))

function articlePage(a) {
  const url = `${SITE}/articles/${a.slug}`
  const related = ARTICLES.filter(o => o.slug !== a.slug && o.category === a.category).slice(0, 4)
  const games = (a.games || []).map(g => `<li><a href="${g.href}">${esc(g.label)}</a></li>`).join('')
  const body = `
    <div class="crumbs"><a href="/articles">Articles</a> · ${esc(CATEGORIES[a.category])}</div>
    <article>
      <h1>${esc(a.h1)}</h1>
      <p class="dek">${esc(a.dek)}</p>
      <div class="byline">By ${esc(AUTHOR.name)} · Published ${fmtDate(a.published)}${a.updated && a.updated !== a.published ? ` · Updated ${fmtDate(a.updated)}` : ''} · ${readMins(a)} min read</div>
      ${a.body.map(block).join('\n      ')}
      ${a.sources ? `<h2 id="sources">Sources and method</h2>${a.sources.map(s => `<p class="note">${inline(s)}</p>`).join('')}` : ''}
    </article>
    ${games ? `<h2>Play it</h2><ul>${games}</ul>` : ''}
    ${related.length ? `<h2>More ${esc(CATEGORIES[a.category].toLowerCase())} articles</h2><ul class="cards">${related.map(card).join('')}</ul>` : ''}`
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Article', headline: a.h1, description: a.description,
      datePublished: a.published, dateModified: a.updated || a.published, mainEntityOfPage: url,
      author: { '@type': AUTHOR.type, name: AUTHOR.name, url: `${SITE}/about` },
      publisher: { '@type': 'Organization', name: 'Triviverse', url: SITE },
      image: `${SITE}/og/default.png`, wordCount: words(a),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Triviverse', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Articles', item: `${SITE}/articles` },
        { '@type': 'ListItem', position: 3, name: a.h1, item: url },
      ],
    },
  ]
  return page({ title: a.title, description: a.description, canonical: url, body, jsonLd, ogType: 'article' })
}

function indexPage() {
  const sections = Object.entries(CATEGORIES).map(([key, label]) => {
    const list = byDate.filter(a => a.category === key)
    return list.length ? `<h2>${esc(label)}</h2><ul class="cards">${list.map(a => card(a, false)).join('')}</ul>` : ''
  }).join('\n')
  const body = `
    <h1>Articles</h1>
    <p class="dek">Football and geography, read through the data behind the games: record scorers, journeymen, rivalries, borders and the world in numbers.</p>
    <p>Every Triviverse game is built from real records: Transfermarkt for football, and Natural Earth and the World Bank for geography. These articles go through the same records looking for the stories in them. Each one says where its figures come from and the date they were checked, and every number in it can be traced back to its source.</p>
    ${sections}`
  return page({
    title: 'Articles: football and geography in numbers | Triviverse',
    description: 'Data-led football and geography articles from Triviverse: Premier League records, journeymen, rivalries, borders and the world in numbers.',
    canonical: `${SITE}/articles`, body,
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Triviverse articles', url: `${SITE}/articles`,
      hasPart: byDate.map(a => ({ '@type': 'Article', headline: a.h1, url: `${SITE}/articles/${a.slug}` })) }],
  })
}

// ── Write ──
const seen = new Set()
for (const a of ARTICLES) {
  if (seen.has(a.slug)) throw new Error(`Duplicate article slug: ${a.slug}`)
  seen.add(a.slug)
  if (!CATEGORIES[a.category]) throw new Error(`${a.slug}: unknown category ${a.category}`)
  const dir = path.join(DIST, 'articles', a.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.html'), articlePage(a))
}
mkdirSync(path.join(DIST, 'articles'), { recursive: true })
writeFileSync(path.join(DIST, 'articles', 'index.html'), indexPage())
console.error(`  ✓ /articles (+${ARTICLES.length} articles)`)

// ── Sitemap: the articles, plus About and Contact, which were never listed ──
const sitemapPath = path.join(DIST, 'sitemap.xml')
let sm = readFileSync(sitemapPath, 'utf8')
const entry = (loc, lastmod, freq, pri) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`
const latest = byDate[0]?.updated || byDate[0]?.published
const add = [entry(`${SITE}/articles`, latest, 'weekly', '0.7')]
for (const a of byDate) add.push(entry(`${SITE}/articles/${a.slug}`, a.updated || a.published, 'monthly', '0.6'))
for (const p of ['about', 'contact']) { // privacy + terms are deliberately noindex
  if (!sm.includes(`<loc>${SITE}/${p}</loc>`)) add.push(entry(`${SITE}/${p}`, latest, 'yearly', '0.3'))
}
sm = sm.replace('</urlset>', `${add.join('\n')}\n</urlset>`)
writeFileSync(sitemapPath, sm)
console.error('  ✓ sitemap.xml (+articles)')
