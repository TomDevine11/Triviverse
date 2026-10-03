// Tiny localStorage wrapper for the social layer. Every read/write is guarded:
// storage can be missing (private mode, SSR/prerender, blocked site data) and
// the site must still work without it — it just forgets.

export const PREFIX = 'ftg-'

export function loadJson(key, fallback = null) {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    return raw == null ? fallback : JSON.parse(raw)
  } catch { return fallback }
}

export function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

export function removeKey(key) {
  try { localStorage.removeItem(key) } catch { /* storage unavailable */ }
}

// Every key this site owns (the ftg- namespace) — what a device transfer moves.
export function ownedKeys() {
  try {
    const out = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) out.push(k)
    }
    return out
  } catch { return [] }
}

// Cross-component "something social changed" signal (same tab). Components that
// show derived state (hub chips, toasts) subscribe instead of polling storage.
const EVENT = 'tv-social'
export function emit(detail) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail }))
}
export function subscribe(fn) {
  if (typeof window === 'undefined') return () => {}
  const h = (e) => fn(e.detail)
  window.addEventListener(EVENT, h)
  return () => window.removeEventListener(EVENT, h)
}
