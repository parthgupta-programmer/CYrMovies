import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  { label: 'ANALYZING PREFERENCES', duration: 1200 },
  { label: 'BUILDING PROFILE MATRIX', duration: 1000 },
  { label: 'CALIBRATING ALGORITHMS', duration: 900 },
  { label: 'FINDING MATCHES', duration: 800 },
  { label: 'READY.', duration: 0 },
]

export default function ProfileInitializer({ onComplete }) {
  const [step,     setStep]     = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let current = 0
    const advance = () => {
      if (current >= STEPS.length - 1) {
        setProgress(100)
        setTimeout(() => onComplete?.(), 700)
        return
      }
      current++
      setStep(current)
      setProgress(Math.round((current / (STEPS.length - 1)) * 100))
      if (STEPS[current].duration > 0) setTimeout(advance, STEPS[current].duration)
    }
    const first = setTimeout(advance, STEPS[0].duration)
    return () => clearTimeout(first)
  }, [onComplete])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', gap: '2rem',
    }}>
      {/* Animated reactor */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 1.5 + i * 0.5, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: i * 10,
              border: '1.5px solid',
              borderColor: ['#f97316', '#f59e0b', '#fbbf24', '#ea580c'][i],
              borderRadius: '50%',
              opacity: 0.7 - i * 0.1,
            }}
          />
        ))}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              width: 16, height: 16, borderRadius: '50%',
              background: '#f97316', boxShadow: '0 0 20px #f97316, 0 0 40px rgba(249,115,22,0.4)',
            }}
          />
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.5rem' }}>
          CYRMOVIE INTELLIGENCE
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9' }}>
          Initializing Cinema Profile
        </h2>
      </div>

      {/* Step text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.2em',
            color: step === STEPS.length - 1 ? '#fbbf24' : '#f97316',
            textTransform: 'uppercase',
            textShadow: '0 0 10px rgba(249,115,22,0.5)',
          }}
        >
          {STEPS[step].label}
        </motion.div>
      </AnimatePresence>

      {/* Progress bar */}
      <div style={{ width: 300, maxWidth: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <span style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>PROGRESS</span>
          <span style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', fontWeight: 700, color: '#f97316' }}>{progress}%</span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: 'linear-gradient(90deg, #f97316, #fbbf24)', borderRadius: 2, boxShadow: '0 0 10px rgba(249,115,22,0.5)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}
