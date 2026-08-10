#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// PRERENDER — turns the built SPA into one static HTML file per route + locale.
//
// Runs after `vite build`. For every route in src/seo/seoConfig.js it writes a
// unique static HTML file — English at the root (dist/wordle/index.html) and
// Spanish under /es (dist/es/wordle/index.html) — each with that route+locale's
// title, meta, canonical, hreflang alternates, Open Graph/Twitter tags and
// JSON-LD baked into <head>, plus real crawlable content (h1, how-to, FAQ,
// internal links) inside #root. The SPA then boots and replaces #root.
//
// Also emits dist/sitemap.xml (with hreflang alternates) and dist/robots.txt.
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  ROUTES, SITE_URL, BRAND, absolute, absoluteFor, localePrefix, routeByPath,
  metaTagsFor, jsonLdFor, indexableRoutes, alternatesFor, LOCALES,
} from '../src/seo/seoConfig.js'
import { strings } from '../src/i18n/strings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const template = readFileSync(path.join(DIST, 'index.html'), 'utf8')

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
  if (route.sections?.length) {
    for (const s of route.sections) { h += `<h2>${esc(s.h2)}</h2>`; for (const p of s.body) h += `<p>${esc(p)}</p>` }
  }
  if (route.howTo?.length) {
    h += `<h2>${esc(t('common.howToPlay', lang, { name: route.name }))}</h2><ol>`
    for (const s of route.howTo) h += `<li>${esc(s)}</li>`
    h += `</ol>`
  }
  if (route.faq?.length) {
    h += `<h2>${esc(t('common.faq', lang))}</h2><dl>`
    for (const f of route.faq) h += `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`
    h += `</dl>`
  }
  if (route.answersPath) h += `<p>${link(route.answersPath, `Past ${route.name} answers & solutions`)}</p>`
  const others = indexableRoutes().filter(o => o.path !== route.path && !o.hideFromNav)
  h += `<nav aria-label="${esc(t('common.moreGames', lang))}"><h2>${esc(t('common.moreGames', lang))}</h2><ul>`
  if (route.path !== '/') h += `<li>${link('/', BRAND)}</li>`
  for (const o of others.filter(o => o.path !== '/')) h += `<li>${link(o.path, o.name)}</li>`
  h += `</ul></nav>`
  return h
}

const SR_ONLY = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'
function staticBody(route, lang) {
  return `<div style="min-height:100vh;background:#0b0a14;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;font-family:system-ui,-apple-system,sans-serif">`
    + `<h1 style="color:#fff;font-size:1.75rem;font-weight:800;margin:0">${esc(route.h1)}</h1>`
    + `<p style="color:#9ca3af;margin:.5rem 0 0;max-width:34rem">${esc(route.tagline)}</p>`
    + `<div style="${SR_ONLY}">${crawlable(route, lang)}</div>`
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
  writeRouteLocale(route, 'en')
  if (!route.noindex) writeRouteLocale(route, 'es') // Spanish only for indexable routes
}

function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10)
  const urls = []
  for (const r of indexableRoutes()) {
    const alts = LOCALES.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${absoluteFor(r.path, l)}"/>`)
      .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(r.path)}"/>`).join('\n')
    for (const l of LOCALES) {
      urls.push(`  <url>\n    <loc>${absoluteFor(r.path, l)}</loc>\n${alts}\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq || 'weekly'}</changefreq>\n    <priority>${r.priority || '0.7'}</priority>\n  </url>`)
    }
  }
  writeFileSync(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`)
  console.error('  ✓ sitemap.xml')
}

function writeRobots() {
  writeFileSync(path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)
  console.error('  ✓ robots.txt')
}

console.error(`Prerendering ${BRAND} (${ROUTES.length} routes × ${LOCALES.length} locales)…`)
for (const route of ROUTES) writeRoute(route)
writeSitemap()
writeRobots()
console.error('Done.')
