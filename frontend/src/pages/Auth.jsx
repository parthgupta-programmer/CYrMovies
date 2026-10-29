import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import HUDFrame from '../components/hud/HUDFrame'
import Button from '../components/common/Button'
import { authAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const { login }  = useAuth()
  const initMode   = params.get('mode') === 'signup' ? 'signup' : 'login'

  const [mode,    setMode]    = useState(initMode)
  const [form,    setForm]    = useState({ name: '', email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const data = await authAPI.register(form.name, form.email, form.password)
        setSuccess(true)
        setTimeout(() => {
          setMode('login')
          setSuccess(false)
        }, 1500)
      } else {
        const data = await authAPI.login(form.email, form.password)
        const userData = { user_id: data.user_id, name: form.email.split('@')[0], email: form.email }
        login(userData, data.access_token || 'auth_token')
        navigate('/')
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  // Use demo login (no real backend required)
  const demoLogin = () => {
    login({ user_id: 1, name: 'Cyrus', email: 'cyrus@cyrmovie.ai' }, 'demo_token_123')
    navigate('/')
  }

  const inputStyle = {
    width: '100%', padding: '0.85rem 1rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(249,115,22,0.2)',
    color: '#f1f5f9', fontSize: '0.9rem',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
    outline: 'none', transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', position: 'relative',
    }}>
      <div className="grid-overlay" />
      <div className="scan-overlay" />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460 }}>
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '2.5rem' }}
        >
          <div style={{ position: 'relative', width: 50, height: 50, margin: '0 auto 1rem' }}>
            {[0, 1].map(i => (
              <motion.div
                key={i}
                animate={{ rotate: i === 0 ? 360 : -360 }}
                transition={{ duration: 4 + i * 2, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', inset: i * 8,
                  border: '1.5px solid',
                  borderColor: i === 0 ? '#f97316' : '#f59e0b',
                  borderRadius: '50%',
                }}
              />
            ))}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 14px #f97316' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.6rem', color: '#f1f5f9' }}>
            CYr<span style={{ color: '#f97316', textShadow: '0 0 16px rgba(249,115,22,0.5)' }}>Movie</span>
          </div>
          <div style={{ fontFamily: 'Orbitron', fontSize: '0.52rem', letterSpacing: '0.28em', color: 'rgba(249,115,22,0.45)', marginTop: 4 }}>
            CINEMA INTELLIGENCE SYSTEM
          </div>
        </motion.div>

        <HUDFrame label={mode === 'login' ? 'SYSTEM ACCESS' : 'NEW AGENT REGISTRATION'} animate>
          {/* Tab toggle */}
          <div style={{ display: 'flex', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1, padding: '0.65rem 0',
                  fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em',
                  textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                  background: mode === m ? 'rgba(249,115,22,0.12)' : 'transparent',
                  color: mode === m ? '#f97316' : 'rgba(255,255,255,0.35)',
                  borderBottom: mode === m ? '2px solid #f97316' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {m === 'login' ? 'SIGN IN' : 'SIGN UP'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '2rem 0' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
                <div style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', color: '#f97316', letterSpacing: '0.2em' }}>
                  AGENT REGISTERED. SIGNING IN...
                </div>
              </motion.div>
            ) : (
              <motion.form
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                {mode === 'signup' && (
                  <div>
                    <label style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.35rem' }}>
                      AGENT NAME
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={update('name')}
                      placeholder="Enter your name"
                      required
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(249,115,22,0.6)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(249,115,22,0.2)'}
                    />
                  </div>
                )}
                <div>
                  <label style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.35rem' }}>
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={update('email')}
                    placeholder="your@email.com"
                    required
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(249,115,22,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(249,115,22,0.2)'}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'Orbitron', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.35rem' }}>
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={update('password')}
                    placeholder="••••••••"
                    required
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(249,115,22,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(249,115,22,0.2)'}
                  />
                </div>

                {error && (
                  <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', fontSize: '0.82rem', fontFamily: 'Orbitron', letterSpacing: '0.08em' }}>
                    ⚠ {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} fullWidth size="lg">
                  {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'ACCESS SYSTEM' : 'CREATE AGENT'}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Demo login */}
          <div style={{ marginTop: '1.2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.2rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.6rem' }}>
              or access demo mode
            </div>
            <button
              onClick={demoLogin}
              style={{
                fontFamily: 'Orbitron', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'rgba(249,115,22,0.6)',
                background: 'none', border: '1px solid rgba(249,115,22,0.2)',
                padding: '0.5rem 1.2rem', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.target.style.color = '#f97316'; e.target.style.borderColor = 'rgba(249,115,22,0.5)' }}
              onMouseOut={e => { e.target.style.color = 'rgba(249,115,22,0.6)'; e.target.style.borderColor = 'rgba(249,115,22,0.2)' }}
            >
              DEMO LOGIN
            </button>
          </div>
        </HUDFrame>
      </div>
    </div>
  )
}
