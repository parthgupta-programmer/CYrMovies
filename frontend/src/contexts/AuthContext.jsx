// ============================================================
//  CYrMovie — Auth Context (React Context for user session)
// ============================================================
import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('cyrmovie_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('cyrmovie_token'))

  const login = useCallback((userData, accessToken) => {
    localStorage.setItem('cyrmovie_token', accessToken)
    localStorage.setItem('cyrmovie_user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('cyrmovie_token')
    localStorage.removeItem('cyrmovie_user')
    setToken(null)
    setUser(null)
  }, [])

  const userId = user?.user_id || user?.userId || 1
  const isLoggedIn = !!token

  return (
    <AuthContext.Provider value={{ user, token, userId, isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
