// "Remind me" — a recurring calendar event for the daily matchday. No push
// server needed: an .ics file (Outlook desktop, Apple Calendar, anything) and a
// Google Calendar template link, both with a weekly RRULE. The audience plays
// at their desks at lunchtime, so the default is 12:55 on weekdays.

import { SITE_URL } from '../utils/site'

const pad = (n) => String(n).padStart(2, '0')
const WEEKDAYS = 'MO,TU,WE,TH,FR'
const EVERYDAY = 'MO,TU,WE,TH,FR,SA,SU'

// Next occurrence of hh:mm (today if still ahead, else tomorrow), local time.
function nextStart(time) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setSeconds(0, 0)
  d.setHours(h, m)
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1)
  return d
}
const localStamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
const utcStamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function buildIcs({ time = '12:55', weekdaysOnly = true, minutes = 10, locale = 'en' } = {}) {
  const start = nextStart(time)
  const end = new Date(start.getTime() + minutes * 60000)
  const es = locale === 'es'
  const summary = es ? '⚽ Jornada de Triviverse' : '⚽ Triviverse matchday'
  const desc = es ? `Los juegos diarios de hoy ya están disponibles. No pierdas tu racha 🔥 ${SITE_URL}` : `Today's dailies are live. Keep your streak alive 🔥 ${SITE_URL}`
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Triviverse//Matchday//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:matchday-${Date.now()}@triviverse.com`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${localStamp(start)}`,
    `DTEND:${localStamp(end)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${weekdaysOnly ? WEEKDAYS : EVERYDAY}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc}`,
    `URL:${SITE_URL}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${summary}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs(opts) {
  const blob = new Blob([buildIcs(opts)], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'triviverse-matchday.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export function googleCalendarUrl({ time = '12:55', weekdaysOnly = true, minutes = 10, locale = 'en' } = {}) {
  const start = nextStart(time)
  const end = new Date(start.getTime() + minutes * 60000)
  const es = locale === 'es'
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: es ? '⚽ Jornada de Triviverse' : '⚽ Triviverse matchday',
    details: es ? `Los juegos diarios ya están disponibles 🔥 ${SITE_URL}` : `Today's dailies are live — keep the streak alive 🔥 ${SITE_URL}`,
    dates: `${localStamp(start)}/${localStamp(end)}`,
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${weekdaysOnly ? WEEKDAYS : EVERYDAY}`,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London',
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

// Outlook on the web can't take a recurrence in a deeplink; the .ics covers
// Outlook desktop. This opens a single prefilled event the user can set to repeat.
export function outlookUrl({ time = '12:55', minutes = 10, locale = 'en' } = {}) {
  const start = nextStart(time)
  const end = new Date(start.getTime() + minutes * 60000)
  const p = new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent',
    subject: locale === 'es' ? '⚽ Jornada de Triviverse' : '⚽ Triviverse matchday',
    body: SITE_URL, startdt: start.toISOString(), enddt: end.toISOString(),
  })
  return `https://outlook.office.com/calendar/0/deeplink/compose?${p}`
}
