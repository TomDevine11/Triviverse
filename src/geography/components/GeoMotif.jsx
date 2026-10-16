// Solid duotone game marks for Triviverse Geography, in the same icon language
// as the Triviverse family: chunky filled shapes, opacity layering, currentColor.
const MOTIFS = {
  geography: ( // the wing mark: a globe with a meridian
    <>
      <circle cx="12" cy="12" r="9.6" opacity=".35" />
      <path d="M12 2.4c2.6 2.7 3.9 5.9 3.9 9.6s-1.3 6.9-3.9 9.6c-2.6-2.7-3.9-5.9-3.9-9.6S9.4 5.1 12 2.4z" />
    </>
  ),
  borderline: ( // a landmass on its compass
    <>
      <circle cx="12" cy="12" r="9.8" fill="none" stroke="currentColor" strokeWidth="1.9" opacity=".4" />
      <path d="M12 .8v3.4M12 19.8v3.4M.8 12h3.4M19.8 12h3.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" opacity=".4" />
      <path d="M8.2 6.4c1.6-.9 3.4-.4 4.3.6.8.9 2.4.6 3.4 1.5 1.2 1.1.6 2.6 1.3 3.7.8 1.3.2 3-1.2 3.4-1.1.3-1.6 1.5-2.7 2.3-1.3.9-3 .3-3.4-1.1-.3-1.1-1.5-1.6-2.1-2.7-.8-1.4-.2-2.9-.6-4.2-.4-1.5.2-2.9 1-3.5z" />
    </>
  ),
  overland: ( // two stops joined by a route through a third
    <>
      <path d="M5.5 17.5 12 10.5l6.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity=".45" />
      <circle cx="5" cy="18" r="3.2" />
      <circle cx="12" cy="10" r="2.4" opacity=".7" />
      <path d="M19 3.5a3.6 3.6 0 0 1 3.6 3.6c0 2.7-3.6 6.4-3.6 6.4s-3.6-3.7-3.6-6.4A3.6 3.6 0 0 1 19 3.5zm0 2.3a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z" />
    </>
  ),
  unfurl: ( // a flag on its pole
    <>
      <rect x="4" y="2.5" width="2.2" height="19.5" rx="1.1" opacity=".55" />
      <path d="M7.4 4.2c3.1-1.5 5.4 1.3 8.4.4 1.5-.4 2.8-1 3.9-1.6v9.4c-1.1.6-2.4 1.2-3.9 1.6-3 .9-5.3-1.9-8.4-.4z" />
      <path d="M7.4 8.8c3.1-1.5 5.4 1.3 8.4.4 1.5-.4 2.8-1 3.9-1.6" fill="none" stroke="#000" strokeOpacity=".22" strokeWidth="1.4" />
    </>
  ),
  patchwork: ( // a map tile with one piece cut out
    <>
      <path d="M3 5.5 9 3l6 2.5L21 3v15.5L15 21l-6-2.5L3 21z" opacity=".4" />
      <path d="M9.6 8.2h4.8v5.2H9.6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2 1.6" />
      <path d="M15 5.5 21 3v15.5L15 21z" />
    </>
  ),
  milestone: ( // a roadside milestone, a pin on its face
    <>
      <path d="M5 22V9.5a7 7 0 0 1 14 0V22z" opacity=".42" />
      <rect x="3" y="20" width="18" height="2.6" rx="1" />
      <path d="M12 6.2a3.6 3.6 0 0 1 3.6 3.6c0 2.7-3.6 6.5-3.6 6.5s-3.6-3.8-3.6-6.5A3.6 3.6 0 0 1 12 6.2zm0 2.3a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z" />
    </>
  ),
  earshot: ( // a speech bubble carrying a voice's waveform
    <>
      <path d="M4.5 3h15A2.5 2.5 0 0 1 22 5.5v10a2.5 2.5 0 0 1-2.5 2.5H11l-5 4v-4H4.5A2.5 2.5 0 0 1 2 15.5v-10A2.5 2.5 0 0 1 4.5 3z" opacity=".4" />
      <rect x="6" y="9" width="2" height="3" rx="1" />
      <rect x="9.5" y="6.5" width="2" height="8" rx="1" />
      <rect x="13" y="8" width="2" height="5" rx="1" />
      <rect x="16.5" y="9.5" width="2" height="2" rx="1" />
    </>
  ),
  outrank: ( // two bars squared up, an up and a down chevron between them
    <>
      <rect x="2.5" y="9" width="7" height="13" rx="1.6" opacity=".42" />
      <rect x="14.5" y="4" width="7" height="18" rx="1.6" />
      <path d="M12 2.6 9.6 5.4h4.8zM12 14.2l-2.4-2.8h4.8z" opacity=".75" />
    </>
  ),
  postcard: ( // a postcard with its stamp, a pin dropped on it
    <>
      <rect x="1.5" y="5" width="21" height="14.5" rx="2" opacity=".4" />
      <rect x="15" y="7.2" width="5.2" height="5.6" rx=".8" opacity=".75" />
      <path d="M8.5 3a4.6 4.6 0 0 1 4.6 4.6c0 3.5-4.6 8.4-4.6 8.4S3.9 11.1 3.9 7.6A4.6 4.6 0 0 1 8.5 3zm0 2.9a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z" />
    </>
  ),
}

export default function GeoMotif({ id, className = 'w-9 h-9' }) {
  const motif = MOTIFS[id]
  if (!motif) return null
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">{motif}</svg>
}
