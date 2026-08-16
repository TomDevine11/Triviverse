import { describe, it, expect } from 'vitest'
import {
  ROUTES, SITE_URL, BRAND, absolute, routeByPath, indexableRoutes,
  metaTagsFor, jsonLdFor,
} from '../src/seo/seoConfig.js'

const get = (tags, key) => tags.find(t => t.name === key || t.property === key)?.content

describe('SEO route config integrity', () => {
  it('uses the configured canonical domain everywhere', () => {
    expect(SITE_URL).toBe('https://triviverse.com')
    expect(absolute('/')).toBe(SITE_URL + '/')
    expect(absolute('/wordle')).toBe(SITE_URL + '/wordle')
  })

  it('every route has a path, a title and a description', () => {
    for (const r of ROUTES) {
      expect(r.path.startsWith('/'), r.path).toBe(true)
      expect(r.title, r.path).toBeTruthy()
      expect(r.description, r.path).toBeTruthy()
    }
  })

  it('titles and descriptions are unique (no duplicate-content signals)', () => {
    const titles = ROUTES.map(r => r.title)
    const descs = ROUTES.map(r => r.description)
    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(descs).size).toBe(descs.length)
  })

  it('titles and descriptions are within sensible length limits', () => {
    for (const r of ROUTES) {
      expect(r.title.length, `${r.path} title`).toBeLessThanOrEqual(65)
      expect(r.description.length, `${r.path} desc`).toBeGreaterThanOrEqual(50)
      expect(r.description.length, `${r.path} desc`).toBeLessThanOrEqual(165)
    }
  })

  it('every title is brand-anchored or the brand itself', () => {
    for (const r of ROUTES) expect(r.title.includes(BRAND), r.path).toBe(true)
  })

  it('501 is live and indexable', () => {
    expect(routeByPath('/501').noindex).toBeFalsy()
    expect(indexableRoutes().some(r => r.path === '/501')).toBe(true)
  })

  it('every route is indexable (nothing left noindex)', () => {
    expect(indexableRoutes().length).toBe(ROUTES.length)
  })
})

describe('per-route meta tags', () => {
  it('expose description, canonical-equivalent og:url, robots and twitter card', () => {
    for (const r of ROUTES) {
      const tags = metaTagsFor(r)
      expect(get(tags, 'description')).toBe(r.description)
      expect(get(tags, 'og:url')).toBe(absolute(r.path))
      expect(get(tags, 'og:title')).toBe(r.title)
      expect(get(tags, 'twitter:card')).toBe('summary_large_image')
      expect(get(tags, 'robots')).toMatch(r.noindex ? /noindex/ : /index/)
      expect(get(tags, 'og:image')).toMatch(/^https:\/\//)
    }
  })
})

describe('structured data (JSON-LD)', () => {
  const types = blocks => blocks.map(b => b['@type'])

  it('home exposes WebSite, Organization and an ItemList of games', () => {
    const t = types(jsonLdFor(routeByPath('/')))
    expect(t).toEqual(expect.arrayContaining(['WebSite', 'Organization', 'ItemList']))
  })

  it('each game exposes VideoGame, BreadcrumbList and FAQPage', () => {
    for (const r of indexableRoutes().filter(r => r.schema === 'VideoGame')) {
      const t = types(jsonLdFor(r))
      expect(t, r.path).toEqual(expect.arrayContaining(['VideoGame', 'BreadcrumbList', 'FAQPage']))
    }
  })

  it('answers/archive pages expose BreadcrumbList + FAQPage (a game, not a VideoGame)', () => {
    const content = indexableRoutes().filter(r => r.path !== '/' && r.schema !== 'VideoGame')
    expect(content.length).toBeGreaterThan(0)
    for (const r of content) {
      const t = types(jsonLdFor(r))
      expect(t, r.path).toEqual(expect.arrayContaining(['BreadcrumbList', 'FAQPage']))
      expect(t, r.path).not.toContain('VideoGame')
    }
  })

  it('all JSON-LD blocks carry a schema.org context and type', () => {
    for (const r of ROUTES) {
      for (const b of jsonLdFor(r)) {
        expect(b['@context']).toBe('https://schema.org')
        expect(b['@type']).toBeTruthy()
      }
    }
  })
})
