import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
