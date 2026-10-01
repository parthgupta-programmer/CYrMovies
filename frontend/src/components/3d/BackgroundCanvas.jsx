import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { Suspense } from 'react'

// ---- Floating particle field ----
function ParticleField({ count = 700 }) {
  const ref = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) arr[i] = (Math.random() - 0.5) * 45
    return arr
  }, [count])

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.018
      ref.current.rotation.x = clock.elapsedTime * 0.008
    }
  })

  return (
    <Points ref={ref} positions={positions} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#f97316"
        size={0.07}
        sizeAttenuation
        depthWrite={false}
        opacity={0.55}
      />
    </Points>
  )
}

// ---- Secondary white/gold particle layer ----
function StarField({ count = 300 }) {
  const ref = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) arr[i] = (Math.random() - 0.5) * 60
    return arr
  }, [count])

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * -0.01
    }
  })

  return (
    <Points ref={ref} positions={positions} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#fbbf24"
        size={0.04}
        sizeAttenuation
        depthWrite={false}
        opacity={0.35}
      />
    </Points>
  )
}

// ---- Thin energy lines ----
function EnergyLines() {
  const ref = useRef()
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const verts = []
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 25
      const y = (Math.random() - 0.5) * 12
      const z = (Math.random() - 0.5) * 12
      verts.push(x, y, z, x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 1.5, z)
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    return geo
  }, [])

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.008
  })

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial color="#f97316" transparent opacity={0.15} />
    </lineSegments>
  )
}

// ---- Central reactor core (right-side) ----
function ReactorCore({ mouseX = 0, mouseY = 0 }) {
  const groupRef  = useRef()
  const ring1     = useRef()
  const ring2     = useRef()
  const ring3     = useRef()
  const ring4     = useRef()
  const innerRef  = useRef()
  const icoRef    = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003
      groupRef.current.position.x += (mouseX * 0.6 - groupRef.current.position.x) * 0.025
      groupRef.current.position.y += (mouseY * 0.4 - groupRef.current.position.y) * 0.025
    }
    if (ring1.current) ring1.current.rotation.z = t * 0.6
    if (ring2.current) ring2.current.rotation.x = t * 0.35
    if (ring3.current) ring3.current.rotation.y = t * 0.8
    if (ring4.current) ring4.current.rotation.z = -t * 0.4
    if (innerRef.current) {
      const s = 1 + Math.sin(t * 2.5) * 0.06
      innerRef.current.scale.set(s, s, s)
    }
    if (icoRef.current) {
      icoRef.current.rotation.x = t * 0.15
      icoRef.current.rotation.y = t * 0.22
    }
  })

  return (
    <group ref={groupRef} position={[3.5, 0, 0]}>
      {/* Outer rings */}
      <mesh ref={ring1}>
        <torusGeometry args={[2.5, 0.018, 8, 80]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.65} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[2.0, 0.013, 8, 80]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.5} />
      </mesh>
      <mesh ref={ring3}>
        <torusGeometry args={[1.55, 0.011, 8, 60]} />
        <meshBasicMaterial color="#ea580c" transparent opacity={0.55} />
      </mesh>
      <mesh ref={ring4}>
        <torusGeometry args={[1.1, 0.009, 8, 60]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.4} />
      </mesh>
      {/* Wireframe icosahedron */}
      <mesh ref={icoRef}>
        <icosahedronGeometry args={[1.3, 0]} />
        <meshBasicMaterial color="#f97316" wireframe transparent opacity={0.12} />
      </mesh>
      {/* Glow sphere */}
      <mesh>
        <sphereGeometry args={[0.72, 20, 20]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.1} />
      </mesh>
      {/* Core */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.95} />
      </mesh>
    </group>
  )
}

// ---- Inner scene wrapper ----
function Scene({ mouseX, mouseY }) {
  return (
    <>
      <ambientLight intensity={0.05} />
      <pointLight position={[4, 4, 6]}  color="#f97316" intensity={2.5} distance={25} />
      <pointLight position={[-8, -4, -4]} color="#f59e0b" intensity={0.8} distance={20} />
      <ParticleField count={600} />
      <StarField    count={250} />
      <EnergyLines />
      <ReactorCore mouseX={mouseX} mouseY={mouseY} />
      <fog attach="fog" args={['#030303', 18, 45]} />
    </>
  )
}

// ---- Exported Canvas wrapper ----
export default function BackgroundCanvas() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  const handleMouse = (e) => {
    setMouse({
      x: (e.clientX / window.innerWidth  - 0.5) * 2,
      y: -(e.clientY / window.innerHeight - 0.5) * 2,
    })
  }

  return (
    <div
      onMouseMove={handleMouse}
      style={{
        position: 'fixed', inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 13], fov: 58 }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <Scene mouseX={mouse.x} mouseY={mouse.y} />
        </Suspense>
      </Canvas>
    </div>
  )
}
