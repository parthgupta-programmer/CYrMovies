// ============================================================
//  CYrMovie — API Service Layer
// ============================================================

const BASE_URL = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'

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
  me: () => request('GET', '/auth/me'),
}

// ---- Movies (FLOW A: Search only — no recommendation logic) ----
export const moviesAPI = {
  search:  (q, limit = 20) => request('GET', `/movies/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  getById: (id)             => request('GET', `/movies/${id}`),
  rate:    (userId, movieId, rating) =>
    request('POST', '/ratings', { user_id: userId, movie_id: movieId, rating }),
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
  getAll: ()                => request('GET', '/watchlist'),
}

// ---- Health ----
export const healthAPI = {
  check: () => request('GET', '/../health'),
}
