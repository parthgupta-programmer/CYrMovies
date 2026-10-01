import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import MovieCard from '../components/movies/MovieCard'
import MovieModal from '../components/movies/MovieModal'
import RecommendationGrid from '../components/recommendations/RecommendationGrid'
import HUDFrame from '../components/hud/HUDFrame'
import EnergyRing from '../components/hud/EnergyRing'
import DataReadout from '../components/hud/DataReadout'
import Button from '../components/common/Button'
import { MOCK_MOVIES, MOCK_RECOMMENDATIONS, USER_PROFILE } from '../data/mockData'
import { recommendationsAPI, watchlistAPI } from '../services/api'

export default function Home() {
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [watchlist,     setWatchlist]     = useState([])
  const [recs,          setRecs]          = useState([])
  const [recsLoading,   setRecsLoading]   = useState(true)
  const [mousePos,      setMousePos]      = useState({ x: 0, y: 0 })

  useEffect(() => {
    const load = async () => {
      setRecsLoading(true)
      try {
        const data = await recommendationsAPI.forUser(USER_PROFILE.userId, 32)
        setRecs(data.recommendations || MOCK_RECOMMENDATIONS)
      } catch {
        setRecs(MOCK_RECOMMENDATIONS)
      } finally {
        setRecsLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const handle = (e) => setMousePos({
      x: (e.clientX / window.innerWidth  - 0.5) * 30,
      y: (e.clientY / window.innerHeight - 0.5) * 20,
    })
    window.addEventListener('mousemove', handle)
    return () => window.removeEventListener('mousemove', handle)
  }, [])

  const handleWatchlist = (movie) => {
    setWatchlist(wl => wl.find(m => m.movieId === movie.movieId) ? wl : [...wl, movie])
    watchlistAPI.add(USER_PROFILE.userId, movie.movieId).catch(() => {})
  }

  const trending = MOCK_MOVIES.slice(0, 8)

  return (
    <div>
      {/* ===== HERO ===== */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: '0 2rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div className="grid-overlay" />
        <div className="scan-overlay" />

        <div className="container" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem',
            alignItems: 'center',
            paddingTop: '80px',
          }}>
            {/* LEFT */}
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem' }}>
                <div style={{ width: 30, height: 1, background: 'linear-gradient(90deg, #f97316, transparent)', boxShadow: '0 0 6px rgba(249,115,22,0.6)' }} />
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.7)', textTransform: 'uppercase' }}>
                  PERSONALIZED CINEMA INTELLIGENCE
                </span>
              </div>

              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }} style={{ lineHeight: 1, marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: 'clamp(3rem, 6vw, 5rem)', color: '#f1f5f9', letterSpacing: '-0.01em', display: 'block' }}>
                  CYr<span style={{ color: '#f97316', textShadow: '0 0 30px rgba(249,115,22,0.5)' }}>Movie</span>
                </span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}
                style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', fontWeight: 300, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                Your next movie is already waiting.
              </motion.p>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 480 }}>
                An intelligent movie recommendation system that learns what you like —
                powered by collaborative filtering, content similarity, and advanced ML.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <NavLink to="/discover"><Button size="lg">EXPLORE MOVIES</Button></NavLink>
                <NavLink to="/for-you"><Button size="lg" variant="secondary">GET MY PICKS</Button></NavLink>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                style={{ display: 'flex', gap: '2rem', marginTop: '3rem', flexWrap: 'wrap' }}>
                {[{ value: '87K+', label: 'Films' }, { value: '94%', label: 'Match Acc.' }, { value: '32M+', label: 'Ratings' }].map(({ value, label }) => (
                  <div key={label}>
                    <div style={{ fontFamily: 'Orbitron', fontSize: '1.4rem', fontWeight: 800, color: '#f97316', lineHeight: 1, textShadow: '0 0 12px rgba(249,115,22,0.4)' }}>{value}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: 'Orbitron', letterSpacing: '0.1em' }}>{label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* RIGHT — HUD */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}
              style={{ transform: `translate(${mousePos.x * 0.03}px, ${mousePos.y * 0.03}px)`, transition: 'transform 0.2s ease-out' }}>
              <HUDFrame label="CINEMA INTELLIGENCE CORE" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <EnergyRing size={120} value={0.94} label="MATCH" delay={0.4} />
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} animate={{ rotate: 360 }} transition={{ duration: 3 + i * 1.2, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
                        style={{ position: 'absolute', inset: -(20 + i * 14), border: '1px solid transparent' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: ['#f97316', '#f59e0b', '#fbbf24'][i], boxShadow: `0 0 6px ${['#f97316','#f59e0b','#fbbf24'][i]}`, position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }} />
                      </motion.div>
                    ))}
                  </div>
                </div>
                <DataReadout items={[
                  { label: 'User',           value: USER_PROFILE.name,                              highlight: false },
                  { label: 'Ratings',        value: USER_PROFILE.ratingCount,                       highlight: false },
                  { label: 'Top Genres',     value: USER_PROFILE.favoriteGenres.join(' / '),         highlight: false },
                  { label: 'Match Accuracy', value: `${USER_PROFILE.matchAccuracy}%`,               highlight: true  },
                ]} />
              </HUDFrame>
            </motion.div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, transparent, #030303)', pointerEvents: 'none' }} />
      </section>

      {/* ===== TRENDING ===== */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container">
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.62rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.5rem' }}>DISCOVER CINEMA</div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 700, color: '#f1f5f9' }}>
              Trending <span style={{ color: '#f97316', textShadow: '0 0 16px rgba(249,115,22,0.35)' }}>Films</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '1.2rem' }}>
            {trending.map((movie, i) => (
              <motion.div key={movie.movieId} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <MovieCard movie={movie} onOpen={setSelectedMovie} onWatchlist={handleWatchlist} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== RECOMMENDATIONS — 32 movies, 4 per row ===== */}
      <RecommendationGrid
        movies={recs}
        loading={recsLoading}
        onOpen={setSelectedMovie}
        onWatchlist={handleWatchlist}
        title={<>Your Cinema <span style={{ color: '#f97316', textShadow: '0 0 16px rgba(249,115,22,0.4)' }}>Profile</span></>}
        subtitle="Recommendations generated from your taste matrix."
        label="FOR YOU"
      />

      {/* ===== ONBOARDING CTA ===== */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container">
          <HUDFrame label="NEW USER ONBOARDING" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.62rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.75rem' }}>NEW HERE?</div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.75rem' }}>
              Build Your Cinema Profile
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', marginBottom: '2rem', maxWidth: 480, margin: '0 auto 2rem' }}>
              Give us a few favorites. We'll handle the rest and generate your personalized recommendation matrix.
            </p>
            <NavLink to="/for-you"><Button size="lg">START PERSONALIZATION</Button></NavLink>
          </HUDFrame>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: '1px solid rgba(249,115,22,0.1)', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.2rem', color: '#f1f5f9', marginBottom: '0.35rem' }}>
          CYr<span style={{ color: '#f97316' }}>Movie</span>
        </div>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.52rem', letterSpacing: '0.28em', color: 'rgba(249,115,22,0.45)' }}>
          PERSONALIZED CINEMA INTELLIGENCE
        </div>
        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
          FastAPI · Collaborative Filtering · Content TF-IDF · React · Three.js
        </div>
      </footer>

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} onWatchlist={handleWatchlist} onRate={(movieId, r) => console.log('Rated', movieId, r)} />
      )}
    </div>
  )
}
