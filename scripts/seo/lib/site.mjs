// Site model — the layer's understanding of YOUR website, read straight from
// the source of truth (src/seo/seoConfig.js). No credentials needed. Produces a
// per-route summary plus derived signals: keyword cannibalisation, title-length
// issues, and name↔search-term alignment candidates for the demand tools.

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { REPO_ROOT } from './env.mjs'

const seoConfigUrl = pathToFileURL(resolve(REPO_ROOT, 'src/seo/seoConfig.js')).href
const { ROUTES, SITE_URL } = await import(seoConfigUrl)

export { SITE_URL }

// The games (every indexable route except the home page).
export function games() {
  return ROUTES.filter(r => r.path !== '/' && !r.noindex)
}

export function routeModel() {
  return ROUTES.map(r => ({
    path: r.path,
    name: r.name,
    title: r.title,
    titleLen: r.title?.length ?? 0,
    h1: r.h1,
    description: r.description,
    descLen: r.description?.length ?? 0,
    keywords: r.keywords || [],
    schema: r.schema,
    faqCount: r.faq?.length ?? 0,
  }))
}

// Keyword cannibalisation: the same target phrase declared on >1 route splits
// ranking signals and confuses which page Google should surface.
export function cannibalisation() {
  const byKeyword = new Map()
  for (const r of ROUTES) {
    for (const kw of r.keywords || []) {
      const key = kw.toLowerCase().trim()
      if (!byKeyword.has(key)) byKeyword.set(key, new Set())
      byKeyword.get(key).add(r.path)
    }
  }
  return [...byKeyword.entries()]
    .filter(([, paths]) => paths.size > 1)
    .map(([keyword, paths]) => ({ keyword, paths: [...paths] }))
    .sort((a, b) => b.paths.length - a.paths.length)
}

// Cheap on-page hygiene flags (title length, name↔H1 drift). Real ROI calls
// come from combining these with demand + GSC data downstream.
export function hygiene() {
  const flags = []
  for (const r of ROUTES) {
    if ((r.title?.length ?? 0) > 60) flags.push({ path: r.path, issue: 'title over 60 chars (may truncate in SERP)', value: r.title })
    if ((r.description?.length ?? 0) > 160) flags.push({ path: r.path, issue: 'description over 160 chars', value: `${r.description?.length} chars` })
    if (r.h1 && r.name && r.h1 !== r.name && r.path !== '/') {
      flags.push({ path: r.path, issue: 'H1 differs from route name (pick one canonical label)', value: `name="${r.name}" h1="${r.h1}"` })
    }
  }
  return flags
}

// The seed terms the demand tools should probe for each game: the route name
// plus its declared keywords. This is what makes "is there a better name?"
// answerable — we compare declared names against real autosuggest/volume.
export function demandSeeds() {
  return games().map(g => ({
    path: g.path,
    name: g.name,
    seeds: [g.name, ...(g.keywords || [])].map(s => s.toLowerCase()),
  }))
}
