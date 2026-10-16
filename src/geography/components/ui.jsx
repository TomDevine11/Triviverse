// Triviverse Geography's UI primitives. Visually they follow the Triviverse design
// system (tokens, type, surfaces); they are Geography's own so the two products
// can evolve without touching each other.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import BrandMark from '../../components/BrandMark'
import GeoMotif from './GeoMotif'
import { t, tl } from '../strings'
import { geoDayNumber } from '../data/day'

// The chrome bar: TRIVIVERSE GEOGRAPHY lockup → geography home; centre carries the
// game's mark; `right` is the page slot. Pass `howTo` (the game's numbers, e.g.
// { n: 6 }) on a game page to add the goal bar underneath.
export function GeoChrome({ gameId, title, right, howTo }) {
  const header = (
    <header className="flex items-center justify-between gap-3 py-3">
      <Link to="/geography" className="flex items-center gap-2 text-[0.62rem] sm:text-[0.7rem] font-black tracking-[0.12em] hover:opacity-80 transition-opacity">
        <BrandMark className="w-3.5 h-3.5 text-brand-bright" />
        <span className="text-primary">{t('brand')}</span>
        <span className="text-brand-bright">{t('wing')}</span>
      </Link>
      {gameId && (
        <span className="hidden sm:inline-flex items-center gap-2 text-[0.7rem] font-black tracking-[0.1em] text-primary">
          <GeoMotif id={gameId} className="w-4 h-4 text-accent-bright" />
          {title}
          <b className="text-faint font-extrabold text-[0.58rem] tracking-[0.16em]">{t('day')} {geoDayNumber()}</b>
        </span>
      )}
      <span className="text-[0.6rem] font-bold tracking-[0.1em] text-muted">{right}</span>
    </header>
  )
  if (!gameId || !howTo) return header
  return <>{header}<GoalBar gameId={gameId} name={title} vars={howTo} /></>
}

