// The unified ContentSpec — every generator emits this shape; the renderer + QC + dedup + (future)
// scheduling/upload all consume it. A spec must pass validate() before it is ever rendered.
export const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Build a normalised spec. `render` is the format-specific payload the template draws.
export function makeSpec({ format, version, difficulty, entities, question, answer, render, accent, metadata, engagement, audioCues }) {
  const slug = `${format}-${slugify(entities.slice(0, 3).join('-')).slice(0, 60)}`
  return { format, version, difficulty, slug, entities, question, answer, render, accent, metadata, engagement, audioCues: audioCues || [] }
}

// Validation — reject anything unsafe/incomplete rather than render a broken video.
export function validate(spec) {
  if (!spec) return { ok: false, reason: 'no spec' }
  for (const k of ['format', 'version', 'entities', 'answer', 'render', 'metadata']) if (spec[k] == null) return { ok: false, reason: `missing ${k}` }
  if (!Array.isArray(spec.entities) || spec.entities.length < 2) return { ok: false, reason: 'too few entities' }
  if (spec.entities.some(e => !e || String(e).trim() === '')) return { ok: false, reason: 'empty entity' }
  if (String(spec.answer).length > 34) return { ok: false, reason: 'answer too long' }
  // per-format guards
  const r = spec.render
  if (spec.format === 'career-path' || spec.format === 'guess-the-club' || spec.format === 'played-alongside' || spec.format === 'who-am-i') {
    if (!Array.isArray(r.rows) || r.rows.length < 3) return { ok: false, reason: 'too few rows' }
    if (r.rows.length > 7) return { ok: false, reason: 'too many rows' }
    if (r.rows.some(x => up(x.text).length > 26)) return { ok: false, reason: 'row text too long' }
  }
  if (spec.format === 'winner-stays-on') {
    if (!Array.isArray(r.rounds) || r.rounds.length < 3) return { ok: false, reason: 'too few rounds' }
    if (r.rounds.some(x => up(x.a).length > 24 || up(x.b).length > 24)) return { ok: false, reason: 'player name too long' }
  }
  if (spec.format === 'football-pointless') {
    if (!Array.isArray(r.board) || r.board.length < 4) return { ok: false, reason: 'too few answers' }
  }
  return { ok: true }
}
const up = (s) => String(s).toUpperCase()
