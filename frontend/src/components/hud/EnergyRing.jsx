import { motion } from 'framer-motion'

export default function EnergyRing({ size = 90, value = 0.75, label, color = '#f97316', delay = 0 }) {
  const r            = size / 2 - 5
  const circumference = 2 * Math.PI * r
  const offset        = circumference * (1 - value)

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={size}
        height={size}
        style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2.5} />
        {/* Progress */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: 'easeOut', delay }}
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
        />
      </svg>
      <div style={{ textAlign: 'center', zIndex: 1, lineHeight: 1 }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.3 }}
          style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: size * 0.19,
            fontWeight: 800,
            color,
            textShadow: `0 0 12px ${color}`,
          }}
        >
          {Math.round(value * 100)}%
        </motion.div>
        {label && (
          <div style={{
            fontSize: size * 0.1,
            color: 'rgba(255,255,255,0.45)',
            marginTop: 3,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: 'Orbitron',
          }}>
            {label}
          </div>
        )}
      </div>
    </div>
  )
}
