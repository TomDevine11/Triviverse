// Game motifs ported from src/components/GameMotif.jsx (duotone marks) for the
// OG "matchday" day-recap card. currentColor → the game's accent.

export const DAY_GAMES = [
  { motif: 'tenable', accent: '#facc15' },
  { motif: 'wordle', accent: '#60a5fa' },
  { motif: 'tictactoe', accent: '#818cf8' },
  { motif: 'teammates', accent: '#f472b6' },
  { motif: 'career-path', accent: '#22d3ee' },
  { motif: 'world-cup', accent: '#fbbf24' },
  { motif: 'connections', accent: '#bef264' },
  { motif: 'higher-or-lower', accent: '#fb923c' },
  { motif: '501', accent: '#f87171' },
]

export function Motif({ id, color, size = 40 }) {
  const c = color
  const shapes = {
    tenable: [
      <rect key="1" x="3" y="12" width="5" height="9" rx="1" fill={c} opacity="0.45" />,
      <rect key="2" x="9.5" y="4.5" width="5" height="16.5" rx="1" fill={c} />,
      <rect key="3" x="16" y="15" width="5" height="6" rx="1" fill={c} opacity="0.45" />,
    ],
    wordle: [
      <rect key="1" x="2" y="9" width="6" height="6.5" rx="1.4" fill={c} />,
      <rect key="2" x="9" y="9" width="6" height="6.5" rx="1.4" fill={c} opacity="0.45" />,
      <rect key="3" x="16" y="9" width="6" height="6.5" rx="1.4" fill={c} opacity="0.45" />,
    ],
    tictactoe: [
      <rect key="1" x="7.8" y="3" width="2.4" height="18" rx="1.2" fill={c} />,
      <rect key="2" x="13.8" y="3" width="2.4" height="18" rx="1.2" fill={c} />,
      <rect key="3" x="3" y="7.8" width="18" height="2.4" rx="1.2" fill={c} opacity="0.45" />,
      <rect key="4" x="3" y="13.8" width="18" height="2.4" rx="1.2" fill={c} opacity="0.45" />,
    ],
    teammates: [
      <path key="1" d="M7.2 3C8.7 4.6 15.3 4.6 16.8 3l3.7 3-2 3.6-1.5-.9V21H7V8.7l-1.5.9-2-3.6z" fill={c} />,
    ],
    'career-path': [
      <circle key="1" cx="5" cy="18.5" r="2.8" fill={c} opacity="0.45" />,
      <circle key="2" cx="12" cy="10.5" r="2.8" fill={c} />,
      <circle key="3" cx="19.5" cy="15" r="2.8" fill={c} opacity="0.45" />,
      <path key="4" d="M6.8 16.5 10 12.4M14.5 11.7l3.2 2.2" stroke={c} strokeWidth="2.6" fill="none" strokeLinecap="round" />,
    ],
    'world-cup': [
      <path key="1" d="M7 3.5h10V9a5 5 0 0 1-10 0z" fill={c} />,
      <path key="2" d="M7 4.5H4a3.2 3.2 0 0 0 3.4 4.3M17 4.5h3a3.2 3.2 0 0 1-3.4 4.3" fill="none" stroke={c} strokeWidth="2.2" />,
      <rect key="3" x="10.9" y="13" width="2.2" height="4" fill={c} />,
      <rect key="4" x="7.5" y="18.5" width="9" height="2.7" rx="1" fill={c} />,
    ],
    connections: [
      <rect key="1" x="3.5" y="3.5" width="7.5" height="7.5" rx="2" fill={c} />,
      <rect key="2" x="13" y="3.5" width="7.5" height="7.5" rx="2" fill={c} opacity="0.45" />,
      <rect key="3" x="3.5" y="13" width="7.5" height="7.5" rx="2" fill={c} opacity="0.45" />,
      <rect key="4" x="13" y="13" width="7.5" height="7.5" rx="2" fill={c} />,
    ],
    'higher-or-lower': [
      <path key="1" d="M12 2.5 5.2 10h13.6z" fill={c} />,
      <path key="2" d="M12 21.5 5.2 14h13.6z" fill={c} opacity="0.45" />,
    ],
    501: [
      <circle key="1" cx="12" cy="12" r="9" fill={c} opacity="0.28" />,
      <circle key="2" cx="12" cy="12" r="5.6" fill={c} opacity="0.55" />,
      <circle key="3" cx="12" cy="12" r="2.4" fill={c} />,
    ],
  }[id]
  return <svg width={size} height={size} viewBox="0 0 24 24">{shapes}</svg>
}

// Small drawn glyphs (no emoji — Satori has no emoji font).
export function Flame({ color, size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2c1.5 3 4.5 4.5 4.5 8.5A4.5 4.5 0 0 1 12 15a2.5 2.5 0 0 1-2.5-2.5c0-1.2.8-2 .8-3-1.6.5-2.8 2.2-2.8 4.3A6.5 6.5 0 0 0 18.5 13c0-5-3.5-7-6.5-11z" fill={color} />
    </svg>
  )
}

export function Star({ color, size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2l2.9 6 6.6.6-5 4.3 1.5 6.5L12 16.9 5.9 19.4l1.5-6.5-5-4.3 6.6-.6z" fill={color} />
    </svg>
  )
}
