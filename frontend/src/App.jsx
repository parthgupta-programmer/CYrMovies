import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useState } from 'react'
import Navbar from './components/navigation/Navbar'
import CustomCursor from './components/common/CustomCursor'
import BackgroundCanvas from './components/3d/BackgroundCanvas'
import Loader from './components/common/Loader'
import CinematicIntro from './components/CinematicIntro'

const Home         = lazy(() => import('./pages/Home'))
const Discover     = lazy(() => import('./pages/Discover'))
const ForYou       = lazy(() => import('./pages/ForYou'))
const SimilarMovies = lazy(() => import('./pages/SimilarMovies'))
const Watchlist    = lazy(() => import('./pages/Watchlist'))
const Auth         = lazy(() => import('./pages/Auth'))

export default function App() {
  const [showIntro, setShowIntro] = useState(true)

  return (
    <BrowserRouter>
      {showIntro && <CinematicIntro onComplete={() => setShowIntro(false)} />}
      <CustomCursor />
      <BackgroundCanvas />
      <Navbar />
      <main style={{ position: 'relative', zIndex: 1 }}>
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <Loader message="LOADING..." />
          </div>
        }>
          <Routes>
            <Route path="/"                  element={<Home />} />
            <Route path="/discover"          element={<Discover />} />
            <Route path="/for-you"           element={<ForYou />} />
            <Route path="/similar/:movieId"  element={<SimilarMovies />} />
            <Route path="/watchlist"         element={<Watchlist />} />
            <Route path="/auth"              element={<Auth />} />
          </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  )
}
