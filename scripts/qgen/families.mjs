// qgen/families — reusable QUESTION FAMILIES.
//
// Each family is a generator that enumerates many concrete candidate questions
// from the registry, deliberately GENEROUSLY (we over-produce, then the quality
// layer rejects most). A candidate is { familyId, title, description, predicate,
// scope }. `scope` tells the scorer which stat measures "nameability for THIS
// question". Families never decide quality — they only decide what is expressible.
import { TROPHIES, TROPHY_LABEL, COMP_NAME, LEAGUE_COMPS } from './predicates.mjs'

const LEAGUES = LEAGUE_COMPS
const ALL_COMPS = ['GB1', 'ES1', 'IT1', 'L1', 'FR1', 'CL']

// Clubs worth naming in a question: appearance roster in a sensible band and a
// recognisable name surface. We pass the registry so families can size predicates.
function candidateClubs(R, { min = 60, minReco = 1 } = {}) {
  const out = []
  for (const [cid, members] of R.clubMembers) {
    if (members.size < min) continue
    const name = R.clubName.get(cid)
    if (!name) continue
    const league = R.clubLeague.get(cid)
    const reco = countReco(R, members, 25)
    if (reco < minReco) continue
    out.push({ cid, name, league, size: members.size, reco })
  }
  return out.sort((a, b) => b.reco - a.reco)
}
function countReco(R, ids, bar) { let n = 0; for (const id of ids) if ((R.players.get(id)?.reco || 0) >= bar) n++; return n }

// Nationalities offered as question subjects (enough international players).
function candidateNations(R, { min = 40 } = {}) {
  const out = []
  for (const [nat, ids] of R.natIndex) if (ids.size >= min) out.push({ nat, size: ids.size })
  return out.sort((a, b) => b.size - a.size)
}

export function pointlessFamilies(R) {
  const clubs = candidateClubs(R, { min: 80, minReco: 8 })
  const bigClubs = clubs.slice(0, 40)          // for club×club pairing (fame surface)
  const nations = candidateNations(R, { min: 60 })
  const out = []
  const push = (c) => out.push(c)

  // 1. Played for CLUB (in its league) — the classic single-club Pointless board.
  for (const c of clubs) push({
    familyId: 'club', title: `Played for ${c.name}`,
    description: `Name anyone who has made a league appearance for ${c.name}.`,
    predicate: { kind: 'club', cid: c.cid }, scope: { type: 'club', cid: c.cid },
  })

  // 2. Played in BOTH league A and league B.
  for (let i = 0; i < LEAGUES.length; i++) for (let j = i + 1; j < LEAGUES.length; j++) {
    const [a, b] = [LEAGUES[i], LEAGUES[j]]
    push({
      familyId: 'both-leagues', title: `Played in BOTH ${COMP_NAME[a]} and ${COMP_NAME[b]}`,
      description: `Name a player who appeared in both — a single cameo counts.`,
      predicate: { kind: 'and', of: [{ kind: 'league', comp: a }, { kind: 'league', comp: b }] },
      scope: { type: 'comps', comps: [a, b] },
    })
  }

  // 3. Scored in BOTH competition A and B.
  for (let i = 0; i < ALL_COMPS.length; i++) for (let j = i + 1; j < ALL_COMPS.length; j++) {
    const [a, b] = [ALL_COMPS[i], ALL_COMPS[j]]
    push({
      familyId: 'scored-both', title: `Scored in ${COMP_NAME[a]} AND ${COMP_NAME[b]}`,
      description: `Name a player who has scored in both.`,
      predicate: { kind: 'and', of: [{ kind: 'statMin', comp: a, stat: 'goals', n: 1 }, { kind: 'statMin', comp: b, stat: 'goals', n: 1 }] },
      scope: { type: 'comps', comps: [a, b] },
    })
  }

  // 4. Played for BOTH club A and club B (rivalries + famous moves).
  for (let i = 0; i < bigClubs.length; i++) for (let j = i + 1; j < bigClubs.length; j++) {
    const a = bigClubs[i], b = bigClubs[j]
    push({
      familyId: 'both-clubs', title: `Played for BOTH ${a.name} and ${b.name}`,
      description: `Name anyone who turned out for both clubs.`,
      predicate: { kind: 'and', of: [{ kind: 'club', cid: a.cid }, { kind: 'club', cid: b.cid }] },
      scope: { type: 'comps', comps: ALL_COMPS },
    })
  }

  // 5. Played for CLUB and won TROPHY.
  for (const c of bigClubs) for (const [name] of TROPHIES) push({
    familyId: 'club-trophy', title: `Played for ${c.name} and ${TROPHY_LABEL.get(name)}`,
    description: `Name a player who did both (not necessarily at the same time).`,
    predicate: { kind: 'and', of: [{ kind: 'club', cid: c.cid }, { kind: 'trophy', name }] },
    scope: { type: 'club', cid: c.cid },
  })

  // 6. COUNTRY internationals who played in LEAGUE.
  for (const n of nations.slice(0, 30)) for (const comp of LEAGUES) push({
    familyId: 'nat-league', title: `${n.nat} players who appeared in ${COMP_NAME[comp]}`,
    description: `Name a ${n.nat} international who played in ${COMP_NAME[comp]}.`,
    predicate: { kind: 'and', of: [{ kind: 'nationality', nat: n.nat }, { kind: 'league', comp }] },
    scope: { type: 'comp', comp },
  })

  // 7. Won TROPHY (broad honour board).
  for (const [name, label] of TROPHIES) push({
    familyId: 'trophy', title: `Players who ${label}`,
    description: `Name anyone who ${label}.`,
    predicate: { kind: 'trophy', name }, scope: { type: 'career' },
  })

  // Tag each candidate with the stable ENTITIES it is "about" (clubs, nations,
  // trophies, competitions). Used for structural near-duplicate detection and for
  // spacing the same entity apart in the daily rota.
  for (const c of out) c.entities = [...entitiesOf(c.predicate)].sort()
  return out
}

function entitiesOf(pred, set = new Set()) {
  switch (pred.kind) {
    case 'club': set.add(`club:${pred.cid}`); break
    case 'nationality': set.add(`nat:${pred.nat}`); break
    case 'trophy': set.add(`trophy:${pred.name}`); break
    case 'league': set.add(`comp:${pred.comp}`); break
    case 'statMin': set.add(`comp:${pred.comp}`); break
    case 'and': case 'or': for (const p of pred.of) entitiesOf(p, set); break
    case 'not': entitiesOf(pred.of, set); break
    case 'minus': entitiesOf(pred.a, set); entitiesOf(pred.b, set); break
  }
  return set
}

export { candidateClubs, candidateNations, countReco }
