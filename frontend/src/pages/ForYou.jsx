import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GenreSelector from '../components/onboarding/GenreSelector'
import MovieSelector from '../components/onboarding/MovieSelector'
import ProfileInitializer from '../components/onboarding/ProfileInitializer'
import RecommendationGrid from '../components/recommendations/RecommendationGrid'
import MovieModal from '../components/movies/MovieModal'
import HUDFrame from '../components/hud/HUDFrame'
import EnergyRing from '../components/hud/EnergyRing'
import Button from '../components/common/Button'
import { MOCK_RECOMMENDATIONS, USER_PROFILE } from '../data/mockData'
import { recommendationsAPI } from '../services/api'

export default function ForYou() {
  const [phase, setPhase]              = useState('loading') // loading | onboarding | recs
  const [onboardingStep, setStep]      = useState(0)         // 0=genres 1=movies 2=init
  const [selectedGenres, setGenres]    = useState([])
  const [selectedMovies, setMovies]    = useState([])
  const [recs, setRecs]                = useState([])
  const [recsLoading, setRecsLoading]  = useState(false)
  const [selectedMovie, setSelected]   = useState(null)
  const [recType, setRecType]          = useState('cold_start')

  // On mount: try to load personalized recs for logged-in user
  useEffect(() => {
    const tryPersonalized = async () => {
      try {
        const data = await recommendationsAPI.forUser(USER_PROFILE.userId, 32)
        const list = data.recommendations || []
        if (list.length > 0) {
          setRecs(list)
          setRecType('personalized')
          setPhase('recs')
          return
        }
      } catch { /* user not in model, fall to onboarding */ }
      setPhase('onboarding')
    }
    tryPersonalized()
  }, [])

  const toggleGenre = (name) =>
    setGenres(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name])

  const toggleMovie = (id) =>
    setMovies(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])

  // After ProfileInitializer finishes: call cold-start endpoint
  const handleInitComplete = async () => {
    setRecsLoading(true)
    setPhase('recs')
    try {
      const data = await recommendationsAPI.coldStart(selectedGenres, selectedMovies, 32)
      const list = data.recommendations || []
      setRecs(list.length > 0 ? list : MOCK_RECOMMENDATIONS.slice(0, 32))
      setRecType('cold_start')
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

  // Recommendations phase
  if (phase === 'recs') {
    const isPersonalized = recType === 'personalized'
    const topGenres = isPersonalized
      ? USER_PROFILE.favoriteGenres
      : selectedGenres.slice(0, 5)

    return (
      <div style={{ paddingTop: 64 }}>
        {/* Header */}
        <div style={{ padding: '4rem 2rem 2rem', position: 'relative', overflow: 'hidden' }}>
          <div className="grid-overlay" />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.5rem' }}>
                FOR YOU
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                Your Cinema <span style={{ color: '#f97316', textShadow: '0 0 20px rgba(249,115,22,0.4)' }}>Profile</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                {isPersonalized
                  ? 'Personalized from your rating history using collaborative filtering + content matching.'
                  : 'Content-based recommendations from your selected genres and movies.'}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Profile stats */}
        <div className="container" style={{ padding: '1.5rem 0' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <HUDFrame label="MATCH ACCURACY" style={{ padding: '1.5rem', flex: '0 0 auto' }}>
              <EnergyRing size={100} value={isPersonalized ? USER_PROFILE.matchAccuracy / 100 : 0.72} label="MATCH" delay={0.3} />
            </HUDFrame>
            <HUDFrame label="GENRE PROFILE" style={{ padding: '1.5rem', flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {topGenres.map(g => (
                  <span key={g} style={{
                    fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                    color: '#f97316', background: 'rgba(249,115,22,0.08)',
                    border: '1px solid rgba(249,115,22,0.25)', padding: '4px 12px',
                  }}>
                    {g}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: '0.75rem', fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)' }}>
                {isPersonalized
                  ? `${USER_PROFILE.ratingCount} RATINGS IN PROFILE`
                  : `${selectedMovies.length} SEED FILMS SELECTED`}
              </div>
              <div style={{ marginTop: '0.4rem', fontFamily: 'Orbitron', fontSize: '0.52rem', letterSpacing: '0.1em', color: 'rgba(249,115,22,0.4)' }}>
                {isPersonalized ? 'CF + CONTENT HYBRID' : 'CONTENT-BASED (COLD START)'}
              </div>
            </HUDFrame>
          </div>
        </div>

        {/* Recommendation grid — 32 movies, 4 per row */}
        <RecommendationGrid
          movies={recs}
          loading={recsLoading}
          onOpen={setSelected}
          onWatchlist={() => {}}
          title={isPersonalized ? 'Personalized For You' : 'Based On Your Taste'}
          subtitle={`${recs.length} recommendations generated from ${isPersonalized ? 'your collaborative + content profile' : 'your genre & film selections'}`}
          label={isPersonalized ? 'PERSONALIZED FOR YOU' : 'COLD START RECOMMENDATIONS'}
        />

        {selectedMovie && (
          <MovieModal
            movie={selectedMovie}
            onClose={() => setSelected(null)}
            onWatchlist={() => {}}
            onRate={() => {}}
          />
        )}
      </div>
    )
  }

  // Onboarding flow
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
                    Select 3–5 films. This seeds your recommendation engine.
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
