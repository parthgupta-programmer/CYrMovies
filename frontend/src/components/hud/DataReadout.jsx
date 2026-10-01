import { motion } from 'framer-motion'

export default function DataReadout({ items = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07, duration: 0.3 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.3rem 0',
            borderBottom: '1px solid rgba(249,115,22,0.07)',
          }}
        >
          <span style={{
            fontFamily: 'Orbitron',
            fontSize: '0.58rem',
            letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase',
          }}>
            {item.label}
          </span>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: item.highlight ? '#f97316' : '#f1f5f9',
            textShadow: item.highlight ? '0 0 10px rgba(249,115,22,0.5)' : 'none',
          }}>
            {item.value}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
