import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getMoviePoster, getFallbackPoster } from '../../utils/poster'
import HUDFrame from '../hud/HUDFrame'

function RecommendationGridCard({ movie, index, onOpen, onWatchlist }) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const poster = imgError ? getFallbackPoster(movie?.title, movie?.genres) : getMoviePoster(movie)
  const genreList = (movie?.genres || '').split('|').filter(Boolean).slice(0, 3)
  const score = movie?.score ?? null
  const matchPct = score !== null ? Math.round(score * 100) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 8) * 0.05, duration: 0.35 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      {/* Match badge */}
      {matchPct !== null && (
        <div style={{
          position: 'absolute', top: -10, left: 8, zIndex: 10,
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          padding: '2px 10px',
          fontFamily: 'Orbitron', fontSize: '0.58rem', fontWeight: 700, color: '#fff',
          letterSpacing: '0.08em',
          boxShadow: '0 0 12px rgba(249,115,22,0.5)',
          clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
        }}>
          {matchPct}% MATCH
        </div>
      )}

      <div
        onClick={() => onOpen?.(movie)}
        style={{
          background: '#0a0a0f',
          border: hovered ? '1px solid rgba(249,115,22,0.55)' : '1px solid rgba(249,115,22,0.12)',
          borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
          boxShadow: hovered ? '0 0 24px rgba(249,115,22,0.2), 0 16px 32px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.35)',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Poster */}
        <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden' }}>
          <img
            src={poster}
            alt={movie.title}
            onError={() => setImgError(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.4s ease',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(3,3,3,0.95) 0%, rgba(3,3,3,0.2) 50%, transparent 70%)',
          }} />

          {/* Hover overlay actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 4 }}
          >
            <button
              onClick={e => { e.stopPropagation(); onWatchlist?.(movie) }}
              style={{
                flex: 1, padding: '5px 0',
                fontFamily: 'Orbitron', fontSize: '0.5rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: 'rgba(249,115,22,0.15)', color: '#f97316',
                border: '1px solid rgba(249,115,22,0.4)', borderRadius: 3, cursor: 'pointer',
              }}
            >
              + LIST
            </button>
          </motion.div>

          {hovered && (
            <>
              <span style={{ position:'absolute', top:4, left:4, width:7, height:7, borderTop:'1.5px solid #f97316', borderLeft:'1.5px solid #f97316' }} />
              <span style={{ position:'absolute', top:4, right:4, width:7, height:7, borderTop:'1.5px solid #f97316', borderRight:'1.5px solid #f97316' }} />
            </>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '0.6rem 0.7rem 0.5rem' }}>
          <div style={{
            fontWeight: 600, fontSize: '0.8rem', color: '#f1f5f9',
            lineHeight: 1.3, marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {movie.title}
          </div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
            {genreList.map(g => (
              <span key={g} style={{ fontSize: '0.55rem', color: 'rgba(249,115,22,0.7)', fontFamily: 'Orbitron', letterSpacing: '0.05em' }}>
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Why this? toggle */}
      {movie.explanation && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              width: '100%', marginTop: 5,
              padding: '4px 0',
              fontFamily: 'Orbitron', fontSize: '0.53rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'transparent',
              color: expanded ? '#f97316' : 'rgba(255,255,255,0.3)',
              border: `1px solid ${expanded ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.07)'}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {expanded ? '▲ HIDE' : '▼ WHY THIS?'}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: 4 }}
              >
                <HUDFrame label="WHY THIS MOVIE?" animate={false} style={{ padding: '0.7rem 0.85rem' }}>
                  <p style={{
                    fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1.6, fontStyle: 'italic', margin: 0,
                  }}>
                    {movie.explanation}
                  </p>
                </HUDFrame>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}

export default function RecommendationGrid({
  movies = [],
  loading = false,
  onOpen,
  onWatchlist,
  title = 'Recommended Films',
  subtitle = '',
  label = 'RECOMMENDATIONS',
}) {
  return (
    <section style={{ padding: '3rem 0 5rem' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: '0.62rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.5rem' }}>
            {label}
          </div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 700, color: '#f1f5f9' }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
              {subtitle}
            </p>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{
              fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.2em',
              color: '#f97316', textShadow: '0 0 10px rgba(249,115,22,0.5)',
            }}>
              COMPUTING RECOMMENDATIONS...
            </div>
          </div>
        )}

        {!loading && movies.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '4rem 0',
            fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.25)',
          }}>
            NO RECOMMENDATIONS AVAILABLE
          </div>
        )}

        {!loading && movies.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.4rem',
          }}>
            {movies.map((movie, i) => (
              <RecommendationGridCard
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
    </section>
  )
}
