import { Navigate, Outlet, useLocation } from 'react-router'
import type { Role } from '@/lib/api/types'
import { hasRole, useAuth } from './context'

/** Chặn trang khi chưa đăng nhập; truyền `roles` để chỉ cho một số role vào. */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center text-sm text-gray-500">Đang tải…</div>
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!hasRole(user, roles)) {
    return <Navigate to="/403" replace />
  }
  return <Outlet />
}
