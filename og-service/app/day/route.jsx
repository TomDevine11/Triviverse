import { ImageResponse } from 'next/og'
import { C, decodeDay } from '../../lib/card'
import { INTER_500, INTER_800, BEBAS, toBuf } from '../../lib/fonts'
import { Flame } from '../../lib/motifs.jsx'

export const runtime = 'nodejs'

const BRAND = '#a78bfa'
const CYAN = '#22d3ee'
const ORANGE = '#fb923c'

// Fallback when no packed payload is supplied (e.g. a bare /day hit).
const SAMPLE = { matchday: 207, dailyPoints: 120, weeklyPoints: 340, dayStreak: 12, won: 5 }

function Header() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg width="24" height="28" viewBox="0 0 24 28" style={{ marginRight: 14 }}>
          <polygon points="12.48,0 3.84,15.68 10.56,15.68 7.68,28 20.64,11.2 13.44,11.2 15.84,0" fill={BRAND} />
        </svg>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, letterSpacing: 3 }}>
          <div style={{ color: C.primary }}>TRIVIVERSE</div>
          <div style={{ color: BRAND, marginLeft: 9 }}>FOOTBALL</div>
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, color: C.faint }}>MY MATCHDAY</div>
    </div>
  )
}

function Footer() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 56, paddingLeft: 22, paddingRight: 28, borderRadius: 30, backgroundColor: C.surface, border: `1px solid ${C.borderStrong}` }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: BRAND, marginRight: 14 }} />
        <div style={{ fontSize: 28, fontWeight: 800 }}>triviverse.com</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, color: C.faint }}>{"PLAY TODAY'S DAILY"}</div>
    </div>
  )
}

// Wins ring (no game icons).
function Ring(d) {
  const S = 300, CIRC = 2 * Math.PI * 42
  const won = d.won ?? 0
  return (
    <div style={{ position: 'relative', display: 'flex', width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      <svg width={S} height={S} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#26243a" strokeWidth="9" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={BRAND} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${((won / 9) * CIRC).toFixed(2)} ${CIRC.toFixed(2)}`} transform="rotate(-90 50 50)" />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 112, lineHeight: 0.78 }}>{`${won}/9`}</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 4, color: BRAND }}>WON</div>
      </div>
    </div>
  )
}

function StatCard({ value, label, color, flame }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 190, backgroundColor: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 16, padding: '15px 18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {flame && <Flame color={ORANGE} size={32} />}
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 66, lineHeight: 0.85, color, marginLeft: flame ? 4 : 0 }}>{String(value ?? 0)}</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function Stats(d) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 4, color: C.muted }}>MATCHDAY</div>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 118, lineHeight: 0.84, color: C.primary }}>{String(d.matchday ?? '')}</div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <StatCard value={d.dailyPoints} label="POINTS TODAY" color={BRAND} />
        <StatCard value={d.weeklyPoints} label="THIS WEEK" color={CYAN} />
        <StatCard value={d.dayStreak} label="DAY STREAK" color={C.primary} flame />
      </div>
    </div>
  )
}

function Dashboard(d) {
  return (
    <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', padding: 56, backgroundColor: C.canvas, color: C.primary, fontFamily: 'Inter',
      backgroundImage: `radial-gradient(circle at 86% 14%, ${BRAND}30 0%, transparent 46%), linear-gradient(155deg, ${C.canvasHigh}, ${C.canvas} 55%)` }}>
      <Header />
      <div style={{ height: 3, marginTop: 22, borderRadius: 2, backgroundImage: `linear-gradient(90deg, ${BRAND}, transparent 78%)` }} />
      <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', marginTop: 6 }}>
        <div style={{ display: 'flex', width: 640 }}>{Stats(d)}</div>
        <div style={{ display: 'flex', flexGrow: 1, justifyContent: 'center' }}>{Ring(d)}</div>
      </div>
      <Footer />
    </div>
  )
}

export async function GET(request) {
  const r = new URL(request.url).searchParams.get('r')
  const d = (r && decodeDay(r)) || SAMPLE
  return new ImageResponse(Dashboard(d), {
    width: 1200, height: 630,
    fonts: [
      { name: 'Inter', data: toBuf(INTER_500), weight: 500, style: 'normal' },
      { name: 'Inter', data: toBuf(INTER_800), weight: 800, style: 'normal' },
      { name: 'Bebas Neue', data: toBuf(BEBAS), weight: 400, style: 'normal' },
    ],
    headers: { 'cache-control': 'public, immutable, max-age=31536000' },
  })
}
