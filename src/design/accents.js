// Runtime twin of the game-accent tokens in tailwind.config.js (design-tokens.md §1.4).
// Keys match the token names (accent-tenable → 'tenable'). A game surface sets these
// three variables once at its root and every accent-aware style (`text-accent`,
// `border-accent`, `shadow-glow`, the Hub card wash) picks up that game's identity.
// Change values here and in tailwind.config.js together.

export const GAME_ACCENTS = {
  tenable: { accent: '#eab308', bright: '#facc15', tint: 'rgb(234 179 8 / 0.12)' },
  wordle: { accent: '#3b82f6', bright: '#60a5fa', tint: 'rgb(59 130 246 / 0.12)' },
  tictactoe: { accent: '#6366f1', bright: '#818cf8', tint: 'rgb(99 102 241 / 0.12)' },
  teammates: { accent: '#ec4899', bright: '#f472b6', tint: 'rgb(236 72 153 / 0.12)' },
  careers: { accent: '#06b6d4', bright: '#22d3ee', tint: 'rgb(6 182 212 / 0.12)' },
  connections: { accent: '#a3e635', bright: '#bef264', tint: 'rgb(163 230 53 / 0.12)' }, // volt
  higherlower: { accent: '#f97316', bright: '#fb923c', tint: 'rgb(249 115 22 / 0.12)' },
  501: { accent: '#ef4444', bright: '#f87171', tint: 'rgb(239 68 68 / 0.12)' },
  pointless: { accent: '#0ea5e9', bright: '#38bdf8', tint: 'rgb(14 165 233 / 0.12)' }, // display azure
}

// Style object for the element that roots a game's accent scope.
export function accentVars(id) {
  const a = GAME_ACCENTS[id]
  if (!a) return {}
  return { '--accent': a.accent, '--accent-bright': a.bright, '--accent-tint': a.tint }
}
