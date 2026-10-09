import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Hub from './pages/Hub'
import GamePage from './seo/GamePage'
import ScrollToTop from './components/ScrollToTop'
import Analytics from './components/Analytics'
import PreviewBanner from './components/PreviewBanner'
import ChallengeBanner from './components/social/ChallengeBanner'
import BadgeToast from './components/social/BadgeToast'
import SocialBoot from './components/social/SocialBoot'

// Lazy-load each game so its (sometimes heavy) data only downloads on its own
// route — the hub and lighter games stay fast, which helps Core Web Vitals.
const Football501 = lazy(() => import('./games/football501/Football501'))
const FootballBingo = lazy(() => import('./games/bingo/FootballBingo'))
const FootballContexto = lazy(() => import('./games/contexto/FootballContexto'))
const FootballTenable = lazy(() => import('./games/tenable/FootballTenable'))
const FootballWordle = lazy(() => import('./games/wordle/FootballWordle'))
const TicTacToeMenu = lazy(() => import('./games/tictactoe/TicTacToeMenu'))
const GuessByTeammates = lazy(() => import('./games/teammates/GuessByTeammates'))
const CareerPath = lazy(() => import('./games/careers/CareerPath'))
const HigherLower = lazy(() => import('./games/higherlower/HigherLower'))
const FootballConnections = lazy(() => import('./games/connections/FootballConnections'))
const FootballPointless = lazy(() => import('./games/pointless/FootballPointless'))
// Social layer — personal, noindex app screens (see docs/social.md).
const Me = lazy(() => import('./pages/Me'))
const LeaguesIndex = lazy(() => import('./pages/Leagues').then(m => ({ default: m.LeaguesIndex })))
const LeagueView = lazy(() => import('./pages/Leagues').then(m => ({ default: m.LeagueView })))
const World = lazy(() => import('./pages/World'))

// Dev-only: identity foundation inspector (Phase 0). Not linked from the hub;
// reads only the generated identity artifacts, touches no game code.
const IdentityInspector = lazy(() => import('./dev/IdentityInspector'))

const Loading = () => <div className="min-h-screen bg-canvas" aria-busy="true" />

// English only: the /es mirrors were retired 2026-10-09 and 301 to these paths
// (worker/redirects.js), as do the archive, pair and themed pages listed there.
const GAME_ROUTES = [
  { path: '/501', el: <GamePage path="/501"><Football501 /></GamePage> },
  { path: '/football-bingo', el: <GamePage path="/football-bingo"><FootballBingo /></GamePage> },
  { path: '/football-contexto', el: <GamePage path="/football-contexto"><FootballContexto /></GamePage> },
  { path: '/tenable', el: <GamePage path="/tenable"><FootballTenable /></GamePage> },
  { path: '/wordle', el: <GamePage path="/wordle"><FootballWordle /></GamePage> },
  { path: '/tictactoe', el: <GamePage path="/tictactoe"><TicTacToeMenu /></GamePage> },
  { path: '/teammates', el: <GamePage path="/teammates"><GuessByTeammates /></GamePage> },
  { path: '/career-path', el: <GamePage path="/career-path"><CareerPath /></GamePage> },
  { path: '/connections', el: <GamePage path="/connections"><FootballConnections /></GamePage> },
  { path: '/higher-or-lower', el: <GamePage path="/higher-or-lower"><HigherLower /></GamePage> },
]

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Analytics />
      <PreviewBanner />
      <SocialBoot />
      <ChallengeBanner />
      <BadgeToast />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Hub />} />
          {import.meta.env.DEV && <Route path="/dev/identity" element={<IdentityInspector />} />}
          <Route path="/me" element={<Me />} />
          <Route path="/leagues" element={<LeaguesIndex />} />
          <Route path="/leagues/:code" element={<LeagueView />} />
          <Route path="/world" element={<World />} />
          {GAME_ROUTES.map(({ path, el }) => <Route key={path} path={path} element={el} />)}
          {/* Football Pointless MVP */}
          <Route path="/football-pointless" element={<GamePage path="/football-pointless"><FootballPointless /></GamePage>} />
        </Routes>
      </Suspense>
    </>
  )
}
