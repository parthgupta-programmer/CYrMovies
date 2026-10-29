import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useState } from 'react'
import Navbar from './components/navigation/Navbar'
import CustomCursor from './components/common/CustomCursor'
import BackgroundCanvas from './components/3d/BackgroundCanvas'
import Loader from './components/common/Loader'
import CinematicIntro from './components/CinematicIntro'
import { AuthProvider, useAuth } from './contexts/AuthContext'

const Home          = lazy(() => import('./pages/Home'))
const Discover      = lazy(() => import('./pages/Discover'))
const ForYou        = lazy(() => import('./pages/ForYou'))
const SimilarMovies = lazy(() => import('./pages/SimilarMovies'))
const Watchlist     = lazy(() => import('./pages/Watchlist'))
const Auth          = lazy(() => import('./pages/Auth'))

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/auth" state={{ from: location }} replace />
  return children
}

function AppContent() {
  const [showIntro, setShowIntro] = useState(true)
  const { isLoggedIn } = useAuth()

  return (
    <>
      {showIntro && <CinematicIntro onComplete={() => setShowIntro(false)} />}
      {!showIntro && (
        <>
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
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={isLoggedIn ? <Home /> : <Navigate to="/auth" replace />} />
                <Route path="/discover" element={<RequireAuth><Discover /></RequireAuth>} />
                <Route path="/for-you" element={<RequireAuth><ForYou /></RequireAuth>} />
                <Route path="/similar/:movieId" element={<RequireAuth><SimilarMovies /></RequireAuth>} />
                <Route path="/watchlist" element={<RequireAuth><Watchlist /></RequireAuth>} />
                <Route path="*" element={<Navigate to={isLoggedIn ? "/" : "/auth"} replace />} />
              </Routes>
            </Suspense>
          </main>
        </>
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}
