import { useState } from 'react'
import { motion } from 'framer-motion'
import { MOCK_MOVIES } from '../../data/mockData'
import { getMoviePoster, getFallbackPoster } from '../../utils/poster'

export default function MovieSelector({ selected, onToggle, max = 5 }) {
  const pool = MOCK_MOVIES.slice(0, 12)

  return (
    <div>
      <div style={{
        textAlign: 'center', marginBottom: '1rem',
        fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.2em',
        color: selected.length >= max ? '#f97316' : 'rgba(255,255,255,0.4)',
      }}>
        {selected.length} / {max} SELECTED
        {selected.length >= max && ' — MAX REACHED'}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '1rem',
      }}>
        {pool.map((movie, i) => {
          const active = selected.includes(movie.movieId)
          const canSelect = active || selected.length < max
          const poster = getMoviePoster(movie)
          return (
            <motion.div
              key={movie.movieId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileHover={canSelect ? { scale: 1.04 } : {}}
              whileTap={canSelect ? { scale: 0.96 } : {}}
              onClick={() => canSelect && onToggle(movie.movieId)}
              style={{
                cursor: canSelect ? 'pointer' : 'not-allowed',
                opacity: !canSelect && !active ? 0.35 : 1,
                position: 'relative',
              }}
            >
              <div style={{
                border: active ? '2px solid #f97316' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: active ? '0 0 20px rgba(249,115,22,0.35), inset 0 0 20px rgba(249,115,22,0.05)' : 'none',
                borderRadius: 3, overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}>
                <div style={{ aspectRatio: '2/3', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={poster}
                    alt={movie.title}
                    onError={e => { e.target.src = getFallbackPoster(movie?.title, movie?.genres) }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(3,3,3,0.9) 0%, transparent 60%)',
                  }} />
                  {active && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', color: '#fff', fontWeight: 700,
                        boxShadow: '0 0 12px rgba(249,115,22,0.6)',
                      }}
                    >
                      ✓
                    </motion.div>
                  )}
                </div>
                <div style={{ padding: '0.5rem 0.6rem' }}>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 600, color: '#f1f5f9',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {movie.title}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
