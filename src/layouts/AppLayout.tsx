import { Building2, Gauge, LayoutDashboard, History, LogOut, Settings2, SlidersHorizontal, UsersRound, Network, Grid3x3, Menu } from 'lucide-react'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { PlumbLine } from '@/components/PlumbLine'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { hasRole, useAuth } from '@/auth/context'
import type { Role } from '@/lib/api/types'
import { ROLE_LABEL } from '@/lib/labels'
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

export function AppLayout() {
  const { user, logout } = useAuth()
  const connected = useRealtimeConnected()
  const [menuOpen, setMenuOpen] = useState(false)

  const navigation = (onNavigate?: () => void) => (
    <>
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
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring ${
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
          <Button variant="ghost" className="-ml-2 mt-2 min-h-11 text-muted-foreground" onClick={() => { onNavigate?.(); void logout() }}>
            <LogOut aria-hidden />
            Đăng xuất
          </Button>
        </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-surface text-foreground">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-background p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Đến nội dung chính</a>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        {navigation()}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mb-6 flex min-h-18 items-center justify-between gap-4 border-b bg-background px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="size-11 shrink-0 lg:hidden" aria-label="Mở điều hướng"><Menu aria-hidden /></Button>
              </DialogTrigger>
              <DialogContent className="top-0 left-0 flex h-dvh w-72 max-w-[90vw] translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-72" aria-describedby={undefined}>
                <DialogTitle className="sr-only">Điều hướng chính</DialogTitle>
                {navigation(() => setMenuOpen(false))}
              </DialogContent>
            </Dialog>
            <span className="hidden text-sm font-medium sm:inline">Không gian làm việc</span>
          </div>
          <span className="flex items-center gap-1.5" role="status">
            <span
              className="size-2 rounded-full"
              style={{ background: connected ? 'var(--primary)' : 'var(--status-offline)' }}
              aria-hidden
            />
            <span className="text-xs text-muted-foreground">{connected ? 'Đang nhận dữ liệu trực tiếp' : 'Chưa kết nối trực tiếp'}</span>
          </span>
        </header>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-12 outline-none sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
