# Design Audit — July 2026

> **Point-in-time snapshot.** This audit predates the removal of the World Cup
> Squads game (2026-07-30) — §9 and any "nine games / all nine" counts are
> superseded; the hub now has **eight** games. Kept as a dated design record.

Every page scored 1–10 across eight criteria, grounded in the actual markup (file references throughout). Part of the [Floodlight design system](./design-system.md) docs.

**Scoring lens:** 5 = competent generic; 7 = good, consistent, on-brand; 9+ = premium game UI. Scores are deliberately hard — the target is 8+ across the board after the token/redesign work.

| Criterion | What it measures |
|---|---|
| Hierarchy | Is the board the star? One focal point? |
| Layout | Structure, rhythm, anatomy compliance |
| Typography | Scale use, display vs UI casting |
| Colour | Token-worthiness, semantics vs identity, contrast |
| Interaction | Feedback, affordances, states, keyboard |
| A11y | Contrast, ARIA, focus, targets, reduced motion |
| Mobile | 375px experience, thumb reach, touch targets |
| Polish | The premium delta: motion, detail, delight |

---

## 1. Hub (`src/pages/Hub.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 6 | 6 | 7 | 4 | 5 | 6 | 7 | 4 | **5.6** |

The shopfront, and currently the weakest expression of the brand. Bebas H1 + overline welcome is right. But the game cards are the definition of generic Tailwind: `bg-gray-900 border-gray-800 rounded-xl p-6` with all nine accents hidden behind hover (`Hub.jsx:12–20`) — on touch devices the accents effectively don't exist. The → glyph is a text character, not a crafted affordance. Cards have no press state, no entrance stagger, no personality difference between a darts game and a wordle. About/FAQ block is appropriately quiet. **Verdict: functional directory, not a game lobby. Highest-priority redesign after tokens.**

## 2. Football 501 (`src/games/football501/Football501.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 8 | 7 | 8 | 6 | 8 | 5 | 7 | 7 | **7.0** |

The flagship, and it shows. The giant countdown with range-based colour (`getScoreColor`, line 40) and `score-pop` is the best hero in the product; checkout-zone pulse adds real tension. Live strategy `InfoBox` row is smart. Entry/setup flows are clear. Weaknesses: purple used as secondary accent on entry cards (line 314) though red is 501's Hub identity — the game never uses its own accent; win screen is a long scroll rather than the ResultModal pattern the other 8 games share (structural inconsistency); suggestion dropdown has no ARIA; multiplayer scoreboard cards are plain. Custom builder is dense but honest about validity — good.

## 3. Football Tenable (`src/games/tenable/FootballTenable.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 8 | 8 | 7 | 6 | 8 | 5 | 7 | 8 | **7.1** |

Best-in-product moment: the bottom-up pyramid pulse counting to your rank (lines 111–133). Anatomy compliance is perfect — this is the reference implementation of the eight-slot skeleton. `CategoryIcon` on the question card is the premium icon tier working. Weaknesses: yellow accent (its Hub identity) appears nowhere in-game; wordmark hardcoded "TENABLE" (line 323) skips i18n; pyramid cells at `w-16` squeeze long names to 10px text; hearts are emoji-glyph `♥` spans with no `aria-label`; give-up confirm is a duplicated inline modal.

## 4. Football Wordle (`src/games/wordle/FootballWordle.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 8 | 8 | 7 | 7 | 8 | 5 | 8 | 8 | **7.4** |

The most polished game. Staggered flip, victory bounce, keyboard state colouring, and the vw-clamped tile sizing for long surnames (line 185) is genuinely clever responsive work — the reference for wide boards. Weaknesses: tile/keyboard colours are hex literals in the component (lines 15–19) rather than shared tokens; keys are `w-8 h-11` on mobile (below 44px target); no `aria-live` announcing verdicts; blue accent identity absent in-game.

## 5. Football TicTacToe — solo (`src/games/tictactoe/FootballTicTacToe.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 7 | 7 | 6 | 6 | 8 | 5 | 7 | 7 | **6.6** |

Dense but well-handled: category headers with icons, selected-cell ring, post-game tap-any-cell-for-answers (the explorable-board gold standard, lines 433–465). Weaknesses: yellow/blue row/col header colours collide with Tenable's yellow and Wordle's blue accents while meaning something entirely different — a semantics/identity violation; 🔍 emoji as affordance hint; grid needs `overflow-x-auto` at 320px; give-up modal duplicated from Tenable; purple identity absent.

