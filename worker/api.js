// Social API — Cloudflare Worker + D1. Player state only (results, leagues,
// transfer codes); all game content stays in the static build.
//
// Identity model: the client holds a private `player` id (sent on every call,
// used as the write credential) and a public `pub` id (the only id this API
// ever returns). There are no accounts. Scores are client-reported, so they are
// trusted only as far as a friends' league needs — see the validation below and
// the note on public leaderboards in docs/social.md.

const GAMES = new Set(['tenable', 'wordle', 'tictactoe', 'teammates', 'careers', 'connections', 'higherlower', '501', 'pointless', 'bingo', 'contexto'])
const UNITS = new Set(['pts', 'mistakes', 'guesses', 'players', 'streak'])
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_LEAGUE_MEMBERS = 100
const MAX_OWNED_LEAGUES = 10
const MAX_MEMBERSHIPS = 20
const TRANSFER_TTL_MS = 24 * 3600 * 1000

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
})
const bad = (error, status = 400) => json({ error }, status)

const utcDay = () => Math.floor(Date.now() / 86400000)
export const weekStart = (d) => d - ((d + 3) % 7) // Monday — same formula as src/data/dailyStats.js

const cleanName = (s) => String(s || '').replace(/[<>"'`\\{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20)
const cleanLeagueName = (s) => String(s || '').replace(/[<>"'`\\{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 32)
const validId = (s) => typeof s === 'string' && /^[a-z0-9]{8,40}$/i.test(s)
const validDay = (d) => Number.isInteger(d) && Math.abs(d - utcDay()) <= 1

function code(n = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(n))
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

async function body(request) {
  try { return await request.json() } catch { return null }
}

// Create-or-refresh the player row. Returns false if the pub id is taken by
// another private id (someone replaying a public id) — the write is refused.
async function upsertPlayer(db, { player, pub, name }) {
  if (!validId(player) || !validId(pub)) return false
  const now = Date.now()
  const row = await db.prepare('SELECT id, pub, name FROM players WHERE id = ?').bind(player).first()
  if (!row) {
    const clash = await db.prepare('SELECT id FROM players WHERE pub = ?').bind(pub).first()
    if (clash) return false
    await db.prepare('INSERT INTO players (id, pub, name, created, updated) VALUES (?, ?, ?, ?, ?)')
      .bind(player, pub, cleanName(name), now, now).run()
    return true
  }
  const nm = cleanName(name)
  if (nm && nm !== row.name) await db.prepare('UPDATE players SET name = ?, updated = ? WHERE id = ?').bind(nm, now, player).run()
  return true
}

// ── Results ─────────────────────────────────────────────────────────────────
async function percentile(db, { day, game, player, w, v, low }) {
  const hasV = v != null
  const row = await db.prepare(`
    SELECT
      SUM(CASE WHEN w < ?1 OR (w = ?1 AND ?7 = 1 AND v IS NOT NULL AND ((?3 = 1 AND v > ?2) OR (?3 = 0 AND v < ?2))) THEN 1 ELSE 0 END) AS beat,
      SUM(CASE WHEN w = ?1 AND (?7 = 0 OR v IS NULL OR v = ?2) THEN 1 ELSE 0 END) AS tie,
      COUNT(*) AS n
    FROM results WHERE day = ?4 AND game = ?5 AND player != ?6`)
    .bind(w ? 1 : 0, hasV ? v : 0, low ? 1 : 0, day, game, player, hasV ? 1 : 0).first()
  const n = row?.n || 0
  return { pc: n ? Math.round(((row.beat || 0) + (row.tie || 0) / 2) / n * 100) : null, others: n }
}

// ── Points (server-computed) ────────────────────────────────────────────────
// The same economy as src/data/dailyStats.js — keep them in step. The client
// still sends its own `p`, but leagues and the world table use these numbers,
// so a tampered request can't claim more than a real result would earn.
const PTS_PLAY = 10
const PTS_WIN = 25
const PTS_STREAK_PER = 5
const PTS_STREAK_CAP = 25
const PERFECT_MULT = 2

async function serverPoints(db, player, day, game, won) {
  if (!won) return PTS_PLAY // a loss resets that game's streak, so no bonus
  const cap = PTS_STREAK_CAP / PTS_STREAK_PER
  const { results } = await db.prepare('SELECT day, w FROM results WHERE player = ? AND game = ? AND day BETWEEN ? AND ?')
    .bind(player, game, day - cap, day - 1).all()
  const wonDays = new Set(results.filter(r => r.w).map(r => r.day))
  let streak = 1
  while (streak < cap && wonDays.has(day - streak)) streak++
  return PTS_WIN + Math.min(streak * PTS_STREAK_PER, PTS_STREAK_CAP)
}

// The perfect-day bonus, awarded by the server when the day's last daily lands.
async function awardPerfect(db, player, day) {
  const row = await db.prepare(`SELECT COUNT(DISTINCT game) AS n, SUM(pts) AS base,
      (SELECT COUNT(*) FROM results WHERE player = ?1 AND day = ?2 AND game = 'perfect') AS has
    FROM results WHERE player = ?1 AND day = ?2 AND game != 'perfect'`).bind(player, day).first()
  if (!row || row.has || row.n < GAMES.size) return
  await db.prepare(`INSERT OR IGNORE INTO results (player, day, game, w, pts, created) VALUES (?, ?, 'perfect', 1, ?, ?)`)
    .bind(player, day, (row.base || 0) * (PERFECT_MULT - 1), Date.now()).run()
}

async function postResult(request, env) {
  const b = await body(request)
  if (!b) return bad('bad_json')
  const game = String(b.game || '')
  if (!GAMES.has(game) && game !== 'perfect') return bad('bad_game')
  if (!validDay(b.day)) return bad('bad_day')
  // The perfect bonus is the server's to award (awardPerfect); client rows are ignored.
  if (game === 'perfect') return (await upsertPlayer(env.DB, b)) ? json({ ok: true }) : bad('bad_player', 403)
  const v = b.v == null ? null : Number(b.v)
  if (v != null && (!Number.isFinite(v) || v < 0 || v > 10000)) return bad('bad_score')
  const of = b.of == null ? null : Math.max(0, Math.min(100, Math.round(Number(b.of)) || 0))
  const u = UNITS.has(b.u) ? b.u : null
  if (!(await upsertPlayer(env.DB, b))) return bad('bad_player', 403)
  const pts = await serverPoints(env.DB, b.player, b.day, game, !!b.w)

  // First write wins for the outcome and its points; a later write may only fill
  // in a missing score (the finish card submits after recordResult's bare row).
  await env.DB.prepare(`
    INSERT INTO results (player, day, game, w, v, of, low, u, pts, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (player, day, game) DO UPDATE SET
      v = COALESCE(results.v, excluded.v), of = COALESCE(results.of, excluded.of), u = COALESCE(results.u, excluded.u),
      low = CASE WHEN results.v IS NULL THEN excluded.low ELSE results.low END`)
    .bind(b.player, b.day, game, b.w ? 1 : 0, v, of, b.low ? 1 : 0, u, pts, Date.now()).run()
  await awardPerfect(env.DB, b.player, b.day)

  const stored = await env.DB.prepare('SELECT w, v, low FROM results WHERE player = ? AND day = ? AND game = ?').bind(b.player, b.day, game).first()
  const rank = await percentile(env.DB, { day: b.day, game, player: b.player, w: stored.w, v: stored.v, low: stored.low })
  return json({ ok: true, ...rank })
}

async function getToday(url, env) {
  const day = Number(url.searchParams.get('day'))
  if (!validDay(day)) return bad('bad_day')
  const [players, games] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(DISTINCT player) AS n FROM results WHERE day = ? AND game != 'perfect'").bind(day),
    env.DB.prepare("SELECT game, COUNT(*) AS n, SUM(w) AS wins FROM results WHERE day = ? AND game != 'perfect' GROUP BY game").bind(day),
  ])
  const byGame = {}
  for (const r of games.results) byGame[r.game] = { n: r.n, wins: r.wins || 0 }
  return json({ day, players: players.results[0]?.n || 0, games: byGame }, 200, { 'cache-control': 'public, max-age=30' })
}

async function getDist(url, env) {
  const day = Number(url.searchParams.get('day'))
  const game = url.searchParams.get('game') || ''
  if (!validDay(day) || !GAMES.has(game)) return bad('bad_query')
  const { results } = await env.DB.prepare('SELECT w, v, of, low, u, COUNT(*) AS n FROM results WHERE day = ? AND game = ? GROUP BY w, v ORDER BY w DESC, v').bind(day, game).all()
  const total = results.reduce((s, r) => s + r.n, 0)
  const meta = results[0] ? { of: results[0].of, low: !!results[0].low, u: results[0].u } : null
  return json({ day, game, total, meta, buckets: results.map(r => ({ w: !!r.w, v: r.v, n: r.n })) }, 200, { 'cache-control': 'public, max-age=30' })
}

// ── Leagues ─────────────────────────────────────────────────────────────────
async function createLeague(request, env) {
  const b = await body(request)
  if (!b) return bad('bad_json')
  if (!cleanName(b.name)) return bad('name_required')
  const leagueName = cleanLeagueName(b.leagueName)
  if (!leagueName) return bad('league_name_required')
  if (!(await upsertPlayer(env.DB, b))) return bad('bad_player', 403)
  const owned = await env.DB.prepare('SELECT COUNT(*) AS n FROM leagues WHERE owner = ?').bind(b.player).first()
  if ((owned?.n || 0) >= MAX_OWNED_LEAGUES) return bad('too_many_leagues')
  const memberships = await env.DB.prepare('SELECT COUNT(*) AS n FROM members WHERE player = ?').bind(b.player).first()
  if ((memberships?.n || 0) >= MAX_MEMBERSHIPS) return bad('too_many_memberships')
  let c
  for (let i = 0; i < 5; i++) {
    c = code()
    const taken = await env.DB.prepare('SELECT 1 FROM leagues WHERE code = ?').bind(c).first()
    if (!taken) break
  }
  const now = Date.now()
  await env.DB.batch([
    env.DB.prepare('INSERT INTO leagues (code, name, owner, created) VALUES (?, ?, ?, ?)').bind(c, leagueName, b.player, now),
    env.DB.prepare('INSERT INTO members (league, player, joined) VALUES (?, ?, ?)').bind(c, b.player, now),
  ])
  return json({ code: c, name: leagueName })
}

const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)

async function joinLeague(request, env, c) {
  const b = await body(request)
  if (!b) return bad('bad_json')
  if (!cleanName(b.name)) return bad('name_required')
  const league = await env.DB.prepare('SELECT code, name FROM leagues WHERE code = ?').bind(c).first()
  if (!league) return bad('not_found', 404)
  if (!(await upsertPlayer(env.DB, b))) return bad('bad_player', 403)
  const already = await env.DB.prepare('SELECT 1 FROM members WHERE league = ? AND player = ?').bind(c, b.player).first()
  if (!already) {
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM members WHERE league = ?').bind(c).first()
    if ((count?.n || 0) >= MAX_LEAGUE_MEMBERS) return bad('league_full')
    const memberships = await env.DB.prepare('SELECT COUNT(*) AS n FROM members WHERE player = ?').bind(b.player).first()
    if ((memberships?.n || 0) >= MAX_MEMBERSHIPS) return bad('too_many_memberships')
    await env.DB.prepare('INSERT OR IGNORE INTO members (league, player, joined) VALUES (?, ?, ?)').bind(c, b.player, Date.now()).run()
  }
  return json({ code: league.code, name: league.name, joined: !already })
}

async function leaveLeague(request, env, c) {
  const b = await body(request)
  if (!b || !validId(b.player)) return bad('bad_player')
  await env.DB.prepare('DELETE FROM members WHERE league = ? AND player = ?').bind(c, b.player).run()
  const left = await env.DB.prepare('SELECT player FROM members WHERE league = ? ORDER BY joined LIMIT 1').bind(c).first()
  if (!left) await env.DB.prepare('DELETE FROM leagues WHERE code = ?').bind(c).run()
  else await env.DB.prepare('UPDATE leagues SET owner = ? WHERE code = ? AND owner = ?').bind(left.player, c, b.player).run()
  return json({ ok: true })
}

async function peekLeague(env, c) {
  const league = await env.DB.prepare(`SELECT l.code, l.name, p.name AS ownerName, (SELECT COUNT(*) FROM members m WHERE m.league = l.code) AS members
    FROM leagues l LEFT JOIN players p ON p.id = l.owner WHERE l.code = ?`).bind(c).first()
  if (!league) return bad('not_found', 404)
  return json(league)
}

// Standings for [from, to]: points, dailies played, wins, perfect days — per member.
async function standings(env, c, from, to) {
  const { results } = await env.DB.prepare(`
    SELECT r.player,
      SUM(r.pts) AS pts,
      SUM(CASE WHEN r.game != 'perfect' THEN 1 ELSE 0 END) AS played,
      SUM(CASE WHEN r.game != 'perfect' THEN r.w ELSE 0 END) AS wins,
      SUM(CASE WHEN r.game = 'perfect' THEN 1 ELSE 0 END) AS perfect
    FROM results r JOIN members m ON m.player = r.player AND m.league = ?
    WHERE r.day BETWEEN ? AND ? GROUP BY r.player`).bind(c, from, to).all()
  return new Map(results.map(r => [r.player, r]))
}

function table(members, stats, youId) {
  return members.map(m => {
    const s = stats.get(m.id) || {}
    return { pub: m.pub, name: m.name || '—', you: m.id === youId, pts: s.pts || 0, played: s.played || 0, wins: s.wins || 0, perfect: s.perfect || 0 }
  }).sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.played - a.played || a.name.localeCompare(b.name))
    .map((r, i, arr) => ({ ...r, rank: 1 + arr.filter(x => x.pts > r.pts || (x.pts === r.pts && x.wins > r.wins)).length, tied: arr.some(x => x !== r && x.pts === r.pts && x.wins === r.wins) }))
}

