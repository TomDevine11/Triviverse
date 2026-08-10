// Deterministic reconstruction of every past daily answer, powering the
// crawlable "answers" archive pages (AnswersPage.jsx). Every game exposes a
// pure <thing>ForDay(dayIndex) selector — the same one its Daily mode uses — so
// past answers need no stored data: they are recomputed on demand. This is what
// makes the archive a zero-maintenance link magnet and "answers/today" capture.
import { getWordlePlayerForDay } from '../data/wordle'
import { getTargetForDay as getTeammatesForDay } from '../data/teammates'
import { getTargetForDay as getCareersForDay } from '../data/careers'
import { getTenableQuestionForDay } from '../data/tenable'
import { getConnectionsForDay } from '../data/connections'
import { todayIndex, matchdayNumber } from '../data/dailyStats'

// MATCHDAY_EPOCH is private to dailyStats; derive it (both operands exported).
// Matchday 1 is the first playable day → dayIndex === epoch + 1.
export const matchdayEpoch = () => todayIndex() - matchdayNumber()

// A day index → a readable calendar date. dayIndex counts local days from the
// Unix epoch, so format the corresponding UTC-midnight instant to avoid drift.
export function dateForDay(dayIndex) {
  return new Date(dayIndex * 86400000).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

// Per-game answer extractor + the game accent to theme its archive page. Keyed
// by the game's own route so App routing can pass `/wordle` → `/wordle/answers`.
export const ANSWER_GAMES = {
  '/wordle': {
    accent: 'wordle', kind: 'word',
    forDay: (d) => { const p = getWordlePlayerForDay(d); return { primary: p.displaySurname, secondary: p.fullName, flag: p.flag } },
  },
  '/teammates': {
    accent: 'teammates', kind: 'player',
    forDay: (d) => ({ primary: getTeammatesForDay(d).name }),
  },
  '/career-path': {
    accent: 'careers', kind: 'player',
    forDay: (d) => ({ primary: getCareersForDay(d).name }),
  },
  '/tenable': {
    accent: 'tenable', kind: 'list',
    forDay: (d) => { const q = getTenableQuestionForDay(d); return { primary: q.title, list: q.answers.map(a => ({ text: a.text, detail: a.detail })) } },
  },
  '/connections': {
    accent: 'connections', kind: 'groups',
    forDay: (d) => ({ groups: getConnectionsForDay(d).groups.map(g => ({ label: g.label, players: g.players })) }),
  },
}

// Reasonable page lengths: rich multi-line answers (Tenable lists, Connections
// grids) get fewer rows than one-line answers so the page stays scannable.
const DEFAULT_LIMIT = { list: 30, groups: 30, word: 90, player: 90 }

// Build a game's archive: today's answer (separated so the page can spoiler-gate
// it) plus past days, newest first, back to launch and capped for length.
export function buildArchive(gamePath, { limit } = {}) {
  const game = ANSWER_GAMES[gamePath]
  if (!game) return { today: null, past: [], kind: null }
  const cap = limit ?? DEFAULT_LIMIT[game.kind] ?? 90
  const t = todayIndex()
  const epoch = matchdayEpoch()
  const entry = (d) => {
    try { return { dayIndex: d, matchday: d - epoch, date: dateForDay(d), answer: game.forDay(d) } }
    catch { return null } // a day that can't be reconstructed (e.g. generator miss) is skipped
  }
  const today = entry(t)
  const past = []
  for (let d = t - 1; d >= epoch + 1 && past.length < cap; d--) {
    const e = entry(d)
    if (e) past.push(e)
  }
  return { today, past, kind: game.kind }
}
