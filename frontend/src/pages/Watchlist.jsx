import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MovieCard from '../components/movies/MovieCard'
import MovieModal from '../components/movies/MovieModal'
import HUDFrame from '../components/hud/HUDFrame'
import Button from '../components/common/Button'
import { MOCK_WATCHLIST } from '../data/mockData'
import { watchlistAPI } from '../services/api'

export default function Watchlist() {
  const [movies,  setMovies]  = useState(MOCK_WATCHLIST)
  const [modal,   setModal]   = useState(null)

  const remove = (movieId) => {
    setMovies(prev => prev.filter(m => m.movieId !== movieId))
  }

  const addToList = (movie) => {
    if (!movies.find(m => m.movieId === movie.movieId)) {
      setMovies(prev => [...prev, movie])
      watchlistAPI.add(1, movie.movieId).catch(() => {})
    }
  }

  return (
    <div style={{ paddingTop: 64 }}>
      {/* Header */}
      <div style={{ padding: '4rem 2rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <div className="grid-overlay" />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.5rem' }}>
              MY WATCHLIST
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
              Saved <span style={{ color: '#f97316', textShadow: '0 0 20px rgba(249,115,22,0.4)' }}>Films</span>
            </h1>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
              {movies.length} FILMS IN QUEUE
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container" style={{ padding: '3rem 0 6rem' }}>
        <AnimatePresence>
          {movies.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '5rem 2rem' }}
            >
              <HUDFrame label="WATCHLIST EMPTY" style={{ padding: '3rem', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
                <div style={{
                  fontSize: '3rem', marginBottom: '1rem',
                  filter: 'drop-shadow(0 0 10px rgba(249,115,22,0.4))',
                }}>📡</div>
                <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No Films Queued</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                  Start saving films from the Discover or Home page.
                </p>
              </HUDFrame>
            </motion.div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
              gap: '1.5rem',
            }}>
              {movies.map((movie, i) => (
                <motion.div
                  key={movie.movieId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.25 } }}
                  transition={{ delay: i * 0.05 }}
                  style={{ position: 'relative' }}
                >
                  <MovieCard
                    movie={movie}
                    onOpen={setModal}
                    onWatchlist={() => {}}
                  />
                  {/* Remove button */}
                  <button
                    onClick={() => remove(movie.movieId)}
                    style={{
                      position: 'absolute', top: 8, left: 8, zIndex: 10,
                      width: 24, height: 24,
                      background: 'rgba(220,38,38,0.15)',
                      border: '1px solid rgba(220,38,38,0.4)',
                      color: '#dc2626', borderRadius: 3,
                      cursor: 'pointer', fontSize: '0.7rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Remove from watchlist"
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {modal && (
        <MovieModal
          movie={modal}
          onClose={() => setModal(null)}
          onWatchlist={addToList}
          onRate={() => {}}
        />
      )}
    </div>
  )
}
