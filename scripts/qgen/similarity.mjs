// qgen/similarity — question diversity as a first-class concept.
//
// Two boards with different wording can be the "same question" for gameplay: same
// entities (e.g. "Played in both PL and Ligue 1" vs "Scored in both PL and Ligue
// 1"), or near-identical answer pools (e.g. "won the Bundesliga" vs "Bayern +
// Bundesliga"). We measure both a STRUCTURAL signature and answer-pool overlap,
// and use them to drop near-duplicates and to space repeated entities apart in the
// daily rota — so a large inventory is also a VARIED one.

export function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0; const [s, l] = a.size < b.size ? [a, b] : [b, a]
  for (const x of s) if (l.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

// Near-duplicate if they concern the SAME entity set (structural) or their answer
// pools overlap heavily (empirical). Same-entity catches the both-leagues/scored-
// both twins; Jaccard catches trophy/club-trophy twins with different entities.
export function nearDuplicate(x, y, poolThreshold = 0.6) {
  const ex = x.c.entities.join('|'), ey = y.c.entities.join('|')
  if (ex && ex === ey) return 'SAME_ENTITIES'
  if (jaccard(x.ids, y.ids) >= poolThreshold) return 'ANSWER_POOL_OVERLAP'
  return null
}

// Greedy dedup: keep the strongest board of each near-duplicate group.
export function dedup(items, poolThreshold = 0.6) {
  const ranked = items.slice().sort((a, b) => b.e.score - a.e.score)
  const kept = []
  const dropped = []
  for (const it of ranked) {
    let dup = null
    for (const k of kept) { const why = nearDuplicate(it, k, poolThreshold); if (why) { dup = { of: k.c.title, why }; break } }
    if (dup) dropped.push({ title: it.c.title, dupOf: dup.of, why: dup.why })
    else kept.push(it)
  }
  return { kept, dropped }
}

// Interleave for the daily rota: round-robin across families AND avoid repeating a
// primary entity (club/nation/trophy) within a sliding window, so consecutive days
// feel varied even though the inventory is large.
export function diversifyOrder(items, entityWindow = 8) {
  const buckets = new Map()
  for (const it of items.slice().sort((a, b) => b.e.score - a.e.score)) {
    const k = it.c.familyId; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(it)
  }
  const order = []
  const recent = [] // recently placed entities
  const usedRecently = (ents) => ents.some(e => recent.includes(e))
  let guard = 0
  while ([...buckets.values()].some(b => b.length) && guard++ < 100000) {
    for (const list of buckets.values()) {
      // take the first item whose entities weren't used in the last `entityWindow`
      let idx = list.findIndex(it => !usedRecently(it.c.entities))
      if (idx === -1) idx = list.length ? 0 : -1 // fall back rather than stall
      if (idx === -1) continue
      const [it] = list.splice(idx, 1)
      order.push(it)
      recent.push(...it.c.entities)
      while (recent.length > entityWindow) recent.shift()
    }
  }
  return order
}