// What you're meant to do, always on screen: the goal and the win line, with the
// full rules one tap away. Never opens by itself.
function GoalBar({ gameId, name, vars }) {
  const [open, setOpen] = useState(false)
  const game = name.charAt(0) + name.slice(1).toLowerCase()
  return (
    <>
      <div className="geo-goal -mt-1 mb-2.5 flex items-center gap-2.5 rounded-xl border border-border bg-surface/70 pl-2.5 pr-1.5 py-1.5">
        <GeoMotif id={gameId} className="w-5 h-5 shrink-0 text-accent-bright" />
        <p className="m-0 min-w-0 flex-1 text-[0.74rem] sm:text-[0.8rem] leading-snug text-secondary">
          <b className="font-bold text-primary">{t(`howto.${gameId}.goal`, vars)}</b>{' '}
          <span className="text-muted">{t(`howto.${gameId}.win`, vars)}</span>
        </p>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
          className="shrink-0 h-8 pl-2 pr-2.5 rounded-lg border border-border-strong text-[0.7rem] font-bold text-secondary hover:text-primary hover:bg-border/60 inline-flex items-center gap-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
          <span className="w-4 h-4 rounded-full bg-accent-tint text-accent-bright text-[0.62rem] font-black flex items-center justify-center" aria-hidden="true">?</span>
          <span className="hidden min-[380px]:inline">{t('howto.button')}</span>
          <span className="sr-only min-[380px]:hidden">{t('howto.button')}</span>
        </button>
      </div>
      <ResultModal open={open} onClose={() => setOpen(false)}>
        <div className="w-full text-left">
          <div className="flex items-center gap-3">
            <GeoMotif id={gameId} className="w-10 h-10 shrink-0 text-accent-bright" />
            <h2 className="m-0 score-number text-[1.9rem] leading-none text-primary">{t('howto.title', { game })}</h2>
          </div>
          <p className="m-0 mt-3 text-[0.88rem] font-bold text-primary">{t(`howto.${gameId}.goal`, vars)}</p>
          <ol className="m-0 mt-3 p-0 list-none flex flex-col gap-2.5">
            {tl(`howto.${gameId}.steps`, vars).map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[0.82rem] leading-snug text-secondary">
                <span className="shrink-0 w-5 h-5 mt-px rounded-full bg-accent-tint text-accent-bright text-[0.66rem] font-black flex items-center justify-center">{i + 1}</span>{step}
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-accent-tint px-3.5 py-2.5">
            <div className="text-[0.6rem] font-black tracking-[0.18em] uppercase text-accent-bright">{t('howto.win')}</div>
            <p className="m-0 mt-0.5 text-[0.84rem] font-bold text-primary">{t(`howto.${gameId}.win`, vars)}</p>
          </div>
          <p className="m-0 mt-3 text-[0.74rem] leading-relaxed text-muted">{t('howto.modes')}</p>
          <button type="button" onClick={() => setOpen(false)}
            className="mt-4 w-full h-11 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright">{t('howto.close')}</button>
        </div>
      </ResultModal>
    </>
  )
}

export function ModeToggle({ mode, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-lg border border-border bg-surface p-0.5 ${className}`}>
      {[['daily', t('daily')], ['unlimited', t('unlimited')]].map(([id, label]) => (
        <button key={id} type="button" aria-pressed={mode === id} onClick={() => mode !== id && onChange(id)}
          className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright ${mode === id ? 'bg-brand text-white' : 'text-muted hover:text-secondary'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

// Flag artwork from flag-icons (MIT), emitted as static assets and fetched per use.
const FLAG_FILES = import.meta.glob('/node_modules/flag-icons/flags/4x3/*.svg', { eager: true, query: '?no-inline', import: 'default' })
export function Flag({ code, className = 'w-6 h-[1.125rem]' }) {
  const url = FLAG_FILES[`/node_modules/flag-icons/flags/4x3/${code.toLowerCase()}.svg`]
  if (!url) return <span className={`${className} rounded-[3px] bg-inert inline-block shrink-0`} aria-hidden="true" />
  return <img src={url} alt="" width="24" height="18" loading="lazy" className={`${className} rounded-[3px] object-cover shrink-0 ring-1 ring-white/10`} />
}

// The finish card. Closable (✕ / backdrop / Escape) to look back at the board.
export function ResultModal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-modal bg-black/70 backdrop-blur-sm overflow-y-auto result-modal-in" onClick={onClose} role="dialog" aria-modal="true"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="result-card relative w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-modal px-5 pt-7 pb-6 flex flex-col items-center" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={onClose} aria-label={t('close')} autoFocus
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-primary hover:bg-border transition-colors text-lg leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">✕</button>
          {children}
        </div>
      </div>
    </div>
  )
}

export const SECONDARY_BTN = 'mt-2 w-full h-11 bg-border/60 hover:bg-border border border-border-strong text-primary text-sm font-bold rounded-lg px-6 transition-colors flex items-center justify-center gap-2'

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" /><path d="m8.3 10.8 7.4-4.4M8.3 13.2l7.4 4.4" />
  </svg>
)

// Native share sheet on phones, clipboard elsewhere.
export function ShareButton({ text, primary = false }) {
  const [copied, setCopied] = useState(false)
  const onShare = async () => {
    if (typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)').matches) {
      try { await navigator.share({ text }) } catch { /* cancelled */ }
      return
    }
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* blocked */ }
  }
  return (
    <button type="button" onClick={onShare}
      className={primary ? 'mt-3 w-full h-12 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-black tracking-[0.04em] flex items-center justify-center gap-2 transition-colors' : SECONDARY_BTN}>
      <ShareIcon /> <span aria-live="polite">{copied ? t('copied') : t('share')}</span>
    </button>
  )
}

export function GeoFooter() {
  const links = [['/about', 'About'], ['/contact', 'Contact'], ['/privacy', 'Privacy'], ['/terms', 'Terms']]
  return (
    <footer className="mt-12 border-t border-border pt-6 pb-10">
      <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {links.map(([href, label]) => <a key={href} href={href} className="text-muted hover:text-brand-bright transition-colors text-sm">{label}</a>)}
      </nav>
      <p className="text-faint text-xs text-center mt-4">Free daily geography games. No account, no download.</p>
    </footer>
  )
}

// Played / Win % / Streak / Max + the result distribution. `labels` names the
// distribution rows (guess counts for Borderline, +0…+n for Overland).
export function StatsBlock({ stats, last, labels }) {
  const max = Math.max(1, ...stats.dist)
  const cells = [
    [stats.played, t('played')],
    [stats.played ? Math.round((stats.wins / stats.played) * 100) : 0, t('winPct')],
    [stats.streak, t('streak')],
    [stats.maxStreak, t('max')],
  ]
  return (
    <div className="w-full mt-4">
      <div className="grid grid-cols-4 gap-2 text-center">
        {cells.map(([v, l]) => (
          <div key={l}><div className="score-number text-[1.7rem] leading-none tabular-nums text-primary">{v}</div><div className="text-[0.58rem] font-black tracking-[0.14em] uppercase text-muted mt-1">{l}</div></div>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-1" aria-label={t('borderline.distribution')}>
        {stats.dist.map((n, i) => (
          <div key={i} className="flex items-center gap-2 text-[0.72rem] font-bold">
            <span className="w-6 text-muted tabular-nums text-right">{labels?.[i] ?? i + 1}</span>
            <span className="flex-1 h-5">
              <span className={`bl-bar h-full min-w-[1.5rem] rounded flex items-center justify-end px-1.5 tabular-nums ${last === i + 1 ? 'bg-success-strong text-white' : 'bg-border-strong text-secondary'}`} style={{ width: `${(n / max) * 100}%` }}>{n}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

