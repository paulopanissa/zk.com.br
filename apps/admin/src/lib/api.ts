import axios, { type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3040/api/v1'

export const TOKEN_KEY = 'zk_access_token'
export const REFRESH_KEY = 'zk_refresh_token'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// --- Silent token refresh ---

type QueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void }
let isRefreshing = false
let failedQueue: QueueItem[] = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

// Bypass the main interceptor for the refresh call itself to avoid infinite loops
const rawAxios = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } })

async function attemptRefresh(): Promise<string> {
  const refresh_token = localStorage.getItem(REFRESH_KEY)
  if (!refresh_token) throw new Error('no refresh token')
  const res = await rawAxios.post<{ access_token: string; refresh_token: string }>(
    '/auth/system/refresh',
    { refresh_token },
  )
  const { access_token, refresh_token: newRefresh } = res.data
  localStorage.setItem(TOKEN_KEY, access_token)
  localStorage.setItem(REFRESH_KEY, newRefresh)
  setAuthToken(access_token)
  return access_token
}

let _onAuthFailure: (() => void) | null = null

export function setAuthFailureCallback(fn: (() => void) | null) {
  _onAuthFailure = fn
}

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config as RetryableRequest | undefined

    if (!original || err?.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }

    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) {
      _onAuthFailure?.()
      return Promise.reject(err)
    }

    original._retry = true

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers['Authorization'] = `Bearer ${token}`
        return api(original)
      })
    }

    isRefreshing = true
    try {
      const newToken = await attemptRefresh()
      processQueue(null, newToken)
      original.headers['Authorization'] = `Bearer ${newToken}`
      return api(original)
    } catch (refreshErr) {
      processQueue(refreshErr, null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
      _onAuthFailure?.()
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)
