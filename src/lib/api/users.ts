import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Paged } from './alerts'
import { request } from './client'
import { toApiError } from './errors'
import type { Role } from './types'

// auth-service – team-sync mục 4.1

export interface UserAccount {
  id: string
  email: string
  name: string | null
  role: Role
  orgId: string | null
  enabled: boolean
  /** phòng ban (organization-service); null khi chưa gán */
  departmentId: string | null
}

export const USERS_PAGE_SIZE = 20

/** Gốc khóa truy vấn: invalidate khóa này là làm mới mọi danh sách người dùng. */
const USERS_KEY = ['users'] as const

/** `departmentId`: chỉ lấy thành viên của phòng ban đó (backend lọc, tổng `total` cũng theo bộ lọc). */
export function useUsers(page: number, enabled = true, departmentId?: string) {
  return useQuery({
    queryKey: [...USERS_KEY, 'list', page, departmentId ?? null],
    queryFn: () =>
      request<Paged<UserAccount>>({ url: '/users', params: { page, size: USERS_PAGE_SIZE, departmentId } }),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Số nhân viên của từng phòng ban (`total` của GET /users?departmentId=…&size=1), cùng thứ tự với `departmentIds`. */
export function useDepartmentMemberCounts(departmentIds: string[]) {
  return useQueries({
    queries: departmentIds.map((id) => ({
      queryKey: [...USERS_KEY, 'count', id],
      queryFn: () => request<Paged<UserAccount>>({ url: '/users', params: { page: 0, size: 1, departmentId: id } }),
      select: (page: Paged<UserAccount>) => page.total,
    })),
  })
}

/**
 * Tra userId -> tài khoản (để hiện tên thay vì mã). ORG_ADMIN chỉ thấy người cùng tổ chức.
 * Lấy tối đa 5 trang × 100 = 500 người; thiếu hoặc lỗi thì nơi dùng rơi về mã rút gọn.
 */
export function useUserDirectory(enabled = true) {
  return useQuery({
    queryKey: [...USERS_KEY, 'directory'],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const map: Record<string, UserAccount> = {}
      for (let page = 0; page < 5; page++) {
        const res = await request<Paged<UserAccount>>({ url: '/users', params: { page, size: 100 } })
        for (const u of res.items) map[u.id] = u
        if ((page + 1) * res.size >= res.total || res.items.length === 0) break
      }
      return map
    },
  })
}

/** Tên hiển thị: tên, rồi email; không tra được thì 8 ký tự đầu của userId. */
export function displayUser(dir: Record<string, UserAccount> | undefined, userId: string) {
  const u = dir?.[userId]
  return u?.name || u?.email || userId.slice(0, 8)
}

export interface NewUser {
  email: string
  password: string
  role: Role
  name?: string
  /** chỉ SYS_ADMIN gửi; với ORG_ADMIN backend tự gán tổ chức của họ nên không gửi */
  orgId?: string | null
}
export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: NewUser) => request<UserAccount>({ method: 'POST', url: '/users', data: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

export function useChangeRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      request<UserAccount>({ method: 'PATCH', url: `/users/${encodeURIComponent(id)}/role`, data: { role } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

/** `departmentId` = null: bỏ nhân viên khỏi phòng ban. Backend kiểm phòng ban có thật, đang dùng và thuộc đúng tổ chức. */
export function useSetUserDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, departmentId }: { id: string; departmentId: string | null }) =>
      request<UserAccount>({
        method: 'PATCH',
        url: `/users/${encodeURIComponent(id)}/department`,
        data: { departmentId },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

/**
 * Câu tiếng Việt cho lỗi gán phòng ban (team-sync mục 4.1). `stale` = true khi danh sách phòng ban hoặc
 * nhân viên trên màn hình đã cũ nên cần tải lại.
 */
export function departmentError(e: unknown): { message: string; stale: boolean } {
  const err = toApiError(e)
  switch (err.code) {
    case 'DEPARTMENT_NOT_FOUND':
      return { message: 'Phòng ban không còn hoặc không thuộc tổ chức này. Danh sách đã được tải lại.', stale: true }
    case 'DEPARTMENT_INACTIVE':
      return { message: 'Phòng ban này đã ngừng dùng nên không gán thêm được. Hãy chọn phòng ban khác.', stale: true }
    case 'USER_NOT_FOUND':
      return { message: 'Không tìm thấy tài khoản này. Danh sách đã được tải lại.', stale: true }
    case 'AUTH_FORBIDDEN':
      return { message: 'Bạn không có quyền đổi phòng ban của tài khoản này.', stale: true }
    case 'ORGANIZATION_UNAVAILABLE':
      return { message: 'Chưa kiểm tra được phòng ban lúc này. Hãy thử lại sau ít phút.', stale: false }
    case 'VALIDATION_FAILED':
      return err.fieldErrors.departmentId
        ? { message: 'Tài khoản này chưa thuộc tổ chức nào nên chưa gán được phòng ban.', stale: false }
        : { message: `Dữ liệu không hợp lệ: ${err.message}`, stale: false }
    default:
      return { message: err.message, stale: false }
  }
}

export function useSetUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      request<UserAccount>({ method: 'PATCH', url: `/users/${encodeURIComponent(id)}/status`, data: { enabled } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

/** Sau lỗi 403/404 khi thao tác: danh sách đã cũ, cần tải lại. */
export function useRefreshUsers() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: USERS_KEY })
}
