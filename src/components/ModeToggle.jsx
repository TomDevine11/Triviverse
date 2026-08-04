// Daily ⇄ Unlimited switch shown at the top of every game.
//   • Daily     — one deterministic puzzle per day; records stats & streaks.
//   • Unlimited — random, replayable practice; never touches stats.
import { useI18n } from '../i18n'

export default function ModeToggle({ mode, onChange, className = '', modes }) {
  const { t } = useI18n()
  // Default: the Daily ⇄ Unlimited pair. Callers can pass a custom `modes` list
  // (e.g. Daily · Random · Build your own) — one of them may be an action, not a
  // persistent mode, in which case it simply never shows as active.
  const MODES = modes || [['daily', t('common.daily')], ['unlimited', t('common.unlimited')]]
  return (
    <div className={`inline-flex rounded-lg border border-border bg-surface p-0.5 ${className}`}>
      {MODES.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => mode !== id && onChange(id)}
          className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
            mode === id ? 'bg-brand text-white' : 'text-muted hover:text-secondary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
