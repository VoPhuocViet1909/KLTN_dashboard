import { useQuery } from '@tanstack/react-query'
import { request } from './client'
import type { Paged } from './alerts'

export type DepartmentHistory = { id: string; userId: string; orgId: string; departmentId: string | null; validFrom: string; validTo: string | null }
export function useDepartmentHistory(userId: string, page: number) {
  return useQuery({ queryKey: ['users', 'department-history', userId, page],
    queryFn: () => request<Paged<DepartmentHistory>>({ url: `/users/${encodeURIComponent(userId)}/department-history`, params: { page, size: 20 } }), retry: false })
}

export type DepartmentReportRow = {
  group: 'DEPARTMENT' | 'UNASSIGNED' | 'UNKNOWN'; departmentId: string | null
  status: 'OK' | 'NO_DATA' | 'NO_TIMING' | 'SUPPRESSED' | 'OVERLAPPING_WINDOWS'
  contributors: number | null; presenceSec: number | null; knownSec: number | null; badSec: number | null
  badRatio: number | null; legacyPresenceSec: number | null; alertCount: number | null
}
export type DepartmentReport = { week: string; from: string; to: string; dataAsOf: string; minimumGroupSize: number; status: 'OK' | 'NO_DATA' | 'SUPPRESSED' | 'OVERLAPPING_WINDOWS'; rows: DepartmentReportRow[] }
export function useDepartmentReport(week?: string) {
  return useQuery({ queryKey: ['stats', 'org', 'department-report', week ?? null],
    queryFn: () => request<DepartmentReport>({ url: '/stats/org/departments/report', params: { week } }), retry: false })
}