async function getLeague(url, env, c) {
  const player = url.searchParams.get('player') || ''
  const day = Number(url.searchParams.get('day'))
  if (!validDay(day)) return bad('bad_day')
  const league = await env.DB.prepare('SELECT code, name, owner, created FROM leagues WHERE code = ?').bind(c).first()
  if (!league) return bad('not_found', 404)
  const { results: members } = await env.DB.prepare(`SELECT p.id, p.pub, p.name, m.joined FROM members m JOIN players p ON p.id = m.player WHERE m.league = ? ORDER BY m.joined`).bind(c).all()
  const isMember = members.some(m => m.id === player)
  if (!isMember) return json({ code: league.code, name: league.name, member: false, members: members.length })

  const ws = weekStart(day)
  const createdDay = Math.floor(league.created / 86400000) - 1
  const [week, lastWeek, allTime, todayRows] = await Promise.all([
    standings(env, c, ws, ws + 6),
    standings(env, c, ws - 7, ws - 1),
    standings(env, c, createdDay, day + 1),
    env.DB.prepare(`SELECT r.player, r.game, r.w, r.v, r.of, r.low, r.u, r.pts FROM results r JOIN members m ON m.player = r.player AND m.league = ? WHERE r.day = ?`).bind(c, day).all(),
  ])
  const pubOf = new Map(members.map(m => [m.id, m.pub]))
  const today = {}
  for (const r of todayRows.results) {
    const pub = pubOf.get(r.player)
    ;(today[pub] ||= {})[r.game] = { w: !!r.w, v: r.v, of: r.of || undefined, low: !!r.low, u: r.u || undefined, p: r.pts }
  }
  const lastTable = table(members, lastWeek, player).filter(r => r.pts > 0)
  return json({
    code: league.code,
    name: league.name,
    member: true,
    owner: pubOf.get(league.owner) || null,
    weekStart: ws,
    week: table(members, week, player),
    lastWeek: lastTable.slice(0, 3),
    allTime: table(members, allTime, player),
    today,
  })
}

