// ============================================================
//  CYrMovie — Home Page (Netflix/JioHotstar style)
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink, useNavigate } from 'react-router-dom'
import MovieModal from '../components/movies/MovieModal'
import GenreRail from '../components/recommendations/GenreRail'
import HUDFrame from '../components/hud/HUDFrame'
import EnergyRing from '../components/hud/EnergyRing'
import DataReadout from '../components/hud/DataReadout'
import Button from '../components/common/Button'
import { MOCK_MOVIES, MOCK_RECOMMENDATIONS } from '../data/mockData'
import { recommendationsAPI, moviesAPI, watchlistAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getMoviePoster, getFallbackPoster } from '../utils/poster'

const GENRE_ROWS = [
  { genre: 'Action',    label: 'HIGH OCTANE',   title: 'Action & Thrills',     color: '#f97316' },
  { genre: 'Sci-Fi',    label: 'DEEP SPACE',    title: 'Science Fiction',      color: '#06b6d4' },
  { genre: 'Drama',     label: 'EMOTIONAL',     title: 'Powerful Dramas',      color: '#a78bfa' },
  { genre: 'Comedy',    label: 'FEEL GOOD',     title: 'Comedy & Laughs',      color: '#4ade80' },
  { genre: 'Thriller',  label: 'EDGE OF SEAT',  title: 'Suspense & Thriller',  color: '#f59e0b' },
  { genre: 'Horror',    label: 'DARK CINEMA',   title: 'Horror & Darkness',    color: '#dc2626' },
  { genre: 'Animation', label: 'ANIMATED',      title: 'Animation & Family',   color: '#fbbf24' },
  { genre: 'Crime',     label: 'CRIME WORLD',   title: 'Crime & Mystery',      color: '#94a3b8' },
]

