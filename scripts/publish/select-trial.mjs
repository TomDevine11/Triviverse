// Pick the trial content: per-format quotas, best-first (generators already sort by recognisability),
// with variety guards — no repeated subject (answer), a cap on how often any one club recurs, and a
// weighted round-robin interleave so the same format never lands back-to-back. Quality gates in the
// generators remain authoritative; we never lower them to fill a quota — we substitute + report.
import { FORMATS } from '../shorts/lib/engine.mjs'

const CLUB_CAP = 5 // a single club may headline at most this many videos across the whole trial

const clubsIn = (spec) => {
  const r = spec.render || {}
  if (Array.isArray(r.rows)) return r.rows.filter((x) => x.crest).map((x) => String(x.crest).toLowerCase())
  if (r.header) return [r.header.aName, r.header.bName].filter(Boolean).map((s) => String(s).toLowerCase())
  return []
}
export function subjectOf(spec) {
  const r = spec.render || {}
  if (spec.format === 'winner-stays-on') return r.catLabel || spec.answer
  if (r.header) return r.header.bName ? `${r.header.aName} & ${r.header.bName}` : r.header.aName
  return spec.answer
}

// Weighted round-robin: always take from the format with the most remaining that isn't the last used.
function interleave(perFormat) {
  const lists = Object.entries(perFormat).map(([fmt, arr]) => ({ fmt, arr: [...arr] }))
  const out = []; let last = null
  while (lists.some((l) => l.arr.length)) {
    const avail = lists.filter((l) => l.arr.length).sort((a, b) => b.arr.length - a.arr.length)
    const pick = avail.find((l) => l.fmt !== last) || avail[0]
    out.push(pick.arr.shift()); last = pick.fmt
  }
  return out
}

// Returns { items: spec[] (ordered), report: { perFormat, shortfalls, substitutions } }.
export function selectTrial(weights) {
  const usedAnswer = new Set(), clubCount = new Map()
  const take = (fmt, n, pool) => {
    const picked = []
    for (const spec of pool) {
      if (picked.length >= n) break
      const ans = String(spec.answer || '').toLowerCase()
      if (!ans || usedAnswer.has(ans)) continue
      const clubs = clubsIn(spec)
      if (clubs.some((c) => (clubCount.get(c) || 0) >= CLUB_CAP)) continue
      picked.push(spec); usedAnswer.add(ans); for (const c of clubs) clubCount.set(c, (clubCount.get(c) || 0) + 1)
    }
    return picked
  }

  const pools = {}, perFormat = {}, shortfalls = {}
  for (const [fmt, n] of Object.entries(weights)) {
    pools[fmt] = FORMATS[fmt].gen(100000, {}, null)
    const picked = take(fmt, n, pools[fmt])
    perFormat[fmt] = picked
    if (picked.length < n) shortfalls[fmt] = n - picked.length
  }

  // Substitute any shortfall from the deepest remaining pools (variety guards still apply).
  const substitutions = {}
  let deficit = Object.values(shortfalls).reduce((a, b) => a + b, 0)
  if (deficit) {
    const byDepth = Object.keys(weights).sort((a, b) => pools[b].length - pools[a].length)
    for (const fmt of byDepth) {
      if (deficit <= 0) break
      const extra = take(fmt, perFormat[fmt].length + deficit, pools[fmt]).slice(perFormat[fmt].length)
      if (extra.length) { perFormat[fmt].push(...extra); substitutions[fmt] = (substitutions[fmt] || 0) + extra.length; deficit -= extra.length }
    }
  }

  return { items: interleave(perFormat), report: { perFormat: Object.fromEntries(Object.entries(perFormat).map(([k, v]) => [k, v.length])), shortfalls, substitutions } }
}
