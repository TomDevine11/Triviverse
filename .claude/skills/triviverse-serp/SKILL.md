---
name: triviverse-serp
description: Inspect and record Google/Bing SERPs for Triviverse queries. Use when asked why a page ranks where it does, who is beating us, whether a query is worth building for, or when assessing a new game/page opportunity. Encodes the decision rules derived from the 2026-09-24 sweep and the observation-record format.
---

# Triviverse SERP observation

Triviverse has strong **introspection** — Search Console, GA4, Bing Webmaster, Trends,
autosuggest, its own crawler — and no **external view**. Every finding that changed a
decision in September came from a human opening a browser and looking at a SERP. This
skill is that capability, written down so it is done the same way each time.

## Scope discipline — read this first

This is **strategic observation, not scraping**. Tens of queries, chosen because they
matter; never thousands, never on a schedule, never headless against Google.

- Use **Claude in Chrome** against the user's own browser. It is a real profile on a
  residential connection making an ordinary search. There is nothing to evade.
- If a CAPTCHA ever appears, **stop and tell the user**. Do not attempt it.
- Do not build a crawler out of this. The volume is the thing that keeps it legitimate.

## Choosing what to inspect

Candidates come from tooling we already have — never from guesswork:

```
npm run seo-trends      # what moved in the last 7 days (rising / falling / new)
npm run seo-report      # 90-day GSC + Bing + GA4, striking distance, low CTR
npm run experiments     # what we already shipped and whether it worked
```

Prioritise: a query that is **rising** · a large pool with **poor CTR** · a page at
**position 4–20** · a term where Google and Bing disagree sharply. Check
`docs/BACKLOG.md` first — several lines of enquiry are closed with evidence and must
not be reopened on a hunch.

## What to capture

Only four things earned their place across ten manual inspections. Everything else was
noise. Record them in `docs/seo/serp-observations.json`, appending — never rewriting,
because the value is the series.

1. **Who ranks above us** — domain and page, in order.
2. **Which SERP features are present** — ads, video carousels, top stories, people-also-ask.
3. **Any AI Overview** — its text, and crucially **which brand it credits**.
4. **New domains** — anything not already in the log.

Do **not** archive full SERP text, and do not extract competitors' body copy. Ten
inspections produced roughly 15% signal; the rest was waste.

## Reading the result — rules derived from evidence

These came from the 2026-09-24 sweep. They are observations, not SEO folklore.

**Triviverse has a realistic opportunity when all three hold:**

| Signal | Why |
|---|---|
| The query names a **UK TV format** (Pointless, Tenable, 501/darts) | Unambiguous intent, smaller field. We rank 3rd and 4th on these. |
| **No exact-match domain** is present | The strongest single predictor. Every SERP where we are absent has at least one; neither SERP we rank top-5 on does. |
| Rivals have **brand-named** their clone | "Goalless" cannot match "football pointless". Our descriptive naming does. This is the mechanism behind 17.1% CTR on `/football-pointless`. |

**It is a dead end when:**

- Generic global format (wordle, higher-or-lower, tic-tac-toe) — dozens of clones, exact-match domains.
- A non-organic block owns the viewport (the Tenable.com ad; the tic-tac-toe video carousel).
- An **AI Overview has already assigned the term to a competitor's brand** — observed on 2 of 4 Google SERPs carrying one. No metadata change reaches this.

**Always check both engines.** They diverge in kind, not degree: `football 501` is
position 3 with 1,887 impressions on Bing and position 29.6 with 58 on Google.

## Before proposing a game or page

A weak SERP is necessary but not sufficient. Also confirm:

- **Canonical data supports it.** The pools are recognisability-filtered, not data-limited
  (`recognisability.generated.json` scores 22,424 players; honours covers 5,642 across 815
  trophy types), so the question is usually "what threshold?" not "do we have it?".
- **A game mechanic satisfies the intent** better than an article would.
- **It does not touch the "Football 501" trademark** (B-027) — research and propose, never act.

Then open an entry in `docs/seo/experiments.json` **before** shipping, so the outcome is
measurable rather than a story told afterwards.
