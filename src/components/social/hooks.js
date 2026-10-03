// Hooks + formatters shared by the social surfaces (split from bits.jsx so that
// file exports components only — keeps React fast refresh working).
import { useEffect, useState } from 'react'
import { subscribe } from '../../social/store'

// hh:mm:ss until local midnight (the next matchday), ticking every second.
export function useCountdown() {
  const calc = () => {
    const now = new Date()
    const s = Math.max(0, 86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()))
    const p = (n) => String(n).padStart(2, '0')
    return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`
  }
  const [v, setV] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setV(calc()), 1000)
    return () => clearInterval(id)
  }, [])
  return v
}

// Re-render when the social layer signals a change (results, rivals, leagues…).
export function useSocialTick(types) {
  const [n, setN] = useState(0)
  useEffect(() => subscribe(e => { if (!types || types.includes(e?.type)) setN(x => x + 1) }), [types])
  return n
}

export const ordinal = (n, locale = 'en') => {
  if (locale === 'es') return `${n}º`
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export const fmt = (n, locale = 'en') => Number(n || 0).toLocaleString(locale === 'es' ? 'es-ES' : 'en-GB')
