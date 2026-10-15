import { useAuth } from '@/auth/context'
import { NoOrgNotice } from '@/components/NoOrgNotice'
import { UsersManager } from '@/components/UsersManager'

/** Nhân viên của tổ chức (ORG_ADMIN). Bảng và hộp thoại dùng chung với trang Người dùng của SYS_ADMIN. */
export function OrgUsersPage() {
  const { user } = useAuth()
  if (!user?.orgId) return <NoOrgNotice title="Nhân viên" />
  return <UsersManager scope="org" selfId={user.id} title="Nhân viên" />
}
