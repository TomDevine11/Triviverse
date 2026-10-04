// The matchday streak: consecutive days on which you played at least one daily,
// protected by streak freezes. Every 7 days of streak banks a freeze (max 2); a
// missed day is covered automatically the next time you visit, as long as the
// bank holds enough freezes to bridge the whole gap. Frozen days count toward the
// streak so the number never "jumps" when a freeze is spent.

import { loadJson, saveJson, emit } from './store'
import { playedDays } from './log'
import { matchdayIndex } from '../utils/matchday.js'

const KEY = 'ftg-streak-v1'
export const FREEZE_EVERY = 7
export const FREEZE_CAP = 2

const today = () => {
  return matchdayIndex() // UK-time matchday, the same for every visitor
}

function loadState() {
  const s = loadJson(KEY)
  return s && Array.isArray(s.used) ? s : { bank: 0, used: [], runStart: null, earned: 0 }
}

function runBack(set, from) {
  let n = 0
  for (let d = from; set.has(d); d--) n++
  return n
}

function bestRun(sorted) {
  let best = 0, run = 0, prev = null
  for (const d of sorted) {
    run = prev != null && d === prev + 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

// Reads the streak and settles any pending freeze spend/earn. Cheap; call freely.
export function getStreak(now = today()) {
  const s = loadState()
  const played = playedDays()
  const set = new Set([...played, ...s.used])
  let changed = false

  // Spend freezes to bridge a gap that ends yesterday (today is still open).
  if (!set.has(now - 1) && s.bank > 0) {
    const before = played.filter(d => d < now - 1)
    const last = before.length ? before[before.length - 1] : null
    if (last != null) {
      const gap = []
      for (let d = last + 1; d <= now - 1; d++) if (!set.has(d)) gap.push(d)
      if (gap.length > 0 && gap.length <= s.bank) {
        s.used.push(...gap)
        s.bank -= gap.length
        gap.forEach(d => set.add(d))
        changed = true
      }
    }
  }

  const alive = set.has(now)
  const anchor = alive ? now : now - 1
  const streak = runBack(set, anchor)

  // Earn a freeze each FREEZE_EVERY days of the current run.
  const runStart = streak ? anchor - streak + 1 : null
  if (runStart !== s.runStart) { s.runStart = runStart; s.earned = 0; changed = true }
  const due = Math.floor(streak / FREEZE_EVERY)
  if (due > s.earned) {
    s.bank = Math.min(FREEZE_CAP, s.bank + (due - s.earned))
    s.earned = due
    changed = true
  }

  if (changed) { s.used = s.used.filter(d => d > now - 400); saveJson(KEY, s); emit({ type: 'streak' }) }

  const allDays = [...set].sort((a, b) => a - b)
  return {
    streak,
    alive, //                 played today already
    atRisk: !alive && streak > 0,
    freezes: s.bank,
    frozenDays: s.used,
    best: Math.max(bestRun(allDays), streak),
    toNextFreeze: s.bank >= FREEZE_CAP ? null : FREEZE_EVERY - (streak % FREEZE_EVERY),
  }
}
