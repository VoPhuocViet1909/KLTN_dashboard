import { Building2, Gauge, LayoutDashboard, History, LogOut, Settings2, SlidersHorizontal, UsersRound, Network, Grid3x3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { PlumbLine } from '@/components/PlumbLine'
import { Button } from '@/components/ui/button'
import { hasRole, useAuth } from '@/auth/context'
import type { Role } from '@/lib/api/types'
import { useRealtimeConnected } from '@/realtime/hooks'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
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
      { to: '/', label: 'Tổng quan', icon: Gauge },
      { to: '/habits', label: 'Thói quen', icon: Grid3x3 },
      { to: '/history', label: 'Lịch sử cảnh báo', icon: History },
      { to: '/settings', label: 'Cấu hình', icon: Settings2 },
    ],
  },
  {
    title: 'Tổ chức',
    roles: ['ORG_ADMIN'],
    items: [
      { to: '/org', label: 'Tổng quan tổ chức', icon: LayoutDashboard },
      { to: '/org/users', label: 'Nhân viên', icon: UsersRound },
      { to: '/org/departments', label: 'Phòng ban', icon: Network },
      { to: '/org/settings', label: 'Cấu hình tổ chức', icon: SlidersHorizontal },
    ],
  },
  {
    title: 'Quản trị hệ thống',
    roles: ['SYS_ADMIN'],
    items: [
      { to: '/admin/organizations', label: 'Tổ chức', icon: Building2 },
      { to: '/admin/users', label: 'Người dùng', icon: UsersRound },
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
    <div className="flex min-h-screen bg-surface text-foreground">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex items-center gap-2 px-5 py-5">
          <PlumbLine state="GOOD" size={28} />
          <span className="font-semibold leading-tight">Giám sát tư thế</span>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Điều hướng chính">
          {NAV.filter((g) => hasRole(user, g.roles)).map((group) => (
            <div key={group.title} className="space-y-0.5">
              <div className="px-3 pb-1 text-xs text-muted-foreground">{group.title}</div>
              {group.items
                .filter((i) => hasRole(user, i.roles))
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    className={({ isActive }) =>
                      `flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive
                          ? 'bg-sidebar-accent font-medium text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="border-t px-5 py-4 text-sm">
          <div className="truncate font-medium">{user?.name || user?.email || user?.id}</div>
          <div className="text-xs text-muted-foreground">{user && ROLE_LABEL[user.role]}</div>
          <Button variant="ghost" size="sm" className="-ml-2 mt-2 text-muted-foreground" onClick={() => void logout()}>
            <LogOut aria-hidden />
            Đăng xuất
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end px-8 pt-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5" role="status">
            <span
              className="size-2 rounded-full"
              style={{ background: connected ? 'var(--primary)' : 'var(--status-offline)' }}
              aria-hidden
            />
            {connected ? 'Đang nhận dữ liệu trực tiếp' : 'Chưa kết nối trực tiếp'}
          </span>
        </header>
        <main className="flex-1 px-8 pb-12 pt-2">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
