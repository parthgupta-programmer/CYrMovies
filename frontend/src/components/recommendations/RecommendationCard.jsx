import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MovieCard from '../movies/MovieCard'
import ConfidenceMeter from '../hud/ConfidenceMeter'
import HUDFrame from '../hud/HUDFrame'

export default function RecommendationCard({ movie, onOpen, onWatchlist, index = 0 }) {
  const [expanded, setExpanded] = useState(false)
  const score = movie.score ?? 0.85

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      style={{ width: 200, flexShrink: 0 }}
    >
      <div style={{ position: 'relative' }}>
        {/* Match badge */}
        <div style={{
          position: 'absolute', top: -12, left: 8, zIndex: 10,
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          padding: '2px 10px',
          fontFamily: 'Orbitron', fontSize: '0.6rem', fontWeight: 700, color: '#fff',
          letterSpacing: '0.08em',
          boxShadow: '0 0 12px rgba(249,115,22,0.5)',
          clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
        }}>
          MATCH {Math.round(score * 100)}%
        </div>

        <MovieCard movie={movie} onOpen={onOpen} onWatchlist={onWatchlist} />

        {/* Why this movie toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            width: '100%', marginTop: 6,
            padding: '5px 0',
            fontFamily: 'Orbitron', fontSize: '0.57rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            background: 'transparent',
            color: expanded ? '#f97316' : 'rgba(255,255,255,0.3)',
            border: `1px solid ${expanded ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
        >
          {expanded ? '▲ HIDE' : '▼ WHY THIS?'}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
              animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.3 }}
              style={{ marginTop: 6 }}
            >
              <HUDFrame label="WHY THIS MOVIE?" animate={false} style={{ padding: '0.85rem 1rem' }}>
                <ConfidenceMeter value={score} label="VIEWER MATCH" delay={0} />
                {movie.genres && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>
                      SHARED GENRES
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {movie.genres.split('|').map(g => (
                        <span key={g} style={{
                          fontFamily: 'Orbitron', fontSize: '0.55rem',
                          color: '#f97316', letterSpacing: '0.05em',
                        }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {movie.explanation && (
                  <p style={{
                    fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)',
                    lineHeight: 1.6, marginTop: '0.6rem', fontStyle: 'italic',
                  }}>
                    {movie.explanation}
                  </p>
                )}
              </HUDFrame>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
