#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// PRERENDER — turns the built SPA into one static HTML file per route + locale.
//
// Runs after `vite build`. For every route in src/seo/seoConfig.js it writes a
// unique static HTML file (dist/wordle/index.html; English only since 2026-10-09)
// — each with that route's
// title, meta, canonical, Open Graph/Twitter tags and
// JSON-LD baked into <head>, plus real crawlable content (h1, how-to, FAQ,
// internal links) inside #root. The SPA then boots and replaces #root.
//
// Also emits dist/sitemap.xml, dist/robots.txt and
// dist/llms.txt + dist/llms-full.txt (the AI-assistant read of the site).
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  ROUTES, SITE_URL, BRAND, GAME_COUNT, absolute, absoluteFor, localePrefix, routeByPath,
  metaTagsFor, jsonLdFor, indexableRoutes, alternatesFor, LOCALES,
} from '../src/seo/seoConfig.js'
import { llmsTxt, llmsFullTxt } from './seo/llms.mjs'
import { strings } from '../src/i18n/strings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const template = readFileSync(path.join(DIST, 'index.html'), 'utf8')

// Bare SPA shell for app-only screens (/me, /leagues/*) that are never
// prerendered: the untouched Vite template, marked noindex. Served by the
// Cloudflare Worker (worker/index.js) and harmless elsewhere.
writeFileSync(path.join(DIST, 'app-shell.html'), template
  .replace(/<title>[^<]*<\/title>/i, '<title>Triviverse</title>')
  .replace('</head>', '<meta name="robots" content="noindex, nofollow">\n</head>'))

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Minimal translate for the prerender (no React/hooks in Node).
function t(key, lang, vars) {
  const pick = loc => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), strings[loc])
  let s = pick(lang) ?? pick('en') ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v)
  return s
}

function stripManaged(html) {
  return html
    .replace(/\n?\s*<meta\s+name="description"[^>]*>/gi, '')
    .replace(/\n?\s*<meta\s+name="keywords"[^>]*>/gi, '')
    .replace(/\n?\s*<meta\s+name="robots"[^>]*>/gi, '')
    .replace(/\n?\s*<meta\s+name="theme-color"[^>]*>/gi, '')
    .replace(/\n?\s*<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/\n?\s*<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/\n?\s*<link\s+rel="canonical"[^>]*>/gi, '')
}

function headFor(route, lang) {
  const lines = [`<link rel="canonical" href="${absoluteFor(route.path, lang)}" data-seo>`]
  if (!route.noindex) {
    for (const alt of alternatesFor(route.path)) {
      lines.push(`<link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" data-seo>`)
    }
  }
  for (const tag of metaTagsFor(route, lang)) {
    const attr = tag.name ? `name="${esc(tag.name)}"` : `property="${esc(tag.property)}"`
    lines.push(`<meta ${attr} content="${esc(tag.content)}" data-seo>`)
  }
  for (const block of jsonLdFor(route, lang)) {
    lines.push(`<script type="application/ld+json" data-seo>${JSON.stringify(block)}</script>`)
  }
  return lines.join('\n    ')
}

// Crawlable supporting content + internal links, localized.
function crawlable(route, lang) {
  const link = (p, name) => `<a href="${localePrefix(p, lang)}">${esc(name)}</a>`
  let h = ''
  if (route.about) h += `<p>${esc(route.about)}</p>`
  if (route.coverageNote) h += `<p class="coverage-note">${esc(route.coverageNote)}</p>`
  // Relation/list pages: the answer set itself is the content (unique + complete).
  if (route.itemList?.items?.length) {
    h += `<h2>${esc(route.itemList.heading)}</h2><ul>`
    for (const it of route.itemList.items) h += `<li>${esc(it.text)}${it.detail ? ` — ${esc(it.detail)}` : ''}</li>`
    h += `</ul>`
  }
  if (route.howTo?.length) {
    h += `<h2>${esc(t('common.howToPlay', lang, { name: route.name }))}</h2><ol>`
    for (const s of route.howTo) h += `<li>${esc(s)}</li>`
    h += `</ol>`
  }
  if (route.sections?.length) {
    for (const s of route.sections) { h += `<h2>${esc(s.h2)}</h2>`; for (const p of s.body) h += `<p>${esc(p)}</p>` }
  }
  if (route.faq?.length) {
    h += `<h2>${esc(t('common.faq', lang))}</h2><dl>`
    for (const f of route.faq) h += `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`
    h += `</dl>`
  }
  // Contextual internal links (related pairs, hub, a game to play).
  if (route.relatedLinks?.length) {
    h += `<h2>Related football trivia</h2><ul>`
    for (const r of route.relatedLinks) h += `<li>${link(r.path, r.label)}</li>`
    h += `</ul>`
  }
  const others = indexableRoutes().filter(o => o.path !== route.path && !o.hideFromNav)
  h += `<nav aria-label="${esc(t('common.moreGames', lang))}"><h2>${esc(t('common.moreGames', lang))}</h2><ul>`
  if (route.path !== '/') h += `<li>${link('/', BRAND)}</li>`
  for (const o of others.filter(o => o.path !== '/')) h += `<li>${link(o.path, o.name)}</li>`
  h += `</ul></nav>`
  return h
}

