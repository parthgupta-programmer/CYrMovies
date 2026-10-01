import { useState } from 'react'
import { motion } from 'framer-motion'

export default function MovieRating({ onRate, initialRating = 0 }) {
  const [hovered, setHovered]   = useState(0)
  const [selected, setSelected] = useState(initialRating)

  const handleSelect = (r) => {
    setSelected(r)
    onRate?.(r)
  }

  return (
    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => {
        const active = n <= (hovered || selected)
        return (
          <motion.button
            key={n}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleSelect(n)}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 28, height: 28,
              borderRadius: '50%',
              background: active ? 'linear-gradient(135deg, #f97316, #fbbf24)' : 'transparent',
              border: active ? '2px solid #f97316' : '2px solid rgba(249,115,22,0.3)',
              cursor: 'pointer',
              boxShadow: active ? '0 0 14px rgba(249,115,22,0.6)' : 'none',
              transition: 'all 0.15s ease',
            }}
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          />
        )
      })}
      <span style={{
        fontFamily: 'Orbitron', fontSize: '0.62rem', letterSpacing: '0.1em',
        color: hovered || selected ? '#f97316' : 'rgba(255,255,255,0.3)',
        marginLeft: '0.25rem',
      }}>
        {(hovered || selected) ? `${hovered || selected} / 5` : 'SELECT'}
      </span>
    </div>
  )
}
