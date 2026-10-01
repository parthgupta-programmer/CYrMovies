import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GENRES } from '../../data/mockData'

export default function GenreSelector({ selected, onToggle }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '0.75rem',
      justifyContent: 'center', maxWidth: 640, margin: '0 auto',
    }}>
      {GENRES.map((genre, i) => {
        const active = selected.includes(genre.name)
        return (
          <motion.button
            key={genre.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggle(genre.name)}
            style={{
              padding: '0.6rem 1.3rem',
              fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: 'pointer',
              background: active ? `linear-gradient(135deg, ${genre.color}33, ${genre.color}11)` : 'rgba(255,255,255,0.03)',
              border: active ? `1px solid ${genre.color}88` : '1px solid rgba(255,255,255,0.1)',
              color: active ? genre.color : 'rgba(255,255,255,0.45)',
              boxShadow: active ? `0 0 18px ${genre.color}44` : 'none',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{genre.icon}</span>
            {genre.name}
            {active && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{ fontSize: '0.6rem', color: genre.color }}
              >
                ✓
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
