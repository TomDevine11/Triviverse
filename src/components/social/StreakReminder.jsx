// The finish card's streak bar: the matchday streak, the promise of tomorrow
// ("Come back tomorrow to make it 13"), the countdown, and a labelled Remind me
// button that opens the calendar-reminder sheet (shows the time once one is set).

import { useState } from 'react'
import { useI18n } from '../../i18n'
import { getStreak } from '../../social/streak'
import { loadJson } from '../../social/store'
import { FlameIcon, FreezeIcon, CalendarIcon } from './bits'
import { useCountdown, useSocialTick } from './hooks'
import ReminderSheet from './ReminderSheet'

const TICK = ['streak', 'result']

export default function StreakReminder() {
  const { t } = useI18n()
  useSocialTick(TICK)
  const s = getStreak()
  const countdown = useCountdown()
  const [open, setOpen] = useState(false)
  const pref = loadJson('ftg-reminder-v1', null)
  return (
    <div className="w-full mt-1 bg-board border border-border-strong rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <span className="flex items-center gap-1 text-warn shrink-0">
          <FlameIcon className="w-5 h-5" />
          <b className="score-number text-[1.7rem] leading-none tabular-nums">{s.streak}</b>
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-[0.8rem] font-bold text-primary leading-tight">{t('social.streak.keepAlive', { n: s.streak + 1 })}</span>
          <span className="block text-[0.66rem] text-muted mt-0.5 tabular-nums">
            {t('social.streak.nextMatchday', { t: countdown })}
            {s.freezes > 0 && <span className="text-brand-bright"> · <FreezeIcon className="w-3 h-3 inline -mt-0.5" /> {s.freezes}</span>}
          </span>
        </span>
      </div>
      <button type="button" onClick={() => setOpen(true)}
        className={`w-full h-9 flex items-center justify-center gap-2 border-t border-border-strong text-[0.72rem] font-bold transition-colors ${
          pref ? 'text-success hover:bg-success/5' : 'text-brand-bright hover:bg-brand/10'}`}>
        <CalendarIcon className="w-4 h-4" />
        {pref ? t('social.card.reminderSet', { t: pref.time }) : t('social.card.remindCta')}
      </button>
      {open && <ReminderSheet onClose={() => setOpen(false)} />}
    </div>
  )
}
