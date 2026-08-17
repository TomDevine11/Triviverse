import { describe, it, expect } from 'vitest'
import { llmsTxt, llmsFullTxt, llmsSections } from '../scripts/seo/llms.mjs'
import { BRAND, SITE_URL, absolute, indexableRoutes } from '../src/seo/seoConfig.js'

const txt = llmsTxt()
const full = llmsFullTxt()

describe('llms.txt — the AI-assistant read of the site', () => {
  it('follows the llms.txt shape: H1 brand, then a blockquote summary', () => {
    const [h1, blank, summary] = txt.split('\n')
    expect(h1).toBe(`# ${BRAND}`)
    expect(blank).toBe('')
    expect(summary.startsWith('> ')).toBe(true)
  })

  it('lists every indexable route exactly once, with its absolute URL', () => {
    for (const r of indexableRoutes()) {
      const url = absolute(r.path)
      expect(txt.split(`(${url})`).length - 1, r.path).toBe(1)
    }
  })

  // The whole point is that it cannot drift from the site: nothing here is
  // hand-written, so a new route appears without anyone remembering to add it.
  it('is generated from ROUTES — a new route shows up automatically', () => {
    const withExtra = [...indexableRoutes(), {
      path: '/new-game', name: 'New Game', description: 'A brand new game.',
    }]
    expect(llmsTxt(withExtra)).toContain(`- [New Game](${SITE_URL}/new-game): A brand new game.`)
  })

  it('separates playable games from answer archives', () => {
    const groups = Object.fromEntries(llmsSections().map(([h, rs]) => [h, rs.map(r => r.path)]))
    expect(groups['Games']).toContain('/tenable')
    expect(groups['Games']).not.toContain('/tenable/answers')
    expect(groups['Past answers and archives']).toContain('/tenable/answers')
  })

  it('names the home page after the brand, not "Home"', () => {
    expect(txt).toContain(`- [${BRAND}](${SITE_URL}/)`)
    expect(txt).not.toContain('- [Home](')
  })

  it('llms-full.txt carries the rules and FAQ an assistant needs to answer "how do I play?"', () => {
    const tenable = indexableRoutes().find(r => r.path === '/tenable')
    for (const step of tenable.howTo) expect(full).toContain(step)
    for (const { q, a } of tenable.faq) {
      expect(full).toContain(q)
      expect(full).toContain(a)
    }
  })

  it('emits no empty sections and no undefined leakage', () => {
    for (const [, group] of llmsSections()) expect(group.length).toBeGreaterThan(0)
    for (const out of [txt, full]) {
      expect(out).not.toContain('undefined')
      expect(out).not.toContain('[object Object]')
    }
  })
})
