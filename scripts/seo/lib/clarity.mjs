// Microsoft Clarity Data Export API (Priority 2). Behavioural signal — where
// users rage-click, dead-click, scroll and drop off. Complements GA4's "what"
// with "why". The free API returns up to the last 3 days of aggregated insights.
// Inert without a project data-export token.

import { config } from './config.mjs'

const URL = 'https://www.clarity.ms/export-data/api/v1/project-live-insights'

export function clarityAvailable() { return !!config.clarity.token }

// numOfDays: 1–3. dimensions: e.g. ['URL'], ['Device']. Returns Clarity's
// aggregated metrics (sessions, engagement, rage/dead clicks, scroll depth…).
export async function clarityInsights({ numOfDays = 3, dimensions = ['URL'] } = {}) {
  if (!config.clarity.token) return null
  const qs = new URLSearchParams()
  qs.set('numOfDays', String(numOfDays))
  dimensions.slice(0, 3).forEach((d, i) => qs.set(`dimension${i + 1}`, d))
  const res = await fetch(`${URL}?${qs}`, { headers: { Authorization: `Bearer ${config.clarity.token}` } })
  if (!res.ok) return { error: `Clarity API ${res.status}` }
  return res.json()
}
