import { useAuth } from '@/auth/context'
import { UsersManager } from '@/components/UsersManager'

/** Người dùng toàn hệ thống (SYS_ADMIN): có cột Tổ chức, gán được mọi vai trò, chọn tổ chức khi thêm. */
export function AdminUsersPage() {
  const { user } = useAuth()
  if (!user) return null
  return <UsersManager scope="system" selfId={user.id} title="Người dùng" />
}
