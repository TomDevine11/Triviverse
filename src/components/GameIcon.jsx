// Custom line-icon set for the game modes. Each icon uses `currentColor`, so it
// takes whatever text colour its container sets (e.g. the card's accent colour).
// viewBox 0 0 24 24, consistent 1.75 stroke.

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ICONS = {
  // Leaderboard / podium — "name the top 10"
  tenable: (
    <>
      <rect x="3" y="13" width="5" height="8" rx="1" {...S} />
      <rect x="9.5" y="7" width="5" height="14" rx="1" {...S} />
      <rect x="16" y="16" width="5" height="5" rx="1" {...S} />
    </>
  ),
  // Wordle tiles — first one "solved"
  wordle: (
    <>
      <rect x="2.5" y="9" width="6" height="6" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" {...S} />
      <rect x="15.5" y="9" width="6" height="6" rx="1.2" {...S} />
    </>
  ),
  // Tic-tac-toe grid with a single centered X — clean, uncrowded
  tictactoe: (
    <>
      <path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" {...S} />
      <path d="M10.3 10.3l3.4 3.4M13.7 10.3l-3.4 3.4" {...S} />
    </>
  ),
  // Two people — "teammates"
  teammates: (
    <>
      <path d="M16 20.5v-1.8a3.8 3.8 0 0 0-3.8-3.8H6.3a3.8 3.8 0 0 0-3.8 3.8v1.8" {...S} />
      <circle cx="9.2" cy="7.3" r="3.8" {...S} />
      <path d="M21.5 20.5v-1.8a3.8 3.8 0 0 0-2.85-3.67" {...S} />
      <path d="M15.6 3.7a3.8 3.8 0 0 1 0 7.2" {...S} />
    </>
  ),
  // Connected path with nodes — "career path"
  'career-path': (
    <>
      <path d="M4 18l5-9 5 7 6-9" {...S} />
      <circle cx="4" cy="18" r="1.6" {...S} />
      <circle cx="14" cy="16" r="1.6" {...S} />
      <circle cx="20" cy="7" r="1.6" {...S} />
    </>
  ),
  // Four squares — the Connections motif
  connections: (
    <>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.4" fill="currentColor" stroke="none" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.4" {...S} />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.4" {...S} />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  // Up / down arrows — "higher or lower"
  'higher-or-lower': (
    <>
      <path d="M8 9.5L8 3.5M8 3.5L5.2 6.3M8 3.5l2.8 2.8" {...S} />
      <path d="M16 14.5L16 20.5M16 20.5l-2.8-2.8M16 20.5l2.8-2.8" {...S} />
    </>
  ),
  // Dartboard — "501"
  '501': (
    <>
      <circle cx="12" cy="12" r="9" {...S} />
      <circle cx="12" cy="12" r="5.2" {...S} />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function GameIcon({ id, className = 'w-9 h-9' }) {
  const body = ICONS[id]
  if (!body) return null
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {body}
    </svg>
  )
}
