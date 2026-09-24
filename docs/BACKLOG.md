# BACKLOG.md — work queue and findings record

The prioritised queue Claude pulls from, and the durable record of what the traffic data has
already proven or ruled out. Claude maintains this file: continuously **generating**
worthwhile work (not only what Tom provides) and ranking it by the [VISION.md](../VISION.md)
§19 priority stack and expected impact. Committed so state survives sessions.

**Read the findings sections before re-investigating anything.** Several apparent
opportunities have been diagnosed as structurally capped and deliberately closed; they are
written up here so they are not reopened on a hunch.

## Columns
- **ID** — `B-###`, monotonic, never reused.
- **Title** — imperative, specific.
- **Class** — `internal` | `user-facing` (classify conservatively; see CLAUDE.md).
- **Value** — one line: the user/engineering/growth benefit, tied to a VISION priority.
- **Source** — how it was found: `bug` · `test-gap` · `arch-invariant` · `layer-exception`
  · `gsc` · `ga4` · `perf` · `sec` · `dep` · `data-quality` · `product` · `growth`
  · `retention` · `monetisation` · `idea` (Claude-originated).
- **Effort** — `S` | `M` | `L`.
- **Priority** — `P0` broken/blocker · `P1` high value · `P2` normal · `P3` nice-to-have.
- **Status** — `todo` · `in-progress:<branch>` · `in-review:#<pr>` · `done` · `dropped`.

## Scoring — pick next = highest
1. **Priority tier** first (P0 → P3).
2. Then **priority-stack rank** of the item's VISION §19 category (growth > data-integrity >
   UX > retention > monetisation > expansion > internal), adjusted by evidence from the
   latest GA4/GSC read.
3. Then **value ÷ effort**.
4. Then age.
Skip any item whose likely files overlap an open PR (`gh pr list`).
Do not spend large capacity on low-value technical polish while meaningful
growth/product/revenue items remain.

## Discovery sources (refresh when the queue is thin)
Observed bugs · test gaps · architecture invariants · layer-guard exceptions
(`src/data/layers.js`) · Search Console (rankings, striking-distance, cannibalisation) · GA4
(traffic, engagement, retention, channels) · performance · security · dependencies · data
quality/coverage · product observations · growth opportunities · retention opportunities ·
monetisation opportunities · Claude-originated ideas. Respect the VISION §20a beachhead rule.

## Lifecycle
Append discovered items as `todo` (dedupe first). `in-progress:<branch>` on start;
`in-review:#<pr>` when a user-facing PR opens (also add to the review queue); `done` on
internal-merge or when Tom merges a user-facing PR; `dropped` (with a one-line reason) if
obsolete. Never delete rows — this is an audit trail.

## Seed items (evidence-based, from the 2026-08-16 baseline — hypotheses to validate)
> These are candidate starting points, not commitments. The loop re-ranks them against fresh
> data. User-facing items ship only via PR for Tom's review.

