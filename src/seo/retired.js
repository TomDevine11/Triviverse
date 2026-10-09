// Pages retired 2026-10-09 after AdSense rejected the site for "low-value
// content" (docs/BACKLOG.md B-032): thin programmatic pages and duplicate
// translations, not the games, were most of the URL count. Each 301s to the page
// a visitor following an old link most likely wanted.
//
// One list, two consumers: scripts/cloudflare-pages.mjs writes it as Cloudflare
// `_redirects` (production), and server/index.js applies it for local/e2e runs.
// Order matters — first match wins. A trailing `*` matches the rest of the path,
// and `:splat` in the target is replaced with whatever it matched.
export const RETIRED = [
  ['/build-your-own-football-darts', '/501'],
  ['/england-football-quiz', '/career-path'],
  ['/players-who-played-for', '/tictactoe'],
  ['/players-who-played-for/*', '/tictactoe'],
  ...['wordle', 'teammates', 'career-path', 'tenable', 'connections', 'football-pointless']
    .map(g => [`/${g}/answers`, `/${g}`]),
  ['/es', '/'],
  ['/es/build-your-own-football-darts', '/501'],
  ['/es/england-football-quiz', '/career-path'],
  ['/es/players-who-played-for/*', '/tictactoe'],
  ['/es/*', '/:splat'],
]

// The 301 target for a path, or null if it was not retired. Mirrors Cloudflare's
// `_redirects` semantics for the subset used above.
export function retiredTarget(pathname) {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  for (const [from, to] of RETIRED) {
    if (from.endsWith('/*')) {
      const base = from.slice(0, -1)
      if (p.startsWith(base) && p.length > base.length) return to.replace(':splat', p.slice(base.length))
    } else if (p === from) return to
  }
  return null
}
