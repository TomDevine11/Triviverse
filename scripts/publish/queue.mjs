// Persistent trial queue + schedule config. The queue is the source of truth for what gets posted
// when, and the record we analyse afterwards. Stored under output/ (gitignored).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const QUEUE_FILE = path.join(ROOT, 'output', 'shorts', '_trial-queue.json')

// Defaults — all overridable via prepare-tiktok-trial args. Times are UK-local, spread across the day.
export const DEFAULT_CONFIG = {
  count: 100,
  perDay: 10,
  times: ['09:00', '11:00', '13:00', '15:00', '17:00', '18:00', '19:30', '20:30', '21:30', '22:30'],
  privacy: 'PUBLIC_TO_EVERYONE', // enforced: publisher refuses to post if the API doesn't offer this
  // 100-video weighting across formats (scaled proportionally for other counts).
  weights: { 'who-am-i': 20, 'winner-stays-on': 20, 'career-path': 15, 'guess-the-club': 15, 'played-alongside': 10, 'football-pointless': 10, 'player-between-clubs': 10 },
  timezone: 'Europe/London (uses this machine\'s local clock)',
}

export const loadQueue = () => (existsSync(QUEUE_FILE) ? JSON.parse(readFileSync(QUEUE_FILE, 'utf8')) : null)
export const saveQueue = (q) => writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2) + '\n')

// Absolute time for day `dayOffset` (0-based from startDate) at "HH:MM" local.
export function slotTime(startDate, dayOffset, hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(startDate)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d
}

export const dueItems = (queue, now = Date.now()) => queue.items.filter((it) => it.status === 'scheduled' && new Date(it.scheduledAt).getTime() <= now)
