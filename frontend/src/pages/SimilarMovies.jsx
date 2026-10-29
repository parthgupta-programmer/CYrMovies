import { useState, useEffect } from 'react'
import { useParams, useLocation, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import RecommendationGrid from '../components/recommendations/RecommendationGrid'
import MovieModal from '../components/movies/MovieModal'
import HUDFrame from '../components/hud/HUDFrame'
import Button from '../components/common/Button'
import { recommendationsAPI, moviesAPI, watchlistAPI } from '../services/api'
import { getMoviePoster, getFallbackPoster } from '../utils/poster'
import { useAuth } from '../contexts/AuthContext'

export default function SimilarMovies() {
  const { movieId } = useParams()
  const location = useLocation()
  const { userId } = useAuth()

  const [seedMovie, setSeedMovie]   = useState(location.state?.movie || null)
  const [recs, setRecs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [imgError, setImgError]     = useState(false)

  // Load seed movie if not passed via state
  useEffect(() => {
    if (!seedMovie && movieId) {
      moviesAPI.getById(Number(movieId)).then(setSeedMovie).catch(() => {})
    }
  }, [movieId])

  // Load recommendations
  useEffect(() => {
    if (!movieId) return
    setLoading(true)
    setRecs([])
    recommendationsAPI.similarMovies(Number(movieId), 32)
      .then(data => setRecs(data.results || []))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false))
  }, [movieId])

  const handleWatchlist = (movie) => {
    watchlistAPI.add(userId, movie.movieId).catch(() => {})
  }

  const seedGenres = (seedMovie?.genres || '').split('|').filter(Boolean)
  const seedPoster = seedMovie
    ? (imgError ? getFallbackPoster(seedMovie.title, seedMovie.genres) : getMoviePoster(seedMovie))
    : null

  return (
    <div style={{ paddingTop: 64 }}>
      {/* Header */}
      <div style={{ padding: '4rem 2rem 2rem', position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(249,115,22,0.08)' }}>
        <div className="grid-overlay" />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.75rem' }}>
              MOVIES LIKE THIS
            </div>

            {seedMovie ? (
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Seed movie card */}
                <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                  {seedPoster && (
                    <div style={{ width: 80, height: 120, borderRadius: 4, overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(249,115,22,0.5)', boxShadow: '0 0 20px rgba(249,115,22,0.2)' }}>
                      <img src={seedPoster} alt={seedMovie.title} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(249,115,22,0.6)', marginBottom: '0.3rem' }}>SEED FILM</div>
                    <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem', lineHeight: 1.2 }}>
                      {seedMovie.title}
                    </h1>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {seedGenres.slice(0, 4).map(g => (
                        <span key={g} style={{
                          fontFamily: 'Orbitron', fontSize: '0.55rem', letterSpacing: '0.08em',
                          color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', padding: '2px 8px',
                        }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Explanation HUD */}
                <HUDFrame label="RECOMMENDATION ENGINE" animate={false} style={{ padding: '1rem 1.25rem', flex: 1, minWidth: 240 }}>
                  <div style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
                    <div>✦ Using content similarity (genres, themes, overview)</div>
                    <div>✦ Franchise sequels are excluded</div>
                    <div>✦ Results diversified by theme & genre</div>
                    <div style={{ color: '#f97316', marginTop: '0.3rem' }}>✦ Showing 32 similar films</div>
                  </div>
                </HUDFrame>
              </div>
            ) : (
              <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, color: '#f1f5f9' }}>
                Similar Movies
              </h1>
            )}

            <NavLink to="/discover" style={{ display: 'inline-block', marginTop: '1.5rem' }}>
              <Button variant="secondary" size="sm">← BACK TO SEARCH</Button>
            </NavLink>
          </motion.div>
        </div>
      </div>

      {/* Recommendation Grid — 32 movies, 4 per row */}
      <RecommendationGrid
        movies={recs}
        loading={loading}
        onOpen={setSelectedMovie}
        onWatchlist={handleWatchlist}
        title={seedMovie ? `Movies Like ${seedMovie.title}` : 'Similar Movies'}
        subtitle={`${recs.length} recommendations based on content similarity and genre themes`}
        label="SIMILAR FILMS"
      />

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onWatchlist={handleWatchlist}
          onRate={(id, r) => moviesAPI.rate(userId, id, r).catch(() => {})}
        />
      )}
    </div>
  )
}
