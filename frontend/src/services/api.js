// ============================================================
//  CYrMovie — API Service Layer (Enhanced)
// ============================================================

const BASE_URL = import.meta.env.VITE_API_BASE || '/api/v1'

function getAuthHeaders() {
  const token = localStorage.getItem('cyrmovie_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(method, path, body) {
  const opts = { method, headers: getAuthHeaders() }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE_URL}${path}`, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Request failed: HTTP ${res.status}`)
  return data
}

// ---- Auth ----
export const authAPI = {
  register: (name, email, password) =>
    request('POST', '/auth/register', { name, email, password }),
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),
  me: (userId) => request('GET', userId ? `/auth/me?user_id=${userId}` : '/auth/me'),
}

// ---- Movies (FLOW A: Search only — no recommendation logic) ----
export const moviesAPI = {
  search:  (q, limit = 20) => request('GET', `/movies/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  getById: (id)             => request('GET', `/movies/${id}`),
  trending: (n = 20)        => request('GET', `/movies/trending?n=${n}`),
  browse:  (genre = null, limit = 32, offset = 0) => {
    const params = new URLSearchParams({ limit, offset })
    if (genre) params.set('genre', genre)
    return request('GET', `/movies/browse?${params}`)
  },
  byGenre: (genre, n = 20) => request('GET', `/movies/by-genre?genre=${encodeURIComponent(genre)}&n=${n}`),
  rate:    (userId, movieId, rating) =>
    request('POST', '/ratings', { user_id: userId, movie_id: movieId, rating }),
  getRatings: (userId) =>
    request('GET', `/ratings?user_id=${userId}`),
  deleteRating: (userId, movieId) =>
    request('DELETE', `/ratings/${movieId}?user_id=${userId}`),
  getProfile: (userId) =>
    request('GET', `/user/profile?user_id=${userId}`),
  addInteraction: (userId, movieId, type) =>
    request('POST', '/interactions', { user_id: userId, movie_id: movieId, interaction_type: type }),
}

// ---- Recommendations ----
export const recommendationsAPI = {
  // FLOW B: Movie-to-movie content-based (NOT title similarity)
  similarMovies: (movieId, n = 32) =>
    request('GET', `/recommendations/similar/${movieId}?n=${n}`),

  // FLOW C: Personalized CF + content for logged-in user
  forUser: (userId, n = 32) =>
    request('GET', `/recommendations/for-you?user_id=${userId}&n=${n}`),

  refresh: (userId, n = 20) =>
    request('GET', `/recommendations/refresh?user_id=${userId}&n=${n}`),

  // FLOW D: Cold-start from onboarding preferences
  coldStart: (genres, seedMovieIds, n = 32) =>
    request('POST', '/recommendations/cold-start', {
      genres,
      seed_movie_ids: seedMovieIds,
      n,
    }),

  // Legacy fallback
  forUserLegacy: (userId, n = 32) => request('GET', `/recommendations/${userId}?n=${n}`),
}

// ---- Watchlist ----
export const watchlistAPI = {
  add:    (userId, movieId) => request('POST', '/watchlist', { user_id: userId, movie_id: movieId }),
  getAll: (userId = 1)      => request('GET', `/watchlist?user_id=${userId}`),
  remove: (userId, movieId) => request('DELETE', `/watchlist/${movieId}?user_id=${userId}`),
}

// ---- Health ----
export const healthAPI = {
  check: () => request('GET', '/../health'),
}
