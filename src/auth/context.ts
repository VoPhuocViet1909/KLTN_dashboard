import { createContext, useContext } from 'react'
import type { Role, SessionUser } from '@/lib/api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  user: SessionUser | null
  status: AuthStatus
  /** true khi người dùng tự bấm đăng xuất (khác với phiên hết hạn): đăng nhập lại thì không quay về trang cũ */
  loggedOut: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải nằm trong <AuthProvider>')
  return ctx
}

export function hasRole(user: SessionUser | null, roles?: Role[]) {
  return !!user && (!roles || roles.includes(user.role))
}
