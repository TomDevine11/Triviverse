// Shared by the finish card (NextFixture) and the games' Unlimited buttons.

// Route + dailyStats key per daily, in suggestion order.
export const POOL = [
  { stats: 'wordle', to: '/wordle' },
  { stats: 'tenable', to: '/tenable' },
  { stats: 'tictactoe', to: '/tictactoe' },
  { stats: 'teammates', to: '/teammates' },
  { stats: 'careers', to: '/career-path' },
  { stats: 'connections', to: '/connections' },
  { stats: 'higherlower', to: '/higher-or-lower' },
  { stats: 'bingo', to: '/football-bingo' },
  { stats: 'contexto', to: '/football-contexto' },
  { stats: '501', to: '/501' },
  { stats: 'pointless', to: '/football-pointless' },
]

export const shortTitle = (t, id) => t(`games.${id}.title`).replace(/^Football /, '').replace(/ de Fútbol$/, '')
