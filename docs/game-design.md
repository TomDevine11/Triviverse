# Game Design Conventions

The product-level rules that make the games feel like one. Part of the [Floodlight design system](./design-system.md). This is about *game* design — loops, fairness, reward — where the other docs are about pixels.

---

## 1. The portfolio

| Game | Route | Core loop | Board | Fail state |
|---|---|---|---|---|
| Football Tenable | `/tenable` | Name the top 10 of a list | Pyramid (1-2-3-4) | 3 lives |
| Football Wordle | `/wordle` | Guess the surname letter-by-letter | Letter grid + keyboard | 6 guesses |
| Football TicTacToe | `/tictactoe` | Player fitting row×col categories | 3×3 category grid | 3 lives (solo) / turns (1v1) |
| Teammates | `/teammates` | Guess player from teammate clues | Clue list (drip-fed) | clues run out |
| Career Path | `/career-path` | Guess player from club history | Crest clue list | clubs run out |
| Football Connections | `/connections` | Sort 16 names into 4 groups | 4×4 tile grid | 4 mistakes |
| Higher or Lower | `/higher-or-lower` | Compare two players' stats | Versus cards | 1 mistake ends run |
| Football 501 | `/501` | Darts countdown using career stats | Giant score + input | bust rules / give up |

Two structural outliers by design: **501** (entry screen with solo daily vs local multiplayer, deeper setup flows, custom question builder) and **TicTacToe** (mode menu: solo daily vs 1v1 versus with grid builder). Every other game drops you straight into today's puzzle.

---

## 2. Daily ⇄ Unlimited (the spine of the product)

Every game ships two modes behind the shared `ModeToggle`:

- **Daily** — one deterministic puzzle per day (seeded by day index), identical for all players. Records stats & streaks. This is the retention engine and the *default* on load.
- **Unlimited** — random, replayable practice. Never touches stats.

**Contracts**
- Daily results always offer "Play unlimited" as the post-game action, plus "Come back tomorrow" copy. Never let a finished daily be a dead end.
- Skip/new-question buttons exist only in Unlimited (Tenable, 501 honour this — keep it universal).
- Stats are recorded exactly once, at round end, via `recordResult()` — win/loss games use the `win` variant, score games (Higher/Lower streak, WC Squads count) use `score`.

## 3. Lives, guesses & pressure

- Fixed budgets: Tenable/TicTacToe 3 lives, Connections 4 mistakes, Wordle 6 guesses; Teammates/Career tie guesses to clue count (each miss buys the next clue — failure drips information; this is the product's cleverest fairness mechanic).
- **Escalating tension is shown, not told**: Career Path's remaining-guess colour (grey → amber at 2 → red at 1) is the reference pattern; all budget displays should adopt it.
- **Skip** is always available where a guess can be "spent" deliberately (uses a try, reveals the next clue / passes the turn). Ghost button, never red.
- **Give up** is always available in solo games, always red-outline, always leads to a *full reveal* — quitting still pays out the answers. Multi-step games confirm first (`ConfirmDialog`); instant games (WC Squads) don't need to.

## 4. Fairness rules (hard-won, do not regress)

- **The suggestion dropdown never spoils.** It searches the whole player/club universe (TheSportsDB + local pools), *not* the puzzle's answer set — picking from it only disambiguates spelling. (Documented in code comments in Tenable/TicTacToe; applies product-wide.)
- Surname-only guesses match full names; names normalise accents/case.
- Duplicate guesses are called out ("Already found") and never cost a life.
- Near-miss feedback where the game allows it: Connections' "One away!", 501's bust-with-value (shows the stat that busted you). Prefer informative rejection over a bare ✗.
- Ambiguity is surfaced, not silently resolved (501 asks "which one?" via options list).

## 5. Round end: the reveal contract

Ending a round always pays the player in knowledge:

1. Board settles into its final state (won cells green, missed answers revealed in red-tinted cells).
2. ~2.5s later the **ResultModal** opens (see motion-system.md §2). A "See result" text button remains if dismissed.
3. Modal content order (fixed): hero icon → display headline → one supporting line (always naming the answer where there was one) → `DailyStats` (daily only) → `ShareCard` → primary next action → `MoreGames` → optional full answer list (Tenable lost-state list, 501's every-valid-answer table).
4. The board behind stays explorable — TicTacToe's tap-a-cell-for-all-answers is the gold standard; extend the pattern where it fits.

**Tone**: wins are loud (🏆/🎉 → future custom SVG, display type, green), losses are warm not punishing (💔, red headline, but immediate "the answer was X" + retry path), give-ups are neutral (🏳️, grey).

## 6. Share format (the growth loop)

All share texts follow the Wordle-style contract, built per game:

```
<Game name / puzzle title>
<result line — score, guesses, streak>
[<🔥 day-streak line — only when daily & streak > 0>]

<emoji grid — the round's shape, spoiler-free>

<site URL>
```

- Emoji grids are spoiler-free (colours/shape only, never answer names).
- Grid vocab: 🟩 correct, 🟨 near/mid, 🟥/⬜/⬛ miss or empty, game-specific extras (501's 🎯 checkout).
- One `ShareCard` renders it everywhere: copy (primary), native share, WhatsApp/X/Facebook/Instagram.

## 7. Streaks & stats

- Per-game daily stats in localStorage: played, wins/best, current streak, max streak — shown as the 4-up `DailyStats` grid in every daily result.
- Streaks are the retention currency: surfaced in result modal *and* appended to share text ("🔥 N day streak").
- Unlimited "best" records (Higher/Lower best streak) are per-game local flourishes; they never mix with daily stats.

## 8. Multiplayer conventions (501 versus, TicTacToe 1v1)

Local pass-the-phone play:
- Whose turn it is must be unmissable: pulsing "PLAYER 2'S TURN" (501) / accent-coloured "X's turn" banner (TicTacToe).
- Errors are public and explained: TicTacToe's persistent wrong-guess banner ("X guessed Ronaldo — already used; turn passes to O") is the reference.
- Fair-endings rule: in 501 2-player, player 2 always gets a reply to player 1's checkout (closest-to-zero wins). Comparable "last word" fairness applies to any future turn-based mode.
- Scores across rounds (TicTacToe X·O tally) persist until leaving the grid.

## 9. Per-game identity

Each game = shared skeleton + one accent + **one signature moment** (usually motion):

| Game | Accent | Signature moment |
|---|---|---|
| Tenable | Yellow | Bottom-up pyramid count to your rank |
| Wordle | Blue | Staggered row flip; victory bounce |
| TicTacToe | Purple | Cell claim + winning-line glow |
| Teammates | Pink | Clue drip-reveal |
| Career Path | Cyan | Crest timeline building down the page |
| WC Squads | Amber | Slots filling toward a full 23 |
| Connections | Teal | Group bar slam + colour fill |
| Higher/Lower | Orange | The stat reveal beat before verdict |
| 501 | Red | The giant score popping down toward checkout |

When polishing a game, invest in its signature moment first — that's the memory the player keeps.

## 10. New game checklist

A new mode ships only when it has:
1. Daily (seeded) + Unlimited variants wired to `recordResult`
2. The eight-slot page anatomy (design-system.md §4.2) built from library components
3. An accent hue + Hub card + `GameIcon`
4. A non-spoiling input path (shared `GuessInput` where it's type-a-name)
5. A reveal contract implementation (settle → 2.5s → modal, full answers on loss)
6. A spoiler-free share grid
7. A signature moment on the motion scale
8. EN + ES strings, SEO route entry, and a `MoreGames` presence
