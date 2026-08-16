import { useState, useEffect } from 'react'

// Hostname-gated PREVIEW badge. Renders ONLY on non-production hosts (e.g. Cloudflare
// per-PR preview URLs) — never on triviverse.com and not in local dev — so it is
// immediately obvious when reviewing a branch preview rather than production. Mounts
// client-side only (no SSR/prerender output, no hydration mismatch). Self-contained inline
// styles + pointer-events:none so it can neither affect nor block the app.
const PROD_HOSTS = ['triviverse.com', 'www.triviverse.com']
const DEV_HOSTS = ['localhost', '127.0.0.1']

export default function PreviewBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const host = window.location.hostname
    if (!PROD_HOSTS.includes(host) && !DEV_HOSTS.includes(host)) setShow(true)
  }, [])
  if (!show) return null
  return (
    <div
      aria-label="Preview environment — not production"
      style={{
        position: 'fixed', bottom: 12, left: 12, zIndex: 2147483647,
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px',
        borderRadius: 9999, background: 'rgba(180, 83, 9, 0.95)', color: '#fff',
        font: '700 11px/1 ui-sans-serif, system-ui, sans-serif', letterSpacing: '0.08em',
        textTransform: 'uppercase', boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
        pointerEvents: 'none', userSelect: 'none',
      }}
    >
      <span aria-hidden="true">⚠</span> Preview — not production
    </div>
  )
}
