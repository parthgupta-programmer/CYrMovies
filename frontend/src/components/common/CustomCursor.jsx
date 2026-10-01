import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function CustomCursor() {
  const [hovering, setHovering] = useState(false)
  const [clicking, setClicking] = useState(false)
  const mx = useMotionValue(-200)
  const my = useMotionValue(-200)
  const sx = useSpring(mx, { stiffness: 500, damping: 40 })
  const sy = useSpring(my, { stiffness: 500, damping: 40 })

  useEffect(() => {
    const onMove = (e) => { mx.set(e.clientX); my.set(e.clientY) }
    const onOver = (e) => {
      if (e.target.closest('button, a, [role="button"], .movie-card, input, select')) setHovering(true)
    }
    const onOut  = () => setHovering(false)
    const onDown = () => setClicking(true)
    const onUp   = () => setClicking(false)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    window.addEventListener('mouseout',  onOut)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mouseout',  onOut)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [mx, my])

  const size = clicking ? 28 : hovering ? 38 : 10

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0, left: 0,
        zIndex: 99999,
        pointerEvents: 'none',
        x: sx, y: sy,
        translateX: '-50%',
        translateY: '-50%',
        width: size,
        height: size,
        borderRadius: '50%',
        background: hovering ? 'transparent' : 'rgba(249,115,22,0.9)',
        border: hovering ? '1.5px solid #f97316' : 'none',
        boxShadow: hovering
          ? '0 0 16px rgba(249,115,22,0.7), inset 0 0 8px rgba(249,115,22,0.1)'
          : '0 0 8px rgba(249,115,22,0.8)',
        transition: 'width 0.18s ease, height 0.18s ease, background 0.18s ease, border 0.18s ease',
      }}
    />
  )
}
