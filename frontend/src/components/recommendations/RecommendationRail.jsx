import { useRef } from 'react'
import { motion } from 'framer-motion'
import RecommendationCard from './RecommendationCard'
import Loader from '../common/Loader'

export default function RecommendationRail({ movies = [], loading = false, onOpen, onWatchlist, label = 'FOR YOU' }) {
  const railRef = useRef(null)

  const scroll = (dir) => {
    if (railRef.current) {
      railRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' })
    }
  }

  return (
    <section style={{ padding: '5rem 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.62rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.5rem' }}>
              {label}
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>
              Your Cinema <span style={{ color: '#f97316', textShadow: '0 0 16px rgba(249,115,22,0.4)' }}>Profile</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', marginTop: '0.4rem' }}>
              Recommendations generated from your taste matrix.
            </p>
          </div>

          {/* Scroll controls */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['◀', '▶'].map((arrow, i) => (
              <button
                key={i}
                onClick={() => scroll(i === 0 ? -1 : 1)}
                style={{
                  width: 36, height: 36,
                  background: 'rgba(249,115,22,0.08)',
                  border: '1px solid rgba(249,115,22,0.3)',
                  color: '#f97316', cursor: 'pointer', fontSize: '0.8rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {arrow}
              </button>
            ))}
          </div>
        </div>

        {loading && <Loader message="BUILDING YOUR PROFILE..." />}

        {!loading && (
          <div style={{ position: 'relative' }}>
            {/* Left / right fade overlays */}
            <div style={{ position:'absolute', top:0, left:-1, bottom:0, width:40, background:'linear-gradient(to right, #030303, transparent)', zIndex:5, pointerEvents:'none' }} />
            <div style={{ position:'absolute', top:0, right:-1, bottom:0, width:60, background:'linear-gradient(to left, #030303, transparent)', zIndex:5, pointerEvents:'none' }} />

            <div
              ref={railRef}
              style={{
                display: 'flex',
                gap: '1.2rem',
                overflowX: 'auto',
                paddingBottom: '1rem',
                paddingTop: '1.2rem',
                scrollbarWidth: 'thin',
              }}
            >
              {movies.length === 0 ? (
                <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.2em' }}>
                  NO FILMS DETECTED — COMPLETE ONBOARDING
                </div>
              ) : (
                movies.map((movie, i) => (
                  <RecommendationCard
                    key={movie.movieId}
                    movie={movie}
                    index={i}
                    onOpen={onOpen}
                    onWatchlist={onWatchlist}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
