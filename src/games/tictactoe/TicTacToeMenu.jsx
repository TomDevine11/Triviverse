import { useState } from 'react'
import FootballTicTacToe from './FootballTicTacToe'
import TicTacToeVersus from './TicTacToeVersus'
import GameChrome from '../../components/GameChrome'
import GameMotif from '../../components/GameMotif'
import Mark from './Mark'
import { accentVars } from '../../design/accents'
import { useI18n } from '../../i18n'

export default function TicTacToeMenu() {
  const { t } = useI18n()
  const [mode, setMode] = useState(null) // null | 'solo' | 'versus'

  if (mode === 'solo') return <FootballTicTacToe onBackToModes={() => setMode(null)} />
  if (mode === 'versus') return <TicTacToeVersus onBackToModes={() => setMode(null)} />

  return (
    <div className="tv-scene min-h-dvh text-primary" style={accentVars('tictactoe')}>
      <div className="flex flex-col items-center px-4 pb-8 max-w-4xl mx-auto">
        <div className="w-full">
          <GameChrome
            motifId="tictactoe"
            title={t('tictactoe.wordmark')}
            right={
              <span className="inline-flex items-center gap-1">
                <Mark mark="X" size={13} /><Mark mark="O" size={13} />
              </span>
            }
          />
        </div>

        <div className="w-full max-w-lg flex-1 flex flex-col justify-center min-h-[70dvh]">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Mark mark="X" size={38} /><Mark mark="O" size={38} />
            </div>
            <h2 className="score-number text-4xl text-primary mb-2">{t('games.tictactoe.title')}</h2>
            <p className="text-muted text-sm">{t('tictactoe.menuSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMode('solo')}
              className="group bg-card border border-border-strong hover:border-accent rounded-2xl p-6 text-left transition-colors"
            >
              <GameMotif id="tictactoe" className="w-8 h-8 mb-3 text-accent-bright" />
              <div className="text-primary font-bold text-lg">{t('tictactoe.dailyTitle')}</div>
              <div className="text-accent-bright text-[0.62rem] font-black tracking-[0.14em] uppercase mt-1">{t('tictactoe.solo')}</div>
              <div className="text-muted text-xs mt-3 leading-relaxed">{t('tictactoe.dailyDesc')}</div>
            </button>

            <button
              onClick={() => setMode('versus')}
              className="group bg-card border border-border-strong hover:border-accent rounded-2xl p-6 text-left transition-colors"
            >
              <div className="flex items-center gap-1 mb-3"><Mark mark="X" size={26} /><Mark mark="O" size={26} /></div>
              <div className="text-primary font-bold text-lg">{t('tictactoe.versusTitle')}</div>
              <div className="text-accent-bright text-[0.62rem] font-black tracking-[0.14em] uppercase mt-1">{t('tictactoe.versusSub')}</div>
              <div className="text-muted text-xs mt-3 leading-relaxed">{t('tictactoe.versusDesc')}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