async function myLeagues(url, env) {
  const player = url.searchParams.get('player') || ''
  const day = Number(url.searchParams.get('day'))
  if (!validId(player) || !validDay(day)) return bad('bad_query')
  const { results: leagues } = await env.DB.prepare(`SELECT l.code, l.name, (SELECT COUNT(*) FROM members x WHERE x.league = l.code) AS members
    FROM members m JOIN leagues l ON l.code = m.league WHERE m.player = ? ORDER BY m.joined`).bind(player).all()
  const ws = weekStart(day)
  // Optional `game`: what that daily's result added today (plus the perfect-day
  // bonus if it was the eleventh), so the finish card can show "6th → 4th".
  const game = url.searchParams.get('game') || ''
  let gained = 0
  if (GAMES.has(game)) {
    const { results: today } = await env.DB.prepare('SELECT game, pts, created FROM results WHERE player = ? AND day = ?').bind(player, day).all()
    const mineRow = today.find(r => r.game === game)
    if (mineRow) {
      gained = mineRow.pts
      const perfect = today.find(r => r.game === 'perfect')
      const lastGame = today.filter(r => r.game !== 'perfect').every(r => r.created <= mineRow.created)
      if (perfect && lastGame) gained += perfect.pts
    }
  }
  const out = []
  for (const l of leagues) {
    const { results: rows } = await env.DB.prepare(`SELECT m.player, p.name, COALESCE(SUM(r.pts), 0) AS pts FROM members m
      JOIN players p ON p.id = m.player
      LEFT JOIN results r ON r.player = m.player AND r.day BETWEEN ? AND ? WHERE m.league = ? GROUP BY m.player ORDER BY pts DESC, p.name`).bind(ws, ws + 6, l.code).all()
    const idx = rows.findIndex(r => r.player === player)
    const mine = rows[idx]?.pts || 0
    const leader = rows[0]?.pts || 0
    const rankOf = (r) => rows.filter(x => x.pts > r.pts).length + 1
    const above = idx > 0 ? rows.slice(0, idx).reverse().find(r => r.pts > mine) : null
    const below = rows.slice(idx + 1).find(r => r.pts < mine) || null
    // The three rows around you (above · you · below) for the hub's title-race
    // rail. Public fields only: never a private player id.
    const from = Math.max(0, Math.min(idx - 1, rows.length - 3))
    const slice = rows.slice(from, from + 3).map(r => ({ rank: rankOf(r), name: r.name || '—', pts: r.pts, you: r.player === player }))
    out.push({
      ...l, rank: rows.filter(r => r.pts > mine).length + 1, pts: mine, leaderPts: leader,
      gapToNext: above ? above.pts - mine : 0, aboveName: above?.name || null,
      leadOver: !above && below ? mine - below.pts : 0, belowName: !above ? below?.name || null : null,
      slice,
      ...(game ? { gained, rankBefore: rows.filter(r => r.player !== player && r.pts > mine - gained).length + 1 } : {}),
    })
  }
  return json({ leagues: out })
}

