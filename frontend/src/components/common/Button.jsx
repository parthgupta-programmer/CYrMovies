import { motion } from 'framer-motion'

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  size = 'md',
  style: extraStyle = {},
  type = 'button',
}) {
  const sizes = {
    sm: { padding: '0.45rem 1.1rem', fontSize: '0.72rem' },
    md: { padding: '0.68rem 1.7rem', fontSize: '0.8rem' },
    lg: { padding: '0.9rem 2.2rem',  fontSize: '0.9rem' },
  }

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontFamily: 'Orbitron, monospace',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    position: 'relative',
    overflow: 'hidden',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.2s ease',
    ...sizes[size],
    ...extraStyle,
  }

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      color: '#fff',
      boxShadow: '0 0 22px rgba(249,115,22,0.28)',
      clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
    },
    secondary: {
      background: 'transparent',
      color: '#f97316',
      border: '1px solid rgba(249,115,22,0.5)',
    },
    ghost: {
      background: 'rgba(249,115,22,0.07)',
      color: '#f97316',
      border: '1px solid rgba(249,115,22,0.2)',
    },
    danger: {
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      color: '#fff',
      boxShadow: '0 0 18px rgba(220,38,38,0.25)',
    },
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.04, boxShadow: '0 0 36px rgba(249,115,22,0.5)' } : {}}
      whileTap={!disabled ? { scale: 0.96 } : {}}
      style={{ ...base, ...variants[variant] }}
    >
      {children}
    </motion.button>
  )
}
