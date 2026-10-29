// ============================================================
//  CYrMovie — Discover Page (Real API + Genre Browse)
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MovieSearch from '../components/movies/MovieSearch'
import MovieCard from '../components/movies/MovieCard'
import MovieModal from '../components/movies/MovieModal'
import { MOCK_MOVIES, GENRES } from '../data/mockData'
import { moviesAPI, watchlistAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const ALL_GENRES = [
  { id: 0,  name: 'All',       icon: '🎬', color: '#f97316' },
  { id: 1,  name: 'Action',    icon: '💥', color: '#f97316' },
  { id: 2,  name: 'Sci-Fi',    icon: '🚀', color: '#06b6d4' },
  { id: 3,  name: 'Drama',     icon: '🎭', color: '#a78bfa' },
  { id: 4,  name: 'Thriller',  icon: '🔪', color: '#f59e0b' },
  { id: 5,  name: 'Comedy',    icon: '😂', color: '#4ade80' },
  { id: 6,  name: 'Horror',    icon: '👻', color: '#dc2626' },
  { id: 7,  name: 'Romance',   icon: '❤️', color: '#fb7185' },
  { id: 8,  name: 'Animation', icon: '✨', color: '#fbbf24' },
  { id: 9,  name: 'Crime',     icon: '🔍', color: '#94a3b8' },
  { id: 10, name: 'Adventure', icon: '🗺️', color: '#34d399' },
  { id: 11, name: 'Fantasy',   icon: '🧙', color: '#d946ef' },
  { id: 12, name: 'Mystery',   icon: '🕵️', color: '#6366f1' },
]

function MovieCardSkeleton() {
  return (
    <div style={{ borderRadius: 4, overflow: 'hidden', background: '#0a0a0f', border: '1px solid rgba(249,115,22,0.08)' }}>
      <div style={{ aspectRatio: '2/3', background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      <div style={{ padding: '0.65rem 0.75rem' }}>
        <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 6, width: '85%' }} />
        <div style={{ height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 2, width: '60%' }} />
      </div>
    </div>
  )
}

export default function Discover() {
  const { userId } = useAuth()
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [activeGenre, setActiveGenre] = useState('All')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const loadMoreRef = useRef(null)
  const LIMIT = 32

  const handleWatchlist = (movie) => {
    watchlistAPI.add(userId, movie.movieId).catch(() => {})
  }

  const fetchMovies = useCallback(async (genre, off = 0, append = false) => {
    if (off === 0) setLoading(true)
    else setLoadingMore(true)

    try {
      const g = genre === 'All' ? null : genre
      const data = await moviesAPI.browse(g, LIMIT, off)
      const results = data.results || []
      setMovies(prev => append ? [...prev, ...results] : (results.length > 0 ? results : MOCK_MOVIES.filter(m => genre === 'All' || (m.genres || '').includes(genre))))
      setHasMore(results.length === LIMIT)
      setTotalCount(prev => append ? prev : results.length)
    } catch {
      if (!append) {
        setMovies(genre === 'All' ? MOCK_MOVIES : MOCK_MOVIES.filter(m => (m.genres || '').includes(genre)))
        setHasMore(false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setOffset(0)
    setMovies([])
    fetchMovies(activeGenre, 0, false)
  }, [activeGenre, fetchMovies])

  const loadMore = () => {
    const newOffset = offset + LIMIT
    setOffset(newOffset)
    fetchMovies(activeGenre, newOffset, true)
  }

  const activeGenreObj = ALL_GENRES.find(g => g.name === activeGenre) || ALL_GENRES[0]

  return (
    <div style={{ paddingTop: 64 }}>
      {/* Page header */}
      <div style={{ padding: '4rem 2rem 2rem', borderBottom: '1px solid rgba(249,115,22,0.08)', position: 'relative', overflow: 'hidden' }}>
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
              87,000+ films in the database. Search, filter by genre, explore endlessly.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search */}
      <MovieSearch onOpen={setSelectedMovie} onWatchlist={handleWatchlist} />

      {/* Genre filter tabs */}
      <div className="container" style={{ paddingBottom: '1rem' }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>
          FILTER BY GENRE
        </div>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {ALL_GENRES.map(g => (
            <motion.button
              key={g.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveGenre(g.name)}
              style={{
                padding: '0.35rem 0.85rem',
                fontFamily: 'Orbitron', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', cursor: 'pointer',
                background: activeGenre === g.name ? `${g.color}22` : 'transparent',
                color: activeGenre === g.name ? g.color : 'rgba(255,255,255,0.35)',
                border: `1px solid ${activeGenre === g.name ? `${g.color}66` : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 3, transition: 'all 0.2s',
                boxShadow: activeGenre === g.name ? `0 0 12px ${g.color}33` : 'none',
              }}
            >
              {g.icon} {g.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Movie grid */}
      <div className="container" style={{ paddingBottom: '5rem' }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', marginBottom: '1.2rem' }}>
          {loading ? 'SCANNING DATABASE...' : `${movies.length} FILMS ${activeGenre !== 'All' ? `IN ${activeGenre.toUpperCase()}` : 'TOTAL'}`}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.2rem' }}>
              {[...Array(16)].map((_, i) => <MovieCardSkeleton key={i} />)}
            </motion.div>
          ) : (
            <motion.div key={activeGenre} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.2rem' }}>
              {movies.map((movie, i) => (
                <motion.div
                  key={movie.movieId || i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: (i % 8) * 0.04 }}
                >
                  <MovieCard
                    movie={movie}
                    onOpen={setSelectedMovie}
                    onWatchlist={handleWatchlist}
                  />
                </motion.div>
              ))}

              {/* Skeleton placeholders while loading more */}
              {loadingMore && [...Array(8)].map((_, i) => <MovieCardSkeleton key={`more-${i}`} />)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Load more button */}
        {!loading && hasMore && (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                padding: '0.75rem 2.5rem',
                fontFamily: 'Orbitron', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.15em',
                textTransform: 'uppercase',
                background: loadingMore ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.12)',
                color: loadingMore ? 'rgba(249,115,22,0.4)' : '#f97316',
                border: '1px solid rgba(249,115,22,0.3)',
                cursor: loadingMore ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loadingMore ? 'LOADING...' : 'LOAD MORE FILMS'}
            </motion.button>
          </div>
        )}
      </div>

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onWatchlist={handleWatchlist}
          onRate={(id, r) => moviesAPI.rate(userId, id, r).catch(() => {})}
        />
      )}
    </div>
  )
}
