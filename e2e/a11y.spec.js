import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Accessibility checks over a representative set of routes, not every page:
// the games share one shell and one component library, so five routes surface
// the same component defects that fifty would, in a fraction of the runtime.
const ROUTES = [
  { path: '/', name: 'home — the shared shell' },
  { path: '/tenable', name: 'tenable — a standard game' },
  { path: '/tictactoe', name: 'tictactoe — the grid' },
  { path: '/connections', name: 'connections — the tiles' },
  { path: '/football-pointless/answers', name: 'pointless archive — generated content' },
]

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// KNOWN, PRE-EXISTING, UNFIXED — audited 2026-09-25, not introduced by this work.
//
// Exactly one rule fails anywhere on the site, and it is a palette decision
// rather than a code defect, so it is recorded here rather than silently
// ignored or papered over with a redesign nobody asked for:
//
//   color-contrast
//     • .text-gray-500 — #6b7280 on #111827 = 3.66 (needs 4.5). A stray generic
//       Tailwind class, which docs/design-system.md forbids anyway.
//     • the muted token #57536e on #0b0a14–#16151f = 2.46–2.68 (needs 4.5).
//       Used site-wide; 330 nodes on the archive alone.
//
// Changing either is a design-system change and Tom's call as design lead —
// it would repaint the site and invalidate the visual baselines.
//
// This list is a CEILING, not a mute: any rule that is not in it fails the
// build, so the site cannot acquire a new class of accessibility defect while
// this one is outstanding. Shrink it when the palette is fixed; do not grow it
// to make a test pass.
const KNOWN_FAILING_RULES = new Set(['color-contrast'])

for (const route of ROUTES) {
  test(`${route.name} has no accessibility violations outside the known baseline`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await page.locator('h1').first().waitFor({ state: 'visible' })

    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    const unexpected = violations.filter(v => !KNOWN_FAILING_RULES.has(v.id))

    expect(
      unexpected.map(v => `${v.id} (${v.impact}, ${v.nodes.length} nodes): ${v.help}`),
      `${route.path} has accessibility violations outside the documented baseline`,
    ).toEqual([])
  })
}

test('the accessibility baseline is not silently over-broad', async ({ page }) => {
  // If a rule in KNOWN_FAILING_RULES stops failing everywhere, it should be
  // removed from the list rather than left as permanent cover for a future
  // regression. This fails when the baseline becomes stale in the good
  // direction — i.e. when someone fixes the palette and forgets to tighten it.
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('h1').first().waitFor({ state: 'visible' })
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const stillFailing = new Set(violations.map(v => v.id))

  for (const rule of KNOWN_FAILING_RULES) {
    expect(
      stillFailing.has(rule),
      `"${rule}" is in KNOWN_FAILING_RULES but no longer fails on the home page — remove it from the baseline`,
    ).toBe(true)
  }
})
