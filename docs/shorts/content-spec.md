# Triviverse Short-Form Content Engine — Phase 2 Content Specification

> Analysis + product spec only. **No new templates are implemented.** Everything below is grounded
> in the actual Triviverse data model (inspected 2026-08-27), not speculation. Where a number is an
> estimate it is labelled *(est.)*. The working `player-between-clubs-v1` renderer is untouched.

---

## 0. The data we actually have (the addressable universe)

Everything is Transfermarkt-sourced through the canonical → derived pipeline. The **qgen registry**
(`scripts/qgen/registry.mjs`) already assembles one unified per-player model. Measured facts:

| Signal | Coverage | Source |
|---|---|---|
| Players in registry | **42,816** | history.{GB1,ES1,IT1,L1,FR1,CL} |
| **Scope** | **Big-5 leagues (PL, La Liga, Serie A, Bundesliga, Ligue 1) + Champions League only** | — |
| Recognisability (`reco`, 0–100) | ≥80: **472** · ≥60: **958** · ≥40: **1,934** · ≥20: **5,145** | recognisability.generated.json |
| Position | **100%** | registry (`pos`) |
| Nationality | **100%** | registry (`nats`) |
| Trophies/honours | **5,642 players**, 815 distinct trophies | football501/honours.generated.json |
| International caps/goals | **20,218 players** | football501/intl.generated.json |
| Per-competition apps + goals | all 42,816 (Big-5 + CL) | history.\*.generated.json |
| Goal leaderboards (record-holders + values) | intl, PL, La Liga, UCL, Bundesliga | canonical/stats.generated.json |
| Chronological careers (club + from/to) | **811 players** (all ≥5 clubs); **31% with complete years** | careers.generated.json |
| Teammate lists | **361 hub players**, avg **28** teammates each (with fame) | teammates.generated.json |
| "Played for both" club pairs (gated) | **134 pairs** across 55 clubs | seo/relations.generated.json |
| Open-ended "Pointless" questions (gated) | **124** (club 78, club-trophy 26, both-leagues 10, nat-league 6, scored-both 4) | pointless/questions.generated.json |
| Top-10 ranked lists (Tenable) | **101** (nationality 42, club 51, competition 8) — caps/goals/apps/€value | tenable.generated.json |
| "Good content" core (reco≥50 **and** ≥1 trophy **and** nationality) | **1,333 players** | derived |

**Three hard truths that shape everything:**
1. **Scope = Big-5 + CL.** A career spent mainly in Portugal/Netherlands/MLS/Turkey has thin stats.
   Recognisable *names* still exist (fame is global) but their **numbers** may be incomplete.
2. **No exact age/DOB and no assists.** We have era (`last` active year) and goals/apps/caps only.
3. **Reliable comparable stats are limited** to the goal leaderboards + caps + per-competition
   apps/goals — not "any stat for any player."

The recognisability model is the spine of the whole engine: it drives **answer selection, clue
ordering, difficulty and rarity** in every format.

---

## 1. CAREER PATH — "Whose career is this?"

**Data available (real):** `careers.generated.json` — 811 players, each `{name, clubs:[{name,from,to}]}`,
≥5 clubs, pre-filtered to `reco≥40`. Chronological order preserved. Years present on **only 31%** of
careers (so year-based variants are a minority).

**Generation strategy**
- Answer = the player. Clues = their clubs revealed **in order**.
- Reveal *earliest → latest* so the path builds toward the obvious final/peak club (natural
  difficulty ramp). Optionally hold back the most-famous club for the reveal beat.
- **Difficulty = f(reco, career "signature")**: a career with a unique fingerprint (e.g.
  Southampton→Liverpool→Barcelona) is easier than a generic mid-table journey.
- Prefer careers where a **famous club sits late** in the sequence (payoff), and where the early
  clubs are distinctive enough to reward knowledge.
- Year variant (the 31% with full years) = a separate, higher-production sub-format later.

