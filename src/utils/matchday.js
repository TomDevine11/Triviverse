// The matchday clock. Every daily puzzle, streak, leaderboard and league runs on
// ONE day for everyone, turning over at midnight UK time (Europe/London, so GMT
// in winter and BST in summer) — not at each visitor's local midnight. Most
// players are in the UK and Europe, where that is at or near their own midnight;
// elsewhere the new matchday simply arrives mid-day.
//
// Shared by the browser and the Worker (worker/api.js imports this file), so the
// two can never disagree about what "today" is. Dependency-free on purpose: the
// UK clock-change rule is fixed in law (last Sunday of March / October, 01:00
// UTC), and test/matchday.test.js checks it against Intl's tz data.

const DAY_MS = 86400000
const HOUR_MS = 3600000

// Day of the month of the last Sunday in a month (month 0-based).
function lastSunday(year, month) {
  const last = new Date(Date.UTC(year, month + 1, 0))
  return last.getUTCDate() - last.getUTCDay()
}

// UK offset from UTC at an instant: 1h during British Summer Time, else 0.
export function londonOffsetMs(t) {
  const y = new Date(t).getUTCFullYear()
  const start = Date.UTC(y, 2, lastSunday(y, 2), 1)
  const end = Date.UTC(y, 9, lastSunday(y, 9), 1)
  return t >= start && t < end ? HOUR_MS : 0
}

// The matchday index: whole days since 1970-01-01 on the UK calendar. Same
// numbering the site has always used (day 20730 = 4 Oct 2026), so stored
// progress, archives and matchday numbers carry straight over.
export function matchdayIndex(t = Date.now()) {
  return Math.floor((t + londonOffsetMs(t)) / DAY_MS)
}

// Milliseconds until the next matchday begins (the next UK midnight). The UK
// clocks change at 01:00 UTC, never at a UK midnight, so the offset an hour
// before the boundary is the offset at it.
export function msUntilNextMatchday(t = Date.now()) {
  const next = (matchdayIndex(t) + 1) * DAY_MS
  return next - londonOffsetMs(next - HOUR_MS) - t
}