// ── World table ─────────────────────────────────────────────────────────────
// Everyone's matchday points over [from, to], best first. Two guards keep the
// public table honest (scores are client-reported — docs/social.md):
//   • points are server-computed (postResult), so nobody can claim more than a
//     real result earns;
//   • a player-day of 6+ dailies all landing within two minutes isn't humanly
//     playable, so it's left out of the table (still counts in private leagues).
// Moderated players (players.hidden) never appear.
const BURST_GAMES = 6
const BURST_MS = 120000

async function worldStandings(db, from, to) {
  const { results } = await db.prepare(`
    WITH days AS (
      SELECT player, day, SUM(pts) AS pts,
        SUM(CASE WHEN game != 'perfect' THEN 1 ELSE 0 END) AS n,
        SUM(CASE WHEN game != 'perfect' THEN w ELSE 0 END) AS wins,
        SUM(CASE WHEN game = 'perfect' THEN 1 ELSE 0 END) AS perfect,
        MAX(created) - MIN(created) AS span
      FROM results WHERE day BETWEEN ? AND ? GROUP BY player, day
    )
    SELECT d.player, p.name, SUM(d.pts) AS pts, SUM(d.n) AS played, SUM(d.wins) AS wins, SUM(d.perfect) AS perfect
    FROM days d JOIN players p ON p.id = d.player
    WHERE p.hidden = 0 AND NOT (d.n >= ? AND d.span < ?)
    GROUP BY d.player
    ORDER BY pts DESC, wins DESC, played ASC`).bind(from, to, BURST_GAMES, BURST_MS).all()
  const counts = new Map()
  for (const r of results) counts.set(r.pts, (counts.get(r.pts) || 0) + 1)
  return results.map((r, i, arr) => ({ ...r, rank: arr.findIndex(x => x.pts === r.pts) + 1, tied: counts.get(r.pts) > 1 }))
}