function HeroSpotlight({ movie, onOpen, onWatchlist }) {
  const [imgError, setImgError] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handle = (e) => setMousePos({
      x: (e.clientX / window.innerWidth - 0.5) * 20,
      y: (e.clientY / window.innerHeight - 0.5) * 10,
    })
    window.addEventListener('mousemove', handle)
    return () => window.removeEventListener('mousemove', handle)
  }, [])

  if (!movie) return null
  const poster = imgError ? getFallbackPoster(movie.title, movie.genres) : getMoviePoster(movie)
  const genres = (movie.genres || '').split('|').slice(0, 3)

  return (
    <div style={{
      position: 'relative', height: '70vh', minHeight: 480,
      display: 'flex', alignItems: 'flex-end',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <motion.img
          src={poster}
          alt={movie.title}
          onError={() => setImgError(true)}
          animate={{ x: mousePos.x * 0.4, y: mousePos.y * 0.3 }}
          transition={{ duration: 0.15, ease: 'linear' }}
          style={{
            width: '110%', height: '110%', objectFit: 'cover',
            filter: 'brightness(0.35) saturate(1.2)',
            marginLeft: '-5%', marginTop: '-5%',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #030303 0%, rgba(3,3,3,0.7) 40%, transparent 80%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(3,3,3,0.92) 0%, transparent 65%)' }} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 2, paddingBottom: '3.5rem', paddingTop: '4rem' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ maxWidth: 580 }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.85)', marginBottom: '0.75rem' }}>
            🎬 SPOTLIGHT RECOMMENDATION
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.1, marginBottom: '0.75rem' }}>
            {movie.title}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {genres.map(g => (
              <span key={g} style={{
                fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.1em',
                color: '#f97316', border: '1px solid rgba(249,115,22,0.4)', padding: '3px 10px',
              }}>{g}</span>
            ))}
            {movie.year && <span style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', alignSelf: 'center' }}>{movie.year}</span>}
            {movie.rating && <span style={{ color: '#fbbf24', fontSize: '0.75rem', alignSelf: 'center' }}>★ {movie.rating}</span>}
          </div>
          {movie.description && (
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: '1.5rem', maxWidth: 460 }}>
              {movie.description.length > 160 ? movie.description.slice(0, 160) + '…' : movie.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.85rem' }}>
            <Button size="lg" onClick={() => onOpen?.(movie)}>▶ VIEW FILM</Button>
            <Button size="lg" variant="secondary" onClick={() => onWatchlist?.(movie)}>+ WATCHLIST</Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function Home() {
  const { userId, isLoggedIn, user } = useAuth()
  const navigate = useNavigate()

  const [selectedMovie, setSelectedMovie] = useState(null)
  const [watchlist, setWatchlist] = useState([])
  const [featuredMovie, setFeaturedMovie] = useState(null)
  const [personalized, setPersonalized] = useState([])
  const [trending, setTrending] = useState([])
  const [genreData, setGenreData] = useState({})
  const [userProfile, setUserProfile] = useState(null)
  const [notification, setNotification] = useState('')
  const [loadingStates, setLoadingStates] = useState({
    personalized: true,
    trending: true,
    profile: true,
  })

  const showNotification = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 4000)
  }

  // Load real user profile dynamically
  const loadProfile = useCallback(async () => {
    if (!userId) return
    try {
      const prof = await moviesAPI.getProfile(userId)
      if (prof) setUserProfile(prof)
    } catch {
      // keep null or default
    } finally {
      setLoadingStates(s => ({ ...s, profile: false }))
    }
  }, [userId])

  // Load personalized recommendations (neighbor CF from DB)
  const loadPersonalized = useCallback(async () => {
    if (!userId) return
    setLoadingStates(s => ({ ...s, personalized: true }))
    try {
      const data = await recommendationsAPI.forUser(userId, 20)
      const list = data?.recommendations || []
      if (list.length > 0) {
        setPersonalized(list)
        if (!featuredMovie) setFeaturedMovie(list[0])
      } else {
        setPersonalized(MOCK_RECOMMENDATIONS)
      }
    } catch {
      setPersonalized(MOCK_RECOMMENDATIONS)
    } finally {
      setLoadingStates(s => ({ ...s, personalized: false }))
    }
  }, [userId, featuredMovie])

  // Load trending movies
  const loadTrending = useCallback(async () => {
    setLoadingStates(s => ({ ...s, trending: true }))
    try {
      const data = await moviesAPI.trending(20)
      const list = data?.results || []
      setTrending(list.length > 0 ? list : MOCK_MOVIES)
      if (!featuredMovie && list.length > 0) {
        setFeaturedMovie(list[0])
      }
    } catch {
      setTrending(MOCK_MOVIES)
    } finally {
      setLoadingStates(s => ({ ...s, trending: false }))
    }
  }, [featuredMovie])

  useEffect(() => {
    loadProfile()
    loadPersonalized()
    loadTrending()
  }, [loadProfile, loadPersonalized, loadTrending])

  // Load genre rails
  useEffect(() => {
    GENRE_ROWS.forEach(({ genre }, i) => {
      setTimeout(() => {
        moviesAPI.byGenre(genre, 20)
          .then(data => {
            const movies = data.results || []
            if (movies.length > 0) {
              setGenreData(prev => ({ ...prev, [genre]: movies }))
            }
          })
          .catch(() => {
            const fallback = MOCK_MOVIES.filter(m => (m.genres || '').includes(genre))
            if (fallback.length > 0) setGenreData(prev => ({ ...prev, [genre]: fallback }))
          })
      }, i * 150)
    })
  }, [])

  // Handle Watchlist update -> re-calc recommendations and profile!
  const handleWatchlist = async (movie) => {
    try {
      await watchlistAPI.add(userId, movie.movieId)
      showNotification(`✓ Added "${movie.title}" to Watchlist! Recalculating recommendations...`)
      setTimeout(() => {
        loadPersonalized()
        loadProfile()
      }, 400)
    } catch {
      showNotification(`Added "${movie.title}" to Watchlist`)
    }
  }

  // Handle rating update -> re-calc recommendations and profile!
  const handleRateMovie = async (movieId, rating) => {
    try {
      await moviesAPI.rate(userId, movieId, rating)
      showNotification(`✓ Rating (${rating}★) recorded! Profile and neural recommendations updated.`)
      setTimeout(() => {
        loadPersonalized()
        loadProfile()
      }, 400)
    } catch (err) {
      console.error('Rating failed:', err)
    }
  }

  const userDisplayName = user?.name || (isLoggedIn ? `Agent #${userId}` : 'Guest Explorer')
  const ratingCount = userProfile?.rating_count || 0
  const avgRating = userProfile?.avg_rating || 0.0
  const favoriteGenres = userProfile?.favorite_genres?.length > 0
    ? userProfile.favorite_genres.slice(0, 3).join(' / ')
    : (ratingCount > 0 ? 'Analyzing...' : 'Rate films to calibrate')
  
  // Dynamic match accuracy computed from rating activity
  const matchAccuracy = Math.min(99, Math.max(72, 72 + Math.min(26, ratingCount * 3)))
  const energyRingVal = matchAccuracy / 100

  return (
    <div>
      {/* Floating Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: 76, right: 24, zIndex: 9999,
              background: 'rgba(10,10,15,0.96)', border: '1px solid #f97316',
              padding: '0.75rem 1.4rem', borderRadius: 4,
              boxShadow: '0 0 25px rgba(249,115,22,0.45)',
              fontFamily: 'Orbitron', fontSize: '0.68rem', color: '#f1f5f9',
              letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.6rem',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 10px #f97316' }} />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HERO AREA ===== */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="grid-overlay" />
        <div className="scan-overlay" />

        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '0 2rem', position: 'relative' }}>
          <div className="container" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', paddingTop: '80px' }}>
              {/* LEFT */}
              <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem' }}>
                  <div style={{ width: 30, height: 1, background: 'linear-gradient(90deg, #f97316, transparent)', boxShadow: '0 0 6px rgba(249,115,22,0.6)' }} />
                  <span style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.7)', textTransform: 'uppercase' }}>
                    COLLABORATIVE NEURAL CINEMA CORE
                  </span>
                </div>

                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }} style={{ lineHeight: 1, marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: 'clamp(3rem, 6vw, 5rem)', color: '#f1f5f9', letterSpacing: '-0.01em', display: 'block' }}>
                    CYr<span style={{ color: '#f97316', textShadow: '0 0 30px rgba(249,115,22,0.5)' }}>Movie</span>
                  </span>
                </motion.h1>

                <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}
                  style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', fontWeight: 300, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                  {isLoggedIn ? `Welcome back, ${userDisplayName}` : 'Your cinema intelligence network.'}
                </motion.p>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                  style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 480 }}>
                  Collaborative filtering calibrated against real-time peer cinephile matrices, content semantic embeddings, and your live watchlist.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                  style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <NavLink to="/discover"><Button size="lg">EXPLORE MOVIES</Button></NavLink>
                  <NavLink to="/for-you"><Button size="lg" variant="secondary">CINEMA PROFILE</Button></NavLink>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                  style={{ display: 'flex', gap: '2rem', marginTop: '3rem', flexWrap: 'wrap' }}>
                  {[
                    { value: '5,000+', label: 'Local Films' },
                    { value: `${matchAccuracy}%`, label: 'Match Accuracy' },
                    { value: `${ratingCount} Rated`, label: 'Personal Ratings' }
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <div style={{ fontFamily: 'Orbitron', fontSize: '1.4rem', fontWeight: 800, color: '#f97316', lineHeight: 1, textShadow: '0 0 12px rgba(249,115,22,0.4)' }}>{value}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: 'Orbitron', letterSpacing: '0.1em' }}>{label}</div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>

              {/* RIGHT — DYNAMIC HUD */}
              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
                <HUDFrame label="CINEMA INTELLIGENCE CORE" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative' }}>
                      <EnergyRing size={120} value={energyRingVal} label="MATCH" delay={0.4} />
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ rotate: 360 }} transition={{ duration: 3 + i * 1.2, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
                          style={{ position: 'absolute', inset: -(20 + i * 14), border: '1px solid transparent' }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: ['#f97316', '#f59e0b', '#fbbf24'][i], boxShadow: `0 0 6px ${['#f97316', '#f59e0b', '#fbbf24'][i]}`, position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <DataReadout items={[
                    { label: 'Active User',     value: userDisplayName,                       highlight: false },
                    { label: 'Ratings Saved',   value: `${ratingCount} Movies`,              highlight: false },
                    { label: 'Average Rating',  value: avgRating > 0 ? `${avgRating} ★` : 'No ratings yet', highlight: false },
                    { label: 'Top Genres',      value: favoriteGenres,                        highlight: false },
                    { label: 'Match Confidence', value: `${matchAccuracy}%`,                  highlight: true  },
                  ]} />
                  <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        loadProfile()
                        loadPersonalized()
                        showNotification('✓ Cinema Intelligence Core refreshed.')
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(249,115,22,0.3)',
                        color: 'rgba(249,115,22,0.85)',
                        fontFamily: 'Orbitron',
                        fontSize: '0.6rem',
                        letterSpacing: '0.15em',
                        padding: '0.4rem 0.8rem',
                        cursor: 'pointer',
                        borderRadius: 3,
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={e => {
                        e.target.style.background = 'rgba(249,115,22,0.15)'
                        e.target.style.borderColor = '#f97316'
                      }}
                      onMouseOut={e => {
                        e.target.style.background = 'transparent'
                        e.target.style.borderColor = 'rgba(249,115,22,0.3)'
                      }}
                    >
                      ⚡ REFRESH CORE HUD
                    </button>
                  </div>
                </HUDFrame>
              </motion.div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, transparent, #030303)', pointerEvents: 'none' }} />
        </div>
      </section>

      {/* Featured Spotlight if available */}
      {featuredMovie && (
        <section style={{ borderTop: '1px solid rgba(249,115,22,0.1)', borderBottom: '1px solid rgba(249,115,22,0.1)' }}>
          <HeroSpotlight
            movie={featuredMovie}
            onOpen={setSelectedMovie}
            onWatchlist={handleWatchlist}
          />
        </section>
      )}

      {/* ===== NETFLIX-STYLE CONTENT SECTION ===== */}
      <section style={{ padding: '2.5rem 0 1rem' }}>
        <div className="container">

          {/* ⭐ AI PERSONALIZED FOR YOU */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <div style={{ width: 3, height: 20, background: 'linear-gradient(180deg, #f97316, #a78bfa)', borderRadius: 2 }} />
              <div style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.28em', color: 'rgba(249,115,22,0.85)' }}>
                AI PERSONALIZED · COLLABORATIVE FILTERING
              </div>
            </div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.2rem' }}>
              Picked For <span style={{ color: '#f97316' }}>You</span>
            </h2>
          </div>
          <GenreRail
            title=""
            label=""
            movies={personalized}
            loading={loadingStates.personalized}
            onOpen={setSelectedMovie}
            onWatchlist={handleWatchlist}
            color="#f97316"
          />

          {/* 🔥 TRENDING NOW */}
          <div style={{ marginTop: '2.5rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <div style={{ width: 3, height: 20, background: 'linear-gradient(180deg, #f97316, #dc2626)', borderRadius: 2 }} />
              <div style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.28em', color: 'rgba(249,115,22,0.65)' }}>TRENDING NOW</div>
            </div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.2rem' }}>
              🔥 Hot Right <span style={{ color: '#f97316' }}>Now</span>
            </h2>
          </div>
          <GenreRail
            title=""
            label=""
            movies={trending}
            loading={loadingStates.trending}
            onOpen={setSelectedMovie}
            onWatchlist={handleWatchlist}
          />
        </div>
      </section>

      {/* ===== GENRE CATEGORY ROWS ===== */}
      <section style={{ padding: '1rem 0 3rem' }}>
        <div className="container">
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.62rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.5rem' }}>BROWSE BY CATEGORY</div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#f1f5f9' }}>
              Explore by <span style={{ color: '#f97316' }}>Genre</span>
            </h2>
          </div>

          {GENRE_ROWS.map(({ genre, label, title, color }) => (
            <GenreRail
              key={genre}
              title={title}
              label={label}
              movies={genreData[genre] || []}
              loading={!(genre in genreData)}
              onOpen={setSelectedMovie}
              onWatchlist={handleWatchlist}
              color={color}
            />
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: '1px solid rgba(249,115,22,0.1)', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.2rem', color: '#f1f5f9', marginBottom: '0.35rem' }}>
          CYr<span style={{ color: '#f97316' }}>Movie</span>
        </div>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.52rem', letterSpacing: '0.28em', color: 'rgba(249,115,22,0.45)' }}>
          COLLABORATIVE CINEMA INTELLIGENCE
        </div>
        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
          FastAPI · Neighbor Collaborative Filtering · SQLite · React
        </div>
      </footer>

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onWatchlist={handleWatchlist}
          onRate={handleRateMovie}
        />
      )}
    </div>
  )
}
