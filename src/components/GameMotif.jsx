// Solid duotone game marks — the "bare motif" icon language chosen in the
// 2026-07 design rounds, replacing the thin line icons on the hub. Chunky
// filled shapes with opacity layering; currentColor takes the game's hue.
// (GameIcon.jsx keeps the old line set for screens not yet redesigned.)

const MOTIFS = {
  tenable: (
    <>
      <rect x="3" y="12" width="5" height="9" rx="1" opacity=".45" />
      <rect x="9.5" y="4.5" width="5" height="16.5" rx="1" />
      <rect x="16" y="15" width="5" height="6" rx="1" opacity=".45" />
    </>
  ),
  wordle: (
    <>
      <rect x="2" y="9" width="6" height="6.5" rx="1.4" />
      <rect x="9" y="9" width="6" height="6.5" rx="1.4" opacity=".45" />
      <rect x="16" y="9" width="6" height="6.5" rx="1.4" opacity=".45" />
    </>
  ),
  tictactoe: (
    <>
      <rect x="7.8" y="3" width="2.4" height="18" rx="1.2" />
      <rect x="13.8" y="3" width="2.4" height="18" rx="1.2" />
      <rect x="3" y="7.8" width="18" height="2.4" rx="1.2" opacity=".45" />
      <rect x="3" y="13.8" width="18" height="2.4" rx="1.2" opacity=".45" />
    </>
  ),
  teammates: <path d="M7.2 3C8.7 4.6 15.3 4.6 16.8 3l3.7 3-2 3.6-1.5-.9V21H7V8.7l-1.5.9-2-3.6z" />,
  'career-path': (
    <>
      <circle cx="5" cy="18.5" r="2.8" opacity=".45" />
      <circle cx="12" cy="10.5" r="2.8" />
      <circle cx="19.5" cy="15" r="2.8" opacity=".45" />
      <path d="M6.8 16.5 10 12.4M14.5 11.7l3.2 2.2" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </>
  ),
  connections: (
    <>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" opacity=".45" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" opacity=".45" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
    </>
  ),
  'higher-or-lower': (
    <>
      <path d="M12 2.5 5.2 10h13.6z" />
      <path d="M12 21.5 5.2 14h13.6z" opacity=".45" />
    </>
  ),
  501: (
    <>
      <circle cx="12" cy="12" r="9" opacity=".28" />
      <circle cx="12" cy="12" r="5.6" opacity=".55" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
}

export default function GameMotif({ id, className = 'w-9 h-9' }) {
  const motif = MOTIFS[id]
  if (!motif) return null
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      {motif}
    </svg>
  )
}
