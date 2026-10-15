import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
