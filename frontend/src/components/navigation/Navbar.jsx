import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'

const LINKS = [
  { to: '/',         label: 'HOME' },
  { to: '/discover', label: 'DISCOVER' },
  { to: '/for-you',  label: 'FOR YOU' },
  { to: '/watchlist', label: 'WATCHLIST' },
]

export default function Navbar() {
  const { scrollY } = useScroll()
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.92])
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1])
  const navigate = useNavigate()
  const { isLoggedIn, logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <motion.nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 1000,
        padding: '0 2rem',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        backgroundColor: `rgba(3,3,3,${bgOpacity.get()})`,
        borderBottom: `1px solid rgba(249,115,22,${borderOpacity.get() * 0.15})`,
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* Logo */}
      <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
        <div style={{ position: 'relative', width: 32, height: 32 }}>
          {/* Arc reactor-inspired logo mark */}
          {[0, 1].map(i => (
            <motion.div
              key={i}
              animate={{ rotate: i === 0 ? 360 : -360 }}
              transition={{ duration: 4 + i * 2, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                inset: i * 6,
                border: '1.5px solid',
                borderColor: i === 0 ? '#f97316' : '#f59e0b',
                borderRadius: '50%',
                opacity: 0.9,
              }}
            />
          ))}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#f97316',
              boxShadow: '0 0 10px #f97316, 0 0 20px rgba(249,115,22,0.5)',
            }} />
          </div>
        </div>
        <div>
          <div style={{
            fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.05rem',
            letterSpacing: '0.08em', color: '#f1f5f9',
          }}>
            CYr<span style={{ color: '#f97316', textShadow: '0 0 10px rgba(249,115,22,0.6)' }}>Movie</span>
          </div>
          <div style={{
            fontFamily: 'Orbitron', fontSize: '0.38rem', letterSpacing: '0.25em',
            color: 'rgba(249,115,22,0.55)', marginTop: -2, textTransform: 'uppercase',
          }}>
            Cinema Intelligence
          </div>
        </div>
      </NavLink>

      {/* Centre links */}
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              padding: '0.4rem 1rem',
              fontFamily: 'Orbitron',
              fontSize: '0.65rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: isActive ? '#f97316' : 'rgba(255,255,255,0.55)',
              textDecoration: 'none',
              position: 'relative',
              transition: 'color 0.2s ease',
            })}
          >
            {({ isActive }) => (
              <>
                {label}
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    style={{
                      position: 'absolute', bottom: -2, left: '20%', right: '20%',
                      height: 2, background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
                      boxShadow: '0 0 8px rgba(249,115,22,0.8)',
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Auth buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            style={{
              fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '0.4rem 0.8rem',
              transition: 'color 0.2s',
            }}
            onMouseOver={e => e.target.style.color = '#f97316'}
            onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
          >
            LOGOUT
          </button>
        ) : (
          <>
            <NavLink
              to="/auth"
              style={{
                fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)', textDecoration: 'none',
                padding: '0.4rem 0.8rem', transition: 'color 0.2s',
              }}
            >
              LOGIN
            </NavLink>
            <NavLink
              to="/auth?mode=signup"
              style={{
                fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: '#fff', textDecoration: 'none',
                padding: '0.5rem 1.2rem',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                boxShadow: '0 0 16px rgba(249,115,22,0.3)',
                transition: 'box-shadow 0.2s',
              }}
            >
              SIGN UP
            </NavLink>
          </>
        )}
      </div>
    </motion.nav>
  )
}