// Public shape: never a private id. No nickname → null (the page shows "Anonymous").
const publicRow = (r, player) => ({ rank: r.rank, tied: r.tied, name: r.name || null, pts: r.pts, played: r.played, wins: r.wins, perfect: r.perfect, you: r.player === player })

const TOP = 50
async function getWorld(url, env) {
  const player = url.searchParams.get('player') || ''
  const day = Number(url.searchParams.get('day'))
  const period = url.searchParams.get('period') || 'today'
  if (!validDay(day) || !['today', 'week', 'all'].includes(period)) return bad('bad_query')
  const ws = weekStart(day)
  const [from, to] = period === 'today' ? [day, day] : period === 'week' ? [ws, ws + 6] : [0, day + 1]
  const all = await worldStandings(env.DB, from, to)
  const idx = validId(player) ? all.findIndex(r => r.player === player) : -1
  // Outside the top 50: your row with the players either side of it.
  const around = idx >= TOP ? all.slice(idx - 1, idx + 2).map(r => publicRow(r, player)) : []
  return json({
    period, players: all.length,
    rows: all.slice(0, TOP).map(r => publicRow(r, player)),
    around,
    me: idx >= 0 ? publicRow(all[idx], player) : null,
  }, 200, { 'cache-control': 'private, max-age=30' })
}

