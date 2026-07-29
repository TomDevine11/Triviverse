import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Hub from './pages/Hub'
import GamePage from './seo/GamePage'
import ScrollToTop from './components/ScrollToTop'
import Analytics from './components/Analytics'

// Lazy-load each game so its (sometimes heavy) data only downloads on its own
// route — the hub and lighter games stay fast, which helps Core Web Vitals.
const Football501 = lazy(() => import('./games/football501/Football501'))
const FootballTenable = lazy(() => import('./games/tenable/FootballTenable'))
const FootballWordle = lazy(() => import('./games/wordle/FootballWordle'))
const TicTacToeMenu = lazy(() => import('./games/tictactoe/TicTacToeMenu'))
const GuessByTeammates = lazy(() => import('./games/teammates/GuessByTeammates'))
const CareerPath = lazy(() => import('./games/careers/CareerPath'))
const HigherLower = lazy(() => import('./games/higherlower/HigherLower'))
const FootballConnections = lazy(() => import('./games/connections/FootballConnections'))

// Dev-only: identity foundation inspector (Phase 0). Not linked from the hub;
// reads only the generated identity artifacts, touches no game code.
const IdentityInspector = lazy(() => import('./dev/IdentityInspector'))

const Loading = () => <div className="min-h-screen bg-canvas" aria-busy="true" />

// Each game route is mounted twice: at the root (English) and under /es
// (Spanish). GamePage always gets the locale-free path; Seo/SeoContent derive
// the locale from the URL.
const GAME_ROUTES = [
  { path: '/501', el: <GamePage path="/501"><Football501 /></GamePage> },
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
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/es" element={<Hub />} />
          <Route path="/dev/identity" element={<IdentityInspector />} />
          {GAME_ROUTES.flatMap(({ path, el }) => [
            <Route key={path} path={path} element={el} />,
            <Route key={`es${path}`} path={`/es${path}`} element={el} />,
          ])}
        </Routes>
      </Suspense>
    </>
  )
}
