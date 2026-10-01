import React, { useEffect, useRef, useState, useCallback } from 'react'

/**
 * ============================================================================
 * CYrMovie — CINEMATIC SUPERHERO VERTICAL TAKEOFF INTRO
 * ============================================================================
 * 
 * ADJUSTABLE CONFIGURATION
 * You can customize the timing, speed, and colors directly in this config object.
 */
export const INTRO_CONFIG = {
  // TIMING (in seconds)
  totalDuration: 3.8,      // Total sequence duration before unmounting
  appearTime: 0.0,         // Settle start
  chargeStartTime: 0.7,    // Thrusters begin powering up & glowing
  launchStartTime: 1.2,    // Sudden explosive ignition and vertical takeoff
  exitTime: 2.8,           // Character punches through the top of the viewport
  flashTime: 2.85,         // Supersonic light flash / sonic boom trigger
  fadeStartTime: 3.2,      // Intro overlay dissolves into existing website

  // FLIGHT DYNAMICS
  flightSpeedFactor: 1.0,  // Increase (> 1.0) for faster flight, decrease (< 1.0) for slower
  characterScale: 1.0,     // Scale multiplier for the superhero character

  // ENERGY & GLOW COLORS
  energyCore: '#ffffff',                // White-hot plasma core
  energyCyan: '#00f0ff',                // Primary repulsor blue-cyan
  energyDeep: '#0284c7',                // Deep plasma falloff
  energyGlowRGBA: 'rgba(0, 240, 255, ', // Alpha-appended glow string

  // ARMOR PALETTE (Iron-Man-inspired)
  armorCrimson: '#991b1b',
  armorCrimsonLight: '#dc2626',
  armorCrimsonDark: '#5c0d0d',
  armorGold: '#fbbf24',
  armorGoldDark: '#b45309',
  armorTitanium: '#27272a',
  armorTitaniumLight: '#52525b',
}

