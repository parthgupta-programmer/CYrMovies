import { useState } from 'react'
import { motion } from 'framer-motion'
import MovieSearch from '../components/movies/MovieSearch'
import MovieCard from '../components/movies/MovieCard'
import MovieModal from '../components/movies/MovieModal'
import { MOCK_MOVIES } from '../data/mockData'
import { watchlistAPI } from '../services/api'
import { USER_PROFILE, GENRES } from '../data/mockData'

export default function Discover() {
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [activeGenre,   setActiveGenre]   = useState(null)
  const [watchlist,     setWatchlist]     = useState([])

  const handleWatchlist = (movie) => {
    setWatchlist(wl => wl.find(m => m.movieId === movie.movieId) ? wl : [...wl, movie])
    watchlistAPI.add(USER_PROFILE.userId, movie.movieId).catch(() => {})
  }

  const filtered = activeGenre
    ? MOCK_MOVIES.filter(m => (m.genres || '').includes(activeGenre))
    : MOCK_MOVIES

  return (
    <div style={{ paddingTop: 64 }}>
      {/* Page header */}
      <div style={{
        padding: '4rem 2rem 2rem',
        borderBottom: '1px solid rgba(249,115,22,0.08)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div className="grid-overlay" />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.5rem' }}>
              CINEMA DATABASE
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1, marginBottom: '0.5rem' }}>
              Discover <span style={{ color: '#f97316', textShadow: '0 0 20px rgba(249,115,22,0.4)' }}>Cinema</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
              {MOCK_MOVIES.length.toLocaleString()} films in the database. Search, filter, explore.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search */}
      <MovieSearch onOpen={setSelectedMovie} onWatchlist={handleWatchlist} />

      {/* Genre filter */}
      <div className="container" style={{ paddingBottom: '2rem' }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>
          FILTER BY GENRE
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveGenre(null)}
            style={{
              padding: '0.35rem 1rem',
              fontFamily: 'Orbitron', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
              background: !activeGenre ? 'rgba(249,115,22,0.15)' : 'transparent',
              color: !activeGenre ? '#f97316' : 'rgba(255,255,255,0.35)',
              border: `1px solid ${!activeGenre ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.08)'}`,
              transition: 'all 0.2s',
            }}
          >
            ALL
          </button>
          {GENRES.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGenre(activeGenre === g.name ? null : g.name)}
              style={{
                padding: '0.35rem 1rem',
                fontFamily: 'Orbitron', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', cursor: 'pointer',
                background: activeGenre === g.name ? `${g.color}22` : 'transparent',
                color: activeGenre === g.name ? g.color : 'rgba(255,255,255,0.35)',
                border: `1px solid ${activeGenre === g.name ? `${g.color}66` : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.2s',
              }}
            >
              {g.icon} {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Movie grid */}
      <div className="container" style={{ paddingBottom: '5rem' }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', marginBottom: '1.2rem' }}>
          {filtered.length} FILMS {activeGenre ? `IN ${activeGenre.toUpperCase()}` : 'TOTAL'}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
          gap: '1.2rem',
        }}>
          {filtered.map((movie, i) => (
            <motion.div
              key={movie.movieId}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: (i % 8) * 0.05 }}
            >
              <MovieCard
                movie={movie}
                onOpen={setSelectedMovie}
                onWatchlist={handleWatchlist}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onWatchlist={handleWatchlist}
          onRate={(id, r) => console.log('Rated', id, r)}
        />
      )}
    </div>
  )
}