**Quality gates** — reject if: reco below the identifiability floor (`reco<45`); career is all
lower-profile clubs (no anchor the audience recognises); two consecutive identical clubs create a
confusing loop unless shown as a return; >8 clubs (won't fit / too noisy → cap the displayed steps
to ~6 with "…"); the player's identity is ambiguous from clubs alone (many journeymen share a path).

**Video structure (~13s)**
```
0.0–1.3  Hook: "WHOSE CAREER IS THIS?"
1.3–7.0  Clubs reveal one-by-one (staggered, ~1.1s each), building suspense
7.0–9.0  Countdown on the final "???" step
9.0–11.0 Reveal the player (pop + underline)
11.0–13  CTA / comment prompt
```

**Engagement**
- *Comment:* "Guessed it before the last club? 👇" / "At which club did you get it?"
- *Share:* "Send this to the mate who says they know football."
- *Follow:* a **daily** "Career of the Day" + an escalating-difficulty run (Mon easy → Sun brutal).

**Volume (est.)** — T1 (excellent, recognisable + clean ramp) **~350** · T2 (valid, needs better club
selection/ambiguity checks) **~350** · T3 (reject: too obscure/ambiguous) **~110**.

**10 hooks:** "Whose career is this?" · "Name him from his clubs." · "This one's harder than it looks."
· "Real fans get this in 3 clubs." · "Bet you can't name him before the last club." · "5 clubs. One
legend. Who?" · "You'll kick yourself." · "Casuals get this at the end. Fans get it at club 2." ·
"Only the last club gives it away." · "Guess the player, hardest at the top."

---

## 2. WHO AM I? — progressive clue reveal

**Data available (real):** the registry gives a rich, per-player clue palette for a large pool
(**reco≥40 = 1,934**; the *good* core is **1,333**): nationality (100%), position (100%), era
(`last`), leagues played in, clubs, per-competition goals/apps, trophies (5,642), international
caps/goals (20,218), recognisability. **Not available:** exact age, assists.

**Clue palette & retrievability (least → most revealing)** — order clues by how much each *narrows
the field*, computed from data:
1. **Nationality** (broad — thousands share it)
2. **Era / decade** (`last` active year)
3. **Position**
4. **A league played in** (PL/La Liga/…)
5. **A major trophy** ("Champions League winner", "World Cup winner")
6. **A specific club**
7. **A hard stat** ("100+ international caps", "top-10 PL scorer")
8. **The most identifying fact** (a signature club/record)

**Generation strategy** — for a chosen answer, emit 4–5 clues sampled so each successive clue cuts the
candidate set roughly in half (compute candidate-set size per clue from the registry → this *is* the
"clue difficulty" estimate). Guarantee the final clue makes the answer unique. Difficulty = how large
the candidate set still is after clue 3.

**Quality gates** — reject if: fewer than 4 non-trivial clues exist; the answer isn't unique even after
all clues (ambiguous); reco too low to be gettable (`reco<45`); every clue is generic (no distinctive
fact). Prefer the **1,333 good core** for T1.

**Video structure (~14s)**
```
0.0–1.3  Hook: "WHO AM I?"
1.3–8.5  Clue 1→4/5 revealed one at a time (~1.6s each)
8.5–10   Countdown
10–12    Reveal (name + optional signature stat)
12–14    CTA
```

**Engagement** — *Comment:* "Which clue gave it away?" *Share:* "Send to someone who reckons they'd
get it in 2 clues." *Follow:* a **5-clue ladder series** — "get it in 1 clue = elite".

**Volume (est.)** — T1 **~700** (good core with clean clue ladders) · T2 **~600** (reco 40–55, thinner
clue sets) · T3 (reject) everything `reco<40`.

**10 hooks:** "Who am I?" · "Get me in 1 clue = certified football nerd." · "4 clues. One player." ·
"Most people need all 5." · "Clue 1 is easy. Clue 1 is a trap." · "Name him before the last clue." ·
"You should get this by clue 3." · "Harder than it sounds." · "Only real fans get this in 2." · "Guess
the mystery player."

---

