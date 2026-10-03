// Small shared pieces for the social layer — kept in one file so every social
// surface (finish card, hub, You page, leagues) speaks the same visual language.

import { METALS } from '../../design/metals'

export const Overline = ({ children, className = '' }) => (
  <div className={`text-[0.62rem] font-black tracking-[0.16em] uppercase text-brand-bright ${className}`}>{children}</div>
)

// A dark panel on the card/board surfaces.
export const Panel = ({ children, className = '' }) => (
  <section className={`bg-surface border border-border-strong rounded-xl p-4 sm:p-5 shadow-panel ${className}`}>{children}</section>
)

export function FlameIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M12.6 2.2c.4 3-1.1 4.6-2.6 6.2C8.4 10.1 7 11.7 7 14.3 7 17.5 9.3 20 12 20s5-2.4 5-5.6c0-1.6-.6-2.9-1.4-4 .1 1.2-.4 2.3-1.4 2.8.3-3.6-1.1-7.8-1.6-11Z" />
      <path fill="currentColor" opacity=".45" d="M12 20c-1.6 0-2.9-1.3-2.9-3 0-1.5 1-2.4 1.8-3.3.6-.6 1-1.2 1.1-2 1.3 1 2.9 2.7 2.9 5.1 0 1.8-1.3 3.2-2.9 3.2Z" />
    </svg>
  )
}

export function FreezeIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" />
    </svg>
  )
}

export function VsIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 4 7 7M4 4v4M4 4h4M20 4l-9.5 9.5M20 4v4M20 4h-4M7 17l-3 3M17 17l3 3M6.5 14.5l3 3M17.5 14.5l-3 3" />
    </svg>
  )
}

export function CalendarIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4M12 13.5v3M10.5 15h3" />
    </svg>
  )
}

export function UserIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5v.5H4Z" opacity=".75" />
    </svg>
  )
}

export function GlobeIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  )
}

export function TableIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <rect x="3" y="4" width="18" height="4" rx="1.2" /><rect x="3" y="10" width="18" height="4" rx="1.2" opacity=".7" /><rect x="3" y="16" width="18" height="4" rx="1.2" opacity=".45" />
    </svg>
  )
}

// Badge crest: a shield in the tier's metal with the badge's mark in Bebas.
// Locked crests render as a flat inert silhouette.
export function Crest({ tier = 'bronze', mark = '', locked = false, size = 56, flame = false }) {
  const c = locked ? METALS.locked : METALS[tier]
  const fs = mark.length > 3 ? 12 : mark.length > 2 ? 15 : mark.length > 1 ? 19 : 23
  return (
    <svg viewBox="0 0 56 64" width={size} height={size * 64 / 56} aria-hidden="true">
      <path d="M28 2 52 10v20c0 16-10.5 27-24 32C14.5 57 4 46 4 30V10Z" fill={c.fill} stroke={c.ring} strokeWidth="3" />
      <path d="M28 8 46 14v16c0 12.4-7.8 21-18 25-10.2-4-18-12.6-18-25V14Z" fill="none" stroke={c.ring} strokeOpacity=".35" strokeWidth="1.2" />
      {flame && !locked && <path d="M28.5 13.5c.3 2.1-.8 3.2-1.8 4.3-1.1 1.2-2.1 2.3-2.1 4.1 0 2.2 1.6 4 3.4 4s3.5-1.7 3.5-3.9c0-1.1-.4-2-1-2.8.1.8-.3 1.6-1 1.9.2-2.5-.8-5.4-1-7.6Z" fill={c.text} opacity=".9" />}
      <text x="28" y={flame ? 44 : 38} textAnchor="middle" fontFamily="Bebas Neue, Arial Black, sans-serif" fontSize={fs} fill={c.text} letterSpacing=".5">{mark}</text>
    </svg>
  )
}
