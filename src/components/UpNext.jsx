import { Link } from 'react-router-dom'
import GameMotif from './GameMotif'
import { useI18n } from '../i18n'
import { playedToday } from '../data/dailyStats'

// The finish-card cross-sell (design-system.md §7): offer the first two dailies
// still on KICK OFF today, plus the all-games link back to the matchday board.
// `exclude` is the current game's dailyStats key.
const POOL = [
  { stats: 'wordle', to: '/wordle' },
  { stats: 'tenable', to: '/tenable' },
  { stats: 'tictactoe', to: '/tictactoe' },
  { stats: 'teammates', to: '/teammates' },
  { stats: 'careers', to: '/career-path' },
  { stats: 'connections', to: '/connections' },
  { stats: 'higherlower', to: '/higher-or-lower' },
  { stats: '501', to: '/501' },
  { stats: 'pointless', to: '/football-pointless' },
]

export default function UpNext({ exclude }) {
  const { t, lp } = useI18n()
  const next = POOL.filter(g => g.stats !== exclude && !playedToday(g.stats)).slice(0, 2)
  return (
    <div className="w-full flex items-center justify-center gap-2 flex-wrap mt-3 pt-3 border-t border-border">
      <span className="text-[0.56rem] font-black tracking-[0.16em] text-faint">{t('common.upNext')}</span>
      {next.map(g => {
        const id = g.to.slice(1)
        return (
          <Link key={g.to} to={lp(g.to)} className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary border border-border rounded-full px-2.5 py-1 hover:border-brand transition-colors">
            <GameMotif id={id} className="w-4 h-4 text-accent-bright" />
            {t(`games.${id}.title`).replace(/^Football /, '').replace(/ de Fútbol$/, '')}
            <i className="not-italic text-[0.5rem] font-black text-brand-bright tracking-[0.08em]">KO</i>
          </Link>
        )
      })}
      <Link to={lp('/')} className="text-xs font-bold text-brand-bright border border-brand/40 rounded-full px-2.5 py-1 hover:border-brand transition-colors">{t('common.allGames2')}</Link>
    </div>
  )
}