## 6. TicTacToe menu + 1v1 (`TicTacToeMenu.jsx`, `TicTacToeVersus.jsx`, `GridBuilder.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 7 | 7 | 6 | 6 | 8 | 5 | 7 | 6 | **6.5** |

Menu is clean (Mark glyphs used well). Versus mode's persistent wrong-guess banner explaining *why* (lines 190–206) is the best multiplayer feedback in the product; winning-line green fill is right. Weaknesses: X=red/O=blue adds two more accent-coloured meanings to a game whose identity is purple — three colour systems on one screen; wordmark becomes "1v1" (inconsistent with wordmark conventions); GridBuilder is functional but visually a form, not a builder — no drag affordance, palette chips are plain; no round-win celebration beyond the banner.

## 7. Teammates (`src/games/teammates/GuessByTeammates.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 7 | 8 | 7 | 5 | 7 | 5 | 8 | 6 | **6.6** |

Clean drip-feed loop, perfect anatomy compliance, clue-reveal motion present. Weaknesses: guesses-left is plain grey text in the status slot — no urgency escalation (Career Path has it; this doesn't); pink identity appears nowhere — this is the most visually anonymous game in the set; clue rows are flag + name only, no visual richness (team is hidden until game end, fine, but the rows could carry more character).

## 8. Career Path (`src/games/careers/CareerPath.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 7 | 8 | 7 | 6 | 8 | 5 | 8 | 7 | **7.0** |

Near-twin of Teammates but better: crest icons give the clues real identity, the escalating guesses-left colour (line 109: grey→amber→red) is the tension-display reference, and skip goes red on the last guess (line 195–199) — thoughtful. Two-column wrap for long careers is sensible. Weaknesses: cyan identity absent; clue list reads as rows, not as a *career timeline* (its signature moment is underexploited); shares Teammates' i18n keys for its result copy (`teammates.mysteryWas`, line 217) — works but smells.

## 9. World Cup Squads (`src/games/wcsquads/WorldCupSquads.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 6 | 7 | 6 | 6 | 7 | 5 | 7 | 5 | **6.1** |

Solid loop, weak board. The 23 slots are the game, but unfound slots are a near-invisible `•` in `text-gray-700` on `bg-gray-900` (lines 174–178) — the board reads as empty grey noise rather than 23 tantalising hidden players. No position grouping (GK/DEF/MID/FWD would make the board scannable and the recall game fairer). No progress celebration between 0 and 23. Amber accent only on the picker year. Squad picker cards are plain text buttons — no flags/kit colours, a missed identity moment.

## 10. Football Connections (`src/games/connections/FootballConnections.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 7 | 8 | 6 | 7 | 7 | 5 | 8 | 6 | **6.8** |

Faithful, competent NYT-Connections adaptation; group bars with CategoryIcon are good. Weaknesses: no solve animation — the group bar just appears where NYT's tile-gather-and-slam is the entire dopamine hit of this genre (signature moment missing); selected tiles are grey-fill + green border (muted vs the teal identity); lives are four tiny `w-2.5` grey dots — third competing lives design, and near-invisible; "one away" message is plain text with no motion.

## 11. Higher or Lower (`src/games/higherlower/HigherLower.jsx`)

| Hierarchy | Layout | Typography | Colour | Interaction | A11y | Mobile | Polish | **Avg** |
|---|---|---|---|---|---|---|---|---|
| 5 | 6 | 6 | 5 | 6 | 5 | 7 | 4 | **5.5** |

Weakest game screen. This genre lives on the reveal beat — number counts up, beat of suspense, verdict — and here the value just appears (`showValue` flips, line 20–23) with a static "Correct!" text line. The streak (the actual score) is a small `text-2xl` above the cards instead of the hero. "More/Fewer" buttons are green/blue — blue meaning "fewer" is arbitrary semantics and collides with Wordle's identity. Cards are plain grey boxes for what should feel like a duel. Orange identity only on the stat picker hover. **Verdict: biggest gap between genre potential and current execution.**

## 12. Cross-cutting components

- **ResultModal** (`components/ResultModal.jsx`) — right pattern, right motion; missing Escape/focus-trap/`aria-labelledby`. 7/10.
- **ShareCard** — complete, works; primary copy button colour-collides with in-game primaries when both visible. 7/10.
- **ModeToggle / LanguageSwitcher** — consistent pair; both ~26px tall (touch target miss); switcher's fixed `z-40` ties ResultModal. 6/10.
- **DailyStats / MoreGames** — clean, on-pattern. 7/10.
- **Route loading state** (`App.jsx:19`) — `bg-gray-950` (blue-black) flashes against the `#080c08` green-black body: visible background jump on every game load. 3/10.

---

## Recurring patterns (the de-facto system — protect these)

1. Eight-slot page anatomy on every game (header → toggle → context card → board → input → meta → actions → history)
2. The 2.5s settle-then-modal reveal contract, with "See result" fallback
3. Overline section labels (`text-xs uppercase tracking-widest text-gray-500`)
4. `GuessInput` block: surface field, green focus border, spinner, dropdown with flags, shake on wrong
5. Give-up as full-width red-outline button; skip as ghost
6. `flash-valid`/`flash-invalid` history rows, `divide-y` bordered lists
7. Bebas for wordmarks/scores/headlines, `tabular-nums` everywhere
8. Non-spoiling suggestion search (game-design.md §4)

## Systemic inconsistencies (ranked by user-visible damage)

1. **Accent identity exists only on the Hub.** All nine games are green+grey inside; Hub promises nine personalities the games don't deliver. (Worst offenders: Teammates, Higher/Lower.)
2. **Three lives displays**: red hearts (Tenable, TTT) vs grey dots (Connections) vs text (Teammates/Career, with escalation only in Career).
3. **Colour meaning collisions**: yellow/blue as TTT axis colours; blue as "fewer"; purple as generic "second option" accent in 501 + TTT menus; X/O red/blue — all while those hues are other games' identities.
4. **501's win screen bypasses ResultModal** — the only game with a different end-of-round structure.
5. **Blue-grey Tailwind `gray-*` surfaces on a green-black canvas** — every card subtly fights the background temperature; plus `theme-color` meta is `#0a0a0a` (third black) and route loading is `gray-950` (fourth).
6. **Radius drift**: primary buttons are `rounded-lg` in modals but `rounded-xl` in-game; same component, two radii.
7. **Section rhythm wobble**: header margins alternate `mb-5`/`mb-6` across games with no rule.
8. **Duplicated give-up ConfirmDialog** (Tenable + TTT) already diverging from ResultModal's overlay treatment (`bg-black/60`, no blur vs `/70` + blur).
9. **Emoji as system icons** (🎯🎲🛠️⚔️👥🔍🏆💔) — per-platform rendering, caps premium feel.
10. **Z-index ad hoc**: 10/20/30/40 assigned per-file; LanguageSwitcher ties ResultModal at 40.

## A11y debt (product-wide, none game-specific)

- `text-gray-700` used for rules/meta text on near-black: ~2.4:1, fails WCAG AA (501 rules row, Tenable counts, several hints)
- No `prefers-reduced-motion` handling anywhere
- No visible `focus-visible` styles beyond browser defaults on most buttons/tiles
- Combobox/listbox ARIA missing on all 7 suggestion inputs; no `aria-live` for verdicts
- Lives/hearts/dots carry no accessible text
- ModeToggle, keyboard keys, language switcher below 44px touch targets
- Modals: no focus trap, no Escape (ResultModal), inline confirms lack `role="dialog"`

## League table

| Page | Avg | Priority |
|---|---|---|
| Higher or Lower | 5.5 | 🔴 Redesign (with Hub) |
| Hub | 5.6 | 🔴 Redesign first |
| WC Squads | 6.1 | 🟠 Board rework |
| TTT menu/1v1 | 6.5 | 🟠 Colour rationalisation |
| TicTacToe solo | 6.6 | 🟡 Token pass |
| Teammates | 6.6 | 🟡 Identity pass |
| Connections | 6.8 | 🟡 Signature moment |
| Career Path | 7.0 | 🟢 Token pass |
| Football 501 | 7.0 | 🟢 Modal alignment |
| Tenable | 7.1 | 🟢 Token pass |
| Wordle | 7.4 | 🟢 Token pass |

**Product-wide average: 6.6.** Foundation is genuinely good — anatomy, motion instincts and fairness UX are above average for the genre. What's missing is the token layer (colour temperature, accents-in-game, rhythm), the a11y floor, and three targeted redesigns (Hub, Higher/Lower, WC Squads board).
