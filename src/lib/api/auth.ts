import { request } from './client'
import type { LoginResponse, SessionUser } from './types'

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>({
      method: 'POST',
      url: '/auth/login',
      data: { email, password, deviceName: 'Web Dashboard' },
    }),

  /** Luôn 204, kể cả token đã hết hạn. */
  logout: (refreshToken: string) =>
    request<void>({ method: 'POST', url: '/auth/logout', data: { refreshToken } }),

  me: () => request<SessionUser>({ method: 'GET', url: '/auth/me' }),
}
