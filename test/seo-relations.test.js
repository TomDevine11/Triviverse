import { describe, it, expect } from 'vitest'
import { ROUTES, jsonLdFor } from '../src/seo/seoConfig.js'
import { RELATION_ROUTES, RELATION_PAGES, RELATION_BASE } from '../src/seo/relations.js'

describe('SEO relation cluster — quality gates', () => {
  it('is a substantial but bounded cluster (not a spam farm)', () => {
    expect(RELATION_PAGES.length).toBeGreaterThan(50)
    expect(RELATION_PAGES.length).toBeLessThan(1000)
  })

  it('every page has a real, complete answer set (passes generation gates)', () => {
    for (const p of RELATION_PAGES) {
      expect(p.total, p.slug).toBeGreaterThanOrEqual(10)     // substantial list
      expect(p.famous, p.slug).toBeGreaterThanOrEqual(5)     // genuinely nameable
      expect(p.players.length, p.slug).toBeGreaterThan(0)
      expect(p.slug).toMatch(/^[a-z0-9-]+-and-[a-z0-9-]+$/)  // canonical, alphabetical
    }
  })

  it('titles and canonical paths are unique across ALL routes', () => {
    const titles = ROUTES.map(r => r.title)
    expect(new Set(titles).size, 'duplicate titles').toBe(titles.length)
    const paths = ROUTES.map(r => r.path)
    expect(new Set(paths).size, 'duplicate paths').toBe(paths.length)
  })

  it('relation routes: indexable, English-only, hidden from game nav, sane meta length', () => {
    for (const r of RELATION_ROUTES) {
      expect(r.noindex, r.path).toBeFalsy()
      expect(r.enOnly, r.path).toBe(true)
      expect(r.hideFromNav, r.path).toBe(true)
      expect(r.description.length, r.path).toBeLessThanOrEqual(160)
      expect(r.title.length, r.path).toBeLessThanOrEqual(65)
      expect(r.title.includes('Triviverse'), r.path).toBe(true)
      expect(r.h1 && r.about).toBeTruthy()
    }
  })

  it('emits valid ItemList + BreadcrumbList JSON-LD with real names', () => {
    const p = RELATION_PAGES[0]
    const blocks = jsonLdFor(ROUTES.find(r => r.path === `${RELATION_BASE}/${p.slug}`))
    const types = blocks.map(b => b['@type'])
    expect(types).toContain('ItemList')
    expect(types).toContain('BreadcrumbList')
    const il = blocks.find(b => b['@type'] === 'ItemList')
    expect(il.numberOfItems).toBe(p.players.length)
    expect(il.itemListElement.every(e => typeof e.name === 'string' && e.name.length > 0)).toBe(true)
  })

  it('no orphans — every page links to the hub, hub links to every page', () => {
    for (const r of RELATION_ROUTES) {
      if (r.path === RELATION_BASE) continue
      expect(r.relatedLinks.some(l => l.path === RELATION_BASE), r.path).toBe(true)
    }
    const hub = RELATION_ROUTES.find(r => r.path === RELATION_BASE)
    expect(hub.relatedLinks.length).toBe(RELATION_PAGES.length)
  })
})