export default function CinematicIntro({ onComplete }) {
  const [phase, setPhase] = useState('settle') // 'settle' | 'charge' | 'launch' | 'exit' | 'fade'
  const [shake, setShake] = useState({ x: 0, y: 0 })
  const [flashOpacity, setFlashOpacity] = useState(0)
  const [overlayOpacity, setOverlayOpacity] = useState(1)
  const [motionBlurY, setMotionBlurY] = useState(0)
  const [isSkipped, setIsSkipped] = useState(false)

  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const characterRef = useRef(null)
  const animFrameRef = useRef(null)
  const startTimeRef = useRef(null)

  // Character coordinate tracking for canvas particle emissions
  const characterPosRef = useRef({
    x: 0,
    y: 0,
    width: 140,
    height: 250,
    progress: 0,
  })

  // End intro helper
  const finishIntro = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    document.body.style.overflow = ''
    if (onComplete) onComplete()
  }, [onComplete])

  const handleSkip = useCallback(() => {
    setIsSkipped(true)
    finishIntro()
  }, [finishIntro])

  // Prevent scroll while intro is playing & listen for ESC key
  useEffect(() => {
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleSkip()
    }
    window.addEventListener('keydown', handleKeyDown)

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      handleSkip()
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleSkip])

  // Main animation loop
  useEffect(() => {
    if (isSkipped) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Handle high DPI
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Particles system
    const particles = []
    const shockwaves = []

    const addParticle = (x, y, vx, vy, size, color, maxLife, type = 'flame') => {
      particles.push({
        x, y, vx, vy, size, initialSize: size, color, life: 0, maxLife, type
      })
    }

    const addShockwave = (x, y, maxRadius, color) => {
      shockwaves.push({
        x, y, radius: 4, maxRadius, color, life: 0, maxLife: 35
      })
    }

    let hasTriggeredShockwave = false
    let hasTriggeredSonicBoom = false

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = (timestamp - startTimeRef.current) / 1000

      const w = window.innerWidth
      const h = window.innerHeight

      // 1. TIMING PHASES
      if (elapsed < INTRO_CONFIG.chargeStartTime) {
        setPhase('settle')
      } else if (elapsed < INTRO_CONFIG.launchStartTime) {
        setPhase('charge')
      } else if (elapsed < INTRO_CONFIG.exitTime) {
        setPhase('launch')
      } else if (elapsed < INTRO_CONFIG.fadeStartTime) {
        setPhase('exit')
      } else {
        setPhase('fade')
      }

      // 2. CHARACTER VERTICAL KINEMATICS
      const initialY = h - 280 // starting near bottom-center
      let currentY = initialY
      let launchProgress = 0

      if (elapsed >= INTRO_CONFIG.launchStartTime) {
        const launchElapsed = elapsed - INTRO_CONFIG.launchStartTime
        const totalLaunchDuration = (INTRO_CONFIG.exitTime - INTRO_CONFIG.launchStartTime) / INTRO_CONFIG.flightSpeedFactor
        launchProgress = Math.min(launchElapsed / totalLaunchDuration, 1.2)

        // Realistic rocket physics: micro-anticipation dip followed by high-acceleration curve
        if (launchElapsed < 0.08) {
          // 80ms micro-crouch / thrust compression
          currentY = initialY + Math.sin((launchElapsed / 0.08) * Math.PI) * 7
        } else {
          // Exponential physics curve: y = y0 - (v0*t + 0.5*a*t^2.4)
          const tNorm = (launchElapsed - 0.08) / (totalLaunchDuration - 0.08)
          const accel = Math.pow(Math.max(0, tNorm), 2.6) // rapid upward exponential acceleration
          const targetDistance = initialY + 450 // fly completely off top
          currentY = initialY - accel * targetDistance
        }

        // Motion blur proportional to velocity
        const blurAmount = Math.min(Math.pow(launchProgress, 2) * 14, 16)
        setMotionBlurY(blurAmount)
      } else {
        setMotionBlurY(0)
      }

      // Update character node in DOM
      if (characterRef.current) {
        characterRef.current.style.transform = `translate3d(0, ${currentY}px, 0)`
      }

      // Store positions for canvas particle emitters
      const charWidth = 140
      const charHeight = 250
      const charCenterX = w / 2
      characterPosRef.current = {
        x: charCenterX - charWidth / 2,
        y: currentY,
        width: charWidth,
        height: charHeight,
        progress: launchProgress
      }

      // 3. SCREEN SHAKE & FLASH
      if (elapsed >= INTRO_CONFIG.launchStartTime && elapsed < INTRO_CONFIG.exitTime) {
        // Shockwave on initial ignition
        if (!hasTriggeredShockwave) {
          hasTriggeredShockwave = true
          addShockwave(charCenterX, initialY + charHeight + 10, 220, INTRO_CONFIG.energyCyan)
        }

        // Camera shake intensity rises during launch
        const intensity = 3.5 + Math.min(launchProgress * 7, 9)
        const sx = (Math.random() - 0.5) * intensity
        const sy = (Math.random() - 0.5) * intensity
        setShake({ x: sx, y: sy })
      } else {
        setShake({ x: 0, y: 0 })
      }

      // Supersonic boom flash
      if (elapsed >= INTRO_CONFIG.flashTime && !hasTriggeredSonicBoom) {
        hasTriggeredSonicBoom = true
        setFlashOpacity(0.92)
        addShockwave(charCenterX, 80, 480, '#ffffff')
      } else if (hasTriggeredSonicBoom) {
        setFlashOpacity((prev) => Math.max(0, prev - 0.045))
      }

      // Fade overlay into website
      if (elapsed >= INTRO_CONFIG.fadeStartTime) {
        const fadeElapsed = elapsed - INTRO_CONFIG.fadeStartTime
        const fadeDuration = INTRO_CONFIG.totalDuration - INTRO_CONFIG.fadeStartTime
        const progress = Math.min(fadeElapsed / fadeDuration, 1)
        setOverlayOpacity(1 - progress)

        if (progress >= 1) {
          finishIntro()
          return
        }
      }

      // 4. CANVAS PARTICLE RENDERING (PLASMAS, SPARKS, VOLUMETRIC EXHAUST)
      ctx.clearRect(0, 0, w, h)

      // Emitter origins based on superhero anatomical joints:
      // - Palms: left & right side, bottom of gauntlets
      // - Boots: soles of left & right boot
      const pY = characterPosRef.current.y
      const leftPalmX = charCenterX - 36
      const rightPalmX = charCenterX + 36
      const palmsY = pY + 165

      const leftBootX = charCenterX - 18
      const rightBootX = charCenterX + 18
      const bootsY = pY + charHeight - 6

      // Emitter list: [x, y, isBoots]
      const emitters = [
        { x: leftBootX, y: bootsY, isBoot: true },
        { x: rightBootX, y: bootsY, isBoot: true },
        { x: leftPalmX, y: palmsY, isBoot: false },
        { x: rightPalmX, y: palmsY, isBoot: false },
      ]

      // Phase: Pre-ignition Charge Up (0.7s - 1.2s)
      if (elapsed >= INTRO_CONFIG.chargeStartTime && elapsed < INTRO_CONFIG.launchStartTime) {
        const chargeProgress = (elapsed - INTRO_CONFIG.chargeStartTime) / (INTRO_CONFIG.launchStartTime - INTRO_CONFIG.chargeStartTime)

        emitters.forEach(({ x, y, isBoot }) => {
          // Energy convergence sparks
          for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2
            const dist = 18 + Math.random() * 25
            addParticle(
              x + Math.cos(angle) * dist,
              y + Math.sin(angle) * dist,
              -Math.cos(angle) * (2 + chargeProgress * 3),
              -Math.sin(angle) * (2 + chargeProgress * 3),
              1.5 + Math.random() * 2,
              INTRO_CONFIG.energyCyan,
              18,
              'spark'
            )
          }

          // Pulsing glowing orb at nozzle
          const coreRadius = (isBoot ? 10 : 7) * (0.6 + chargeProgress * 0.8)
          const grad = ctx.createRadialGradient(x, y, 0, x, y, coreRadius * 2.5)
          grad.addColorStop(0, '#ffffff')
          grad.addColorStop(0.3, INTRO_CONFIG.energyCyan)
          grad.addColorStop(1, 'transparent')
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, coreRadius * 2.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })
      }

      // Phase: Main Vertical Takeoff Thrusters (1.2s - 2.8s)
      if (elapsed >= INTRO_CONFIG.launchStartTime && elapsed < INTRO_CONFIG.exitTime + 0.2) {
        emitters.forEach(({ x, y, isBoot }) => {
          const power = isBoot ? 1.0 : 0.65
          const spawnCount = isBoot ? 6 : 4

          // High-velocity plasma plume particles shooting straight down
          for (let i = 0; i < spawnCount; i++) {
            const spread = (Math.random() - 0.5) * (8 * power)
            const speedY = (16 + Math.random() * 24 + launchProgress * 18) * power
            addParticle(
              x + spread,
              y + (Math.random() - 0.5) * 6,
              spread * 0.15,
              speedY,
              (isBoot ? 6 : 4) + Math.random() * 4,
              Math.random() > 0.3 ? INTRO_CONFIG.energyCyan : '#ffffff',
              16 + Math.floor(Math.random() * 12),
              'flame'
            )
          }

          // Incandescent ricocheting sparks
          for (let i = 0; i < 3; i++) {
            addParticle(
              x + (Math.random() - 0.5) * 8,
              y + Math.random() * 6,
              (Math.random() - 0.5) * 14,
              8 + Math.random() * 22,
              1.2 + Math.random() * 2.2,
              '#ffffff',
              24 + Math.random() * 15,
              'spark'
            )
          }

          // Volumetric heat/smoke trails trailing behind
          if (Math.random() > 0.35) {
            addParticle(
              x + (Math.random() - 0.5) * 12,
              y + 15 + Math.random() * 20,
              (Math.random() - 0.5) * 4,
              4 + Math.random() * 8,
              12 + Math.random() * 18,
              'rgba(30, 45, 60, 0.4)',
              35 + Math.random() * 20,
              'smoke'
            )
          }

          // Continuous plasma jet column drawing (solid radiant beam)
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          const jetLength = (isBoot ? 120 : 75) * (0.8 + launchProgress * 0.8)
          const jetGrad = ctx.createLinearGradient(x, y, x, y + jetLength)
          jetGrad.addColorStop(0, '#ffffff')
          jetGrad.addColorStop(0.2, INTRO_CONFIG.energyCyan)
          jetGrad.addColorStop(0.7, INTRO_CONFIG.energyDeep)
          jetGrad.addColorStop(1, 'transparent')

          ctx.fillStyle = jetGrad
          ctx.beginPath()
          const halfWidth = isBoot ? 10 : 6
          ctx.moveTo(x - halfWidth, y)
          ctx.lineTo(x + halfWidth, y)
          ctx.lineTo(x + halfWidth * 0.4, y + jetLength)
          ctx.lineTo(x - halfWidth * 0.4, y + jetLength)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        })
      }

      // Update and draw existing particles
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life++

        const progress = p.life / p.maxLife
        if (progress >= 1) {
          particles.splice(i, 1)
          continue
        }

        const alpha = 1 - progress
        if (p.type === 'flame') {
          const currentSize = p.initialSize * (1 - progress * 0.4)
          ctx.fillStyle = p.color === '#ffffff' ? `rgba(255, 255, 255, ${alpha})` : `${INTRO_CONFIG.energyGlowRGBA}${alpha * 0.85})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, Math.max(0.5, currentSize), 0, Math.PI * 2)
          ctx.fill()
        } else if (p.type === 'spark') {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, Math.max(0.4, p.initialSize * (1 - progress)), 0, Math.PI * 2)
          ctx.fill()
        } else if (p.type === 'smoke') {
          ctx.fillStyle = `rgba(18, 28, 42, ${alpha * 0.3})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.initialSize * (1 + progress * 1.5), 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Shockwaves rendering
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i]
        sw.life++
        const swProgress = sw.life / sw.maxLife
        if (swProgress >= 1) {
          shockwaves.splice(i, 1)
          continue
        }

        sw.radius += (sw.maxRadius - sw.radius) * 0.15
        const swAlpha = (1 - swProgress) * 0.8
        ctx.strokeStyle = sw.color === '#ffffff' ? `rgba(255, 255, 255, ${swAlpha})` : `${INTRO_CONFIG.energyGlowRGBA}${swAlpha})`
        ctx.lineWidth = 4 * (1 - swProgress)
        ctx.beginPath()
        ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.35, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()

      // Continue animation loop
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [isSkipped, finishIntro])

  if (isSkipped) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#020408',
        opacity: overlayOpacity,
        transition: 'opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
        pointerEvents: overlayOpacity < 0.1 ? 'none' : 'auto',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Dynamic Camera Shake Container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transform: `translate3d(${shake.x}px, ${shake.y}px, 0)`,
        }}
      >
        {/* Cinematic Vignette & Deep Space Atmosphere */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(2, 6, 16, 0.4) 0%, rgba(1, 3, 7, 0.95) 85%, #000000 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Ambient Flight Streaks during Launch */}
        {phase === 'launch' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0, 240, 255, 0.04) 41px, rgba(0, 240, 255, 0.04) 43px)',
              animation: 'flightLines 0.3s linear infinite',
            }}
          />
        )}

        {/* Canvas for Particle Exhaust Plumes & Shockwaves */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* ------------------------------------------------------------- */}
        {/* SUPERHERO ARMORED CHARACTER (ORIGINAL HIGH-DETAIL SVG MODEL)  */}
        {/* ------------------------------------------------------------- */}
        <div
          ref={characterRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: 140,
            height: 250,
            marginLeft: -70,
            zIndex: 2,
            willChange: 'transform, filter',
            filter: motionBlurY > 1 ? `blur(0px, ${motionBlurY}px)` : 'none',
          }}
        >
          <svg
            viewBox="0 0 140 250"
            width="100%"
            height="100%"
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Metallic Crimson Armor Gradient */}
              <linearGradient id="crimsonArmor" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={INTRO_CONFIG.armorCrimsonLight} />
                <stop offset="50%" stopColor={INTRO_CONFIG.armorCrimson} />
                <stop offset="100%" stopColor={INTRO_CONFIG.armorCrimsonDark} />
              </linearGradient>

              {/* Brilliant Gold Trim Gradient */}
              <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="45%" stopColor={INTRO_CONFIG.armorGold} />
                <stop offset="100%" stopColor={INTRO_CONFIG.armorGoldDark} />
              </linearGradient>

              {/* Dark Titanium Frame Gradient */}
              <linearGradient id="titaniumFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={INTRO_CONFIG.armorTitaniumLight} />
                <stop offset="100%" stopColor={INTRO_CONFIG.armorTitanium} />
              </linearGradient>

              {/* Repulsor Glow Gradient */}
              <radialGradient id="repulsorGlow">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor={INTRO_CONFIG.energyCyan} />
                <stop offset="85%" stopColor={INTRO_CONFIG.energyDeep} />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>

              {/* Soft Energy Blur */}
              <filter id="energyBloom" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* --- BACKPACK / FLIGHT STABILIZER FLAPS --- */}
            <path d="M 52 50 L 40 75 L 48 85 Z" fill="url(#titaniumFrame)" />
            <path d="M 88 50 L 100 75 L 92 85 Z" fill="url(#titaniumFrame)" />

            {/* --- LEGS & PROPULSION BOOTS (DOWNWARD EXTENDED) --- */}
            {/* Left Leg */}
            <path d="M 50 135 L 44 185 L 53 235 L 61 235 L 63 185 L 65 135 Z" fill="url(#crimsonArmor)" stroke="#200" strokeWidth="0.8" />
            {/* Left Knee Guard */}
            <polygon points="46,175 61,175 58,190 49,190" fill="url(#goldTrim)" />
            {/* Left Boot */}
            <path d="M 45 228 L 61 228 L 59 245 L 47 245 Z" fill="url(#titaniumFrame)" stroke={INTRO_CONFIG.armorGold} strokeWidth="0.7" />
            {/* Left Boot Thruster Nozzle */}
            <ellipse cx="53" cy="245" rx="5" ry="2" fill="#111" stroke="#333" strokeWidth="0.5" />

            {/* Right Leg */}
            <path d="M 75 135 L 77 185 L 79 235 L 87 235 L 96 185 L 90 135 Z" fill="url(#crimsonArmor)" stroke="#200" strokeWidth="0.8" />
            {/* Right Knee Guard */}
            <polygon points="79,175 94,175 91,190 82,190" fill="url(#goldTrim)" />
            {/* Right Boot */}
            <path d="M 79 228 L 95 228 L 93 245 L 81 245 Z" fill="url(#titaniumFrame)" stroke={INTRO_CONFIG.armorGold} strokeWidth="0.7" />
            {/* Right Boot Thruster Nozzle */}
            <ellipse cx="87" cy="245" rx="5" ry="2" fill="#111" stroke="#333" strokeWidth="0.5" />

            {/* --- LOWER TORSO & HIP ARMOR --- */}
            <polygon points="50,118 90,118 85,142 55,142" fill="url(#crimsonArmor)" />
            <polygon points="62,120 78,120 74,138 66,138" fill="url(#goldTrim)" />

            {/* --- CHEST & ABDOMINAL PLATES --- */}
            {/* Abdominal muscle segments */}
            <path d="M 54 95 L 86 95 L 83 118 L 57 118 Z" fill="url(#titaniumFrame)" />
            {/* Pectoral Main Armor */}
            <path d="M 45 48 L 95 48 L 88 95 L 52 95 Z" fill="url(#crimsonArmor)" stroke="#300" strokeWidth="0.8" />
            <path d="M 48 52 L 67 52 L 65 72 L 50 70 Z" fill="url(#goldTrim)" opacity="0.85" />
            <path d="M 92 52 L 73 52 L 75 72 L 90 70 Z" fill="url(#goldTrim)" opacity="0.85" />

            {/* --- ARC REACTOR (CHEST ENERGY CORE) --- */}
            <circle cx="70" cy="65" r="9" fill="#111" stroke={INTRO_CONFIG.armorGold} strokeWidth="1" />
            <circle cx="70" cy="65" r="6.5" fill="url(#repulsorGlow)" filter="url(#energyBloom)" />
            <circle cx="70" cy="65" r="3" fill="#ffffff" />

            {/* --- SHOULDERS & PAULDRONS --- */}
            <path d="M 42 46 C 30 46 26 56 34 68 C 42 66 45 55 45 46 Z" fill="url(#crimsonArmor)" stroke={INTRO_CONFIG.armorGold} strokeWidth="0.8" />
            <path d="M 98 46 C 110 46 114 56 106 68 C 98 66 95 55 95 46 Z" fill="url(#crimsonArmor)" stroke={INTRO_CONFIG.armorGold} strokeWidth="0.8" />

            {/* --- ARMS EXTENDED DOWNWARD (PALMS FACING GROUND) --- */}
            {/* Left Arm & Gauntlet */}
            <path d="M 33 65 L 26 110 L 32 155 L 41 155 L 39 110 L 42 65 Z" fill="url(#crimsonArmor)" stroke="#200" strokeWidth="0.8" />
            <polygon points="27,105 38,105 36,120 28,120" fill="url(#goldTrim)" />
            {/* Left Hand / Palm Facing Downwards */}
            <path d="M 30 155 L 43 155 L 39 168 L 29 168 Z" fill="url(#titaniumFrame)" stroke={INTRO_CONFIG.armorGold} strokeWidth="0.7" />

            {/* Right Arm & Gauntlet */}
            <path d="M 107 65 L 114 110 L 108 155 L 99 155 L 101 110 L 98 65 Z" fill="url(#crimsonArmor)" stroke="#200" strokeWidth="0.8" />
            <polygon points="113,105 102,105 104,120 112,120" fill="url(#goldTrim)" />
            {/* Right Hand / Palm Facing Downwards */}
            <path d="M 110 155 L 97 155 L 101 168 L 111 168 Z" fill="url(#titaniumFrame)" stroke={INTRO_CONFIG.armorGold} strokeWidth="0.7" />

            {/* --- PALM REPULSOR NODES (GLOWING BLUE-WHITE) --- */}
            {/* Left Palm Node */}
            <ellipse cx="35" cy="165" rx="3.5" ry="1.8" fill={INTRO_CONFIG.energyCyan} filter="url(#energyBloom)" />
            <ellipse cx="35" cy="165" rx="1.8" ry="1" fill="#ffffff" />

            {/* Right Palm Node */}
            <ellipse cx="105" cy="165" rx="3.5" ry="1.8" fill={INTRO_CONFIG.energyCyan} filter="url(#energyBloom)" />
            <ellipse cx="105" cy="165" rx="1.8" ry="1" fill="#ffffff" />

            {/* --- HELMET & FACEPLATE --- */}
            {/* Head Dome */}
            <path d="M 55 35 C 55 16 85 16 85 35 C 85 45 80 48 70 49 C 60 48 55 45 55 35 Z" fill="url(#crimsonArmor)" />
            {/* Gold Faceplate */}
            <polygon points="61,24 79,24 81,42 70,47 59,42" fill="url(#goldTrim)" stroke="#600" strokeWidth="0.6" />
            {/* Visor Eye Slits (Cyan-White Laser Flare) */}
            <polygon points="63,30 68,31 67,33 63,32" fill="#ffffff" filter="url(#energyBloom)" />
            <polygon points="77,30 72,31 73,33 77,32" fill="#ffffff" filter="url(#energyBloom)" />
            <line x1="62" y1="31" x2="69" y2="32" stroke={INTRO_CONFIG.energyCyan} strokeWidth="1.4" filter="url(#energyBloom)" />
            <line x1="78" y1="31" x2="71" y2="32" stroke={INTRO_CONFIG.energyCyan} strokeWidth="1.4" filter="url(#energyBloom)" />
          </svg>
        </div>

        {/* Full-Screen Supersonic Sonic Boom Flash */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 15%, #ffffff 0%, rgba(0, 240, 255, 0.6) 35%, transparent 75%)',
            opacity: flashOpacity,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />

        {/* Sci-Fi HUD Boot Status (Subtle in Corner) */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: 32,
            fontFamily: 'Orbitron, monospace',
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            color: 'rgba(0, 240, 255, 0.75)',
            textTransform: 'uppercase',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: phase === 'launch' || phase === 'exit' ? '#00f0ff' : '#fbbf24',
                boxShadow: '0 0 8px #00f0ff',
              }}
            />
            <span>THRUSTER PROPULSION: {phase === 'settle' ? 'STBY' : phase === 'charge' ? 'CHARGING' : '100% MAXIMUM'}</span>
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.52rem' }}>
            VERTICAL VECTOR // SUPERHERO ASCENT
          </div>
        </div>

        {/* Skip Button */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: 24,
            right: 28,
            zIndex: 20,
            background: 'rgba(10, 15, 25, 0.7)',
            border: '1px solid rgba(0, 240, 255, 0.35)',
            padding: '7px 16px',
            fontFamily: 'Orbitron, monospace',
            fontSize: '0.62rem',
            letterSpacing: '0.18em',
            color: '#00f0ff',
            cursor: 'pointer',
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 240, 255, 0.18)'
            e.currentTarget.style.borderColor = '#00f0ff'
            e.currentTarget.style.boxShadow = '0 0 14px rgba(0, 240, 255, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(10, 15, 25, 0.7)'
            e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.35)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          SKIP INTRO [ESC]
        </button>
      </div>

      {/* Global CSS for vertical flight lines animation */}
      <style>{`
        @keyframes flightLines {
          0% { background-position: 0 0; }
          100% { background-position: 0 400px; }
        }
      `}</style>
    </div>
  )
}
