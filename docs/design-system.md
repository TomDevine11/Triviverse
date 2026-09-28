# Triviverse Design System

**Version 2.0 — the locked direction from the July 2026 design rounds.** This replaces the retired "Floodlight" system entirely. Source of truth for how every screen looks, speaks and behaves. Companion docs: [design-tokens.md](./design-tokens.md) (values), [motion-system.md](./motion-system.md) (movement). The reference implementation is `src/pages/Hub.jsx` — when this doc and that file disagree, one of them is a bug.

---

## 1. Identity

**Triviverse** is the umbrella brand — a growing universe of trivia games (mark: the **bolt orbit**, `src/components/BrandMark.jsx`). **Triviverse Football** is its first wing. The brand may expand beyond football, so:

- The **Triviverse chrome** (slim top bar: bolt orbit + TRIVIVERSE FOOTBALL lockup) is football-agnostic purple. It appears on **every page**.
- Football identity lives in the *language*, not the logo: **matchday, lineup, kick off, full time, form, streaks, gaffer**. This vocabulary is the product's voice — use it everywhere it naturally fits, never force it where it doesn't.

Three words that must be true of every screen: **confident** (bold type, decisive colour, no hedging), **alive** (your own data staring back at you — streaks, form, points), **instant** (the whole story visible without scrolling).

What this is not: not neon-arcade (v0's mistake), not desaturated-sterile (v1's mistake). Vivid colour in controlled doses on a deep night canvas.

## 2. Colour roles

Values in [design-tokens.md](./design-tokens.md). The roles:

| Role | Token family | Rule |
|---|---|---|
| The night canvas | `canvas` (+ `.tv-scene` gradient) | Deep violet-navy. Every page sits on it. Never neutral grey, never green. |
| Surfaces | `surface` / `card` / `board` | Chips → boards, each one step lighter. Depth = surface steps + borders. |
| Brand purple | `brand-*` | Primary actions, focus rings, READY/KICK OFF states, brand moments, the wordmark gradient. |
| Success green | `success` | Correct answers, FT, win form dots. Nothing else. |
| Danger red | `danger` | Wrong answers, losses, lives, give-up. |
| Warn amber | `warn` | Streak flames 🔥, perfect-day star, urgency. |
| Game accents | `accent-*` (vivid, one per game) | **Recognition marks only** — allowed slots: motif icon, small badge, progress indicator, subtle gradient, hover state. Never taglines, never page chrome, never semantics. |

Each game route sets `--accent`/`--accent-bright`/`--accent-tint` once at its root via `accentVars()` (`src/design/accents.js`); shared components then theme themselves with `accent-*` utility classes.

## 3. The three backdrops

Every page is built from three named utilities (defined in `index.css`):

