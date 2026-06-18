import { createContext, useContext, useEffect, useState } from 'react'
import { api, setAuthToken } from '@/lib/api'

interface SystemUser {
  id: string
  name: string
  email: string
  role: string
}

interface AuthState {
  user: SystemUser | null
  token: string | null
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'zk_access_token'
const REFRESH_KEY = 'zk_refresh_token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    setAuthToken(token)
    api
      .get<SystemUser>('/auth/system/me')
      .then((res) => setState({ user: res.data, token }))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_KEY)
        setAuthToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await api.post<{ access_token: string; refresh_token: string }>(
      '/auth/system/login',
      { email, password },
    )
    const { access_token, refresh_token } = res.data
    localStorage.setItem(TOKEN_KEY, access_token)
    localStorage.setItem(REFRESH_KEY, refresh_token)
    setAuthToken(access_token)
    const me = await api.get<SystemUser>('/auth/system/me')
    setState({ user: me.data, token: access_token })
  }

  async function logout() {
    const refresh_token = localStorage.getItem(REFRESH_KEY)
    if (refresh_token) {
      await api.post('/auth/system/logout', { refresh_token }).catch(() => {})
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setAuthToken(null)
    setState({ user: null, token: null })
  }

  // Force logout on 401 so expired tokens don't leave the user in a broken state
  useEffect(() => {
    const id = api.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err?.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(REFRESH_KEY)
          setAuthToken(null)
          setState({ user: null, token: null })
        }
        return Promise.reject(err)
      },
    )
    return () => api.interceptors.response.eject(id)
  }, [])

  if (loading) return null

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, isAuthenticated: !!state.token && !!state.user }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
