// Client-side league state: the list of leagues you're in (cached so the hub
// and finish card can show your standing without waiting on the network), and
// the React hooks the pages use. The API (worker/api.js) is the source of truth.

import { useEffect, useState } from 'react'
import { loadJson, saveJson, emit, subscribe } from './store'
import { myLeagues, today as apiToday } from './api'
import { todayIndex } from '../data/dailyStats'
import { bump, counters, checkBadges } from './badges'

const CACHE_KEY = 'ftg-leagues-v1'
const TTL_MS = 60_000

export const cachedLeagues = () => loadJson(CACHE_KEY, null)?.leagues || []

export async function refreshLeagues(force = false) {
  const cache = loadJson(CACHE_KEY, null)
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.leagues
  const res = await myLeagues(todayIndex())
  if (!res || res.error) return cache?.leagues || []
  saveJson(CACHE_KEY, { at: Date.now(), leagues: res.leagues })
  emit({ type: 'leagues' })
  return res.leagues
}

export function forgetLeaguesCache() {
  saveJson(CACHE_KEY, null)
}

// Your leagues, cached-first then refreshed. Re-reads whenever a daily is
// recorded (points just changed) or a league is joined/left.
export function useMyLeagues() {
  const [leagues, setLeagues] = useState(cachedLeagues)
  useEffect(() => {
    let alive = true
    const load = (force) => refreshLeagues(force).then(l => { if (alive) setLeagues(l) })
    load(false)
    const off = subscribe(e => {
      if (e?.type === 'result') setTimeout(() => load(true), 1200) // after the submission lands
      if (e?.type === 'leagues') setLeagues(cachedLeagues())
    })
    return () => { alive = false; off() }
  }, [])
  return leagues
}

// Live "N playing today" count, polled gently while the page is open.
export function useToday() {
  const [data, setData] = useState(null)
  useEffect(() => {
    let alive = true
    const load = () => apiToday(todayIndex()).then(d => { if (alive && d && !d.error) setData(d) })
    load()
    const id = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [])
  return data
}

// Record a weekly title once per (league, week) so the Champions badge fires.
export function noteChampion(code, weekStart) {
  const key = `title:${code}:${weekStart}`
  if (counters()[key]) return
  bump(key)
  bump('leagueTitles')
  checkBadges()
}
