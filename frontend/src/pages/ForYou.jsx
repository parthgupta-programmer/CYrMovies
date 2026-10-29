import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GenreSelector from '../components/onboarding/GenreSelector'
import MovieSelector from '../components/onboarding/MovieSelector'
import ProfileInitializer from '../components/onboarding/ProfileInitializer'
import RecommendationGrid from '../components/recommendations/RecommendationGrid'
import MovieModal from '../components/movies/MovieModal'
import MovieCard from '../components/movies/MovieCard'
import HUDFrame from '../components/hud/HUDFrame'
import EnergyRing from '../components/hud/EnergyRing'
import Button from '../components/common/Button'
import { MOCK_RECOMMENDATIONS } from '../data/mockData'
import { recommendationsAPI, moviesAPI, watchlistAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function ForYou() {
  const { userId, isLoggedIn, user } = useAuth()
  const [phase, setPhase]              = useState('loading') // loading | onboarding | recs
  const [onboardingStep, setStep]      = useState(0)         // 0=genres 1=movies 2=init
  const [selectedGenres, setGenres]    = useState([])
  const [selectedMovies, setMovies]    = useState([])
  const [recs, setRecs]                = useState([])
  const [profile, setProfile]          = useState(null)
  const [recsLoading, setRecsLoading]  = useState(false)
  const [selectedMovie, setSelected]   = useState(null)
  const [recType, setRecType]          = useState('cold_start')
  const [notification, setNotification] = useState('')
  const ratedRailRef                   = useRef(null)

  // Load user profile & recommendations
  const loadData = async () => {
    try {
      const prof = await moviesAPI.getProfile(userId).catch(() => null)
      setProfile(prof)
      setRecsLoading(true)
      const recData = await recommendationsAPI.forUser(userId, 32).catch(() => ({ recommendations: [] }))
      const list = recData?.recommendations || []
      if (list.length > 0) {
        setRecs(list)
        setRecType(prof && prof.rating_count > 0 ? 'personalized' : 'collaborative_filtering')
        setPhase('recs')
      } else if (!prof || prof.rating_count === 0) {
        setPhase('onboarding')
      } else {
        setPhase('recs')
      }
    } catch {
      setPhase('onboarding')
    } finally {
      setRecsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userId, isLoggedIn])

  const showNotification = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3500)
  }

  const handleRateMovie = async (movieId, rating) => {
    try {
      await moviesAPI.rate(userId, movieId, rating)
      showNotification(`✓ Rating (${rating}★) saved! Updating your cinema profile...`)
      // Refresh profile and recommendations
      const [updatedProfile, updatedRecs] = await Promise.all([
        moviesAPI.getProfile(userId).catch(() => null),
        recommendationsAPI.forUser(userId, 32).catch(() => ({ recommendations: [] }))
      ])
      if (updatedProfile) setProfile(updatedProfile)
      if (updatedRecs?.recommendations?.length > 0) {
        setRecs(updatedRecs.recommendations)
        setRecType('personalized')
        setPhase('recs')
      }
    } catch (err) {
      console.error('Failed to rate movie:', err)
    }
  }

  const handleWatchlist = async (movie) => {
    try {
      await watchlistAPI.add(userId, movie.movieId)
      showNotification(`+ Added "${movie.title}" to Watchlist`)
    } catch (err) {
      console.error('Watchlist add failed:', err)
    }
  }

  const toggleGenre = (name) =>
    setGenres(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name])

  const toggleMovie = (id) =>
    setMovies(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])

  const scrollRated = (dir) => {
    if (ratedRailRef.current) {
      ratedRailRef.current.scrollBy({ left: dir * 240, behavior: 'smooth' })
    }
  }

  // After ProfileInitializer finishes: save seed ratings and fetch recs
  const handleInitComplete = async () => {
    setRecsLoading(true)
    setPhase('recs')
    try {
      // Save onboarding seed movies as initial ratings (5.0 stars)
      for (const mid of selectedMovies) {
        await moviesAPI.rate(userId, mid, 5.0).catch(() => {})
      }
      const [prof, data] = await Promise.all([
        moviesAPI.getProfile(userId).catch(() => null),
        recommendationsAPI.forUser(userId, 32).catch(() => null)
      ])
      setProfile(prof)
      const list = data?.recommendations || []
      setRecs(list.length > 0 ? list : MOCK_RECOMMENDATIONS.slice(0, 32))
      setRecType(prof && prof.rating_count > 0 ? 'personalized' : 'cold_start')
      showNotification('✓ Cinema Profile calibrated and activated!')
    } catch {
      setRecs(MOCK_RECOMMENDATIONS.slice(0, 32))
      setRecType('cold_start')
    } finally {
      setRecsLoading(false)
    }
  }

  // Loading phase
  if (phase === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.2em', color: '#f97316' }}>
          LOADING CINEMA PROFILE...
        </div>
      </div>
    )
  }

  // Recommendations & Profile phase
  if (phase === 'recs') {
    const isPersonalized = recType === 'personalized' || (profile && profile.rating_count > 0)
    const ratedMovies = profile?.rated_movies || []
    const topGenres = profile?.favorite_genres?.length > 0
      ? profile.favorite_genres
      : (selectedGenres.length > 0 ? selectedGenres.slice(0, 5) : ['Sci-Fi', 'Action', 'Drama'])

    return (
      <div style={{ paddingTop: 64 }}>
        {/* Floating Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                position: 'fixed', top: 76, right: 24, zIndex: 9999,
                background: 'rgba(10,10,15,0.95)', border: '1px solid #f97316',
                padding: '0.65rem 1.2rem', borderRadius: 4,
                boxShadow: '0 0 20px rgba(249,115,22,0.4)',
                fontFamily: 'Orbitron', fontSize: '0.65rem', color: '#f1f5f9',
                letterSpacing: '0.1em',
              }}
            >
              {notification}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div style={{ padding: '3.5rem 2rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div className="grid-overlay" />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.5rem' }}>
                FOR YOU & PROFILE
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                    Your Cinema <span style={{ color: '#f97316', textShadow: '0 0 20px rgba(249,115,22,0.4)' }}>Profile</span>
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', maxWidth: 650 }}>
                    {isPersonalized
                      ? `Trained on your ${ratedMovies.length} movie rating${ratedMovies.length !== 1 ? 's' : ''}. Every new rating recalculates your personalized recommendations.`
                      : 'Content-based recommendations generated from your onboarding selections.'}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => { setStep(0); setPhase('onboarding') }}>
                  RE-CALIBRATE PREFERENCES
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Profile stats HUD */}
        <div className="container" style={{ padding: '1rem 0 2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
            <HUDFrame label="MATCH ACCURACY" style={{ padding: '1.2rem' }}>
              <EnergyRing size={88} value={ratedMovies.length > 0 ? Math.min(0.96, 0.70 + ratedMovies.length * 0.05) : 0.75} label="MATCH" delay={0.2} />
            </HUDFrame>

            <HUDFrame label="RATING METRICS" style={{ padding: '1.2rem' }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: '1.8rem', fontWeight: 700, color: '#f97316', textShadow: '0 0 10px rgba(249,115,22,0.4)' }}>
                {ratedMovies.length}
              </div>
              <div style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                FILMS RATED IN PROFILE
              </div>
              <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: '#fbbf24', fontFamily: 'Orbitron' }}>
                ★ {profile?.avg_rating || '5.0'} <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)' }}>AVG SCORE</span>
              </div>
            </HUDFrame>

            <HUDFrame label="TASTE PROFILE" style={{ padding: '1.2rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                {topGenres.map(g => (
                  <span key={g} style={{
                    fontFamily: 'Orbitron', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em',
                    color: '#f97316', background: 'rgba(249,115,22,0.08)',
                    border: '1px solid rgba(249,115,22,0.25)', padding: '3px 8px', borderRadius: 2,
                  }}>
                    {g}
                  </span>
                ))}
              </div>
              <div style={{ fontFamily: 'Orbitron', fontSize: '0.52rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)' }}>
                DYNAMIC ALS + TF-IDF ENGINE ACTIVE
              </div>
            </HUDFrame>
          </div>
        </div>

        {/* Section: Your Rated Films Rail */}
        {ratedMovies.length > 0 && (
          <section style={{ padding: '1rem 0 3rem' }}>
            <div className="container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.2rem' }}>
                <div>
                  <div style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', letterSpacing: '0.25em', color: '#f97316', marginBottom: '0.25rem' }}>
                    SAVED RATINGS
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Your Rated Films ({ratedMovies.length})
                  </h2>
                </div>
                {ratedMovies.length > 3 && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => scrollRated(-1)}
                      style={{
                        width: 32, height: 32, background: 'rgba(249,115,22,0.08)',
                        border: '1px solid rgba(249,115,22,0.3)', color: '#f97316',
                        cursor: 'pointer', fontSize: '0.75rem',
                      }}
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => scrollRated(1)}
                      style={{
                        width: 32, height: 32, background: 'rgba(249,115,22,0.08)',
                        border: '1px solid rgba(249,115,22,0.3)', color: '#f97316',
                        cursor: 'pointer', fontSize: '0.75rem',
                      }}
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>

              <div
                ref={ratedRailRef}
                style={{
                  display: 'flex',
                  gap: '1.2rem',
                  overflowX: 'auto',
                  paddingBottom: '1rem',
                  paddingTop: '0.5rem',
                  scrollbarWidth: 'thin',
                }}
              >
                {ratedMovies.map(movie => (
                  <div key={movie.movieId} style={{ position: 'relative' }}>
                    <MovieCard
                      movie={movie}
                      onOpen={setSelected}
                      onWatchlist={handleWatchlist}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Section: Recommendation grid */}
        <RecommendationGrid
          movies={recs}
          loading={recsLoading}
          onOpen={setSelected}
          onWatchlist={handleWatchlist}
          title={isPersonalized ? 'Recommended For You' : 'Based On Your Preferences'}
          subtitle={`${recs.length} recommendations calculated from your profile ratings.`}
          label={isPersonalized ? 'PERSONALIZED PICKS' : 'COLD START PICKS'}
        />

        {/* Movie Detail Modal */}
        {selectedMovie && (
          <MovieModal
            movie={selectedMovie}
            onClose={() => setSelected(null)}
            onWatchlist={handleWatchlist}
            onRate={handleRateMovie}
          />
        )}
      </div>
    )
  }

  // Onboarding flow (for new users without ratings)
  return (
    <div style={{ paddingTop: 64 }}>
      <div style={{ padding: '4rem 2rem', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
        <div className="grid-overlay" />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>

          {/* Step indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
            {['GENRES', 'MOVIES', 'INIT'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i < onboardingStep ? 'linear-gradient(135deg, #f97316, #ea580c)' :
                              i === onboardingStep ? 'rgba(249,115,22,0.15)' : 'transparent',
                  border: `1.5px solid ${i <= onboardingStep ? '#f97316' : 'rgba(255,255,255,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 700,
                  color: i <= onboardingStep ? '#f97316' : 'rgba(255,255,255,0.3)',
                  boxShadow: i === onboardingStep ? '0 0 12px rgba(249,115,22,0.4)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {i < onboardingStep ? '✓' : i + 1}
                </div>
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.12em', color: i === onboardingStep ? '#f97316' : 'rgba(255,255,255,0.25)' }}>
                  {s}
                </span>
                {i < 2 && <div style={{ width: 30, height: 1, background: i < onboardingStep ? '#f97316' : 'rgba(255,255,255,0.12)' }} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 0: Genres */}
            {onboardingStep === 0 && (
              <motion.div key="genres" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.75rem' }}>
                  STEP 1 OF 3
                </div>
                <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                  Build Your <span style={{ color: '#f97316' }}>Cinema Profile</span>
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>
                  Select your favorite genres. We'll calibrate your taste matrix.
                </p>
                <GenreSelector selected={selectedGenres} onToggle={toggleGenre} />
                <div style={{ marginTop: '2.5rem' }}>
                  <Button size="lg" disabled={selectedGenres.length < 2} onClick={() => setStep(1)}>
                    CONTINUE — SELECT FILMS
                  </Button>
                  <div style={{ marginTop: '0.5rem', fontFamily: 'Orbitron', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
                    SELECT AT LEAST 2 GENRES
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Movies */}
            {onboardingStep === 1 && (
              <motion.div key="movies" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.75rem' }}>
                    STEP 2 OF 3
                  </div>
                  <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                    Pick Films <span style={{ color: '#f97316' }}>You Love</span>
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                    Select 3–5 films. They will be saved to your profile to seed recommendations.
                  </p>
                </div>
                <MovieSelector selected={selectedMovies} onToggle={toggleMovie} max={5} />
                <div style={{ textAlign: 'center', marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <Button variant="secondary" onClick={() => setStep(0)}>BACK</Button>
                  <Button disabled={selectedMovies.length < 3} onClick={() => setStep(2)}>
                    INITIALIZE PROFILE
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Initializer */}
            {onboardingStep === 2 && (
              <motion.div key="init" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProfileInitializer onComplete={handleInitComplete} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
