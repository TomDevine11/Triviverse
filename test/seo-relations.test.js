import { describe, it, expect } from 'vitest'
import { ROUTES, jsonLdFor } from '../src/seo/seoConfig.js'
import { RELATION_ROUTES, RELATION_PAGES, RELATION_BASE, RELATION_REDIRECTS } from '../src/seo/relations.js'

describe('SEO relation cluster — quality gates', () => {
  it('is a curated launch set (not an exhaustive sweep)', () => {
    expect(RELATION_PAGES.length).toBeGreaterThanOrEqual(8)
    expect(RELATION_PAGES.length).toBeLessThanOrEqual(50)
  })

  it('every page has a real answer set with the rich per-player schema', () => {
    for (const p of RELATION_PAGES) {
      expect(p.total, p.slug).toBeGreaterThanOrEqual(1)          // ≥1 qualifying player
      expect(p.players.length, p.slug).toBe(p.total)            // count matches the list
      expect(p.slug).toMatch(/^[a-z0-9-]+-and-[a-z0-9-]+$/)     // canonical, alphabetical
      expect(p.aId && p.bId, p.slug).toBeTruthy()               // exact club identity
      expect(['rich', 'medium', 'scarcity']).toContain(p.tier)
      expect(typeof p.coverageNote, p.slug).toBe('string')
      for (const pl of p.players) {
        expect(pl.id, `${p.slug}/${pl.n}`).toBeTruthy()          // resolves to a canonical id
        expect(pl.a && typeof pl.a.apps === 'number', pl.n).toBe(true)
        expect(pl.b && typeof pl.b.apps === 'number', pl.n).toBe(true)
        expect(pl.a.apps >= 1 && pl.b.apps >= 1, `${pl.n} must have ≥1 app for BOTH clubs`).toBe(true)
        expect(typeof pl.surname, pl.n).toBe('string')
      }
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

  it('crawlable list carries apps/goals detail + a coverage note (prerendered content)', () => {
    for (const r of RELATION_ROUTES) {
      if (r.path === RELATION_BASE) continue
      expect(r.coverageNote, r.path).toMatch(/Premier League \(from 1992\)/)
      expect(r.coverageNote, r.path).toMatch(/aren’t included/)
      expect(r.itemList.items.length, r.path).toBe(r.rel.total)
      for (const it of r.itemList.items) {
        expect(it.detail, `${r.path}/${it.text}`).toMatch(/apps?.*goals?/)
      }
      expect(r.h1).toMatch(/Played for Both/)
    }
  })

  it('redirect map only sends unambiguous old slugs to a REAL current pair (never to a bogus one)', () => {
    const current = new Set(RELATION_PAGES.map(p => p.slug))
    for (const [oldSlug, newSlug] of Object.entries(RELATION_REDIRECTS)) {
      expect(current.has(newSlug), `${oldSlug} → ${newSlug}`).toBe(true)   // target exists
      expect(current.has(oldSlug), `${oldSlug} should not also be current`).toBe(false)
    }
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
