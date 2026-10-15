import { NavLink, Outlet } from 'react-router'
import { hasRole, useAuth } from '@/auth/context'
import type { Role } from '@/lib/api/types'
import { useRealtimeConnected } from '@/realtime/hooks'

interface NavItem {
  to: string
  label: string
  roles?: Role[]
}

interface NavGroup {
  title: string
  roles?: Role[]
  items: NavItem[]
}

// Menu theo role. Thêm trang mới: thêm route trong routes.tsx và một dòng ở đây.
const NAV: NavGroup[] = [
  {
    title: 'Cá nhân',
    items: [
      { to: '/', label: 'Tổng quan' },
      { to: '/habits', label: 'Thói quen' },
      { to: '/history', label: 'Lịch sử cảnh báo' },
      { to: '/settings', label: 'Cấu hình' },
    ],
  },
  {
    title: 'Tổ chức',
    roles: ['ORG_ADMIN'],
    items: [
      { to: '/org', label: 'Tổng quan tổ chức' },
      { to: '/org/users', label: 'Nhân viên' },
      { to: '/org/departments', label: 'Phòng ban' },
      { to: '/org/settings', label: 'Cấu hình tổ chức' },
    ],
  },
  {
    title: 'Quản trị hệ thống',
    roles: ['SYS_ADMIN'],
    items: [
      { to: '/admin/organizations', label: 'Tổ chức' },
      { to: '/admin/users', label: 'Người dùng' },
    ],
  },
]

const ROLE_LABEL: Record<Role, string> = {
  USER: 'Nhân viên',
  ORG_ADMIN: 'Quản lý tổ chức',
  SYS_ADMIN: 'Quản trị hệ thống',
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const connected = useRealtimeConnected()

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="px-5 py-4 text-base font-semibold">KLTN Dashboard</div>
        <nav className="flex-1 space-y-5 px-3 py-2">
          {NAV.filter((g) => hasRole(user, g.roles)).map((group) => (
            <div key={group.title}>
              <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                {group.title}
              </div>
              {group.items
                .filter((i) => hasRole(user, i.roles))
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    className={({ isActive }) =>
                      `block rounded-md px-2 py-1.5 text-sm ${
                        isActive ? 'bg-gray-100 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-gray-200 bg-white px-6 py-3 text-sm">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
            {connected ? 'Realtime' : 'Mất kết nối realtime'}
          </span>
          <span>
            {user?.name || user?.email || user?.id}
            {user && <span className="text-gray-400"> · {ROLE_LABEL[user.role]}</span>}
          </span>
          <button onClick={() => void logout()} className="rounded-md border border-gray-200 px-3 py-1 hover:bg-gray-50">
            Đăng xuất
          </button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
