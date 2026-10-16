import { describe, it, expect } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { geoMercator } from 'd3-geo'
import { project, invert, WORLD_W } from '../src/geography/data/world'
import {
  POSTCARDS, postcardFor, dailyPostcard, scoreFor, distanceBetween, evaluateGuess, greatCircle,
  shareBar, bandOf, formatKm, SCORE_MAX,
} from '../src/geography/data/postcard'
import { GEO_EPOCH } from '../src/geography/data/day'

describe('Triviverse Geography · Postcard', () => {
  it('projection matches the d3 projection the world map was built with, and inverts exactly', () => {
    const d3 = geoMercator().rotate([-11, 0]).scale(WORLD_W / (2 * Math.PI)).translate([WORLD_W / 2, 0])
    const top = d3([0, 84])[1]
    d3.translate([WORLD_W / 2, -top])
    for (const [lat, lon] of [[51.5, -0.13], [-33.86, 151.21], [35.68, 139.69], [-22.95, -43.21], [64.1, -21.9], [0, 0], [-54.8, -68.3], [21.3, -157.8]]) {
      const [x, y] = project(lat, lon), [dx, dy] = d3([lon, lat])
      expect(x).toBeCloseTo(dx, 6); expect(y).toBeCloseTo(dy, 6)
      const [la, lo] = invert(x, y)
      expect(la).toBeCloseTo(lat, 9); expect(lo).toBeCloseTo(lon, 9)
    }
  })

  it('scores fall smoothly with distance and nothing else', () => {
    expect(scoreFor(0)).toBe(SCORE_MAX)
    expect(scoreFor(1)).toBe(SCORE_MAX)
    expect(scoreFor(100)).toBe(4678)
    expect(scoreFor(1000)).toBe(2567)
    expect(scoreFor(5000)).toBe(178)
    expect(scoreFor(20015)).toBe(0)
    expect(scoreFor(NaN)).toBe(0)
    let prev = Infinity
    for (let km = 2; km < 20000; km *= 1.3) { const s = scoreFor(km); expect(s).toBeLessThanOrEqual(prev); prev = s }
  })

  it('distances are great-circle: right across the antimeridian and near the poles', () => {
    expect(distanceBetween([0, 179.9], [0, -179.9])).toBeCloseTo(22.2, 0)
    expect(distanceBetween([89.9, 0], [89.9, 180])).toBeCloseTo(22.2, 0)
    expect(distanceBetween([-17.8, 178], [-13.8, -172])).toBeLessThan(1200)
    expect(distanceBetween([51.5074, -0.1278], [48.8566, 2.3522])).toBeCloseTo(344, -1)
    const card = POSTCARDS[0]
    expect(evaluateGuess(card, [card.lat, card.lon])).toEqual({ km: 0, score: SCORE_MAX })
  })

  it('the great-circle line breaks at the map seam instead of streaking across it', () => {
    const lines = greatCircle([-17.8, 178], [21.3, -157.8]) // Fiji → Hawaii, across 169°W
    expect(lines.length).toBe(2)
    for (const l of lines) for (let i = 1; i < l.length; i++) expect(Math.abs(l[i][0] - l[i - 1][0])).toBeLessThan(WORLD_W / 2)
    expect(greatCircle([48.85, 2.35], [40.7, -74]).length).toBe(1)
  })

  it('the daily pick is deterministic, by stable id, and shows every postcard once per cycle', () => {
    expect(dailyPostcard(GEO_EPOCH + 5).id).toBe(postcardFor(5).id)
    expect(postcardFor(42).id).toBe(postcardFor(42).id)
    const cycle = POSTCARDS.map((_, i) => postcardFor(i).id)
    expect(new Set(cycle).size).toBe(POSTCARDS.length)
    expect(postcardFor(POSTCARDS.length).id).toBe(postcardFor(POSTCARDS.length).id)
    expect(postcardFor(-3)).toBeTruthy()
  })

  it('every postcard is complete: local photo within budget, coordinates, free licence, attribution', () => {
    expect(POSTCARDS.length).toBeGreaterThanOrEqual(100)
    const ids = new Set()
    for (const p of POSTCARDS) {
      expect(ids.has(p.id)).toBe(false); ids.add(p.id)
      const file = `public${p.img}`
      expect(existsSync(file), file).toBe(true)
      expect(statSync(file).size).toBeLessThanOrEqual(200 * 1024)
      expect(Math.abs(p.lat)).toBeLessThanOrEqual(85)
      expect(Math.abs(p.lon)).toBeLessThanOrEqual(180)
      expect(p.credit.artist.length).toBeGreaterThan(0)
      expect(p.credit.source).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
      expect(p.credit.licence).toMatch(/^(CC0|CC BY(-SA)? \d|Public domain|PD)/i)
      expect(p.img).not.toContain(p.id) // the file name never names the answer
    }
  })

  it('share and display helpers', () => {
    expect(shareBar(5000)).toBe('🟩🟩🟩🟩🟩')
    expect(shareBar(3600)).toBe('🟩🟩🟩🟨⬛')
    expect(shareBar(0)).toBe('⬛⬛⬛⬛⬛')
    expect(bandOf(5000)).toBe(4); expect(bandOf(999)).toBe(0)
    expect(formatKm(0.42)).toBe('420 m'); expect(formatKm(3.25)).toBe('3.3 km'); expect(formatKm(12345.6)).toBe('12,346 km')
  })
})