| ID | Title | Class | Value | Source | Effort | Priority | Status |
|----|-------|-------|-------|--------|--------|----------|--------|
| B-001 | Align CI + existing workflows to Node 22.12 (match Render) | internal | consistent runtime/CI | idea | S | P2 | todo |
| B-002 | Investigate pushing "football tenable" from ~#10 into top-5 (title/schema/content/links) | user-facing | biggest current organic lever | gsc | M | P1 | done (#25 merged — misspelling cluster covered; ranking effect not yet measurable, see B-011) |
| B-003 | Diagnose why 501 under-ranks its engagement; propose ranking plan | user-facing | high-demand page, near-zero visibility | gsc | M | P1 | todo |
| B-004 | Resolve "triviverse" brand-SERP cannibalisation across 7 pages | user-facing | brand clarity (VISION §6) | gsc | M | P2 | todo |
| B-005 | Investigate lifting AI-assistant discoverability (already ~25% of sessions) | user-facing | grow a proven channel | ga4 | M | P1 | todo |
| B-006 | Retention audit: which games drive return visits; propose stickiness bets | user-facing | returning users ~15% | ga4 | M | P2 | todo |
| B-007 | Add nickname/mononym alias layer (close the last name-matching gap) | user-facing | data integrity (VISION §8) | data-quality | M | P2 | todo |
| B-008 | Assess multi-mode architecture readiness (routing/data-model/brand generality) | internal | cheap future modes (VISION §20a) | arch-invariant | L | P3 | todo |
| B-009 | Fix failing seo.test.js cases (length limits + archive-page JSON-LD) | user-facing | green test baseline; the gate must pass to mean anything | test-gap | S | P0 | done (#14) |
| B-010 | Drive eslint to zero (~24 pre-existing errors, mostly react-hooks/set-state-in-effect), then remove `continue-on-error` in ci.yml to make lint a hard gate | internal | real server-side lint gate | test-gap | M | P1 | todo |

## Discovered 2026-08-16 (session 2)

| ID | Title | Class | Value | Source | Effort | Priority | Status |
|----|-------|-------|-------|--------|--------|----------|--------|
| B-011 | **Connect GA4 + Search Console (and Bing Webmaster) to the runner environment** | internal | unblocks all evidence-based prioritisation (VISION §18/§20) | sec | S | P0 | done (credentials supplied; GA4 + GSC + Bing all connected) |
| B-012 | Resolve "football guessing game" cannibalisation between `/` and `/teammates` | user-facing | two pages compete for one real query, splitting ranking signal | seo-report | S | P1 | todo (unblocked — #25 merged) |
| B-013 | Fix SERP-truncating titles/descriptions + H1↔route-name mismatches (7 flags) | user-facing | CTR + canonical-label consistency across 5 pages | seo-report | S | P2 | todo (unblocked — #25 merged) |
| B-014 | "Career Path Answers" autocompletes to non-football intent — rename or re-anchor to football | user-facing | ambiguous name wastes an answers page that should capture football intent | seo-report | S | P2 | todo (unblocked — #25 merged) |
| B-015 | Ship `llms.txt` + a machine-readable game index for AI-assistant discovery | user-facing | AI assistants are already ~25% of sessions — cheap, reversible bet on a proven channel | growth | S | P1 | in-review:#28 |

## Discovered 2026-09-12 (live GA4 + GSC read)

> **Milestone 1 is reached.** 10,437 pageviews in the last 28 days vs 5,479 in the prior 28
> (+90%; sessions +216%, games completed +138%). The §18 baseline ("~5,500 in the most recent
> 28 days") is a month stale. This unlocks VISION step 4 (advertising) and relaxes the §20a
> beachhead gate — though see B-021 for why holding on a third mode is still the better bet.

**Three corrections to earlier reasoning, from this session's data:**

1. **The Tenable cluster's low CTR is a position problem, not a snippet problem.** The site's
   own position→CTR curve is 5.82% at positions 5–7 and 1.93% at 7–10. The cluster converts at
   1.8% at average position 8.4 — i.e. exactly its expected rate, on both mobile and desktop.
   Rewriting titles was the wrong diagnosis; B-002's original top-5 framing was right. The
   21,387 impressions sitting in the 7–10 band are worth ~+830 clicks/90d if moved to 5–7.
2. **/501 does not under-rank — it is a Bing success and a Google absence.** 567 of its 801
   sessions come from Bing, 57 from Google. GSC's "24 clicks / position 22.7" only ever
   described Google. Total Google impressions for every 501-style query is ~84 in 90 days.
3. **B-011 was never fully blocked.** GA4 and Search Console both authenticate and produced
   every figure above. What is genuinely missing is Bing (B-016).

| ID | Title | Class | Value | Source | Effort | Priority | Status |
|----|-------|-------|-------|--------|--------|----------|--------|
| B-016 | **Connect Bing Webmaster Tools** — Bing-powered search is 1,116 sessions/90d (33.8%), statistically level with Google (1,127, 34.2%), and entirely unmeasured: no queries, rankings, impressions or CTR | internal | a third of all traffic is currently invisible; every SEO call to date was made on half the picture. Free and quick | ga4 | S | P1 | todo |
| B-017 | Enable AdSense (footer slots already built + mounted; `ADS_ENABLED=false`, placeholder publisher id) — measure engagement before/after | user-facing | first actionable revenue since the milestone unlocked VISION step 4. Honest expectation ~£20–60/mo at current volume, not £100 | monetisation | S | P1 | blocked-on-tom (needs an AdSense account; Claude must not create accounts or handle the publisher id) |
| B-018 | Re-run stuck CI, then get #28/#31 merged — the red `eval` on both was a transient GitHub GraphQL 503 on 17 Aug, never retried; `gate` was green all along | internal | two PRs sat blocked ~4 weeks on an infrastructure blip, one of them the Tenable ranking work | bug | S | P1 | done (checks re-run 2026-09-12 — #28 now fully green and mergeable; #31 needs Tom's GitHub approval, his "ship it" was only in chat) |
| B-019 | Answer the sharper 501 question: why does Bing rank /501 while Google barely serves it? Check indexation, internal links, canonical and content depth against /tenable | user-facing | reframes B-003 into something answerable; 501 has proven engagement (395s, 800 landings) so the product is not the constraint | seo-report | M | P1 | todo |
| B-020 | Investigate desktop > mobile (1,943 vs 1,325 sessions) with *worse* mobile engagement (61.7% vs 67.7%) — backwards for casual games | user-facing | either mobile UX is weaker than desktop or the traffic mix is unusual; both are worth knowing | ga4 | M | P2 | todo |
| B-021 | Hold on a third mode until football's levers are harvested — do not treat the milestone as a green light | — | football is compounding ~2×/month with three unharvested levers (position, 501-on-Google, retention). §20a's warning is *more* apposite while the beachhead accelerates, not less. F1 is exempt: already live and ranking | idea | — | — | decision (revisit when football growth flattens) |
| B-022 | Do not scale the relation-page pattern yet — 134 pages, **0 clicks and 0 impressions** in 90 days; the F1 equivalent earns 10 clicks, so the pattern can work but is unproven on football, and ~149 title/H1 flags are outstanding | user-facing | prevents adding hundreds of pages on an unvalidated pattern | seo-report | S | P2 | todo (verify indexation first) |

**Re-ranking against the above:** B-010 (eslint to zero) should drop from P1 → P3; VISION §19.7
is explicit that internal work must not consume capacity while growth/revenue items are open,
and monetisation was absent from this queue entirely until B-017. B-008 (multi-mode
architecture readiness, P3) is partly overtaken by events — `f1.triviverse.com` is live,
serving 200s and earning search clicks. B-003 is superseded by B-019.

## Findings 2026-09-13 (acting on the morning's high-value items)

**B-019 (why Google ignores /501) — close it, the premise is wrong.** /501 is not
thin and not under-linked: it has *more* on-page depth than /football-pointless
(10 keywords / 3 sections / 6 FAQ / 460-char about vs 5 / 0 / 3 / 303) and the same
26 internal inbound links, and Google has indexed it. The real constraint is demand.
The entire 501-plus-darts query pool is ~84 impressions in 90 days, so ranking #1
for all of it would be worth roughly 30 clicks a quarter. Tenable, Pointless, Wordle
and Connections all borrow *recognised formats* people already search for; "501" is a
coinage competing with Levi's 501, darts 501 and 501(c)(3). **There is no meaningful
Google SEO lever here — stop looking for one.** /501's value is as an engagement asset
(785 sessions, 395s average, 33% return rate), and 628 of its 801 sessions come from
Bing. Understanding *those* queries needs B-016.

**B-006 (retention audit) — done, and it produced a testable lever.** Return rate by
landing page splits cleanly on one feature, whether the game has an answers archive:

| page | return rate | archive |
|---|---|---|
| /connections | 67.4% | yes |
| /career-path | 41.9% | yes |
| /tenable | 36.5% | yes |
| /wordle | 33.3% | yes |
| /501 | 33.2% | no |
| /tictactoe | 26.3% | no |
| /football-pointless | 17.8% | no |

Perfect rank separation, mean 44.8% vs 25.8%. n=7 and confounded — archives may have
been added to games that were already popular — so this is a hypothesis, not a proven
cause. Shipped as an experiment on the best test case (B-023).

**Also observed:** the homepage retains at 49.0% on 871 sessions, higher than any game
page. Partly circular (direct traffic *is* returning traffic), so not yet actionable —
but if it survives a channel-controlled cut, getting organic arrivals to the hub rather
than a single game becomes a significant retention lever in its own right.

| ID | Title | Class | Value | Source | Effort | Priority | Status |
|----|-------|-------|-------|--------|--------|----------|--------|
| B-023 | Football Pointless answers archive — test the archive/retention hypothesis on the worst retainer (17.8%) that is also the 2nd-best acquisition page | user-facing | if the pattern holds, the same treatment applies to /501 and /tictactoe | retention | M | P1 | in-review:#43 |
| B-024 | Re-validate #41's question quality — 101 Tenable lists reduce to ~6 templates (16 Record Signings, 16 Biggest Sales, 10 Most Capped, 10+10 Top Goalscorers, 9 Most Appearances); 32% are transfer-fee questions, and hand-authored sets (World Cup scorers, Ballon d'Or) were deleted | user-facing | Tenable is 475 of 631 total search clicks — the riskiest surface on the site, and variety got worse even as verifiability improved (VISION §7 puts fun first) | product | M | P1 | **kept** (Tom played it 2026-09-13: "look okay for now") — not reverting. Variety remains the open concern: 32% of lists are transfer-fee questions, so revisit if Tenable's engagement or return rate dips |
| B-025 | Measure whether the hub's 49.0% return rate survives a channel-controlled cut; if it does, route organic arrivals to the hub | user-facing | would make cross-game discovery a primary retention lever | retention | S | P2 | todo |

**Re-ranked:** B-003/B-019 closed (no lever). B-016 (Bing) rises — it now gates both the
/501 question and any real read on a third of traffic; the report script shipped in #42,
only the API key is missing.

## Findings 2026-09-18/19 (first Bing query data + SERP inspection)

**B-016 (connect Bing Webmaster) — done.** Verified 13 Sept; per-query data arrived 19 Sept.
The premise that motivated it holds: GA4 over 28 days gives google/organic **1,225** sessions
against bing/organic **1,012**, level since at least 21 Aug. `chatgpt.com / ai-assistant` is a
steady third (~10/day). Bing Webmaster has no history before verification, but GA4 always did —
so "Bing started in September" is an artefact of the tooling, not the traffic.

**B-019 (why Bing ranks /501 and Google doesn't) — answered, and the answer closes it.**
Bing's first query export splits cleanly by game:

| cluster | impressions | clicks | CTR | avg pos |
|---|---|---|---|---|
| 501 | 1,989 | 113 | 5.7% | 2.9 |
| Tenable | 4,824 | 49 | 1.0% | 6.5 |
| Tic-tac-toe | 1,481 | 9 | 0.6% | 9.1 |

501 takes 24% of Bing impressions and returns 66% of the clicks. Google's UK SERP for
"football 501" is **not** an intent mismatch — it is entirely on-topic football content, and we
sit ~33rd behind `generationfootball.co.uk/football-501` (exact-match slug), `topbins.games`,
an **Apple App Store listing**, a playfootball.games how-to article and @genfball on X (8.9k
followers). It is an authority gap, not an on-page one. No cannibalisation: every 501 query maps
to `/501` alone. **Do not spend further effort here** — this now agrees with the 13 Sept finding
from the opposite direction.

**Tenable's Bing CTR is structural — do not rewrite its title or description.** 1.0% at position
6.5 looks like a copy failure and isn't. Bing's SERP for "football tenable" opens with a
full-viewport **sponsored advert for Tenable.com** (the cybersecurity firm) plus six sitelinks;
every organic result begins below the fold. Verified by inspecting the SERP directly, 18 Sept.
Meanwhile Google CTR on the same page doubled unaided over September (1.3% → 3.0%, position flat
~8.5, record 133 clicks/week). There is nothing to win and a working page to lose.

**B-022 (relation pages) — resolved: do not scale, and the page count was wrong.** There are
**10** pages plus a hub, not 134. All are cleanly indexed — URL Inspection returns "Submitted and
indexed", crawled 8 Sept, canonical agreed, rich results PASS — and they still draw **0
impressions in 28 days**. Demand is real: "players who played for …" autocompletes strongly and
every completion matches the intent. The constraint is the SERP. For "players who played for
liverpool and everton" page one is **FourFourTwo, Wikipedia (Merseyside derby), liverpoolfc.com
and FootballFanCast** — national football media and official club sites. A 224-word generated
page does not compete there. The pattern earns clicks on F1 because that field is thin; it does
not transfer to football. Leave the ten in place (they cost nothing) and stop treating it as a
growth lever.

**/wordle is not a title problem.** 781 impressions in 90 days at average position **52.3** —
"football wordle" sits at 58.7. That is too deep for metadata to move; it needs authority or a
different angle, not an alias.


**B-020 (desktop > mobile with worse mobile engagement) — resolved, and the premise is a
measurement artefact.** Engagement *rate* is genuinely lower on mobile (57.6% vs 64.3% over 28
days, and the per-page gaps are wide: /tenable 54% mobile vs 76% desktop, /tictactoe 55% vs 76%).
But the behavioural events point the other way. Per session:

| event | mobile | desktop | mobile ÷ desktop |
|---|---|---|---|
| `page_view` | 4.62 | 3.85 | **1.20** |
| `game_complete` | 0.78 | 0.64 | **1.21** |
| `user_engagement` | 0.45 | 0.90 | 0.50 |

**Mobile users complete 21% more games per session and view 20% more pages.** The only metric
that is worse is `user_engagement`, which GA4 fires when the page is backgrounded — chronically
under-reported on mobile web, where people lock the screen or switch apps mid-session, and which
is exactly what `engagementRate` and `averageSessionDuration` are built from. Scroll (0.68) and
`form_start` (0.65) follow the same shape, consistent with truncated measurement rather than
truncated play.

Do not "fix" mobile UX on the strength of the engagement-rate gap — on the metric that describes
whether people actually play the game, mobile is ahead. Worth revisiting only if `game_complete`
per session drops below desktop.

| ID | Title | Class | Value | Source | Effort | Priority | Status |
|----|-------|-------|-------|--------|--------|----------|--------|
| B-026 | Surface recognised format aliases in titles where Bing shows ranked-but-unclicked demand | user-facing | /tictactoe ranked ~8 for "tiki taka toe" on 216 Bing impressions at 0.0% CTR — it ranks because the body uses the alias, but the snippet didn't | bing | S | P1 | done (#58) |
| B-027 | "Football 501" is another company's **registered UK trademark** (UK00004247843, classes 9 + 41, filed 12 Aug 2025 — ten months before our first commit). Tom's call 2026-09-18: carry on with the name, do not push 501 on Bing where the holder sits, Google only | user-facing | legal exposure grows in proportion to how well 501 ranks | legal | — | P1 | decision (research-and-propose only per CLAUDE.md; a rename is unscoped) |
| B-028 | Give the question builder its own non-trademarked URL and SEO entry | user-facing | the one capability competitors charge £4/mo for was buried in a tab, invisible to search and unlinkable | growth | S | P1 | done (#57) |

**Tenable's misspelling cluster is structurally capped too — B-002 is as done as it can be.**
"teneball" draws 2,255 Google impressions in 90 days at position 7.0 and converts at **0.7%**;
live Search Console on the SERP shows 531 impressions and 4 clicks over seven days. Position is
not the problem. Inspecting the SERP (19 Sept) shows why:

- Google offers **"Did you mean: tenaball"** above the results, diverting the query.
- An **AI Overview** answers it inline, and states that *"Teneball most commonly refers to Footy
  TenaBall"* — Google has resolved the term to a **competitor's brand** (playfootball.games).
- Three competitors rank above us: playfootball.games/football-tenable, lineup-builder.co.uk and
  futbol-11.com. We are 4th.

Our title already carries "(Teneball)" and the description "also spelled Teneball or Tenaball", so
the on-page work #25 shipped is done and correct. The remaining gap is an AI Overview crediting
someone else's brand, which no metadata change reaches. **Do not reopen this as a title/CTR
problem.** Both of Tenable's big pools are now understood and both are structural: Bing is capped
by the Tenable.com advert, Google by the AI Overview and the spelling correction.