## 3. PLAYED ALONGSIDE — "Who played with all of them?"

**Data available (real):** `teammates.generated.json` — **361 hub players**, each with ~28 named
teammates (+ nationality, club, fame). The **squad-season data** (`football501/squads.*.generated.json`)
is the fuller co-appearance source that `build:teammates` derives from.

**Generation strategy** — choose a **target answer T** (from the 361 hubs, `reco` high). Pick 4–5 of
T's **most famous** teammates as the clue sequence (all genuinely played with T, by construction).
Order clue players easy→hard or by fame. Difficulty = how "connected" T is (a one-club loyalist is
easy; a well-travelled player who links surprising names is the fun case).

**The ambiguity problem (critical):** many players can share the same 4 teammates, so a naïve chain may
have **multiple valid answers**. The current derived data (361 hub lists) can only *partially* verify
uniqueness. **Recommendation:** build a fuller co-appearance index from the squad-season data so the
generator can prove "exactly one well-known player links all 5 clues." Until then, gate hard: only
publish chains where the clue set is *specific* (mix clubs/eras so the intersection collapses to one
famous name), and prefer targets whose combination is distinctive.

**Quality gates** — reject if: <4 famous teammates for T; the intersection isn't provably unique among
recognisable players; all clue players come from the *same club/season* (trivially "name a teammate").

**Video structure (~14s)** — hook → 5 clue players revealed one-by-one → countdown → reveal T (+ "the
one name that links them all"). This format *thrives on the reveal being surprising*.

**Engagement** — *Comment:* "Did you get the link? 👇" *Share:* "Only a proper fan links these 5." 
*Follow:* "One impossible link every day."

**Volume (est.)** — T1 **~150–250** (distinctive, provably-unique with careful selection) · T2 **~110**
(need the fuller co-appearance index to de-risk) · T3 (reject: ambiguous/trivial) sizeable.
*Volume is capped by ambiguity control, not raw data.*

**10 hooks:** "Who played with ALL of them?" · "Name the link." · "5 players. 1 connection." · "This
link is filthy." · "Bet you can't connect these 5." · "Only football nerds get the link." · "What do
these 5 have in common? (one player)." · "The answer will annoy you." · "Find the missing teammate." ·
"Guess the man who links them all."

---

## 4. GUESS THE CLUB — "Which club is missing?"

**Data available (real):** same `careers.generated.json` (811 careers). Show the career with **one club
hidden**. Loans aren't separately flagged in the derived career (limitation) and years are on 31% only.

**Generation strategy** — hide **one interior club** (never the first/last only — interior is more
guessable from chronology). Pick the hidden club so it's **inferable from context**: the surrounding
clubs' level/era/country point to it (e.g., a Real Madrid → ??? → Real Madrid loop screams a big loan/
buy-back). Difficulty = how constrained the gap is. Show ~5–6 clubs with one "???".

**Quality gates** — reject if: the hidden club is unguessable (surrounding context gives no signal);
the career is generic; hiding creates multiple plausible answers; the player is too obscure to care.
Prefer careers with a **distinctive shape** around the gap.

**Video structure (~13s)** — hook "WHICH CLUB IS MISSING?" → show the career with the gap → countdown →
reveal the club **and** the player.

**Engagement** — *Comment:* "Too easy? Name the player too." *Share:* "Your mate won't get this one."
*Follow:* "A new missing-club puzzle daily."

**Volume (est.)** — T1 **~200–350** (guessable gap + recognisable career) · T2 **~250** · T3 (reject)
the rest. Overlaps the Career Path pool but is a *genuinely different mechanic* (deduce a node, not the
whole identity).

**10 hooks:** "Which club is missing?" · "Fill the gap." · "Name the missing club." · "One club is
hidden. Which?" · "You know this career — which club?" · "The gap is guessable. Prove it." · "Missing
club. Go." · "Real fans fill this in instantly." · "Which club goes in the ???" · "Complete the career."

---

## 5. WINNER STAYS ON — stat-duel streak

