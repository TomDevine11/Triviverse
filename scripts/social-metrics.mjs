#!/usr/bin/env node
// Social/virality snapshot from the production D1 (read-only queries).
//   npm run social-metrics            → last 30 days
//   npm run social-metrics -- 7       → last 7 days
// Needs wrangler logged in. GA4-side events (share, challenge_open,
// league_create, league_join, reminder_set) live in GA4, not here.
// NB: the `links` table is NOT a share count — a short link is minted whenever
// a result card renders. Real link opens are in share_opens (migration 0006).
import { execFileSync } from 'node:child_process'

const days = Number(process.argv[2]) || 30
const since = Date.now() - days * 86400e3
const sinceDay = new Date(since).toISOString().slice(0, 10)

function q(title, sql) {
  let rows
  try {
    const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'triviverse-social', '--remote', '--json', '--command', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    rows = JSON.parse(out)[0].results
  } catch (e) { rows = [{ error: String(e.stderr || e.message).split('\n').find(Boolean) }] }
  console.log(`\n## ${title}`)
  console.table(rows)
}

console.log(`Triviverse social metrics — last ${days} days (since ${sinceDay})`)
q('Totals (all time)', `SELECT
  (SELECT count(*) FROM players) players,
  (SELECT count(*) FROM players WHERE name <> '') named,
  (SELECT count(*) FROM leagues) leagues,
  (SELECT count(*) FROM members) league_members,
  (SELECT count(*) FROM geo_leagues) geo_leagues,
  (SELECT count(*) FROM geo_members) geo_members`)
q('League sizes', `SELECT n AS members, count(*) AS leagues FROM
  (SELECT l.code, count(m.player) n FROM leagues l LEFT JOIN members m ON m.league = l.code GROUP BY l.code)
  GROUP BY n ORDER BY n`)
q('Leagues with a member active in window', `SELECT count(DISTINCT m.league) active_leagues FROM members m
  WHERE EXISTS (SELECT 1 FROM results r WHERE r.player = m.player AND r.created > ${since})`)
q('Share-link opens (human = clicked, preview = pasted into a chat app)', `SELECT kind, sum(human) human, sum(preview) preview
  FROM share_opens WHERE day >= '${sinceDay}' GROUP BY kind`)
q('Retention: matchdays played per player (all time)', `SELECT CASE WHEN d >= 30 THEN '30+' WHEN d >= 14 THEN '14-29' WHEN d >= 7 THEN '7-13'
  WHEN d >= 3 THEN '3-6' ELSE CAST(d AS TEXT) END AS days, count(*) players
  FROM (SELECT player, count(DISTINCT day) d FROM daily_totals GROUP BY player) GROUP BY 1 ORDER BY min(d)`)
q('Daily players (last 14 matchdays)', `SELECT day, count(*) players, sum(played) games, round(avg(played), 2) per_player, sum(perfect) perfect
  FROM daily_totals WHERE eligible = 1 GROUP BY day ORDER BY day DESC LIMIT 14`)
q('Results by game in window', `SELECT game, count(*) results, round(avg(w) * 100) win_pct
  FROM results WHERE created > ${since} GROUP BY game ORDER BY results DESC`)
