// Announces newly earned badges (social/badges.js emits them). Mounted once in
// App; queues several unlocks and shows them one at a time.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { subscribe } from '../../social/store'
import { Crest } from './bits'

export default function BadgeToast() {
  const { t, lp } = useI18n()
  const [queue, setQueue] = useState([])

  useEffect(() => subscribe(e => {
    if (e?.type === 'badges' && e.fresh?.length) setQueue(q => [...q, ...e.fresh])
  }), [])

  useEffect(() => {
    if (!queue.length) return
    const id = setTimeout(() => setQueue(q => q.slice(1)), 4200)
    return () => clearTimeout(id)
  }, [queue])

  const b = queue[0]
  if (!b) return null
  const [name, desc] = t(`social.badges.names.${b.id}`) || [b.id, '']
  return (
    <Link key={b.id} to={lp('/me')} role="status" style={{ transform: 'translateX(-50%)' }}
      className="fixed bottom-4 left-1/2 z-toast toast-in flex items-center gap-3 bg-surface border border-warn/50 rounded-2xl shadow-float pl-2 pr-5 py-2 min-w-[16rem] max-w-[calc(100%-2rem)]">
      <Crest tier={b.tier} mark={b.mark} flame={b.flame} size={40} />
      <span className="min-w-0">
        <span className="block text-[0.58rem] font-black tracking-[0.16em] text-warn">{t('social.badges.unlocked')}</span>
        <span className="block text-sm font-black text-primary leading-tight">{name}</span>
        <span className="block text-[0.7rem] text-muted truncate">{desc}</span>
      </span>
    </Link>
  )
}
