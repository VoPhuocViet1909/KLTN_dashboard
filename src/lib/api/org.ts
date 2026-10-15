import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { lastDays } from '@/lib/time'
import type { AlertItem, Paged } from './alerts'
import { request } from './client'
import type { Summary } from './stats'

// ORG_ADMIN có orgId – team-sync mục 4.5 và 4.6. `enabled` = false khi tài khoản chưa thuộc tổ chức nào (không gọi API).

export function useOrgSummary(days: number, enabled = true) {
  return useQuery({
    queryKey: ['stats', 'org', 'summary', days],
    queryFn: () => request<Summary>({ url: '/stats/org/summary', params: lastDays(days) }),
    enabled,
  })
}

export const ORG_ALERTS_PAGE_SIZE = 10

/** Cảnh báo của mọi thành viên, mới nhất trước. Có `userId`, `deviceId` để biết của ai. */
export function useOrgAlerts(days: number, page: number, enabled = true) {
  return useQuery({
    queryKey: ['alerts', 'org', days, page],
    queryFn: () =>
      request<Paged<AlertItem>>({
        url: '/alerts/org',
        params: { ...lastDays(days), page, size: ORG_ALERTS_PAGE_SIZE },
      }),
    placeholderData: keepPreviousData,
    enabled,
  })
}

// ---------- Tổ chức và phòng ban (organization-service) – team-sync mục 4.2 ----------

export interface Organization {
  id: string
  name: string
  active: boolean
}

export interface Department {
  id: string
  organizationId: string
  name: string
  active: boolean
}

const ORG_KEY = ['organization'] as const

export function useOrganization(orgId: string) {
  return useQuery({
    queryKey: [...ORG_KEY, orgId],
    queryFn: () => request<Organization>({ url: `/organizations/${encodeURIComponent(orgId)}` }),
  })
}

/** Backend trả mảng thuần (không phân trang). */
export function useDepartments(orgId: string) {
  return useQuery({
    queryKey: [...ORG_KEY, orgId, 'departments'],
    queryFn: () => request<Department[]>({ url: `/organizations/${encodeURIComponent(orgId)}/departments` }),
  })
}

export function useCreateDepartment(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      request<Department>({ method: 'POST', url: `/organizations/${encodeURIComponent(orgId)}/departments`, data: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...ORG_KEY, orgId] }),
  })
}

export function useSetDepartmentStatus(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      request<Department>({
        method: 'PATCH',
        url: `/organizations/${encodeURIComponent(orgId)}/departments/${encodeURIComponent(id)}/status`,
        data: { active },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...ORG_KEY, orgId] }),
  })
}

// ---------- Danh mục tổ chức (SYS_ADMIN) – team-sync mục 4.2 ----------

const ORGS_KEY = ['organizations'] as const

/** Backend trả mảng thuần. SYS_ADMIN thấy tất cả; ORG_ADMIN chỉ thấy tổ chức của mình. */
export function useOrganizations(enabled = true) {
  return useQuery({
    queryKey: ORGS_KEY,
    queryFn: () => request<Organization[]>({ url: '/organizations' }),
    enabled,
  })
}

export function useCreateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => request<Organization>({ method: 'POST', url: '/organizations', data: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ORGS_KEY }),
  })
}

export function useSetOrganizationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      request<Organization>({
        method: 'PATCH',
        url: `/organizations/${encodeURIComponent(id)}/status`,
        data: { active },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ORGS_KEY }),
  })
}

/** Số phòng ban của từng tổ chức (mỗi tổ chức một truy vấn, dùng chung khóa với trang Phòng ban). */
export function useDepartmentCounts(orgIds: string[]) {
  return useQueries({
    queries: orgIds.map((id) => ({
      queryKey: [...ORG_KEY, id, 'departments'],
      queryFn: () => request<Department[]>({ url: `/organizations/${encodeURIComponent(id)}/departments` }),
      select: (d: Department[]) => d.length,
    })),
  })
}
