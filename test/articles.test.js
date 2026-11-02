import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ARTICLES, CATEGORIES } from '../src/articles/content/index.js'
import { ARTICLE_LINKS } from '../src/articles/index.js'
import { indexableRoutes } from '../src/seo/seoConfig.js'
import { GEO_ROUTES } from '../src/geography/seo.js'

const livePaths = new Set(['/', '/about', '/contact', '/privacy', '/terms', '/articles',
  ...indexableRoutes().map(r => r.path), ...GEO_ROUTES.map(r => r.path)])
const linksIn = a => JSON.stringify(a.body).match(/\]\((\/[^)\s]*)\)/g)?.map(m => m.slice(2, -1)) ?? []

describe('articles', () => {
  it('the app index mirrors the full content exactly', () => {
    expect(ARTICLE_LINKS).toEqual(ARTICLES.map(a => ({ slug: a.slug, title: a.h1, games: (a.games || []).map(g => g.href) })))
  })

  it('slugs are unique and URL-safe; every article has the required fields', () => {
    expect(new Set(ARTICLES.map(a => a.slug)).size).toBe(ARTICLES.length)
    for (const a of ARTICLES) {
      expect(a.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(CATEGORIES[a.category], a.slug).toBeTruthy()
      expect(a.published).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      for (const k of ['title', 'h1', 'dek', 'description']) expect(a[k], `${a.slug}.${k}`).toBeTruthy()
      expect(a.description.length, `${a.slug} description`).toBeLessThanOrEqual(200)
    }
  })

  it('each article is substantial (600+ words of body text)', () => {
    for (const a of ARTICLES) {
      const text = a.body.map(b => [b.p, b.h2, b.note, ...(b.ul || []), ...(b.ol || [])].filter(Boolean).join(' ')).join(' ')
      expect(text.split(/\s+/).length, a.slug).toBeGreaterThanOrEqual(600)
    }
  })

  it('every internal link points at a live page, never a retired one', () => {
    const slugs = new Set(ARTICLES.map(a => `/articles/${a.slug}`))
    for (const a of ARTICLES) {
      for (const href of [...linksIn(a), ...(a.games || []).map(g => g.href), ...a.body.filter(b => b.cta).map(b => b.cta.href)]) {
        expect(livePaths.has(href) || slugs.has(href), `${a.slug} → ${href}`).toBe(true)
      }
    }
  })

  it('no prerendered page hides its guide in a clipped box', () => {
    for (const f of ['scripts/prerender.mjs', 'scripts/geography/prerender.mjs']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/clip:rect\(0,0,0,0\)/)
    }
  })
})