1. `.tv-scene` — the ambient night gradient. The page wrapper.
2. `.tv-board` — play-surface interiors (the hub's pitch, game boards): board colour + a breath of brand light from the top.
3. `.tv-wordmark` — display text in the white→purple gradient (wordmarks, matchday numbers).

## 4. Typography

Two faces, unchanged: **Bebas Neue** (`.score-number`) for the scoreboard voice — matchday numbers, big scores, result headlines; never under ~20px. **Inter** for everything else. Signature treatments: black-weight tracked-out uppercase for brand/labels (`font-black tracking-[0.13em]`), tiny uppercase overlines for section labels, `tabular-nums` on every changing number.

## 5. The page contract (every page, no exceptions)

1. **Triviverse chrome bar** at the top: BrandMark + lockup (links home on game pages), page-relevant stats on the right, LanguageSwitcher. Back-navigation lives here.
2. **Zero-scroll rule**: on the hub, *everything* fits the viewport (`h-dvh` flex column, board flexes). On game pages: **the board and the input must be fully visible without scrolling at every viewport size**; history/meta/SEO content may scroll below.
3. **SEO content is sacred**: every page keeps its crawlable copy (about, how-to, FAQ, internal links) — below the fold is fine, deleting is not. The h1 keeps its keywords (sr-only extensions allowed).
4. **Tokens only**: a raw hex, ms, or z-index in a component is a review blocker.

## 6. Iconography

- **Game marks**: `GameMotif` (solid duotone, opacity-layered fills) — the only game icon language. The old thin-line `GameIcon` survives only on un-swept screens and dies with the sweep.
- **Brand**: `BrandMark` (bolt orbit).
- **No decorative emoji as UI** — exceptions: the 🔥 streak flame (part of the retention vocabulary) and flag emoji in dense player lists.

## 7. The retention layer (product spec)

All localStorage, no backend. Implementation + tunable constants: `src/data/dailyStats.js`.

| Mechanic | Spec |
|---|---|
| **Matchday** | `todayIndex() − MATCHDAY_EPOCH` (`matchdayNumber()` in `dailyStats.js`). One shared daily number, everywhere. |
| **Per-game record** | `recordResult(game, won, score?)` — daily mode only, idempotent per day. Feeds streaks, form, points. Every game MUST call it at its daily end. |
| **Form** | `formGuide(game)` — last 5 days as W/L/gap. Rendered as dots (success/danger/inert). |
| **Points** | Play 10 · win 25 · +5×streak (cap 25) · perfect day ×2 (fires once, on the ninth record). Weekly total, resets Monday local. |
| **Perfect day** | All nine dailies in one day. Nine-segment tracker (each segment its game's colour) building to a `warn` star. |
| **KO / FT** | Card state chips: `KICK OFF` (brand purple) → `FT` (success green) once today's daily is recorded. |
| **Share** | The kit format: `TRIVIVERSE · MATCHDAY {n}` / game squares / `🔥{streak} · {pts} pts` / url. Clipboard + "Copied!" flash. |

### 7.1 The finish card (daily result)

Every daily ends in `ResultModal game="<key>"`, which has two columns on desktop and stacks them on mobile:
- **Left:** the verdict. It uses `ResultAnswer` to show the answer at headline size, plus DailyStats. Share and "Unlimited {game} →" use the quiet `RESULT_SECONDARY_BTN` style.
- **Right:** `NextFixture`. It shows YOUR MATCHDAY n/11 with the perfect-day bar, then one **PLAY THIS NEXT** hero game, then four tiles and a link to all games.

The next game is the card's **only** brand-filled button, and the copy is a command. Suggestions only include dailies not yet played today. Clicks fire `upnext_click {from, to, slot}`. 501's match report and the Tic-Tac-Toe 1v1 scoreline use the same right column.

## 8. Voice & microcopy

Second person, present tense, football-fluent, brief. Labels are shouted (`PERFECT DAY`, `KICK OFF`); supporting lines are calm muted greys. Buttons are verbs. Every string goes through `useI18n` — EN and ES ship together, no hardcoded UI text.

## 9. Game-page sweep checklist

Every game-page redesign PR is judged against this list — all boxes or it doesn't merge:

- [ ] Triviverse chrome bar (BrandMark lockup → home, stats, LanguageSwitcher)
- [ ] Board + input fully visible with zero scrolling at 390px and desktop (verified with emulated screenshots)
- [ ] `.tv-scene` page, `.tv-board` play surface, tokens only — no raw hex/ms/z-index
- [ ] `GameMotif` + accent variables set at route root; accent used only in its five slots
- [ ] Retention wired: `recordResult` on daily end; KO/FT vocabulary where state is shown
- [ ] Result flow keeps the `RESULT_REVEAL_DELAY_MS` settle-then-modal signature
- [ ] a11y floor: AA contrast (muted+ on any surface), `focus-visible` brand outline, 44px touch targets, ARIA on inputs/lives, reduced-motion respected
- [ ] All SEO content preserved (crawlable copy, internal links, h1 keywords)
- [ ] i18n complete (EN + ES), no hardcoded strings
- [ ] Verified: tests pass, lint baseline unchanged, desktop + emulated-390px screenshots reviewed

## 10. Governance

New colours, durations, sizes and z-indexes are tokens first, used second. New patterns get named and documented before use. When a game needs something no other game has, ask whether the pattern generalises — if yes, build it shared; if no, build it from existing primitives. The hub is the taste reference: if a new screen doesn't feel like it belongs next to it, it doesn't ship.
