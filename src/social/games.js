// dailyStats key ↔ route ↔ i18n id, for the eleven dailies. The social layer
// speaks dailyStats keys everywhere (results log, API, challenge links).

export const GAMES = {
  tenable: { route: '/tenable', id: 'tenable' },
  wordle: { route: '/wordle', id: 'wordle' },
  tictactoe: { route: '/tictactoe', id: 'tictactoe' },
  teammates: { route: '/teammates', id: 'teammates' },
  careers: { route: '/career-path', id: 'career-path' },
  connections: { route: '/connections', id: 'connections' },
  higherlower: { route: '/higher-or-lower', id: 'higher-or-lower' },
  501: { route: '/501', id: '501' },
  pointless: { route: '/football-pointless', id: 'football-pointless' },
  bingo: { route: '/football-bingo', id: 'football-bingo' },
  contexto: { route: '/football-contexto', id: 'football-contexto' },
}

export const routeOf = (g) => GAMES[g]?.route || '/'

// Locale-free pathname → dailyStats key (null for non-game pages).
export function gameFromPath(pathname) {
  const p = pathname.replace(/^\/es(?=\/|$)/, '') || '/'
  for (const [g, meta] of Object.entries(GAMES)) if (p === meta.route) return g
  return null
}

export const gameTitle = (t, g) => t(`games.${GAMES[g]?.id || g}.title`)
export const gameShortTitle = (t, g) => gameTitle(t, g).replace(/^Football /, '').replace(/ de Fútbol$/, '')
