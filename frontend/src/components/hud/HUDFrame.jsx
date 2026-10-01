import { motion } from 'framer-motion'

// ---- HUD-style frame with corner accents ----
export default function HUDFrame({ children, label, className = '', animate = true, style = {} }) {
  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, scale: 0.97 } : {}}
      animate={animate ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'relative',
        background: 'rgba(10,10,15,0.82)',
        border: '1px solid rgba(249,115,22,0.18)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        padding: '1.5rem',
        ...style,
      }}
    >
      {/* Corners */}
      <span style={corner('tl')} />
      <span style={corner('tr')} />
      <span style={corner('bl')} />
      <span style={corner('br')} />

      {/* Label badge */}
      {label && (
        <div style={{
          position: 'absolute',
          top: -10,
          left: 16,
          background: '#030303',
          padding: '0 8px',
          fontFamily: 'Orbitron, monospace',
          fontSize: '0.58rem',
          letterSpacing: '0.22em',
          color: '#f97316',
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </motion.div>
  )
}

function corner(pos) {
  const base = {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#f97316',
    borderStyle: 'solid',
    boxShadow: '0 0 6px rgba(249,115,22,0.5)',
  }
  const map = {
    tl: { top: -1,   left: -1,  borderWidth: '2px 0 0 2px' },
    tr: { top: -1,   right: -1, borderWidth: '2px 2px 0 0' },
    bl: { bottom: -1, left: -1,  borderWidth: '0 0 2px 2px' },
    br: { bottom: -1, right: -1, borderWidth: '0 2px 2px 0' },
  }
  return { ...base, ...map[pos] }
}
