import { describe, it, expect } from 'vitest'
import { normalizeStats } from '../scripts/seo/lib/bing.mjs'

// Shape of a real GetQueryStats row (captured from the live API 2026-09-24).
const QUERY_ROWS = [
  { __type: 'QueryStats:#Microsoft.Bing.Webmaster.Api', Query: 'football tenable', Clicks: 37, Impressions: 2567, AvgImpressionPosition: 6 },
  { __type: 'QueryStats:#Microsoft.Bing.Webmaster.Api', Query: 'football 501', Clicks: 97, Impressions: 1887, AvgImpressionPosition: 3 },
  { __type: 'QueryStats:#Microsoft.Bing.Webmaster.Api', Query: 'footy tenable', Clicks: 5, Impressions: 1685, AvgImpressionPosition: 7 },
]

describe('normalizeStats', () => {
  it('reads the PascalCase Query label the Bing API actually returns', () => {
    const out = normalizeStats(QUERY_ROWS, 'Query', 'query')
    expect(out.map(r => r.label)).toEqual(['football 501', 'football tenable', 'footy tenable'])
  })

  // REGRESSION — the bug this module exists to prevent.
  //
  // The label keys are rest parameters. When they were a single positional
  // parameter, `val(r, ...labelKeys)` spread the *string* 'Query' into the
  // characters 'Q','u','e','r','y'; every lookup missed and every Bing query
  // in every report silently became '(unknown)'. Half the site's search
  // traffic was invisible for as long as the tooling existed.
  it('never collapses real rows to (unknown)', () => {
    const out = normalizeStats(QUERY_ROWS, 'Query', 'query')
    expect(out.some(r => r.label === '(unknown)')).toBe(false)
  })

  it('falls back to (unknown) only when no label key matches', () => {
    expect(normalizeStats([{ Clicks: 1, Impressions: 2 }], 'Query')[0].label).toBe('(unknown)')
  })

  it('derives CTR and sorts by clicks descending', () => {
    const out = normalizeStats(QUERY_ROWS, 'Query')
    expect(out[0].clicks).toBe(97)
    expect(out[0].ctr).toBeCloseTo(97 / 1887, 6)
    expect(out.map(r => r.clicks)).toEqual([97, 37, 5])
  })

  it('guards against a zero-impression row producing NaN', () => {
    expect(normalizeStats([{ Query: 'x', Clicks: 0, Impressions: 0 }], 'Query')[0].ctr).toBe(0)
  })

  it('prefers Url over Query for page rows', () => {
    const rows = [{ Url: 'https://triviverse.com/tenable', Query: 'ignored', Clicks: 3, Impressions: 9 }]
    expect(normalizeStats(rows, 'Url', 'url', 'Query')[0].label).toBe('https://triviverse.com/tenable')
  })

  it('tolerates a null payload (API unavailable)', () => {
    expect(normalizeStats(null, 'Query')).toEqual([])
  })
})
