import { describe, it, expect } from 'vitest'
import { adsConfigured } from '../src/ads/adsInit'
import { ADS_ENABLED, ADSENSE_CLIENT, AD_SLOTS } from '../src/ads/adsConfig'

describe('ads bootstrap', () => {
  it('is inert while ads are off — nothing renders and no script loads', () => {
    // The whole safety property: with ads off the site is byte-for-byte what it
    // was. If this ever fails, every page is loading Google ad scripts.
    expect(adsConfigured()).toBe(false)
  })

  it('refuses to activate on the placeholder publisher id', () => {
    // Flipping ADS_ENABLED without replacing the id used to render <ins> elements
    // that could never fill, because the AdSense script was never loaded.
    const looksReal = /^ca-pub-\d{16}$/.test(ADSENSE_CLIENT)
    if (!ADS_ENABLED) expect(adsConfigured()).toBe(false)
    if (!looksReal) expect(adsConfigured()).toBe(false)
  })

  it('keeps a slot id for every declared placement', () => {
    for (const name of ['hub-footer', 'game-footer']) {
      expect(AD_SLOTS[name]).toBeDefined()
    }
  })
})
