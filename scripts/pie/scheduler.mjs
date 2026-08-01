// ─────────────────────────────────────────────────────────────────────────
// SCHEDULER — chooses WHICH good question to publish each day.
//
// Knows NOTHING about question quality (the compiler already decided that via
// defaultScore). Its only job: given the compiled catalogue, pick a daily
// sequence that is varied and paced — cooldowns, no repeated clubs/nations/
// competitions/seeds/hooks, difficulty pacing, novelty over recent history, a
// mild Premier-League/England house lean, and editorial pins/vetoes. Fully
// deterministic and reproducible from (catalogue, registry, seed, start, days).
// ─────────────────────────────────────────────────────────────────────────

const QUALITY_FLOOR = 0.45              // "good enough to publish" (compiler's score)
const COOL = { exact: 120, club: 12, nation: 8, competition: 4, seed: 3 } // hard cooldowns (days)

const HOOK = { attribute: 'category', era: 'nostalgia', recordSignings: 'transfer', teammates: 'connection' }
const COMP_COUNTRY = { 'Premier League': 'england', 'La Liga': 'spain', 'Serie A': 'italy', 'Bundesliga': 'germany', 'Ligue 1': 'france', 'Champions League': null, 'All competitions': null }

// deterministic RNG (mulberry32)
function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const pad = (n) => String(n).padStart(2, '0')
const fmt = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d }

// per-candidate scheduling axes (derived from dimensions — not quality).
function axesOf(c) {
  const d = c.dimensions
  const nation = d.nationality || COMP_COUNTRY[d.competition] || null
  const club = d.club || d.anchor || null // record-signings/teammates anchor acts as the "entity"
  return { id: c.id, club, nation, competition: d.competition, seed: d.seed, hook: HOOK[d.seed] || d.seed }
}
// harder = fewer obvious top-of-mind answers.
const difficultyOf = (c) => Math.max(0.1, Math.min(1, 1 - (c.profile.obviousCount || 0) / 25))
// a gentle weekly difficulty curve (Mon easiest → weekend meatier).
const targetDifficulty = (date) => [0.4, 0.42, 0.46, 0.5, 0.58, 0.62, 0.55][new Date(date + 'T00:00:00Z').getUTCDay()]

function novelty(ax, hist) {
  let m = 1
  const N = Math.min(hist.length, 20)
  for (let i = 0; i < N; i++) {
    const h = hist[hist.length - 1 - i], recency = 1 - i / 20 // 1 (yesterday) → 0
    const pen = (f) => { m *= 1 - f * recency }
    if (ax.club && h.axis.club === ax.club) pen(0.5)
    if (ax.nation && h.axis.nation === ax.nation) pen(0.4)
    if (ax.competition && h.axis.competition === ax.competition) pen(0.35)
    if (h.axis.seed === ax.seed) pen(0.30)
    if (h.axis.hook === ax.hook) pen(0.25)
  }
  return m
}
const house = (ax) => (ax.competition === 'Premier League' || ax.nation === 'england') ? 1.12 : 1
const withinCool = (axis, val, hist, days) => val != null && hist.slice(-days).some((h) => h.axis[axis] === val)

export function schedule({ candidates, days = 90, startDate = '2026-08-01', seed = 1, registry = {} }) {
  const veto = new Set(registry.vetoes || [])
  const pins = registry.pins || {}
  const eligible = candidates.filter((c) => c.gatesFailed.length === 0 && c.defaultScore >= QUALITY_FLOOR && !veto.has(c.id))
  const byId = Object.fromEntries(candidates.map((c) => [c.id, c]))
  const rand = rng(seed * 2654435761)
  const hist = [], out = []
  const usedCount = {} // freshness: strongly prefer questions not yet used, so the schedule exhausts the pool before any repeat

  for (let d = 0; d < days; d++) {
    const date = fmt(addDays(startDate, d))
    let chosen = null, ranked = [], pinned = false

    if (pins[date] && byId[pins[date]]) { chosen = byId[pins[date]]; pinned = true }
    else {
      // exact-question cooldown is ALWAYS enforced (never repeat a recent question);
      // the soft entity cooldowns relax only if that would leave nothing to pick.
      const fresh = eligible.filter((c) => !withinCool('id', axesOf(c).id, hist, COOL.exact))
      let cands = fresh.filter((c) => {
        const a = axesOf(c)
        return !withinCool('club', a.club, hist, COOL.club) && !withinCool('nation', a.nation, hist, COOL.nation)
          && !withinCool('competition', a.competition, hist, COOL.competition) && !withinCool('seed', a.seed, hist, COOL.seed)
      })
      if (!cands.length) cands = fresh // relax soft cooldowns, keep exact
      if (!cands.length) cands = eligible // last resort (pool smaller than cooldown window)
      const tgt = targetDifficulty(date)
      ranked = cands.map((c) => {
        const a = axesOf(c)
        const s = c.defaultScore * novelty(a, hist) * (1 - 0.5 * Math.abs(difficultyOf(c) - tgt)) * house(a)
          * Math.pow(0.75, usedCount[c.id] || 0) * (0.97 + 0.06 * rand())
        return { c, s }
      }).sort((x, y) => y.s - x.s)
      chosen = ranked[0].c
    }

    const a = axesOf(chosen)
    out.push({
      date, questionId: chosen.id, title: chosen.title,
      pinned,
      difficulty: +difficultyOf(chosen).toFixed(2),
      hook: a.hook,
      population: chosen.population, projection: chosen.projection,
      board: chosen.board.slice(0, 12),
      reasons: {
        score: +chosen.defaultScore.toFixed(3),
        pinned,
        avoided: axesRecentlyUsed(a, hist),
        houseBoost: house(a) > 1,
        difficultyTarget: +targetDifficulty(date).toFixed(2),
      },
      rejected: ranked.slice(1, 4).map((r) => ({ id: r.c.id, title: r.c.title, dayScore: +r.s.toFixed(3) })),
    })
    hist.push({ date, axis: a })
    usedCount[chosen.id] = (usedCount[chosen.id] || 0) + 1
  }
  return { meta: { days, startDate, seed, eligible: eligible.length, generatedAt: new Date().toISOString() }, schedule: out }
}

// helper for the explanation
function axesRecentlyUsed(a, hist) {
  const last = hist.slice(-7).map((h) => h.axis)
  const used = []
  for (const k of ['club', 'nation', 'competition', 'seed']) if (a[k] && last.some((x) => x[k] === a[k])) used.push(k)
  return used
}
