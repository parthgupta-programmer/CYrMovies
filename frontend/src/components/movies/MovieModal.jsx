import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HUDFrame from '../hud/HUDFrame'
import MovieRating from './MovieRating'
import Button from '../common/Button'
import ConfidenceMeter from '../hud/ConfidenceMeter'
import { getMoviePoster, getFallbackPoster } from '../../utils/poster'

export default function MovieModal({ movie, onClose, onWatchlist, onRate }) {
  const [imgError, setImgError] = useState(false)
  const [currentRating, setCurrentRating] = useState(movie?.user_rating || null)
  const [rated, setRated] = useState(!!movie?.user_rating)
  const navigate = useNavigate()

  if (!movie) return null

  const poster    = imgError ? getFallbackPoster(movie?.title, movie?.genres) : getMoviePoster(movie)
  const genreList = (movie?.genres || '').split('|')
  const score     = movie?.score ?? null

  const handleRate = (r) => {
    setCurrentRating(r)
    setRated(true)
    onRate?.(movie.movieId, r)
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(3,3,3,0.88)',
          backdropFilter: 'blur(12px)',
        }}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, scale: 0.94, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 30 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 2001,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
          pointerEvents: 'none',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            pointerEvents: 'auto',
            width: '100%', maxWidth: 900,
            maxHeight: '90vh', overflowY: 'auto',
            background: 'rgba(10,10,15,0.97)',
            border: '1px solid rgba(249,115,22,0.22)',
            borderRadius: 4,
            position: 'relative',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
              color: '#f97316', width: 32, height: 32, borderRadius: 3,
              cursor: 'pointer', fontFamily: 'Orbitron', fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0 }}>
            {/* Poster */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <img
                src={poster}
                alt={movie.title}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 420 }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to right, transparent 70%, rgba(10,10,15,1) 100%)',
              }} />
            </div>

            {/* Details */}
            <div style={{ padding: '2rem 2rem 2rem 1.5rem' }}>
              {/* Eyebrow */}
              <div style={{
                fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.25em',
                color: '#f97316', marginBottom: '0.5rem', textTransform: 'uppercase',
              }}>
                CYRMOVIE / FILM ANALYSIS
              </div>

              {/* Title */}
              <h2 style={{
                fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.2,
                color: '#f1f5f9', marginBottom: '0.5rem',
              }}>
                {movie.title}
              </h2>

              {/* Meta */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {movie.year && (
                  <span style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                    {movie.year}
                  </span>
                )}
                {movie.rating && (
                  <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>★ {movie.rating}</span>
                )}
                {genreList.slice(0, 3).map(g => (
                  <span key={g} style={{
                    fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.08em',
                    color: 'rgba(249,115,22,0.75)', border: '1px solid rgba(249,115,22,0.25)',
                    padding: '2px 8px',
                  }}>
                    {g}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p style={{
                fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.7, marginBottom: '1.5rem',
              }}>
                {movie.description || 'No description available.'}
              </p>

              {/* Match score */}
              {score !== null && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <HUDFrame label="MATCH ANALYSIS" animate={false} style={{ padding: '1rem 1.2rem' }}>
                    <ConfidenceMeter value={score} label="CINEMA MATCH" delay={0.2} />
                    {movie.explanation && (
                      <p style={{
                        fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)',
                        lineHeight: 1.6, marginTop: '0.6rem',
                        fontStyle: 'italic',
                      }}>
                        "{movie.explanation}"
                      </p>
                    )}
                  </HUDFrame>
                </div>
              )}

              {/* Rating */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '0.6rem',
                }}>
                  <div style={{
                    fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.2em',
                    color: 'rgba(255,255,255,0.5)',
                  }}>
                    {currentRating ? `YOUR RATING: ★ ${Number(currentRating).toFixed(1)}` : 'RATE THIS FILM'}
                  </div>
                  {rated && (
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{
                        fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.15em',
                        color: '#f97316', fontWeight: 700,
                      }}
                    >
                      ✓ SAVED TO PROFILE
                    </motion.span>
                  )}
                </div>
                <MovieRating onRate={handleRate} initialRating={currentRating ? Math.round(Number(currentRating)) : 0} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button size="sm" onClick={() => onWatchlist?.(movie)}>
                  + WATCHLIST
                </Button>
                <Button size="sm" variant="secondary" onClick={() => {
                  onClose?.()
                  navigate(`/similar/${movie.movieId}`, { state: { movie } })
                }}>
                  SIMILAR FILMS
                </Button>
                <Button size="sm" variant="secondary" onClick={onClose}>
                  CLOSE
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