**Data available (real):** reliable **comparable** values exist for a *limited but strong* set of
categories: **International goals** (Ronaldo 146, Messi 125…), **PL goals**, **La Liga goals**, **UCL
goals**, **Bundesliga goals** (canonical/stats.generated.json, record-holder leaderboards, ~12–50 names
each), plus Tenable-backed **most-capped** and **top-scorer** lists by nation/club. Per-competition
apps/goals exist for all Big-5+CL players in the registry, so comparisons can extend beyond the top-10.
**Not reliable:** total career goals across all leagues, assists, per-player trophy counts as a "stat".

**Category shortlist (only where data is trustworthy):**
| Category | Source | Pool | Notes |
|---|---|---|---|
| International goals | stats/intl | ~40+ | Great, globally recognisable |
| Premier League goals | stats (GB1) | ~40+ | Strong, English-audience friendly |
| Champions League goals | stats (CL) | ~30+ | High-glamour |
| La Liga / Bundesliga goals | stats | ~20–40 | Good |
| Most international caps (by nation) | tenable | 10/nation × 42 | Reliable, but per-nation |
| Club top scorers | tenable | 10/club × 51 | Reliable, niche per-club |

**Player-selection algorithm (the core ask — not random):**
- Maintain a **champion**; pick each **challenger** to engineer a specific feeling:
  - **Close call:** challenger whose value is within ~10–15% of champion → suspense.
  - **Obvious:** occasionally a clear gap to reward and build confidence (early in a run).
  - **Escalating:** as the streak grows, tighten the value gap and raise the *fame* bar (bigger names).
  - **Brutal elimination:** every ~6–8 rounds, insert a deceptive pair (a famous name who is actually
    *lower*, or a less-glamorous specialist who is *higher*) — the "gotcha".
- Prefer both players **recognisable** (`reco` high) so the viewer has an opinion.
- Ties = correct (data has exact-equal values occasionally).

**Difficulty** = value-gap size × how counter-intuitive the correct answer is (a famous player being
*lower* than expected is "hard").

**Quality gates** — only categories with ≥12 reliable values; drop any player whose value is
suspect/incomplete; never compare across incompatible stats.

**Video structure (~15s, streak-native)**
```
0.0–1.2  Hook + category ("PREMIER LEAGUE GOALS")
1.2–3.0  Player A vs Player B
3.0–5.0  Countdown 3-2-1
5.0–6.5  Reveal + who stays
6.5–…    Next challenger appears, repeat (2–3 rounds shown)
end      "STREAK: 7 — how far did you get?"
```

**Engagement** — *this format is the strongest for retention.* *Comment:* "How far did you get before
you lost? 👇" *Share:* "Beat my streak." *Follow:* "New category every day — build the longest streak."
The **streak is the primary mechanic** (agreed) — it's a natural loop and a comment magnet.

**Volume (est.)** — the content unit is a **category run**, not a discrete question. **5–8 T1 categories**
(intl/PL/UCL goals, most-capped for big nations) each yield effectively unlimited streak videos; the
*distinct pairings* per category number in the hundreds. T2 = per-club/smaller-nation categories
(niche but valid). T3 = anything outside the reliable leaderboards.

**10 hooks:** "Higher or lower — how long can you last?" · "Pick the bigger goalscorer." · "Build the
streak." · "One wrong and you're out." · "Most people lose by round 4." · "Trust your football
brain." · "This category is brutal." · "Who scored more? 3…2…1." · "Keep the streak alive." · "Bet you
lose before 5."

---

## 6. FOOTBALL POINTLESS — rare-but-valid

**Data available (real):** `pointless/questions.generated.json` — **124 gated open-ended questions**
already carrying a full answer list, per-answer `p` (recognisability 0–100), and qgen retrievability
metrics (`comfortable`, `friction`, `effective`). Families: **club** (78), **club-trophy** (26),
**both-leagues** (10), **nat-league** (6), **scored-both** (4). The relations data adds **134**
"played for both" pairs.

