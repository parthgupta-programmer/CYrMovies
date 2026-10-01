import { motion } from 'framer-motion'

export default function ConfidenceMeter({ value = 0.9, label = 'MATCH', color = '#f97316', delay = 0 }) {
  return (
    <div style={{ marginBottom: '0.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: '0.57rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
          {label}
        </span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.5 }}
          style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', fontWeight: 700, color }}
        >
          {Math.round(value * 100)}%
        </motion.span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${color}, #fbbf24)`,
            borderRadius: 2,
            boxShadow: `0 0 10px ${color}60`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 1.4, ease: 'easeOut', delay }}
        />
      </div>
    </div>
  )
}
