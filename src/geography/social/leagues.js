// Your geography leagues, cached so the hub can show your standing without
// waiting on the network, then refreshed. The API (/api/geo) is the source of truth.
import { useEffect, useState } from 'react'
import { myLeagues } from './api'
import { geoDay } from '../data/day'

const CACHE_KEY = 'tvg-leagues-v1'
const TTL_MS = 60_000
const EVENT = 'tvg-social'

const readJson = (k, f) => { try { const r = localStorage.getItem(k); return r == null ? f : JSON.parse(r) } catch { return f } }
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }

// "Something in geography's competition changed" (a result landed, a league was joined or left).
export function emitGeo(type) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: { type } }))
}

export const cachedLeagues = () => readJson(CACHE_KEY, null)?.leagues || []

export async function refreshLeagues(force = false) {
  const cache = readJson(CACHE_KEY, null)
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.leagues
  const res = await myLeagues(geoDay())
  if (!res || res.error) return cache?.leagues || []
  writeJson(CACHE_KEY, { at: Date.now(), leagues: res.leagues })
  return res.leagues
}

export function useGeoLeagues() {
  const [leagues, setLeagues] = useState(cachedLeagues)
  useEffect(() => {
    let alive = true
    const load = (force) => refreshLeagues(force).then(l => { if (alive) setLeagues(l) })
    load(false)
    const on = (e) => { if (e.detail?.type === 'result' || e.detail?.type === 'leagues') setTimeout(() => load(true), 800) }
    window.addEventListener(EVENT, on)
    return () => { alive = false; window.removeEventListener(EVENT, on) }
  }, [])
  return leagues
}

// The league worth showing on the hub: the closest chase; if you lead them all,
// the one you lead by least. (Same rule as football's hub.)
export function chaseLeague(leagues) {
  if (!leagues?.length) return null
  const chasing = leagues.filter(l => l.gapToNext > 0).sort((a, b) => a.gapToNext - b.gapToNext)
  if (chasing.length) return chasing[0]
  return [...leagues].sort((a, b) => (a.leadOver || 0) - (b.leadOver || 0))[0]
}

export function chaseLine(l, t) {
  if (l.gapToNext > 0) return l.aboveName ? t('leagues.nextUp', { n: l.gapToNext, name: l.aboveName }) : t('leagues.ptsBehind', { n: l.leaderPts - l.pts })
  if (l.leadOver > 0 && l.belowName) return t('leagues.clear', { n: l.leadOver, name: l.belowName })
  return t('leagues.leading')
}
