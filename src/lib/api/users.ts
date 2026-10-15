import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Paged } from './alerts'
import { request } from './client'
import type { Role } from './types'

// auth-service – team-sync mục 4.1

export interface UserAccount {
  id: string
  email: string
  name: string | null
  role: Role
  orgId: string | null
  enabled: boolean
}

export const USERS_PAGE_SIZE = 20

/** Gốc khóa truy vấn: invalidate khóa này là làm mới mọi danh sách người dùng. */
const USERS_KEY = ['users'] as const

export function useUsers(page: number, enabled = true) {
  return useQuery({
    queryKey: [...USERS_KEY, 'list', page],
    queryFn: () =>
      request<Paged<UserAccount>>({ url: '/users', params: { page, size: USERS_PAGE_SIZE } }),
    placeholderData: keepPreviousData,
    enabled,
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
