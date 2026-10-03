// "Share my matchday" — the hub's share button. The whole day in one pasteable
// message (every daily played, score by score) carrying a day-challenge link:
// the recipient lands on the hub with a banner to beat your matchday, and each
// game they play shows the head-to-head.

import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n'
import SharePanel from './SharePanel'
import { Overline } from './bits'
import { resultsOn } from '../../social/log'
import { dayText } from '../../social/shareText'
import { encodeDayChallenge, dayChallengeUrl } from '../../social/challenge'
import { getStreak } from '../../social/streak'
import { useShortUrl } from '../../social/shortLinks'
import { gameShortTitle } from '../../social/games'
import { todayIndex, matchdayNumber, dailyPoints, DAILY_GAMES } from '../../data/dailyStats'

export default function DayShareSheet({ onClose }) {
  const { t, locale } = useI18n()
  const results = resultsOn(todayIndex())
  const matchday = matchdayNumber()
  const points = dailyPoints()
  const streak = getStreak().streak
  const payload = encodeDayChallenge({ matchday, points, streak, results })
  const url = useShortUrl(dayChallengeUrl(payload), payload)
  const text = () => dayText({ matchday, results, total: DAILY_GAMES.length, points, streak, url, titleOf: g => gameShortTitle(t, g), locale })

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-toast bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 result-modal-in" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('social.share.shareDay')}>
      <div className="w-full max-w-sm bg-surface border border-border-strong rounded-2xl shadow-modal p-5 result-card" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <Overline>{t('hub.matchday')} {matchday}</Overline>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-primary hover:bg-border">✕</button>
        </div>
        <SharePanel game="day" url={url} text={text} primaryLabel={t('social.share.shareDay')} copiedLabel={t('social.share.dayCopied')} />
      </div>
    </div>,
    document.body,
  )
}
