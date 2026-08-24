// SEO route layer for the "players who played for both X and Y" page family.
// Turns the generated relations data into ROUTE objects (consumed by seoConfig →
// prerender + sitemap + <Seo>) and exposes lookups for the React page. Plain JS so
// Node (prerender) and the browser both import it. No thin pages: every route
// carries a complete, unique answer list + contextual internal links.
import data from '../data/seo/relations.generated.json' with { type: 'json' }

export const RELATION_BASE = '/players-who-played-for'
export const RELATION_PAGES = data.pages
export const RELATION_CLUBS = data.clubs
const bySlug = new Map(data.pages.map(p => [p.slug, p]))
export const relationBySlug = (slug) => bySlug.get(slug) || null

const topNames = (p, n) => p.players.filter(x => x.s).slice(0, n).map(x => x.n)
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…')

// Title that is always ≤65 chars AND brand-anchored — falls back to shorter forms
// for long club-pair names (Borussia Mönchengladbach & Borussia Dortmund).
const BRAND = ' | Triviverse'
function makeTitle(a, b) {
  for (const f of [`Players Who Played for ${a} & ${b}`, `${a} & ${b} Players Quiz`, `${a} & ${b} Players`, `${a} & ${b}`]) {
    if ((f + BRAND).length <= 65) return f + BRAND
  }
  return `${a} & ${b}`.slice(0, 65 - BRAND.length) + BRAND
}

// One ROUTE per relation page.
function routeFor(p) {
  const both = `${p.aName} and ${p.bName}`
  const stars = topNames(p, 4)
  const h1 = `Players Who Played for ${both}`
  const title = makeTitle(p.aName, p.bName)
  return {
    path: `${RELATION_BASE}/${p.slug}`,
    name: `${p.aName} & ${p.bName}`,
    title,
    description: clip(`${p.total} players have played for both ${both} — including ${stars.slice(0, 3).join(', ')}. See the full list and name them all in this free football trivia challenge.`, 160),
    keywords: [
      `players who played for ${p.aName.toLowerCase()} and ${p.bName.toLowerCase()}`,
      `${p.aName.toLowerCase()} and ${p.bName.toLowerCase()} players`,
      `footballers who played for ${p.aName.toLowerCase()} and ${p.bName.toLowerCase()}`,
    ],
    h1,
    tagline: `${p.total} footballers have turned out for both ${both}. How many can you name?`,
    about: `${p.total} players have appeared for both ${p.aName} and ${p.bName}${stars.length ? `, among them ${stars.join(', ')}` : ''}. It's a classic football trivia question — here is the complete list, with a challenge to see how many you can recall from memory.`,
    itemList: { heading: `Every player who has played for both ${both}`, items: p.players.map(x => ({ text: x.n })) },
    relatedLinks: relatedLinksFor(p),
    schema: 'Relation',
    priority: '0.5',
    changefreq: 'monthly',
    hideFromNav: true,          // out of the game nav; reachable via the hub + related links
    enOnly: true,               // English-intent queries; no Spanish translation → no /es duplicate
    rel: p,                     // full data for the React page
  }
}

// Contextual internal links: sibling pairs sharing a club, the hub, and a game to play.
function relatedLinksFor(p) {
  const links = (p.related || []).slice(0, 8).map(slug => {
    const q = bySlug.get(slug); return q && { path: `${RELATION_BASE}/${q.slug}`, label: `${q.aName} & ${q.bName} players` }
  }).filter(Boolean)
  links.push({ path: RELATION_BASE, label: 'More “played for two clubs” trivia' })
  links.push({ path: '/football-pointless', label: 'Play Football Pointless' })
  return links
}

// Hub page listing every relation page (so none are orphaned, and clubs cluster).
export const RELATION_HUB = {
  path: RELATION_BASE,
  name: 'Played For Two Clubs',
  title: 'Players Who Played for Two Clubs — Football Trivia | Triviverse',
  description: `Football trivia challenges for ${data.pages.length} club pairs — name every player who turned out for both, from Arsenal & Chelsea to Real Madrid & Barcelona.`,
  keywords: ['players who played for two clubs', 'footballers who played for both', 'football trivia clubs', 'name the players quiz'],
  h1: 'Players Who Played for Two Clubs',
  tagline: `Pick two clubs and name every player who turned out for both — ${data.pages.length} football trivia challenges.`,
  about: `A collection of ${data.pages.length} football trivia challenges built from real career data: for each pair of clubs, the complete list of players who have appeared for both. Test your recall club by club.`,
  relatedLinks: data.pages
    .map(p => ({ path: `${RELATION_BASE}/${p.slug}`, label: `${p.aName} & ${p.bName}`, famous: p.famous }))
    .sort((a, b) => b.famous - a.famous)
    .map(({ path, label }) => ({ path, label })),
  schema: 'Collection',
  priority: '0.6',
  changefreq: 'weekly',
  hideFromNav: true,
  enOnly: true,
}

export const RELATION_ROUTES = [RELATION_HUB, ...data.pages.map(routeFor)]
