// ============================================================
//  CYrMovie — Poster Utility & Dynamic Fallback Generator
// ============================================================

const GENRE_GRADIENTS = {
  'Action': ['#f97316', '#dc2626'],
  'Sci-Fi': ['#06b6d4', '#3b82f6'],
  'Adventure': ['#10b981', '#06b6d4'],
  'Drama': ['#8b5cf6', '#ec4899'],
  'Thriller': ['#f59e0b', '#ef4444'],
  'Comedy': ['#84cc16', '#10b981'],
  'Horror': ['#dc2626', '#18181b'],
  'Romance': ['#f43f5e', '#a855f7'],
  'Animation': ['#fbbf24', '#f97316'],
  'Crime': ['#64748b', '#0f172a'],
  'Fantasy': ['#d946ef', '#8b5cf6'],
  'Mystery': ['#6366f1', '#4f46e5'],
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function getFallbackPoster(title = 'Movie', genres = '') {
  const genreArray = (genres || '').split('|').map(g => g.trim()).filter(Boolean)
  const primaryGenre = genreArray[0] || 'Sci-Fi'
  const [c1, c2] = GENRE_GRADIENTS[primaryGenre] || ['#f97316', '#7c3aed']
  
  // Extract title and year (e.g., "Toy Story (1995)" -> "Toy Story", "1995")
  const rawTitle = (title || 'Unknown Title').replace(/\s*\(\d{4}\)$/, '').trim()
  const yearMatch = (title || '').match(/\((\d{4})\)$/)
  const year = yearMatch ? yearMatch[1] : ''

  // Format title for wrapping if long
  const words = rawTitle.split(' ')
  let line1 = rawTitle
  let line2 = ''

  if (rawTitle.length > 18 && words.length > 1) {
    const mid = Math.ceil(words.length / 2)
    line1 = words.slice(0, mid).join(' ')
    line2 = words.slice(mid).join(' ')
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0.95"/>
      </linearGradient>
      <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0a0a0f" stop-opacity="0.3"/>
        <stop offset="50%" stop-color="#0a0a0f" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#0a0a0f" stop-opacity="0.98"/>
      </linearGradient>
    </defs>
    
    <!-- Base background -->
    <rect width="300" height="450" fill="#0a0a0f"/>
    <rect width="300" height="450" fill="url(#bg)"/>
    
    <!-- Grid overlay pattern -->
    <g stroke="rgba(255,255,255,0.06)" stroke-width="1">
      <line x1="0" y1="90" x2="300" y2="90"/>
      <line x1="0" y1="180" x2="300" y2="180"/>
      <line x1="0" y1="270" x2="300" y2="270"/>
      <line x1="0" y1="360" x2="300" y2="360"/>
      <line x1="100" y1="0" x2="100" y2="450"/>
      <line x1="200" y1="0" x2="200" y2="450"/>
    </g>

    <!-- Dark gradient shadow -->
    <rect width="300" height="450" fill="url(#overlay)"/>

    <!-- Corner Accents -->
    <path d="M15,25 L15,15 L25,15" stroke="${c1}" stroke-width="2" fill="none"/>
    <path d="M275,25 L275,15 L265,15" stroke="${c1}" stroke-width="2" fill="none"/>
    <path d="M15,425 L15,435 L25,435" stroke="${c1}" stroke-width="2" fill="none"/>
    <path d="M275,425 L275,435 L265,435" stroke="${c1}" stroke-width="2" fill="none"/>

    <!-- Central Emblem / Icon -->
    <g transform="translate(126, 130)" fill="none" stroke="${c1}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="44" height="44" rx="8" stroke="rgba(255,255,255,0.8)"/>
      <circle cx="24" cy="24" r="10" stroke="${c1}"/>
      <polygon points="21,19 30,24 21,29" fill="${c1}"/>
    </g>

    <!-- Year Badge -->
    ${year ? `
      <rect x="110" y="210" width="80" height="22" rx="4" fill="rgba(10,10,15,0.8)" stroke="rgba(249,115,22,0.4)" stroke-width="1"/>
      <text x="150" y="225" fill="#f97316" font-family="Orbitron, sans-serif" font-size="11" font-weight="700" letter-spacing="2" text-anchor="middle">${escapeXml(year)}</text>
    ` : ''}

    <!-- Movie Title -->
    <text x="150" y="${line2 ? '290' : '305'}" fill="#ffffff" font-family="Space Grotesk, sans-serif" font-size="20" font-weight="700" text-anchor="middle">
      ${escapeXml(line1)}
    </text>
    ${line2 ? `
      <text x="150" y="320" fill="#ffffff" font-family="Space Grotesk, sans-serif" font-size="18" font-weight="700" text-anchor="middle">
        ${escapeXml(line2)}
      </text>
    ` : ''}

    <!-- Genres line -->
    <text x="150" y="385" fill="rgba(249,115,22,0.85)" font-family="Orbitron, sans-serif" font-size="10" font-weight="600" letter-spacing="2" text-anchor="middle">
      ${escapeXml((genreArray.slice(0, 3).join(' • ') || 'CINEMA').toUpperCase())}
    </text>
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function getMoviePoster(movie) {
  if (movie?.poster && !movie.poster.includes('via.placeholder.com')) {
    return movie.poster
  }
  return getFallbackPoster(movie?.title, movie?.genres)
}
