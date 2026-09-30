// "Remind me" sheet: a recurring calendar reminder for the daily matchday.
// Defaults to 12:55 on weekdays — the traffic peaks at UK lunchtime on
// weekdays (GA4, Sept 2026), i.e. people play at their desks.

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n'
import { downloadIcs, googleCalendarUrl, outlookUrl } from '../../social/reminder'
import { saveJson, loadJson } from '../../social/store'
import { track } from '../../utils/analytics'
import { CalendarIcon } from './bits'

const PREF_KEY = 'ftg-reminder-v1'
const opt = 'h-11 flex items-center justify-center rounded-lg border text-sm font-bold transition-colors'

export default function ReminderSheet({ onClose }) {
  const { t, locale } = useI18n()
  const pref = loadJson(PREF_KEY, null) || { time: '12:55', weekdaysOnly: true }
  const [time, setTime] = useState(pref.time)
  const [weekdaysOnly, setWeekdays] = useState(pref.weekdaysOnly)
  const [done, setDone] = useState(false)
  const opts = { time, weekdaysOnly, locale }
  const remember = (method) => { saveJson(PREF_KEY, { time, weekdaysOnly, set: Date.now(), method }); track('reminder_set', { method, time }) }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-toast bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 result-modal-in" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('social.reminder.title')}>
      <div className="w-full max-w-sm bg-surface border border-border-strong rounded-2xl shadow-modal p-5 result-card" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-brand-bright">
          <CalendarIcon className="w-5 h-5" />
          <h2 className="text-primary font-black text-base m-0">{t('social.reminder.title')}</h2>
        </div>
        <p className="text-muted text-[0.8rem] mt-2 mb-4">{t('social.reminder.body')}</p>

        <label className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[0.62rem] font-black tracking-[0.16em] uppercase text-muted">{t('social.reminder.time')}</span>
          <input type="time" value={time} onChange={e => setTime(e.target.value || '12:55')}
            className="bg-board border border-border-strong rounded-lg px-3 h-10 text-primary text-body-lg tabular-nums focus:outline-none focus:border-brand [color-scheme:dark]" />
        </label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button type="button" onClick={() => setWeekdays(true)} className={`${opt} ${weekdaysOnly ? 'border-brand bg-brand-tint text-primary' : 'border-border-strong text-muted hover:text-primary'}`}>{t('social.reminder.weekdays')}</button>
          <button type="button" onClick={() => setWeekdays(false)} className={`${opt} ${!weekdaysOnly ? 'border-brand bg-brand-tint text-primary' : 'border-border-strong text-muted hover:text-primary'}`}>{t('social.reminder.everyday')}</button>
        </div>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => { downloadIcs(opts); remember('ics'); setDone(true) }}
            className="h-11 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-bold transition-colors">{t('social.reminder.ics')}</button>
          <div className="grid grid-cols-2 gap-2">
            <a href={googleCalendarUrl(opts)} target="_blank" rel="noopener noreferrer" onClick={() => remember('google')}
              className={`${opt} border-border-strong bg-border/40 hover:bg-border text-secondary`}>{t('social.reminder.google')}</a>
            <a href={outlookUrl(opts)} target="_blank" rel="noopener noreferrer" onClick={() => remember('outlook_web')}
              className={`${opt} border-border-strong bg-border/40 hover:bg-border text-secondary`}>{t('social.reminder.outlookWeb')}</a>
          </div>
        </div>
        {done && <p className="text-success text-[0.75rem] mt-3 mb-0">{t('social.reminder.done')}</p>}
        <button type="button" onClick={onClose} className="mt-4 w-full h-10 text-muted hover:text-primary text-sm font-bold">{t('social.reminder.close')}</button>
      </div>
    </div>,
    document.body,
  )
}
