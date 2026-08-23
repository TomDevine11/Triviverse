// qgen/retrievability — the missing middle of TRUE → POSSIBLE → GOOD.
//
// The old model asked "are these players recognisable?" and let arbitrary database
// intersections through (a player famous AT Milan counted as nameable for "Milan
// AND Genoa", though nobody would name them FOR that question). This module models
// HUMAN ANSWERABILITY instead: would a fan actually retrieve this player when asked
// THIS question, and is the relationship itself a natural football category?
//
// Two deterministic ideas, no LLM and no manual club allow-list:
//   1. RETRIEVABILITY(player, question) = fame × how strongly the player is
//      associated with EVERY defining entity of the question (min across entities).
//      A famous player weakly tied to one of the entities is NOT retrievable for it.
//   2. PROMINENCE(entity) = how many genuine stars are strongly tied to it — learned
//      from the data (Man Utd has ~50, Genoa ~3), so "iconic" emerges structurally.
// From these we derive a recall surface, predicate naturalness, and a relationship
// tier, all inspectable.

const STAR = 55        // reco at/above which a player is a "household name"
const STRONG_APPS = 40 // appearances at/above which a player is strongly tied to a club/league
// Retrievability bands (calibrated against the curated 501 inventory — see report).
export const RECALL_HIGH = 42
export const RECALL_MED = 18

const clamp01 = (x) => Math.max(0, Math.min(1, x))

// Entity prominence, learned from the data: count of stars strongly tied to it.
export function buildProminence(R) {
  const club = new Map(), nat = new Map(), comp = new Map(), trophy = new Map()
  const inc = (m, k) => m.set(k, (m.get(k) || 0) + 1)
  for (const p of R.players.values()) {
    if ((p.reco || 0) < STAR) continue
    for (const [cid, c] of p.clubApps) if (c.apps >= STRONG_APPS) inc(club, cid)
    for (const n of p.nats) inc(nat, n)
    for (const cm in p.comps) if (p.comps[cm].apps >= STRONG_APPS) inc(comp, cm)
    for (const tr of p.trophies.keys()) inc(trophy, tr)
  }
  return { club, nat, comp, trophy }
}
export function prominenceOf(prom, ent) {
  const [type, val] = split(ent)
  const m = { club: prom.club, nat: prom.nat, comp: prom.comp, trophy: prom.trophy }[type]
  return m ? (m.get(val) || 0) : 0
}

function split(ent) { const i = ent.indexOf(':'); return [ent.slice(0, i), ent.slice(i + 1)] }

const SHARE_REF = 0.30  // ≥30% of a career spent at an entity ⇒ full "identity" credit

function careerApps(pl) { let s = 0; for (const c in pl.comps) s += pl.comps[c].apps; return s }

// How strongly a player is MENTALLY associated with ONE entity (0..1). Two factors:
//   absolute — enough appearances to be a real squad member (not a cameo), and
//   share    — what fraction of the player's CAREER this entity represents.
// The share factor is what stops a globally-famous player counting as a top answer
// for a club where they had one late-career season (de Gea's 7%-of-career Fiorentina
// spell): famous ≠ "I'd name them FOR this club". Nationality/trophy are categorical.
export function assoc(pl, ent) {
  const [type, val] = split(ent)
  if (type === 'club' || type === 'comp') {
    const c = type === 'club' ? pl.clubApps.get(val) : pl.comps[val]
    if (!c) return 0
    const abs = clamp01(c.apps / 50)
    const share = clamp01((c.apps / Math.max(1, careerApps(pl))) / SHARE_REF)
    return abs * share
  }
  if (type === 'nat') return pl.nats.has(val) ? 1 : 0
  if (type === 'trophy') return pl.trophies.has(val) ? 1 : 0
  return 1
}

