import { Link } from 'react-router-dom'
import GameMotif from './GameMotif'
import { POOL, shortTitle } from './nextGames'
import { useI18n } from '../i18n'
import { DAILY_GAMES, playedToday } from '../data/dailyStats'
import { GAME_ACCENTS } from '../design/accents'
import { track } from '../utils/analytics'

// The finish card's right column (desktop) / lower half (mobile): the day's
// progress toward a perfect day, then ONE commanded next game — the only
// brand-filled CTA on the card — plus four more unplayed dailies. `exclude` is
// the current game's dailyStats key. `countCurrent` treats that game as played
// today even before its recordResult effect lands (the card can render first);
// pass false for practice rounds (501 unlimited/build, Tic-Tac-Toe 1v1). Clicks are tracked as `upnext_click` so the
// cross-sell's effect on pages/session can be measured.


function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export default function NextFixture({ exclude, countCurrent = true }) {
  const { t, lp } = useI18n()
  const isDone = g => playedToday(g) || (countCurrent && g === exclude)
  const done = DAILY_GAMES.filter(isDone).length
  const left = DAILY_GAMES.length - done
  const next = POOL.filter(g => g.stats !== exclude && !playedToday(g.stats))
  const [hero, ...rest] = next
  const tiles = rest.slice(0, 4)
  const onPick = (g, slot) => () => track('upnext_click', { from: exclude, to: g.stats, slot })

  return (
    <div className="flex flex-col gap-4">
      {/* Matchday progress — perfect-day tracker in each game's colour */}
      <div>
        <div className="flex items-end gap-4 md:pr-10">
          <div className="flex-1 min-w-0">
            <div className="text-[0.62rem] font-black tracking-[0.16em] uppercase text-brand-bright">{t('next.yourMatchday')}</div>
            <div className="text-[0.8rem] text-secondary mt-1.5">
              {left > 0
                ? <>{t('next.toPerfect', { n: left })} · <b className="text-warn">{t('next.doublePoints')}</b></>
                : <b className="text-warn">{t('hub.perfectDay')}</b>}
            </div>
          </div>
          <div className="score-number text-4xl leading-none tabular-nums">{done}<span className="text-faint">/{DAILY_GAMES.length}</span></div>
        </div>
        <div className="flex gap-1 mt-3" aria-hidden="true">
          {DAILY_GAMES.map(g => (
            <span
              key={g}
              className={`flex-1 h-2 rounded-sm ${isDone(g) ? '' : 'bg-inert'}`}
              style={isDone(g) ? { background: GAME_ACCENTS[g]?.accent } : undefined}
            />
          ))}
        </div>
      </div>

      {hero ? (
        <Link
          to={lp(hero.to)}
          onClick={onPick(hero, 0)}
          className="group flex flex-wrap md:flex-nowrap items-center gap-4 border border-border-strong rounded-2xl p-4 md:p-5 bg-surface hover:border-brand transition-colors"
          style={{ backgroundImage: `radial-gradient(90% 120% at 100% 0%, ${GAME_ACCENTS[hero.stats]?.tint}, transparent 60%)` }}
        >
          <span className="w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shrink-0" style={{ background: GAME_ACCENTS[hero.stats]?.tint }}>
            <GameMotif id={hero.to.slice(1)} className="w-9 h-9 md:w-12 md:h-12" style={{ color: GAME_ACCENTS[hero.stats]?.bright }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[0.62rem] font-black tracking-[0.16em] uppercase text-brand-bright mb-1.5">{t('next.playThisNext')}</span>
            <span className="block score-number text-3xl leading-none text-primary">{t(`games.${hero.to.slice(1)}.title`)}</span>
            <span className="block text-sm text-muted mt-1.5">{t(`games.${hero.to.slice(1)}.tagline`)}</span>
          </span>
          <span className="w-full md:w-auto h-12 px-5 rounded-xl bg-brand group-hover:bg-brand-hover text-white text-[0.95rem] font-extrabold flex items-center justify-center gap-2 whitespace-nowrap transition-colors">
            {t('next.playNow')} <ArrowIcon />
          </span>
        </Link>
      ) : (
        <div className="border border-border-strong rounded-2xl p-5 bg-surface text-center">
          <div className="score-number text-3xl text-warn">{t('hub.perfectDay')}</div>
          <p className="text-sm text-muted mt-1.5">{t('common.comeBackTomorrow')}</p>
        </div>
      )}

      {tiles.length > 0 && (
        <div className="grid grid-cols-4 gap-2 md:gap-2.5">
          {tiles.map((g, i) => (
            <Link
              key={g.to}
              to={lp(g.to)}
              onClick={onPick(g, i + 1)}
              className="h-[5.5rem] md:h-[6.5rem] flex flex-col justify-between border border-border rounded-xl p-2.5 md:p-3.5 bg-surface hover:border-brand transition-colors"
              style={{ backgroundImage: `radial-gradient(90% 90% at 100% 0%, ${GAME_ACCENTS[g.stats]?.tint}, transparent 65%)` }}
            >
              <GameMotif id={g.to.slice(1)} className="w-6 h-6 md:w-8 md:h-8" style={{ color: GAME_ACCENTS[g.stats]?.bright }} />
              <span className="text-[0.7rem] md:text-sm font-extrabold leading-tight text-primary">{shortTitle(t, g.to.slice(1))}</span>
            </Link>
          ))}
        </div>
      )}

      <Link to={lp('/')} className="self-center md:self-end text-sm font-bold text-brand-bright hover:text-primary transition-colors">
        {t('next.allGames', { n: DAILY_GAMES.length })}
      </Link>
    </div>
  )
}
