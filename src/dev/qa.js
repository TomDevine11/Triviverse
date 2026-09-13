// Developer-only Question QA mode. TEMPORARY — safe to delete this folder and the
// small call-sites that reference it to remove QA entirely.
//
// Activation: open ANY game with `?qa=1` in the URL (persists in localStorage so it
// survives navigation); `?qa=0` turns it off. When active, a supported game starts
// in its existing practice/unlimited path (so nothing is recorded and the daily is
// untouched) but renders content by a QA-controlled INDEX, and shows a Skip bar for
// cycling the deterministic generated inventory. It never changes daily selection,
// scoring, generated data, or normal-player behaviour — it only chooses which
// deterministic question index to render, and only ever for a developer who set the
// flag on their own browser.
import { useState, useCallback } from 'react'

const KEY = 'tv_qa'

// Honour ?qa=1 / ?qa=0 (persisted), else the stored flag. Read once per mount.
export function readQaFlag() {
  try {
    const p = new URLSearchParams(window.location.search)
    if (p.has('qa')) {
      const on = p.get('qa') !== '0'
      localStorage.setItem(KEY, on ? '1' : '0')
      return on
    }
    return localStorage.getItem(KEY) === '1'
  } catch { return false }
}

export function qaActive() { try { return localStorage.getItem(KEY) === '1' } catch { return false } }

// Per-game cursor over the deterministic inventory, persisted in sessionStorage so a
// skip survives a refresh but doesn't leak across browser sessions. `total > 0`
// wraps (e.g. Pointless has a bounded array); day-seeded games pass 0 (unbounded).
export function useQa(gameId, total = 0) {
  const [active] = useState(readQaFlag)
  const [index, setIndex] = useState(() => {
    try { return Number(sessionStorage.getItem(`${KEY}_${gameId}`)) || 0 } catch { return 0 }
  })
  const goto = useCallback((i) => {
    const n = total > 0 ? ((i % total) + total) % total : Math.max(0, i)
    try { sessionStorage.setItem(`${KEY}_${gameId}`, String(n)) } catch { /* ignore */ }
    setIndex(n)
  }, [gameId, total])
  const next = useCallback(() => goto(index + 1), [goto, index])
  const prev = useCallback(() => goto(index - 1), [goto, index])
  return { active, index, total, next, prev, goto }
}
