# The social layer — sharing, challenges, streaks, leagues

*Built 2026-09-30 on `feat/social-retention`. Why: GA4 (Sept 2026) showed the audience is UK
office workers playing on desktop at lunchtime (weekday traffic ≈ 70%, 13:00 peak, a Microsoft
Teams referral), yet only **7 shares in 28 days** — and every share link pointed at
`share.triviverse.com`, which **has no DNS record**, so shared links were dead. The goal is the
two loops search traffic can't provide: **spread the word** and **come back tomorrow**.*

## What exists

| Feature | Where | Needs the API? |
|---|---|---|
| Pasteable result text (emoji grid + challenge link) | finish card → `components/social/SharePanel` | no |
| WhatsApp / Teams / image / link buttons | same | no |
| Challenge links — `?c=` carries the sharer's result | `social/challenge.js`, `ChallengeBanner` | no |
| Head-to-head on the finish card, rivals table (W/D/L) on /me | `ResultSocial`, `pages/Me` | no |
| "VS" chip on hub tiles when a mate's result is waiting | `pages/Hub` | no |
| Share my matchday (whole day, one message, day-challenge link) | `DayShareSheet` | no |
| Matchday streak (any daily) + **streak freezes** (1 per 7 days, max 2) | `social/streak.js` | no |
| Streak-at-risk hub state, countdown to next matchday | `pages/Hub`, `ResultSocial` | no |
| Calendar reminder (.ics weekly RRULE, Google, Outlook web) | `ReminderSheet` | no |
| 24 badges (trophy cabinet) + unlock toast | `social/badges.js`, `BadgeToast` | no |
| Records (per game: played, win %, best, avg, best percentile) | `/me` | no |
| 16-week calendar heatmap (perfect days gold, frozen days outlined) | `/me` | no |
| Move stats between devices (long code offline, 6-char code online) | `social/transfer.js`, `/me` | optional |
| "You beat 64% of today's players" + how-everyone-did chart | `ResultSocial` | yes |
| Live "N playing today" | hub overline | yes |
| **Private leagues** — weekly table, today grid, all-time, champion | `/leagues`, `/leagues/:code` | yes |
| League standing on the hub and finish card | `pages/Hub`, `ResultSocial` | yes |
| **World leaderboard** — today / this week / all-time, top 50 + your neighbourhood | `/world`, `pages/World` | yes |
| Short share links `/c/ABC1234` | `social/shortLinks.js` | yes (falls back to long) |
| Share images rendered on triviverse.com (`/s/…`, `/og/*.png`) | `worker/og.js` | yes (Worker) |

Everything in the top half is localStorage + URL payloads and works with the API down.

## Architecture

- **Game content stays static** (ARCHITECTURE.md is unchanged on that). The Worker + D1 hold
  **player state only**: `players`, `results`, `leagues`, `members`, `transfers`, `links`
  (`worker/migrations/`).
- `worker/index.js` runs only for `/api/*`, `/s/*`, `/c/*`, `/og/{g,d}.png`, `/og/l/*`, `/me`,
  `/leagues*` (`wrangler.jsonc` → `assets.run_worker_first`). Everything else is still served
  straight from `dist/` by the platform.
- Games record exactly as before (`recordResult`). `dailyStats.onRecorded` feeds the social
  layer (`social/results.js`); the finish card adds the score (`card.won` + `card.score`) via
  `finalizeResult`. One scoring model for all 11 games: `social/scoring.js` (mirrored in the
  Worker's percentile SQL).
- Identity: a private device id (write credential, never shared) + a public id (in links and
  tables) + a nickname. No accounts. `/api` never returns private ids (smoke-tested).
- Outcomes are client-reported, but **points are server-computed** (`serverPoints` in
  worker/api.js mirrors the dailyStats economy; the client's `p` is ignored, and the perfect-day
  bonus is awarded by the server when the 11th daily lands). That caps what a forged request can
  claim at what a real perfect day earns.
- The public world table (`worldStandings`) also drops any player-day of 6+ dailies that all
  landed within two minutes (not humanly playable — a script), and never shows `players.hidden`.
  Moderate a nickname with `npm run world-hide -- "Name"` (`--unhide`, `--list`, `--local`).

## Run it locally

```
npm run dev:social           # builds dist/ if needed, local D1, wrangler :8787 + vite :5173
npm run dev:social -- --fresh   # wipe the local database first
npm run social-smoke         # API/share/image checks against :8787 (or pass a URL)
```
On `/me`, dev builds show a "load demo history" button (10 weeks of fake play, rivals, badges).

## Production

Live since 2026-10-03. triviverse.com is the `triviverse` Cloudflare Worker (static
assets + this script), deployed automatically by Cloudflare Workers Builds on every
push to `main` — Render only redirects to it now. The production D1 database is
`triviverse-social` (id in `wrangler.jsonc`); schema changes go in `worker/migrations`
and are applied with `npx wrangler d1 migrations apply triviverse-social --remote`
*before* merging code that needs them. The privacy policy covers this data (sections
1, 3, 6, 7). Old `share.triviverse.com/…` links stay dead. After a deploy:
`npm run social-smoke -- https://triviverse.com`.

## Measure

GA4 events: `share {game, method}`, `challenge_open {kind, game}`, `daily_score {game, won, score}`,
`reminder_set {method, time}`, plus the existing `game_complete` / `upnext_click`. Success =
shares/day and returning-user share up; D1 gives league counts directly.
