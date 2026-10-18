import { describe, it, expect, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { GEO_ROUTES, geoRoute, metaTags, jsonLd } from '../src/geography/seo'

vi.mock('../src/utils/analytics', () => ({ track: vi.fn() }))
const { track } = await import('../src/utils/analytics')
const { geoTrack, gameIdFromPath, GEO_EVENTS } = await import('../src/geography/analytics')

describe('Borderline search metadata (docs/seo/borderline.md)', () => {
  const r = geoRoute('/geography/borderline')
  const tags = Object.fromEntries(metaTags(r).map(m => [m.name || m.property, m.content]))

  it('leads the title with the query family and keeps it SERP-sized', () => {
    expect(r.title.startsWith('Guess the Country by Its Shape')).toBe(true)
    expect(r.title).toContain('Borderline')
    expect(r.title.length).toBeLessThanOrEqual(65)
  })

  it('has a description that fits a snippet and names the mechanic', () => {
    expect(r.description.length).toBeLessThanOrEqual(160)
    expect(r.description).toMatch(/country guessing game/i)
    expect(r.description).toMatch(/silhouette/i)
  })

  it('uses its own social title and a real share image', () => {
    expect(tags['og:title']).toBe(r.ogTitle)
    expect(tags['twitter:card']).toBe('summary_large_image')
    expect(tags['og:image']).toBe('https://triviverse.com/og/geography-borderline.png')
    expect(existsSync('public/og/geography-borderline.png')).toBe(true)
  })

  it('describes Worldle accurately, with no claim of affiliation', () => {
    const faq = r.faq.find(f => /Worldle/.test(f.q))
    expect(faq.a).toMatch(/not affiliated/)
    // Worldle belongs in the FAQ, not in the title, description or H1.
    for (const field of [r.title, r.description, r.h1, r.ogTitle]) expect(field).not.toMatch(/worldle/i)
  })

  it('emits valid, honest structured data: no ratings, reviews or invented fields', () => {
    const blocks = jsonLd(r)
    const types = blocks.map(b => b['@type'])
    expect(types).toEqual(['VideoGame', 'BreadcrumbList', 'FAQPage'])
    const game = blocks[0]
    expect(game.applicationCategory).toBe('GameApplication')
    expect(game.aggregateRating).toBeUndefined()
    expect(game.review).toBeUndefined()
    // Every FAQ answer in the markup is visible on the page (same source array).
    expect(blocks[2].mainEntity).toHaveLength(r.faq.length)
  })

  it('keeps every geography route on a unique title and description', () => {
    expect(new Set(GEO_ROUTES.map(x => x.title)).size).toBe(GEO_ROUTES.length)
    expect(new Set(GEO_ROUTES.map(x => x.description)).size).toBe(GEO_ROUTES.length)
  })
})

describe('geography analytics helper', () => {
  it('tags every event with the game and passes only the given params', () => {
    geoTrack(GEO_EVENTS.complete, 'borderline', { game_mode: 'daily', outcome: 'won', won: true, guesses: 3 })
    expect(track).toHaveBeenLastCalledWith('game_complete', { game: 'borderline', game_mode: 'daily', outcome: 'won', won: true, guesses: 3 })
  })

  it('uses the site-wide event names', () => {
    expect(GEO_EVENTS).toMatchObject({ start: 'game_start', complete: 'game_complete', share: 'share' })
  })

  it('maps paths to game ids', () => {
    expect(gameIdFromPath('/geography/borderline')).toBe('borderline')
    expect(gameIdFromPath('/geography')).toBe('hub')
  })
})
