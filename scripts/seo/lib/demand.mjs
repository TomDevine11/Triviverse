// Search-demand signals that need NO credentials.
//
// Google Autosuggest is the single best free proxy for real query behaviour:
// the completions Google offers are ordered by actual search popularity. We use
// it to answer "do people search this name?" and "what do they call this?".

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Raw autosuggest for one query. Returns an ordered list (most popular first).
export async function autosuggest(query, { gl = 'gb', hl = 'en' } = {}) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=${hl}&gl=${gl}&q=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const data = await res.json() // [query, [suggestions], ...]
    return Array.isArray(data?.[1]) ? data[1] : []
  } catch { return [] }
}

// "Alphabet soup": the seed plus seed+" a".."z", de-duped and ranked by how
// often each suggestion recurs — surfaces the phrasing users actually reach for.
export async function expand(seed, { gl = 'gb', hl = 'en', letters = true } = {}) {
  const queries = [seed]
  if (letters) for (const c of 'abcdefghijklmnopqrstuvwxyz') queries.push(`${seed} ${c}`)
  const freq = new Map()
  for (const q of queries) {
    const suggestions = await autosuggest(q, { gl, hl })
    for (const s of suggestions) freq.set(s, (freq.get(s) || 0) + 1)
    await sleep(120) // be gentle
  }
  return [...freq.entries()]
    .map(([suggestion, hits]) => ({ suggestion, hits }))
    .sort((a, b) => b.hits - a.hits)
}

// For a game, does the market phrase it differently than we named it? Compares
// our name against the top completions for the category. Heuristic, but it's the
// exact signal for "should I rename this?" — confirm with volume before acting.
export async function nameAlignment(name, category, opts = {}) {
  const [nameSug, catSug] = await Promise.all([
    autosuggest(name, opts),
    category ? autosuggest(category, opts) : Promise.resolve([]),
  ])
  return {
    name,
    nameIsSuggested: nameSug.some(s => s.toLowerCase().includes(name.toLowerCase())),
    topCompletionsForName: nameSug.slice(0, 8),
    topCompletionsForCategory: catSug.slice(0, 8),
  }
}