// Your own position for one day (the hub's World block). Same table as above.
async function rankOn(db, day, player) {
  const all = await worldStandings(db, day, day)
  const idx = all.findIndex(r => r.player === player)
  if (idx < 0) return null
  const me = all[idx]
  const above = all.slice(0, idx).reverse().find(r => r.pts > me.pts)
  return { rank: me.rank, players: all.length, pts: me.pts, toNext: above ? above.pts - me.pts : 0, top: Math.max(1, Math.ceil((me.rank / all.length) * 100)) }
}

async function getRank(url, env) {
  const player = url.searchParams.get('player') || ''
  const day = Number(url.searchParams.get('day'))
  if (!validId(player) || !validDay(day)) return bad('bad_query')
  const today = await rankOn(env.DB, day, player)
  if (today) return json({ day, ...today })
  // Not played yet today: yesterday's finish, so there's something to defend.
  const prev = await rankOn(env.DB, day - 1, player)
  const playing = await env.DB.prepare("SELECT COUNT(DISTINCT player) AS n FROM results WHERE day = ? AND game != 'perfect'").bind(day).first()
  return json({ day, rank: null, playing: playing?.n || 0, yesterday: prev })
}

// ── Device transfer ─────────────────────────────────────────────────────────
async function putTransfer(request, env) {
  const b = await body(request)
  const blob = String(b?.blob || '')
  if (!blob || blob.length > 300000) return bad('bad_blob')
  const now = Date.now()
  await env.DB.prepare('DELETE FROM transfers WHERE created < ?').bind(now - TRANSFER_TTL_MS).run()
  const c = code(6)
  await env.DB.prepare('INSERT INTO transfers (code, blob, created) VALUES (?, ?, ?)').bind(c, blob, now).run()
  return json({ code: c, expires: now + TRANSFER_TTL_MS })
}