**The scoring truth (must be stated honestly):** we have **no survey data**. The `p` value is
*recognisability*, not "% of people who said it". We therefore compute a **Triviverse Rarity Score** —
a transparent, fame-derived approximation where **rarer (lower-fame) valid answers score higher** — and
we must **label it as such** on-screen ("Triviverse rarity score", never "Pointless survey"). Suggested
scoring: `rarity = round(f(100 − reco))` with a curve so a genuinely obscure valid answer (reco≈0)
scores near the top and a superstar scores low — the exact curve is TBD and should be tuned so the
board *feels* like Pointless.

**Generation strategy** — pick questions with a **satisfying spread**: at least a few household-name
answers (so viewers feel clever) *and* a long tail of obscure valid ones (the "nobody got that"
payoff). Show ~5 answers on the reveal board sorted by rarity. Difficulty = how deep you must dig for a
rare answer.

**Quality gates** — reject if: too few famous answers (nobody can start); answer list is *only* obscure
(unfair); any answer is factually shaky (Big-5 scope means a valid non-Big-5 answer could be missing →
**dangerous for "name anyone" framing**; prefer "name a *famous* player who…" framing to avoid "you
missed X" pile-ons). Prefer club/club-trophy/both-leagues families (largest, cleanest).

**Video structure (~16s, longest — thinking time is the point)**
```
0.0–1.5  Hook + question
1.5–4.0  Question fully stated
4.0–11   10-second countdown ("can you think of one nobody else will?")
11–14    Reveal board: 4–5 answers by rarity score
14–16    CTA
```

**Engagement** — *the best commenter format.* *Comment:* "Drop the most obscure valid answer you
know 👇" / "What did you get?" *Share:* "Send this to your most annoying football-know-it-all mate."
*Follow:* "A new 'name one nobody else will' every day."

**Volume (est.)** — T1 **~60–90** (good rarity spread, safe framing) · T2 **~30** (need reframing/curation)
· T3 the remainder (obscure-only or scope-risky).

**10 hooks:** "Name one nobody else will." · "Can you find a rare answer?" · "The obvious answers don't
count." · "Dig deep." · "Everyone says the same 3 names — beat them." · "Your answer is probably too
obvious." · "Name a forgotten one." · "The rarer your answer, the smarter you are." · "Think of one
your mates won't." · "Only legends name the deep cut."

---

## 7. Cross-format comparison

| Format | Data available? | Question volume (est.) | Quality potential | Automation difficulty | Visual potential | Comment potential | Share potential |
|---|---|---:|---:|---:|---:|---:|---:|
| **Winner Stays On** | ✅ strong (5–8 categories) | Very high (streaks) | ★★★★★ | Medium (selection algo) | ★★★★ | ★★★★★ | ★★★★★ |
| **Career Path** | ✅ strong (811) | ~350 T1 | ★★★★☆ | Low | ★★★★ | ★★★★ | ★★★★ |
| **Who Am I?** | ✅ strong (1,333) | ~700 T1 | ★★★★☆ | Medium (clue ordering) | ★★★☆ | ★★★★ | ★★★☆ |
| **Football Pointless** | ✅ (124, no survey) | ~60–90 T1 | ★★★★☆ | Medium (rarity curve) | ★★★☆ | ★★★★★ | ★★★★★ |
| **Guess the Club** | ✅ (811) | ~200–350 T1 | ★★★☆☆ | Low | ★★★★ | ★★★☆ | ★★★☆ |
| **Played Alongside** | ⚠️ partial (361, ambiguity) | ~150–250 T1 | ★★★★☆ | **High** (ambiguity index) | ★★★★ | ★★★★★ | ★★★★★ |
| *player-between-clubs (shipped)* | ✅ (134) | 134 | ★★★★☆ | done | ★★★★ | ★★★★ | ★★★★ |

---

## 8. Content-volume summary (Tier 1 = publish, Tier 2 = needs filtering, Tier 3 = reject)

| Format | Tier 1 *(est.)* | Tier 2 *(est.)* | Tier 3 (reject) | Real cap / bottleneck |
|---|---:|---:|---:|---|
| Winner Stays On | 5–8 categories (∞ streak videos) | per-club/nation niches | non-reliable stats | # of trustworthy leaderboards |
| Who Am I? | ~700 | ~600 | reco<40 | fair clue ladders |
| Career Path | ~350 | ~350 | ~110 | recognisable anchor + clean ramp |
| Guess the Club | ~250 | ~250 | rest of 811 | guessable gap |
| Played Alongside | ~150–250 | ~110 | ambiguous chains | **ambiguity control** |
| Football Pointless | ~60–90 | ~30 | obscure-only/scope-risk | rarity spread + safe framing |

Honest headline: **~1,500–1,800 genuinely good Tier-1 videos** across the catalogue *before* any new
data — plus Winner Stays On's effectively unlimited streak content. That is a **months-to-a-year**
publishing runway at a sane cadence, without scraping the barrel.

---

## 9. Unified difficulty model

Four levels, computed from data (not hand-set):

| Level | Rule of thumb |
|---|---|
| **EASY** | answer/players `reco≥70`; large value gaps; distinctive careers; ≤3 clues needed |
| **MEDIUM** | `reco 50–70`; moderate gaps; a couple of misdirections |
| **HARD** | `reco 40–55`; close value gaps; deep clue sets; counter-intuitive answers |
| **IMPOSSIBLE** | `reco 30–45` **or** deliberately deceptive (a famous name that's the *wrong* pick) |

Per-format difficulty inputs: **Career Path/Guess-the-Club** = anchor-club fame + career distinctiveness;
**Who Am I** = candidate-set size after clue 3; **Winner Stays On** = value-gap × counter-intuitiveness;
**Pointless** = depth to a rare answer; **Played Alongside** = intersection tightness. The engine takes
`difficulty=hard` and filters the candidate set accordingly.

---

## 10. Deduplication & feed diversity

- **Exact dedup:** stable content hash per spec (already done for the shipped format via slug).
- **Near-dup:** cap reuse of any single **entity** — a player as answer, a club, a club-pair, a
  category — with a rolling cooldown (e.g., no player as answer more than once per N videos; no club in
  more than X% of a batch).
- **Fact fatigue:** track which *facts* have been used (e.g., "Ronaldo Man Utd↔Real" appears across
  several formats) and rotate so the feed doesn't recycle the same trivia in different skins.
- **Format interleave:** a publishing scheduler should alternate formats and difficulty so the feed
  feels varied even day-to-day.
- **Answer-diversity within Pointless/Winner:** spread nationalities/eras/leagues across a batch.

---

## 11. Data-quality gates (what's dangerous for public content)

| Risk | Why it's dangerous | Gate |
|---|---|---|
| **Big-5 scope** | "Name **anyone** who…" can miss a valid non-Big-5 answer → "you forgot X" pile-ons | Frame as "name a **famous/known** player…"; never claim completeness |
| **Incomplete careers/years** | 69% of careers lack full years | Don't show years unless complete; don't imply exact chronology gaps |
| **Loans not flagged** | a loan looks like a transfer | Avoid loan-dependent claims; treat as "played for" only |
| **Club naming/aliases** | same club under variant names | Use canonical club IDs + `nameFixes`; render canonical display name |
| **Ambiguous answers** | multiple valid answers presented as one | Uniqueness check per question (esp. Played Alongside) |
| **Stat reliability** | assists/total-career-goals not sourced | Only use goal-leaderboard / caps / per-comp apps-goals |
| **Retired vs active era** | mixing eras oddly | Use `last` to set era; keep comparisons era-aware where it matters |
| **Recognisability drift** | fame changes over time | `reco` is a snapshot; re-run before big pushes |

**Golden rule:** a viewer must never catch us in a factual error. Prefer "a famous player" framing and
uniqueness checks over maximal coverage.

---

## 12. Missing data worth adding to the canonical/derived layer

Prioritised by content value:
1. **Full co-appearance index** (from squad-season data) → makes **Played Alongside** ambiguity-safe and
   unlocks its Tier-1 volume. *Highest leverage.*
2. **Complete career years** (backfill the 69% missing) → unlocks year variants of Career Path/Guess-the-
   Club and safer chronology.
3. **Loan flags** on career stints → richer, safer Guess-the-Club.
4. **A curated per-format "answerability" score** (extend qgen retrievability to each format) → cleaner
   Tier-1 selection.
5. *(Optional)* Broaden scope beyond Big-5 for **names only** (not stats) to reduce Pointless scope-risk.
6. *(Optional, licensing-gated)* player photos + club badges for richer reveals — **legal review first**
   (Transfermarkt-id crest URLs; see Phase-1 notes).

*Not needed / not worth it:* assists, exact DOB, minute-level stats — no reliable source and low
content ROI.

---

## 13. Recommended implementation priority

1. **Winner Stays On** — best retention + comment/share, data is ready, streak loop is native to the
   platform. Build the selection algorithm first (it's the moat).
2. **Career Path** — data ready, low automation risk, strong shareability, reuses the shipped renderer's
   design language.
3. **Who Am I?** — large high-quality pool, great "which clue got you" comments.
4. **Football Pointless** — elite commenter format; needs the rarity-curve + safe framing, but data's
   there. Ship with the honest "Triviverse rarity score" label.
5. **Guess the Club** — cheap add on top of the Career Path pipeline.
6. **Played Alongside** — highest ceiling for "wow" reveals, but **gate on building the co-appearance
   index first**; until then, hand-curate a small Tier-1 set.

---

## 14. Proposed architecture — unified short-form content engine

```
                         CANONICAL DATA  (Transfermarkt → canonical/*)
                                   ↓
                          DERIVED DATA
        (qgen registry · careers · teammates · stats leaderboards ·
         honours · intl · relations · recognisability · pointless · tenable)
                                   ↓
                    ┌──────── CONTENT GENERATORS ────────┐
                    │  each: select() · validate() ·      │
                    │  scoreDifficulty() · dedupe() ·     │
                    │  toContentSpec()                    │
                    └─────────────────────────────────────┘
        ┌──────────┬──────────┬────────────┬────────────┬───────────┐
        ↓          ↓          ↓            ↓            ↓           ↓
   Career     Who Am I   Played       Guess the    Winner      Pointless
    Path                 Alongside      Club        Stays On
        └──────────┴──────────┴────────────┴────────────┴───────────┘
                                   ↓
                    CONTENT SPEC  (uniform JSON: {format, difficulty,
                       entities, beats[], metadata, hooks[]})
                                   ↓
                     VIDEO TEMPLATE  (one renderer per format;
                        reuses lib/brand + lib/render from Phase 1)
                                   ↓
                                 MP4  + metadata sidecar
```

**Design principles (carried from Phase 1):**
- Generators are **pure functions of the derived data**; no second truth source.
- Every generator emits the **same `ContentSpec` shape** (`format`, `difficulty`, `entities`,
  ordered `beats`, `hooks`, `metadata`) so scheduling, dedup and QC are shared, and each renderer only
  cares about drawing beats.
- **Difficulty + rarity ride the recognisability model**, uniformly, across all six formats.
- The **quality gate is upstream of rendering** — a spec that fails validation never becomes a video
  (as the shipped pipeline already does).
- A single CLI eventually drives it:
  `generate --format winner-stays-on --difficulty hard --category premier-league-goals --count 100`.

---

### Bottom line
The knowledge engine can support a **genuinely diverse, high-quality** six-format catalogue — an
estimated **~1,500–1,800 Tier-1 discrete videos plus unlimited Winner-Stays-On streaks** — *without*
new data. The two investments that most raise the ceiling are the **co-appearance index** (unlocks
Played Alongside) and **career-year backfill**. Recommended build order leads with **Winner Stays On**
(retention) and **Career Path** (cheap, strong), because the goal is maximum *good* content, not maximum
videos.
