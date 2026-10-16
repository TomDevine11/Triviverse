// Triviverse Geography's daily clock. One puzzle day for every player, turning
// over at midnight UK time (Europe/London: GMT in winter, BST in summer).
// Self-contained so Geography never depends on Triviverse Football's matchday
// module; test/geography.test.js checks it against Intl's tz data.

const DAY_MS = 86400000
const HOUR_MS = 3600000

function lastSunday(year, month) {
  const last = new Date(Date.UTC(year, month + 1, 0))
  return last.getUTCDate() - last.getUTCDay()
}

// UK offset from UTC at an instant (1h in British Summer Time, else 0). The
// clock-change rule is fixed in law: last Sunday of March / October, 01:00 UTC.
function londonOffsetMs(t) {
  const y = new Date(t).getUTCFullYear()
  const start = Date.UTC(y, 2, lastSunday(y, 2), 1)
  const end = Date.UTC(y, 9, lastSunday(y, 9), 1)
  return t >= start && t < end ? HOUR_MS : 0
}

// Whole days since 1970-01-01 on the UK calendar.
export function geoDay(t = Date.now()) {
  return Math.floor((t + londonOffsetMs(t)) / DAY_MS)
}

// Day 1 of Triviverse Geography (10 Oct 2026).
export const GEO_EPOCH = 20736
export const geoDayNumber = (day = geoDay()) => day - GEO_EPOCH + 1

export function msUntilNextDay(t = Date.now()) {
  const next = (geoDay(t) + 1) * DAY_MS
  return next - londonOffsetMs(next - HOUR_MS) - t
}