async function getTransfer(env, c) {
  const row = await env.DB.prepare('SELECT blob, created FROM transfers WHERE code = ?').bind(c).first()
  if (!row || row.created < Date.now() - TRANSFER_TTL_MS) return bad('not_found', 404)
  return json({ blob: row.blob })
}

// ── Short share links ───────────────────────────────────────────────────────
async function hashCode(payload, len) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload)))
  return Array.from(digest.slice(0, len), b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

async function postLink(request, env) {
  const b = await body(request)
  const payload = String(b?.c || '')
  if (!payload || payload.length > 2000 || !/^[A-Za-z0-9_-]+$/.test(payload)) return bad('bad_payload')
  for (const len of [7, 9, 12]) {
    const c = await hashCode(payload, len)
    const row = await env.DB.prepare('SELECT payload FROM links WHERE code = ?').bind(c).first()
    if (row?.payload === payload) return json({ code: c })
    if (!row) {
      await env.DB.prepare('INSERT INTO links (code, payload, created) VALUES (?, ?, ?)').bind(c, payload, Date.now()).run()
      return json({ code: c })
    }
  }
  return bad('collision', 500)
}

export async function lookupLink(env, c) {
  if (!env.DB) return null
  const row = await env.DB.prepare('SELECT payload FROM links WHERE code = ?').bind(c).first()
  return row?.payload || null
}

// ── Router ──────────────────────────────────────────────────────────────────
export async function handleApi(request, env) {
  if (!env.DB) return bad('social_api_not_configured', 503)
  const url = new URL(request.url)
  const p = url.pathname.replace(/^\/api/, '')
  const m = request.method
  try {
    if (p === '/results' && m === 'POST') return await postResult(request, env)
    if (p === '/today' && m === 'GET') return await getToday(url, env)
    if (p === '/dist' && m === 'GET') return await getDist(url, env)
    if (p === '/players' && m === 'POST') {
      const b = await body(request)
      return (await upsertPlayer(env.DB, b || {})) ? json({ ok: true }) : bad('bad_player', 403)
    }
    if (p === '/leagues' && m === 'POST') return await createLeague(request, env)
    if (p === '/me/leagues' && m === 'GET') return await myLeagues(url, env)
    if (p === '/rank' && m === 'GET') return await getRank(url, env)
    if (p === '/world' && m === 'GET') return await getWorld(url, env)
    if (p === '/transfer' && m === 'POST') return await putTransfer(request, env)
    if (p === '/links' && m === 'POST') return await postLink(request, env)
    let mm
    if ((mm = p.match(/^\/transfer\/([A-Za-z0-9]+)$/)) && m === 'GET') return await getTransfer(env, normCode(mm[1]))
    if ((mm = p.match(/^\/leagues\/([A-Za-z0-9]+)(\/(join|leave|peek))?$/))) {
      const c = normCode(mm[1])
      const action = mm[3]
      if (action === 'join' && m === 'POST') return await joinLeague(request, env, c)
      if (action === 'leave' && m === 'POST') return await leaveLeague(request, env, c)
      if (action === 'peek' && m === 'GET') return await peekLeague(env, c)
      if (!action && m === 'GET') return await getLeague(url, env, c)
    }
    return bad('not_found', 404)
  } catch (err) {
    return json({ error: 'server_error', detail: String(err?.message || err) }, 500)
  }
}
