// Cross-batch dedup. A persistent content history lets future generation avoid exact repeats and
// stop any one player/club/answer dominating the feed.
import { readFileSync, writeFileSync, existsSync } from 'fs'

export function loadHistory(file) {
  if (!existsSync(file)) return { slugs: new Set(), entityCount: new Map(), answerCount: new Map() }
  try {
    const d = JSON.parse(readFileSync(file, 'utf8'))
    const h = { slugs: new Set(d.slugs || []), entityCount: new Map(Object.entries(d.entityCount || {})), answerCount: new Map(Object.entries(d.answerCount || {})) }
    return h
  } catch { return { slugs: new Set(), entityCount: new Map(), answerCount: new Map() } }
}

export const seen = (h, spec) => h.slugs.has(spec.slug)
export const entityUses = (h, e) => h.entityCount.get(e) || 0
export const answerUses = (h, a) => h.answerCount.get(a) || 0

export function record(h, spec) {
  h.slugs.add(spec.slug)
  for (const e of spec.entities) h.entityCount.set(e, (h.entityCount.get(e) || 0) + 1)
  h.answerCount.set(spec.answer, (h.answerCount.get(spec.answer) || 0) + 1)
}

export function saveHistory(file, h) {
  writeFileSync(file, JSON.stringify({ slugs: [...h.slugs], entityCount: Object.fromEntries(h.entityCount), answerCount: Object.fromEntries(h.answerCount) }, null, 0) + '\n')
}
