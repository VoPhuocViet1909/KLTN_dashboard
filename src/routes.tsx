import { Route, Routes } from 'react-router'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { AdminOrganizationsPage } from '@/pages/AdminOrganizationsPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage'
import { HabitsPage } from '@/pages/HabitsPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { LoginPage } from '@/pages/LoginPage'
import { ForbiddenPage, NotFoundPage } from '@/pages/misc'
import { OrgDepartmentsPage } from '@/pages/OrgDepartmentsPage'
import { OrgOverviewPage } from '@/pages/OrgOverviewPage'
import { OrgSettingsPage } from '@/pages/OrgSettingsPage'
import { OrgUsersPage } from '@/pages/OrgUsersPage'
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
            <Route path="org" element={<OrgOverviewPage />} />
            <Route path="org/users" element={<OrgUsersPage />} />
            <Route path="org/departments" element={<OrgDepartmentsPage />} />
            <Route path="org/settings" element={<OrgSettingsPage />} />
          </Route>

          {/* Quản trị hệ thống – SYS_ADMIN */}
          <Route element={<RequireAuth roles={['SYS_ADMIN']} />}>
            <Route path="admin/organizations" element={<AdminOrganizationsPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
          </Route>

          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