// ── Static pages: fill in the live game count ─────────────────────
// About/Contact/Privacy/Terms are plain files in public/ that Vite copies
// verbatim, so any "N games" claim in them goes stale the moment a game is
// added or removed. They carry {{GAME_COUNT}} / {{GAME_COUNT_WORD}} tokens
// instead, substituted here from seoConfig once the copy has landed in dist.
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
const numberWord = (n) => NUMBER_WORDS[n] ?? String(n)

function fillStaticCounts() {
  const filled = []
  for (const page of ['about', 'contact', 'privacy', 'terms']) {
    const file = path.join(DIST, page, 'index.html')
    let html
    try { html = readFileSync(file, 'utf8') } catch { continue }
    if (!html.includes('{{GAME_COUNT')) continue
    writeFileSync(file, html
      .replaceAll('{{GAME_COUNT_WORD}}', numberWord(GAME_COUNT))
      .replaceAll('{{GAME_COUNT}}', String(GAME_COUNT)))
    filled.push(page)
  }
  if (filled.length) console.log(`  \u2713 game count (${GAME_COUNT}) \u2192 ${filled.join(', ')}`)
}

// About / Contact / Privacy / Terms are static files in public/, not app routes, and
// nothing on the site linked to them — reachable only by typing the URL. Both AdSense
// review and TikTok's app-review guidelines require those links to be findable on the
// site, and a crawler reading the prerendered HTML must see them too, so they go in
// here as well as in the React <SiteFooter>.
const SITE_LINKS = '<nav style="margin-top:2rem;font-size:.85rem">'
  + ['/about,About', '/contact,Contact', '/privacy,Privacy', '/terms,Terms']
      .map((pair) => { const [href, label] = pair.split(','); return `<a href="${href}" style="color:#8c89a3;margin:0 .6rem">${label}</a>` })
      .join('')
  + '</nav>'

const SR_ONLY = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'
function staticBody(route, lang) {
  return `<div style="min-height:100vh;background:#0b0a14;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;font-family:system-ui,-apple-system,sans-serif">`
    + `<h1 style="color:#fff;font-size:1.75rem;font-weight:800;margin:0">${esc(route.h1)}</h1>`
    + `<p style="color:#9ca3af;margin:.5rem 0 0;max-width:34rem">${esc(route.tagline)}</p>`
    + `<div style="${SR_ONLY}">${crawlable(route, lang)}</div>`
    + SITE_LINKS
    + `</div>`
}

function buildPage(routePath, lang) {
  const route = routeByPath(routePath, lang)
  let html = stripManaged(template)
  html = html.replace(/<html[^>]*>/i, `<html lang="${lang}">`)
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(route.title)}</title>`)
  html = html.replace(/<\/head>/i, `    ${headFor(route, lang)}\n  </head>`)
  html = html.replace(/<div id="root">\s*<\/div>/i, `<div id="root">${staticBody(route, lang)}</div>`)
  return html
}

function outDir(routePath, lang) {
  const p = localePrefix(routePath, lang).replace(/^\//, '')
  return p === '' ? DIST : path.join(DIST, p)
}

function writeRouteLocale(route, lang) {
  const html = buildPage(route.path, lang)
  const dir = outDir(route.path, lang)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.html'), html)
  console.error(`  ✓ ${localePrefix(route.path, lang)}`)
}

function writeRoute(route) {
  for (const lang of LOCALES) writeRouteLocale(route, lang)
}

function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10)
  const entry = (loc, freq, priority) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  const urls = indexableRoutes().map(r => entry(absolute(r.path), r.changefreq || 'weekly', r.priority || '0.7'))
  writeFileSync(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`)
  console.error('  ✓ sitemap.xml')
}

function writeRobots() {
  writeFileSync(path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)
  console.error('  ✓ robots.txt')
}

// The AI-assistant read of the site — see scripts/seo/llms.mjs for the why.
function writeLlms() {
  writeFileSync(path.join(DIST, 'llms.txt'), llmsTxt())
  console.error('  ✓ llms.txt')
  writeFileSync(path.join(DIST, 'llms-full.txt'), llmsFullTxt())
  console.error('  ✓ llms-full.txt')
}

console.error(`Prerendering ${BRAND} (${ROUTES.length} routes × ${LOCALES.length} locales)…`)
for (const route of ROUTES) writeRoute(route)
writeSitemap()
writeRobots()
writeLlms()
fillStaticCounts()
console.error('Done.')