// Recall FRICTION: how hard the CATEGORY itself is to enumerate from memory. A
// single club/nation/league/trophy is a rehearsed mental list (friction 1). An
// intersection has no rehearsed list — the player must mentally cross two career
// lists — so its effective recall surface is heavily discounted. Structural, not a
// club allow-list. (Do not ban intersections — big natural ones still clear the bar.)
export function frictionOf(entities) {
  if (entities.length <= 1) return 1.0
  if (entities.length >= 3) return 0.15
  const sig = entities.map(e => split(e)[0]).sort().join('+')
  return sig === 'comp+comp' ? 0.85    // "played in both PL and Serie A" — a big, familiar migration
    : sig === 'club+trophy' ? 0.7      // a sub-category of a club ("Chelsea + won the CL")
    : sig === 'comp+nat' ? 0.6         // "Brazilians in the PL" — semi-rehearsed for big nations
    : sig === 'club+club' ? 0.35       // crossing two specific career lists — hard
    : 0.5
}

// COMFORTABLE recall: how many answers a fan spontaneously reaches for THIS
// category (retrievability ≥ COMFORT_BAR), then discounted by category friction.
// This is the "can I get to five without scraping the barrel?" estimate.
export const COMFORT_BAR = 45
export function comfortableRecall(answers, entities, R) {
  let comfortable = 0
  for (const a of answers) if (retrievability(R.players.get(a.id ?? a), entities) >= COMFORT_BAR) comfortable++
  const friction = frictionOf(entities)
  return { comfortable, friction, effective: comfortable * friction }
}

// Retrievability of a player FOR a question: fame gated by the WEAKEST association
// to any defining entity. This is what collapses arbitrary intersections — a Milan
// star with a Genoa cameo has assoc(Genoa)≈0, so retrievability≈0 for "Milan ∩ Genoa".
export function retrievability(pl, entities) {
  if (!pl) return 0
  let m = 1
  for (const e of entities) m = Math.min(m, assoc(pl, e))
  return (pl.reco || 0) * m
}

// Recall surface of a resolved answer set: how many answers a fan can realistically
// retrieve, split into high / medium / low retrievability.
export function recallBands(answers, entities, R) {
  let high = 0, med = 0, low = 0
  const scored = answers.map(a => {
    const r = retrievability(R.players.get(a.id ?? a), entities)
    if (r >= RECALL_HIGH) high++; else if (r >= RECALL_MED) med++; else low++
    return r
  })
  return { high, med, low, surface: high + med, scored }
}

// Thresholds derived from the good/bad calibration set (see report):
//   Man Utd∩Real, Brazil∩PL (good) vs Milan∩{Genoa,Fiorentina}, Genoa∩Torino,
//   Senegal∩Ligue1 (bad). A single prominent category is inherently a natural
//   question; an INTERSECTION is only natural when BOTH entities are prominent AND
//   megastars actually embody it (a known career/transfer corridor), else arbitrary.
export const MEGASTAR = 70       // retrievability at/above which a player is a marquee embodiment
const EMBODY_MIN = 3             // marquee players needed to make an intersection "a known fact"
const AND_PROM_FLOOR = 36        // both entities must clear this prominence for an AND
const SINGLE_PROM_FLOOR = 4      // a single category only needs to be a real football entity

// Predicate naturalness + relationship tier. `megastars` = number of answers with
// retrievability ≥ MEGASTAR (marquee embodiment of the relationship).
export function classifyPredicate(entities, prom, megastars) {
  const proms = entities.map(e => prominenceOf(prom, e))
  const minProm = proms.length ? Math.min(...proms) : 0
  const n = entities.length
  let naturalness, arbitrary = false
  if (n <= 1) {
    naturalness = clamp01(minProm / 25)
    arbitrary = minProm < SINGLE_PROM_FLOOR
  } else {
    const bothProminent = minProm >= AND_PROM_FLOOR
    const embodied = megastars >= EMBODY_MIN
    arbitrary = !(bothProminent && embodied)
    // graded score for ranking: rewards both prominence and embodiment
    naturalness = clamp01(0.5 * clamp01(minProm / AND_PROM_FLOOR) + 0.5 * clamp01(megastars / (EMBODY_MIN + 2)))
    if (arbitrary) naturalness = Math.min(naturalness, 0.35)
  }
  const tier = arbitrary ? 4 : naturalness >= 0.7 ? 1 : naturalness >= 0.45 ? 2 : 3
  return { naturalness, tier, minProm, arbitraryIntersection: arbitrary && n > 1 }
}

export { STAR, STRONG_APPS }
