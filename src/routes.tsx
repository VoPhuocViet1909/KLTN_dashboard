import { Route, Routes } from 'react-router'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { HabitsPage } from '@/pages/HabitsPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { LoginPage } from '@/pages/LoginPage'
import { ForbiddenPage, NotFoundPage, Placeholder } from '@/pages/misc'
import { OverviewPage } from '@/pages/OverviewPage'
import { SettingsPage } from '@/pages/SettingsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {/* Cá nhân – mọi role */}
          <Route index element={<OverviewPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Tổ chức – ORG_ADMIN */}
          <Route element={<RequireAuth roles={['ORG_ADMIN']} />}>
            <Route
              path="org"
              element={<Placeholder title="Tổng quan tổ chức" apis={['GET /stats/org/summary', 'GET /alerts/org']} />}
            />
            <Route
              path="org/users"
              element={<Placeholder title="Nhân viên" apis={['GET/POST /users', 'PATCH /users/{id}/role', 'PATCH /users/{id}/status']} />}
            />
            <Route
              path="org/departments"
              element={<Placeholder title="Phòng ban" apis={['GET/POST /organizations/{id}/departments']} />}
            />
            <Route
              path="org/settings"
              element={<Placeholder title="Cấu hình tổ chức" apis={['GET /config/org', 'PUT /config/org']} />}
            />
          </Route>

          {/* Quản trị hệ thống – SYS_ADMIN */}
          <Route element={<RequireAuth roles={['SYS_ADMIN']} />}>
            <Route
              path="admin/organizations"
              element={<Placeholder title="Tổ chức" apis={['GET/POST /organizations', 'PATCH /organizations/{id}/status']} />}
            />
            <Route path="admin/users" element={<Placeholder title="Người dùng" apis={['GET/POST /users']} />} />
          </Route>

          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
