import { describe, it, expect } from 'vitest'
import { POINTLESS_QUESTIONS, pointlessIndexForDay, getPointlessForDay } from '../src/data/pointless/pointlessGame'
import { ANSWER_GAMES } from '../src/seo/archiveData'
import { ROUTES } from '../src/seo/seoConfig'

describe('Football Pointless answers archive', () => {
  it('keeps the daily selector identical to the previous todayIndex() % N', () => {
    // The archive is only trustworthy if it recomputes the *same* board the player
    // saw. This pins the selector to the behaviour Daily mode had before it moved
    // out of the component, so a future refactor can't silently shift every board.
    const n = POINTLESS_QUESTIONS.length
    for (const day of [0, 1, 2, 99, 12345, 20000, 20345, 31337]) {
      expect(pointlessIndexForDay(day)).toBe(day % n)
    }
  })

  it('folds negative day indices instead of returning undefined', () => {
    for (const day of [-1, -7, -500]) {
      expect(getPointlessForDay(day)).toBeDefined()
      expect(pointlessIndexForDay(day)).toBeGreaterThanOrEqual(0)
      expect(pointlessIndexForDay(day)).toBeLessThan(POINTLESS_QUESTIONS.length)
    }
  })

  it('is registered as an archive game with a renderable list payload', () => {
    const game = ANSWER_GAMES['/football-pointless']
    expect(game).toBeDefined()
    expect(game.kind).toBe('list')

    const answer = game.forDay(12345)
    expect(answer.primary).toBeTruthy()
    expect(Array.isArray(answer.list)).toBe(true)
    expect(answer.list.length).toBeGreaterThan(0)
    for (const row of answer.list) {
      expect(row.text).toBeTruthy()
      expect(row.detail).toMatch(/^(POINTLESS|\d+ pts)$/)
    }
  })

  it('has both routes wired so the archive is reachable and crawlable', () => {
    const game = ROUTES.find((r) => r.path === '/football-pointless')
    const archive = ROUTES.find((r) => r.path === '/football-pointless/answers')
    expect(game?.answersPath).toBe('/football-pointless/answers')
    expect(archive).toBeDefined()
    expect(archive.title.length).toBeLessThanOrEqual(60)
    expect(archive.description.length).toBeLessThanOrEqual(160)
  })
})
