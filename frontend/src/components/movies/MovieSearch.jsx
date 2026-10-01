import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Loader from '../common/Loader'
import { moviesAPI } from '../../services/api'
import { MOCK_MOVIES } from '../../data/mockData'
import { getMoviePoster, getFallbackPoster } from '../../utils/poster'

// Search Result Card - shows movie entity, NOT recommendations
function SearchResultCard({ movie, onOpen, onWatchlist, onRecommend }) {
  const [imgError, setImgError] = useState(false)
  const poster = imgError ? getFallbackPoster(movie?.title, movie?.genres) : getMoviePoster(movie)
  const genreList = (movie?.genres || '').split('|').filter(Boolean).slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(10,10,15,0.9)',
        border: '1px solid rgba(249,115,22,0.18)',
        borderRadius: 4,
        overflow: 'hidden',
        display: 'flex',
        gap: '1rem',
        padding: '0.85rem',
        transition: 'border-color 0.2s',
      }}
      whileHover={{ borderColor: 'rgba(249,115,22,0.5)' }}
    >
      {/* Poster thumbnail */}
      <div style={{ flexShrink: 0, width: 60, height: 90, borderRadius: 3, overflow: 'hidden' }}>
        <img
          src={poster}
          alt={movie.title}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: '0.92rem', color: '#f1f5f9',
          marginBottom: '0.25rem',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {movie.title}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          {genreList.map(g => (
            <span key={g} style={{
              fontFamily: 'Orbitron', fontSize: '0.55rem', letterSpacing: '0.08em',
              color: 'rgba(249,115,22,0.75)', border: '1px solid rgba(249,115,22,0.2)',
              padding: '2px 7px',
            }}>
              {g}
            </span>
          ))}
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onOpen?.(movie)}
            style={{
              padding: '4px 12px',
              fontFamily: 'Orbitron', fontSize: '0.57rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'rgba(249,115,22,0.08)',
              color: '#f97316',
              border: '1px solid rgba(249,115,22,0.3)',
              borderRadius: 3, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            VIEW
          </button>
          <button
            onClick={() => onRecommend?.(movie)}
            style={{
              padding: '4px 12px',
              fontFamily: 'Orbitron', fontSize: '0.57rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff',
              border: 'none',
              borderRadius: 3, cursor: 'pointer',
              boxShadow: '0 0 12px rgba(249,115,22,0.35)',
              transition: 'all 0.2s',
            }}
          >
            RECOMMEND LIKE THIS
          </button>
          <button
            onClick={() => onWatchlist?.(movie)}
            style={{
              padding: '4px 12px',
              fontFamily: 'Orbitron', fontSize: '0.57rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'transparent',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 3, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            + LIST
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function MovieSearch({ onOpen, onWatchlist }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)
  const debounce = useRef(null)
  const navigate = useNavigate()

  const search = async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true); setError('')
    try {
      try {
        const data = await moviesAPI.search(q, 20)
        setResults(data.results || [])
      } catch {
        const lower = q.toLowerCase()
        setResults(MOCK_MOVIES.filter(m =>
          m.title.toLowerCase().includes(lower) ||
          (m.genres || '').toLowerCase().includes(lower)
        ))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(v), 350)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    clearTimeout(debounce.current)
    search(query)
  }

  const handleRecommend = (movie) => {
    navigate(`/similar/${movie.movieId}`, { state: { movie } })
  }

  return (
    <section style={{ padding: '5rem 0 3rem' }}>
      <div className="container">
        {/* Section heading */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.75rem' }}>
            CINEMA DATABASE
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>
            Search <span style={{ color: '#f97316', textShadow: '0 0 20px rgba(249,115,22,0.4)' }}>Cinema</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', marginTop: '0.5rem' }}>
            Find a movie, then hit <span style={{ color: '#f97316' }}>RECOMMEND LIKE THIS</span> to get similar recommendations.
          </p>
        </div>

        {/* Search field */}
        <form onSubmit={handleSubmit} style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          <div style={{
            position: 'relative',
            border: focused ? '1px solid rgba(249,115,22,0.7)' : '1px solid rgba(249,115,22,0.25)',
            boxShadow: focused ? '0 0 25px rgba(249,115,22,0.2)' : 'none',
            background: 'rgba(10,10,15,0.8)',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.25s ease',
          }}>
            {focused && (
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.08), transparent)',
                  pointerEvents: 'none',
                }}
              />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search movies by title, e.g. 'Maze Runner'..."
              style={{
                width: '100%', padding: '1rem 5rem 1rem 1.5rem',
                background: 'transparent', border: 'none', outline: 'none',
                color: '#f1f5f9', fontSize: '1rem',
                fontFamily: 'Space Grotesk, Inter, sans-serif',
              }}
            />
            <button
              type="submit"
              style={{
                position: 'absolute', right: 0, top: 0, bottom: 0,
                padding: '0 1.5rem',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.15em', color: '#fff', textTransform: 'uppercase',
              }}
            >
              SCAN
            </button>
          </div>
          <span style={{ position:'absolute', top:-1, left:-1, width:10, height:10, borderTop:'2px solid #f97316', borderLeft:'2px solid #f97316' }} />
          <span style={{ position:'absolute', top:-1, right:-1, width:10, height:10, borderTop:'2px solid #f97316', borderRight:'2px solid #f97316' }} />
          <span style={{ position:'absolute', bottom:-1, left:-1, width:10, height:10, borderBottom:'2px solid #f97316', borderLeft:'2px solid #f97316' }} />
          <span style={{ position:'absolute', bottom:-1, right:-1, width:10, height:10, borderBottom:'2px solid #f97316', borderRight:'2px solid #f97316' }} />
        </form>

        {/* Results */}
        <div style={{ marginTop: '2.5rem', maxWidth: 720, margin: '2.5rem auto 0' }}>
          {loading && <Loader message="SCANNING DATABASE..." />}
          {error && (
            <div style={{ textAlign: 'center', color: '#dc2626', fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em' }}>
              CINEMATIC LINK INTERRUPTED
            </div>
          )}
          <AnimatePresence mode="wait">
            {!loading && results.length > 0 && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{
                  fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.2em',
                  color: 'rgba(249,115,22,0.5)', marginBottom: '1.2rem',
                }}>
                  {results.length} FILMS DETECTED — SELECT ONE TO RECOMMEND
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {results.map((movie) => (
                    <SearchResultCard
                      key={movie.movieId}
                      movie={movie}
                      onOpen={onOpen}
                      onWatchlist={onWatchlist}
                      onRecommend={handleRecommend}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            {!loading && query && results.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.2em' }}
              >
                NO FILMS DETECTED
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
