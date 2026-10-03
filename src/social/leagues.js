// Client-side league state: the list of leagues you're in (cached so the hub
// and finish card can show your standing without waiting on the network), and
// the React hooks the pages use. The API (worker/api.js) is the source of truth.

import { useEffect, useState } from 'react'
import { loadJson, saveJson, emit, subscribe } from './store'
import { myLeagues, today as apiToday, worldRank } from './api'
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

// Live "N playing today" count: fetched on load, then every five minutes while
// the tab is visible (and straight away when it comes back into view). The
// Worker edge-caches it for a minute, so this is cheap either way.
const TODAY_POLL_MS = 5 * 60_000
export function useToday() {
  const [data, setData] = useState(null)
  useEffect(() => {
    let alive = true
    const load = () => apiToday(todayIndex()).then(d => { if (alive && d && !d.error) setData(d) })
    const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'
    load()
    const id = setInterval(() => { if (visible()) load() }, TODAY_POLL_MS)
    const onVis = () => { if (visible()) load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
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

// The league worth showing on the hub: the most winnable chase (smallest gap to
// the player above you); if you lead every league, the one you lead by least.
export function chaseLeague(leagues) {
  if (!leagues?.length) return null
  const chasing = leagues.filter(l => l.gapToNext > 0).sort((a, b) => a.gapToNext - b.gapToNext)
  if (chasing.length) return chasing[0]
  return [...leagues].sort((a, b) => (a.leadOver || 0) - (b.leadOver || 0))[0]
}

// Your world rank for today (or yesterday's, before you've played). Refreshed
// after every recorded daily, once the submission has landed.
export function useWorldRank() {
  const [data, setData] = useState(null)
  useEffect(() => {
    let alive = true
    const load = () => worldRank(todayIndex()).then(d => { if (alive && d && !d.error) setData(d) })
    load()
    const off = subscribe(e => { if (e?.type === 'result') setTimeout(load, 1500) })
    return () => { alive = false; off() }
  }, [])
  return data
}

// One-line standing for a league from /me/leagues: "20 pts to catch Jo",
// "22 pts clear of Dave", "Top of the table". Shared by the hub and finish card.
export function chaseLine(l, t) {
  if (l.gapToNext > 0) return l.aboveName ? t('social.leagues.nextUp', { n: l.gapToNext, name: l.aboveName }) : t('social.leagues.ptsBehind', { n: l.leaderPts - l.pts })
  if (l.leadOver > 0 && l.belowName) return t('social.race.clear', { n: l.leadOver, name: l.belowName })
  return l.rank === 1 ? t('social.leagues.leading') : t('social.leagues.ptsBehind', { n: l.leaderPts - l.pts })
}

// Your leagues as this daily's result moved them: each carries `gained` (the
// points it added) and `rankBefore`. Re-fetched once the result submission
// lands, since the card renders before the API has it.
export function useLeagueImpact(game) {
  const [leagues, setLeagues] = useState(null)
  useEffect(() => {
    let alive = true
    const load = () => myLeagues(todayIndex(), game).then(r => { if (alive && r && !r.error) setLeagues(r.leagues) })
    load()
    const off = subscribe(e => { if (e?.type === 'result') setTimeout(load, 1200) })
    return () => { alive = false; off() }
  }, [game])
  return leagues
}
