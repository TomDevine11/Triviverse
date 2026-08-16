// ─────────────────────────────────────────────────────────────────────────
// llms.txt — the AI-assistant read of the site.
//
// AI assistants are already a large share of arrivals, and they reach us by
// fetching and summarising pages rather than by ranking them. Both files are
// generated from ROUTES (src/seo/seoConfig.js), so they stay in step with the
// site automatically and cannot drift the way a hand-written summary would.
//
//   llms.txt      — the index: what Triviverse is, plus every page + description.
//   llms-full.txt — the same, expanded with each game's rules, tips and FAQ, so
//                   an assistant can answer "how do you play X?" from one fetch.
//
// Format follows the llms.txt convention (llmstxt.org): H1 name, blockquote
// summary, prose, then H2 sections of `- [name](url): description` links.
//
// Written by scripts/prerender.mjs; pure functions here so they are testable.
// ─────────────────────────────────────────────────────────────────────────

import { BRAND, SITE_URL, absolute, indexableRoutes } from '../../src/seo/seoConfig.js'

export const SITE_SUMMARY =
  'Free daily football (soccer) trivia games, playable instantly in any browser — no sign-up, no app, no download.'

export const SITE_PROSE = [
  `${BRAND} is a trivia platform currently focused on football. Most games offer a Daily mode — one shared puzzle per day, with a win streak to protect — alongside an Unlimited mode for endless practice that does not affect your stats.`,
  'Every game is built on real historical football data: squads, transfers, appearances, honours and market values, modelled so that answers can be validated properly rather than guessed at.',
  `Every page is also published in Spanish under /es (for example ${SITE_URL}/es/wordle).`,
]

const isArchive = route => route.path.endsWith('/answers')

// Grouped so an assistant can tell a playable game from an answers archive.
export function llmsSections(routes = indexableRoutes()) {
  return [
    ['Games', routes.filter(r => r.path !== '/' && !isArchive(r))],
    ['Past answers and archives', routes.filter(isArchive)],
    // The home page is listed last and under its brand name, not "Home" — an
    // assistant quoting this should say "Triviverse", not "Home".
    ['The site', routes.filter(r => r.path === '/').map(r => ({ ...r, name: BRAND }))],
  ].filter(([, rs]) => rs.length)
}

const preamble = title => `# ${title}\n\n> ${SITE_SUMMARY}\n\n${SITE_PROSE.join('\n\n')}\n`

export function llmsTxt(routes = indexableRoutes()) {
  let out = preamble(BRAND)
  for (const [heading, group] of llmsSections(routes)) {
    out += `\n## ${heading}\n\n`
    for (const r of group) out += `- [${r.name}](${absolute(r.path)}): ${r.description}\n`
  }
  return out
}

export function llmsFullTxt(routes = indexableRoutes()) {
  let out = preamble(`${BRAND} — full site content`)
  for (const [heading, group] of llmsSections(routes)) {
    out += `\n---\n\n# ${heading}\n`
    for (const r of group) {
      out += `\n## ${r.name}\n\nURL: ${absolute(r.path)}\n\n${r.description}\n`
      if (r.tagline) out += `\n${r.tagline}\n`
      if (r.about) out += `\n${r.about}\n`
      if (r.howTo?.length) {
        out += `\n### How to play\n\n`
        r.howTo.forEach((step, i) => { out += `${i + 1}. ${step}\n` })
      }
      for (const s of r.sections || []) out += `\n### ${s.h2}\n\n${s.body.join('\n\n')}\n`
      if (r.faq?.length) {
        out += `\n### FAQ\n`
        for (const { q, a } of r.faq) out += `\n**${q}**\n\n${a}\n`
      }
    }
  }
  return out
}
