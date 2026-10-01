import { motion } from 'framer-motion'

export default function Loader({ message = 'SCANNING...' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '4rem 2rem', gap: '1.5rem',
    }}>
      {/* Triple spinning rings */}
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 1.5 + i * 0.6, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: i * 9,
              border: '1.5px solid',
              borderColor: ['#f97316', '#f59e0b', '#fbbf24'][i],
              borderRadius: '50%',
              opacity: 0.75,
            }}
          />
        ))}
        {/* Centre pulse */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 10px #f97316' }}
          />
        </div>
      </div>

      {/* Message */}
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        style={{
          fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.28em',
          color: '#f97316', textTransform: 'uppercase',
        }}
      >
        {message}
      </motion.div>
    </div>
  )
}
