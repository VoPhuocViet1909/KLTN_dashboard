import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/lib/api/auth'
import { onSessionExpired, refreshAccessToken } from '@/lib/api/client'
import { ApiError, MSG_ORG_UNAVAILABLE, ORGANIZATION_INACTIVE, ORGANIZATION_UNAVAILABLE, toApiError } from '@/lib/api/errors'
import { tokenStore } from '@/lib/api/tokenStore'
import type { SessionUser } from '@/lib/api/types'
import { disconnectRealtime } from '@/realtime/socket'
import { AuthContext, type AuthStatus } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [loggedOut, setLoggedOut] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const reset = useCallback(() => {
    disconnectRealtime()
    queryClient.clear()
    setUser(null)
    setStatus('anonymous')
  }, [queryClient])

  // Mở trang: có refresh token thì lấy access token mới, không thì về trang đăng nhập.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = tokenStore.getUser()
      if (!tokenStore.getRefreshToken() || !stored) {
        if (!cancelled) setStatus('anonymous')
        return
      }
      try {
        await refreshAccessToken()
        let current = stored
        try {
          current = await authApi.me() // mock_server.py chưa có /auth/me: dùng thông tin đã lưu
          tokenStore.setUser(current)
        } catch (e) {
          // 401: phiên hỏng; 403 ORGANIZATION_INACTIVE: tổ chức tạm ngưng (client.ts đã xóa token và đặt thông báo)
          if (e instanceof ApiError && (e.status === 401 || e.code === ORGANIZATION_INACTIVE)) throw e
        }
        if (!cancelled) {
          setUser(current)
          setStatus('authenticated')
        }
      } catch (e) {
        if (cancelled) return
        // 503: chưa kiểm được tổ chức (phiên vẫn còn) – nói rõ để người dùng thử lại thay vì tưởng bị đăng xuất.
        if (toApiError(e).code === ORGANIZATION_UNAVAILABLE) setNotice(MSG_ORG_UNAVAILABLE)
        setStatus('anonymous')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(
    () =>
      onSessionExpired((end) => {
        setNotice((prev) => end.notice ?? prev)
        reset()
      }),
    [reset],
  )

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    tokenStore.setTokens(res)
    tokenStore.setUser(res.user)
    setUser(res.user)
    setStatus('authenticated')
    setLoggedOut(false)
    setNotice(null)
    return res.user
  }, [])

  const logout = useCallback(async () => {
    // Đặt cờ trước khi gọi server: nếu "hết phiên" kích hoạt trong lúc chờ (vd. Socket.IO refresh thất bại sau khi
    // refresh token bị thu hồi), RequireAuth vẫn biết đây là đăng xuất chủ động.
    setLoggedOut(true)
    setNotice(null)
    const refreshToken = tokenStore.getRefreshToken()
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken)
      } catch {
        /* vẫn đăng xuất phía trình duyệt */
      }
    }
    tokenStore.clear()
    reset()
  }, [reset])

  const value = useMemo(
    () => ({ user, status, loggedOut, notice, login, logout }),
    [user, status, loggedOut, notice, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
