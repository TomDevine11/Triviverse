import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Hub from './pages/Hub'
import GamePage from './seo/GamePage'
import AnswersPage from './seo/AnswersPage'
import ThemedEnglandPage from './seo/ThemedEnglandPage'
import ScrollToTop from './components/ScrollToTop'
import Analytics from './components/Analytics'
import PreviewBanner from './components/PreviewBanner'

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
const FootballPointless = lazy(() => import('./games/pointless/FootballPointless'))

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

// Crawlable "past answers" archives (link magnet + "answers/today" capture).
// Each reconstructs its game's daily answers deterministically — see
// seo/archiveData.js. Kept separate from GAME_ROUTES so they stay out of the
// primary game nav (their SEO routes carry hideFromNav), but each game page
// links to its own archive contextually (see SeoContent).
const ANSWER_ROUTES = [
  { path: '/wordle/answers', game: '/wordle' },
  { path: '/teammates/answers', game: '/teammates' },
  { path: '/career-path/answers', game: '/career-path' },
  { path: '/tenable/answers', game: '/tenable' },
  { path: '/connections/answers', game: '/connections' },
]

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Analytics />
      <PreviewBanner />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/es" element={<Hub />} />
          <Route path="/dev/identity" element={<IdentityInspector />} />
          {GAME_ROUTES.flatMap(({ path, el }) => [
            <Route key={path} path={path} element={el} />,
            <Route key={`es${path}`} path={`/es${path}`} element={el} />,
          ])}
          {ANSWER_ROUTES.flatMap(({ path, game }) => [
            <Route key={path} path={path} element={<AnswersPage path={path} gamePath={game} />} />,
            <Route key={`es${path}`} path={`/es${path}`} element={<AnswersPage path={path} gamePath={game} />} />,
          ])}
          {/* Generated data-derived landing page that is itself playable (growth PoC). */}
          <Route path="/england-football-quiz" element={<ThemedEnglandPage path="/england-football-quiz" />} />
          <Route path="/es/england-football-quiz" element={<ThemedEnglandPage path="/england-football-quiz" />} />
          {/* Football Pointless MVP */}
          <Route path="/football-pointless" element={<GamePage path="/football-pointless"><FootballPointless /></GamePage>} />
          <Route path="/es/football-pointless" element={<GamePage path="/football-pointless"><FootballPointless /></GamePage>} />
        </Routes>
      </Suspense>
    </>
  )
}
