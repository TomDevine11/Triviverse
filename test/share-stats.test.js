import { describe, it, expect } from 'vitest'
import { isPreviewFetch, shareKind, countShareOpen } from '../worker/shareStats.js'

describe('share-link open counting', () => {
  it('classifies the link kind from the path', () => {
    expect(shareKind('/s/league/AB12CD')).toBe('league')
    expect(shareKind('/s/pointless')).toBe('challenge')
    expect(shareKind('/s/day')).toBe('challenge')
    expect(shareKind('/c/ABC1234')).toBe('short')
    expect(shareKind('/c/')).toBe(null)
    expect(shareKind('/tenable')).toBe(null)
  })

  it('tells link-preview fetchers from people', () => {
    for (const ua of ['WhatsApp/2.23.20.0 A', 'facebookexternalhit/1.1', 'Mozilla/5.0 (compatible; Discordbot/2.0)',
      'Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5', 'Slackbot-LinkExpanding 1.0', 'TelegramBot (like TwitterBot)', ''])
      expect(isPreviewFetch(ua), ua).toBe(true)
    for (const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0 Teams/24'])
      expect(isPreviewFetch(ua), ua).toBe(false)
  })

  it('upserts one row per day × kind without blocking the response', async () => {
    const calls = []
    const env = { DB: { prepare: (sql) => ({ bind: (...a) => ({ run: async () => { calls.push({ sql, a }) } }) }) } }
    const pending = []
    const ctx = { waitUntil: (p) => pending.push(p) }
    countShareOpen(new Request('https://triviverse.com/c/ABC1234', { headers: { 'user-agent': 'Mozilla/5.0 Safari' } }), env, ctx)
    countShareOpen(new Request('https://triviverse.com/s/league/AB12CD', { headers: { 'user-agent': 'WhatsApp/2' } }), env, ctx)
    countShareOpen(new Request('https://triviverse.com/s/league/AB12CD', { method: 'HEAD' }), env, ctx)
    await Promise.all(pending)
    expect(calls).toHaveLength(2)
    expect(calls[0].sql).toMatch(/human = human \+ 1/)
    expect(calls[0].a[1]).toBe('short')
    expect(calls[1].sql).toMatch(/preview = preview \+ 1/)
    expect(calls[1].a[1]).toBe('league')
  })
})
