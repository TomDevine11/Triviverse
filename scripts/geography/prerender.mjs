#!/usr/bin/env node
// Triviverse Geography prerender. Runs after scripts/prerender.mjs: writes one
// static HTML file per Geography route (title, meta, canonical, JSON-LD and
// crawlable copy from src/geography/seo.js) and adds the routes to the sitemap.
// Starts from dist/app-shell.html — the untouched Vite template — so nothing of
// the football pages' head or body leaks in.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GEO_ROUTES, metaTags, jsonLd, absolute } from '../../src/geography/seo.js'

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist')
const shell = readFileSync(path.join(DIST, 'app-shell.html'), 'utf8')
  .replace(/\n?\s*<meta name="robots" content="noindex, nofollow">/, '')
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function head(route) {
  const lines = [`<link rel="canonical" href="${absolute(route.path)}" data-seo>`]
  for (const m of metaTags(route)) {
    const attr = m.name ? `name="${esc(m.name)}"` : `property="${esc(m.property)}"`
    lines.push(`<meta ${attr} content="${esc(m.content)}" data-seo>`)
  }
  for (const b of jsonLd(route)) lines.push(`<script type="application/ld+json" data-seo>${JSON.stringify(b)}</script>`)
  return lines.join('\n    ')
}

// About / Contact / Privacy / Terms on every page, as on the football pages — a
// crawler reading the static HTML must find them without running the app.
const SITE_LINKS = '<nav style="margin-top:2rem;font-size:.85rem">'
  + [['/about', 'About'], ['/contact', 'Contact'], ['/privacy', 'Privacy'], ['/terms', 'Terms']]
      .map(([href, label]) => `<a href="${href}" style="color:#8c89a3;margin:0 .6rem">${label}</a>`)
      .join('')
  + '</nav>'

function body(route) {
  let h = `<p>${esc(route.about)}</p>`
  if (route.howTo) h += `<h2>How to play ${esc(route.name)}</h2><ol>${route.howTo.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`
  for (const s of route.sections || []) h += `<h2${s.id ? ` id="${esc(s.id)}"` : ''}>${esc(s.h2)}</h2>${s.body.map(p => `<p>${esc(p)}</p>`).join('')}`
  if (route.faq) h += `<h2>Frequently asked questions</h2><dl>${route.faq.map(f => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join('')}</dl>`
  h += `<nav><ul>${GEO_ROUTES.filter(o => o.path !== route.path).map(o => `<li><a href="${o.path}">${esc(o.name)}</a></li>`).join('')}</ul></nav>`
  return `<div style="min-height:100vh;background:#0b0a14;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;font-family:system-ui,-apple-system,sans-serif">`
    + `<h1 style="color:#fff;font-size:1.75rem;font-weight:800;margin:0">${esc(route.h1)}</h1>`
    + `<p style="color:#9ca3af;margin:.5rem 0 0;max-width:34rem">${esc(route.tagline)}</p>`
    + `<div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">${h}</div>`
    + SITE_LINKS
    + `</div>`
}

for (const route of GEO_ROUTES) {
  const html = shell
    .replace(/<html[^>]*>/i, '<html lang="en">')
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(route.title)}</title>`)
    .replace(/<\/head>/i, `    ${head(route)}\n  </head>`)
    .replace(/<div id="root">\s*<\/div>/i, `<div id="root">${body(route)}</div>`)
  const dir = path.join(DIST, route.path.replace(/^\//, ''))
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.html'), html)
  console.error(`  ✓ ${route.path}`)
}

const sitemapPath = path.join(DIST, 'sitemap.xml')
const today = new Date().toISOString().slice(0, 10)
const entries = GEO_ROUTES.map(r => `  <url>\n    <loc>${absolute(r.path)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`).join('\n')
writeFileSync(sitemapPath, readFileSync(sitemapPath, 'utf8').replace('</urlset>', `${entries}\n</urlset>`))
console.error('  ✓ sitemap.xml (+geography)')
