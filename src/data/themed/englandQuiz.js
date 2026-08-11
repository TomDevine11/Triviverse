// England Football Quiz pool loader. Reuses Career Path's exact round shape
// (roundFor) and name matcher, over the generated England pool
// (scripts/growth/gen-themed-england.mjs). Client-only widget data.
import data from './england.generated.json'
import { roundFor, matchesTarget } from '../careers.js'

export { matchesTarget, roundFor }
export const ENGLAND_META = data.meta
export const ENGLAND_COUNT = data.players.length

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

// A shuffled run of raw pool entries (fresh variety each visit). Rounds are
// built lazily one at a time via roundFor — resolving all 70 up front would
// block the main thread (each resolve indexes over the 44k registry).
export function englandPool() { return shuffle(data.players) }
