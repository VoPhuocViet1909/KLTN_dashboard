import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { toApiError } from './errors'
import { tokenStore } from './tokenStore'
import type { TokenPair } from './types'

/**
 * Mọi request đi qua cùng origin (/api/...): lúc dev Vite proxy chuyển tới Gateway,
 * lúc deploy nginx/Gateway phục vụ cùng domain.
 */
export const api = axios.create({ baseURL: '/api/v1', timeout: 15_000 })

// Các endpoint không cần token và không được kích hoạt refresh.
const OPEN_PATHS = ['/auth/login', '/auth/refresh', '/auth/.well-known/jwks.json', '/health']
const isOpen = (url = '') => OPEN_PATHS.some((p) => url.startsWith(p))

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken()
  if (token && !isOpen(config.url)) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---------- Refresh token dùng một lần: chỉ cho MỘT request refresh chạy tại một thời điểm ----------

let refreshing: Promise<string> | null = null
const sessionExpiredListeners = new Set<() => void>()

/** Đăng ký hàm gọi khi phiên hết hạn hẳn (refresh thất bại) – AuthProvider dùng để đưa về trang đăng nhập. */
export function onSessionExpired(fn: () => void) {
  sessionExpiredListeners.add(fn)
  return () => {
    sessionExpiredListeners.delete(fn)
  }
}

/**
 * Lấy access token mới. Nhiều nơi gọi cùng lúc thì dùng chung một lần gọi /auth/refresh,
 * vì refresh token cũ bị thu hồi ngay sau lần dùng đầu tiên.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = tokenStore.getRefreshToken()
      if (!refreshToken) throw new Error('NO_REFRESH_TOKEN')
      const { data } = await axios.post<TokenPair>('/api/v1/auth/refresh', { refreshToken })
      tokenStore.setTokens(data)
      return data.accessToken
    })()
      .catch((err) => {
        // Lỗi mạng: giữ phiên, để lần sau thử lại. Lỗi 401/400: phiên đã hết.
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        if (status !== undefined || (err instanceof Error && err.message === 'NO_REFRESH_TOKEN')) {
          tokenStore.clear()
          sessionExpiredListeners.forEach((fn) => fn())
        }
        throw err
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as RetriableConfig | undefined
    const status = error.response?.status
    if (status === 401 && config && !config._retried && !isOpen(config.url)) {
      config._retried = true
      try {
        const token = await refreshAccessToken()
        config.headers.Authorization = `Bearer ${token}`
        return api(config)
      } catch {
        /* rơi xuống trả lỗi gốc */
      }
    }
    return Promise.reject(toApiError(error))
  },
)

/** Tiện ích: gọi API và trả thẳng data. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const { data } = await api.request<T>(config)
  return data
}
