// ============================================================
//  CYrMovie — GenreRail: Netflix-style horizontal scrolling row
// ============================================================
import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getMoviePoster, getFallbackPoster } from '../../utils/poster'

function RailCard({ movie, index, onOpen, onWatchlist }) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)
  const poster = imgError ? getFallbackPoster(movie?.title, movie?.genres) : getMoviePoster(movie)
  const score = movie?.score ?? null

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width: 160,
        cursor: 'pointer',
        position: 'relative',
      }}
      onClick={() => onOpen?.(movie)}
    >
      <motion.div
        animate={{ scale: hovered ? 1.06 : 1, zIndex: hovered ? 10 : 1 }}
        transition={{ duration: 0.25 }}
        style={{
          border: hovered ? '1px solid rgba(249,115,22,0.6)' : '1px solid rgba(249,115,22,0.1)',
          boxShadow: hovered ? '0 0 28px rgba(249,115,22,0.3), 0 16px 32px rgba(0,0,0,0.6)' : '0 4px 12px rgba(0,0,0,0.4)',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#0a0a0f',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        {/* Poster */}
        <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden' }}>
          <img
            src={poster}
            alt={movie.title}
            onError={() => setImgError(true)}
            loading="lazy"
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.4s ease',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(3,3,3,0.95) 0%, rgba(3,3,3,0.15) 50%, transparent 70%)',
          }} />

          {/* Score badge */}
          {score !== null && (
            <div style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.85)',
              border: '1px solid rgba(249,115,22,0.5)',
              borderRadius: 3, padding: '1px 5px',
              fontFamily: 'Orbitron', fontSize: '0.55rem', fontWeight: 700,
              color: '#f97316',
            }}>
              {Math.round(score * 100)}%
            </div>
          )}

          {/* Hover overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            style={{ position: 'absolute', bottom: 6, left: 6, right: 6 }}
          >
            <button
              onClick={e => { e.stopPropagation(); onWatchlist?.(movie) }}
              style={{
                width: '100%', padding: '4px 0',
                fontFamily: 'Orbitron', fontSize: '0.48rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: 'rgba(249,115,22,0.2)', color: '#f97316',
                border: '1px solid rgba(249,115,22,0.5)', borderRadius: 3, cursor: 'pointer',
              }}
            >
              + WATCHLIST
            </button>
          </motion.div>

          {/* HUD corners */}
          {hovered && <>
            <span style={{ position: 'absolute', top: 4, left: 4, width: 7, height: 7, borderTop: '1.5px solid #f97316', borderLeft: '1.5px solid #f97316' }} />
            <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderTop: '1.5px solid #f97316', borderRight: '1.5px solid #f97316' }} />
          </>}
        </div>

        {/* Info */}
        <div style={{ padding: '0.45rem 0.55rem 0.5rem' }}>
          <div style={{
            fontWeight: 600, fontSize: '0.72rem', color: '#f1f5f9',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.3, marginBottom: 2,
          }}>
            {movie.title}
          </div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {(movie.genres || '').split('|').slice(0, 2).map(g => (
              <span key={g} style={{ fontSize: '0.5rem', color: 'rgba(249,115,22,0.65)', fontFamily: 'Orbitron', letterSpacing: '0.05em' }}>
                {g}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function GenreRail({ title, label, movies = [], loading = false, onOpen, onWatchlist, color = '#f97316' }) {
  const railRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollState = () => {
    if (!railRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = railRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const scroll = (dir) => {
    if (!railRef.current) return
    railRef.current.scrollBy({ left: dir * 480, behavior: 'smooth' })
    setTimeout(updateScrollState, 350)
  }

  if (!loading && movies.length === 0) return null

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Rail header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', padding: '0 1rem' }}>
        <div>
          <div style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', letterSpacing: '0.28em', color: `${color}99`, marginBottom: 3 }}>
            {label}
          </div>
          <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
            {title}
          </h3>
        </div>
        {/* Scroll controls */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            style={{
              width: 30, height: 30, borderRadius: 3,
              background: canScrollLeft ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${canScrollLeft ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: canScrollLeft ? '#f97316' : 'rgba(255,255,255,0.2)',
              cursor: canScrollLeft ? 'pointer' : 'default',
              fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            ‹
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            style={{
              width: 30, height: 30, borderRadius: 3,
              background: canScrollRight ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${canScrollRight ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: canScrollRight ? '#f97316' : 'rgba(255,255,255,0.2)',
              cursor: canScrollRight ? 'pointer' : 'default',
              fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Horizontal scroll rail */}
      {loading ? (
        <div style={{ display: 'flex', gap: '1rem', padding: '0 1rem', overflow: 'hidden' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ flexShrink: 0, width: 160 }}>
              <div style={{ aspectRatio: '2/3', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
              <div style={{ height: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 2, marginTop: 8, width: '80%' }} />
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={railRef}
          onScroll={updateScrollState}
          style={{
            display: 'flex', gap: '0.85rem',
            overflowX: 'auto', overflowY: 'visible',
            padding: '0.5rem 1rem 1rem',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}
        >
          {movies.map((movie, i) => (
            <RailCard
              key={movie.movieId || i}
              movie={movie}
              index={i}
              onOpen={onOpen}
              onWatchlist={onWatchlist}
            />
          ))}
        </div>
      )}
    </div>
  )
}
