// Google Trends — free demand signal (no API key). Uses Google's undocumented /trends/api endpoints
// (the official API is allowlisted/not GA as of 2026). These rate-limit per IP and can change, so
// every call is best-effort and returns null on failure — Trends is a bonus signal, never a hard dep.
// Gives us TOP related queries (0–100 relative) + RISING breakouts (growth %) for a seed term.
const GEO = 'GB'
const strip = (t) => t.replace(/^\)\]\}',?\s*/, '')

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-GB' } })
  if (!res.ok) throw new Error(`trends ${res.status}`)
  return JSON.parse(strip(await res.text()))
}

export async function relatedQueries(seed, geo = GEO) {
  try {
    const req = { comparisonItem: [{ keyword: seed, geo, time: 'today 12-m' }], category: 0, property: '' }
    const explore = await getJson(`https://trends.google.com/trends/api/explore?hl=en-GB&tz=0&req=${encodeURIComponent(JSON.stringify(req))}`)
    const widget = (explore.widgets || []).find((w) => w.id === 'RELATED_QUERIES')
    if (!widget) return null
    const data = await getJson(`https://trends.google.com/trends/api/widgetdata/relatedsearches?hl=en-GB&tz=0&req=${encodeURIComponent(JSON.stringify(widget.request))}&token=${widget.token}`)
    const lists = data?.default?.rankedList || []
    const map = (l) => (l?.rankedKeyword || []).map((k) => ({ query: k.query, value: k.value }))
    return { top: map(lists[0]), rising: map(lists[1]) }
  } catch { return null }
}

// Relative interest over the last 12 months (0–100) — is demand growing or fading?
export async function interestOverTime(seed, geo = GEO) {
  try {
    const req = { comparisonItem: [{ keyword: seed, geo, time: 'today 12-m' }], category: 0, property: '' }
    const explore = await getJson(`https://trends.google.com/trends/api/explore?hl=en-GB&tz=0&req=${encodeURIComponent(JSON.stringify(req))}`)
    const widget = (explore.widgets || []).find((w) => w.id === 'TIMESERIES')
    if (!widget) return null
    const data = await getJson(`https://trends.google.com/trends/api/widgetdata/multiline?hl=en-GB&tz=0&req=${encodeURIComponent(JSON.stringify(widget.request))}&token=${widget.token}`)
    const pts = (data?.default?.timelineData || []).map((d) => d.value?.[0] ?? 0)
    return pts.length ? { points: pts, latest: pts.at(-1), avg: Math.round(pts.reduce((a, b) => a + b, 0) / pts.length) } : null
  } catch { return null }
}
