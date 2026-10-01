import { useState, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { getMoviePoster, getFallbackPoster } from '../../utils/poster'

export default function MovieCard({ movie, onOpen, onWatchlist, compact = false }) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)
  const cardRef = useRef(null)

  // 3D tilt based on mouse position
  const x  = useMotionValue(0)
  const y  = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 300, damping: 30 })
  const sy = useSpring(y, { stiffness: 300, damping: 30 })
  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8])
  const rotateY = useTransform(sx, [-0.5, 0.5], [-8, 8])

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width  - 0.5)
    y.set((e.clientY - rect.top)  / rect.height - 0.5)
  }
  const handleMouseLeave = () => { x.set(0); y.set(0) }

  const poster = imgError ? getFallbackPoster(movie?.title, movie?.genres) : getMoviePoster(movie)
  const genreList = (movie?.genres || '').split('|').slice(0, 3)
  const score = movie?.score ?? null

  return (
    <motion.div
      ref={cardRef}
      className="movie-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onOpen?.(movie)}
      style={{
        perspective: 1000,
        cursor: 'pointer',
        width: compact ? 140 : 200,
        flexShrink: 0,
      }}
      whileHover={{ z: 10 }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          borderRadius: 4,
          overflow: 'hidden',
          border: hovered ? '1px solid rgba(249,115,22,0.55)' : '1px solid rgba(249,115,22,0.12)',
          boxShadow: hovered
            ? '0 0 30px rgba(249,115,22,0.25), 0 20px 40px rgba(0,0,0,0.6)'
            : '0 4px 20px rgba(0,0,0,0.4)',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
          background: '#0a0a0f',
        }}
      >
        {/* Poster */}
        <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden' }}>
          <img
            src={poster}
            alt={movie.title}
            onError={() => setImgError(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: hovered ? 'scale(1.07)' : 'scale(1)',
              transition: 'transform 0.4s ease',
              display: 'block',
            }}
          />

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(3,3,3,0.95) 0%, rgba(3,3,3,0.3) 40%, transparent 70%)',
          }} />

          {/* Score badge */}
          {score !== null && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(3,3,3,0.85)', border: '1px solid rgba(249,115,22,0.4)',
              borderRadius: 3, padding: '2px 6px',
              fontFamily: 'Orbitron', fontSize: '0.58rem', fontWeight: 700,
              color: '#f97316', letterSpacing: '0.08em',
            }}>
              {Math.round(score * 100)}%
            </div>
          )}

          {/* Hover overlay actions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }}
            style={{
              position: 'absolute', bottom: 8, left: 8, right: 8,
              display: 'flex', gap: 6,
            }}
          >
            <button
              onClick={e => { e.stopPropagation(); onWatchlist?.(movie) }}
              style={{
                flex: 1, padding: '5px 0',
                fontFamily: 'Orbitron', fontSize: '0.55rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                background: 'rgba(249,115,22,0.15)', color: '#f97316',
                border: '1px solid rgba(249,115,22,0.4)', borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              + LIST
            </button>
          </motion.div>

          {/* HUD corner decorations */}
          {hovered && (
            <>
              <span style={{ position:'absolute', top:4, left:4, width:8, height:8, borderTop:'1.5px solid #f97316', borderLeft:'1.5px solid #f97316' }} />
              <span style={{ position:'absolute', top:4, right:4, width:8, height:8, borderTop:'1.5px solid #f97316', borderRight:'1.5px solid #f97316' }} />
            </>
          )}
        </div>

        {/* Info bar */}
        <div style={{ padding: compact ? '0.5rem 0.6rem' : '0.65rem 0.75rem' }}>
          <div style={{
            fontWeight: 600, fontSize: compact ? '0.72rem' : '0.82rem',
            color: '#f1f5f9', lineHeight: 1.3, marginBottom: 4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {movie.title}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {genreList.map(g => (
              <span key={g} style={{
                fontSize: '0.58rem', color: 'rgba(249,115,22,0.7)',
                fontFamily: 'Orbitron', letterSpacing: '0.06em',
              }}>
                {g}
              </span>
            ))}
          </div>
          {movie.rating && (
            <div style={{
              marginTop: 4, fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)',
            }}>
              ★ {movie.rating}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
