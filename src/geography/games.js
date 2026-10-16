// The Triviverse Geography lineup. Each game owns an id (storage + motif key),
// a route and an accent — a recognition mark only, like Triviverse's game accents.
export const GEO_GAMES = [
  {
    id: 'postcard',
    route: '/geography/postcard',
    accent: { accent: '#f08a5d', bright: '#f7b08f', tint: 'rgb(240 138 93 / 0.12)' }, // postmark coral — warmer and more orange than Unfurl's rose
  },
  {
    id: 'milestone',
    route: '/geography/milestone',
    accent: { accent: '#d9b44a', bright: '#ecd38a', tint: 'rgb(217 180 74 / 0.12)' }, // archive gold — yellower than Borderline's sand
  },
  {
    id: 'earshot',
    route: '/geography/earshot',
    accent: { accent: '#3cc4b4', bright: '#86e2d6', tint: 'rgb(60 196 180 / 0.12)' }, // sound teal — bluer than the success green, greener than Overland's blue
  },
  {
    id: 'outrank',
    route: '/geography/outrank',
    accent: { accent: '#d27ce6', bright: '#e9adf4', tint: 'rgb(210 124 230 / 0.12)' }, // orchid — pinker than the brand violet, bluer than Unfurl's rose; clear of the green/red verdicts
  },
  {
    id: 'borderline',
    route: '/geography/borderline',
    accent: { accent: '#d9a066', bright: '#ecc08f', tint: 'rgb(217 160 102 / 0.12)' }, // atlas sand
  },
  {
    id: 'overland',
    route: '/geography/overland',
    accent: { accent: '#4fa3e0', bright: '#8cc8f2', tint: 'rgb(79 163 224 / 0.12)' }, // route blue — clear of the green/yellow/orange/red guess tiers
  },
  {
    id: 'unfurl',
    route: '/geography/unfurl',
    accent: { accent: '#ec7a96', bright: '#f6a8bb', tint: 'rgb(236 122 150 / 0.12)' }, // bunting rose — pinker than the loss red
  },
  {
    id: 'patchwork',
    route: '/geography/patchwork',
    accent: { accent: '#8f93f7', bright: '#b5b8fb', tint: 'rgb(143 147 247 / 0.12)' }, // periwinkle — the cut-outs; green stays the restoration colour
  },
]

export const geoGame = (id) => GEO_GAMES.find(g => g.id === id)

// Style object for the element that roots a game's accent scope.
export function geoAccentVars(id) {
  const a = geoGame(id)?.accent
  return a ? { '--accent': a.accent, '--accent-bright': a.bright, '--accent-tint': a.tint } : {}
}
