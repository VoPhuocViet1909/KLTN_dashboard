import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { lastDays } from '@/lib/time'
import { request } from './client'

// alert-service – team-sync mục 4.5

export interface Paged<T> {
  items: T[]
  /** bắt đầu từ 0 */
  page: number
  size: number
  total: number
}

export interface AlertItem {
  userId: string
  deviceId: string
  sessionId: string
  alertType: string
  /** LOW | MEDIUM | HIGH; mã lạ hiện nguyên */
  severity: string
  startedAt: string
  endedAt: string | null
  durationSec: number | null
  /** CORRECTED | SESSION_END | SESSION_TIMEOUT; mã lạ hiện nguyên */
  endReason: string | null
  repeatCount: number
  /** chưa kết thúc */
  open: boolean
}

export interface SessionItem {
  deviceId: string
  sessionId: string
  startedAt: string | null
  endedAt: string | null
  /** SESSION_END | TIMEOUT; mã lạ hiện nguyên */
  endReason: string | null
  lastSeenAt: string | null
  open: boolean
  alertCount: number
}

export const HISTORY_PAGE_SIZE = 20

/** Backend giới hạn khoảng thời gian tối đa 92 ngày. */
export const MAX_HISTORY_DAYS = 92

// `from`/`to` tính trong queryFn (như stats.ts) để khóa truy vấn chỉ phụ thuộc `days`, không đổi theo từng lần render.

export function useMyAlerts(days: number, alertType: string | undefined, page: number) {
  return useQuery({
    queryKey: ['alerts', 'me', days, alertType ?? null, page],
    queryFn: () =>
      request<Paged<AlertItem>>({
        url: '/alerts/me',
        params: { ...lastDays(days), alertType, page, size: HISTORY_PAGE_SIZE },
      }),
    placeholderData: keepPreviousData,
  })
}

export function useMySessions(days: number, page: number) {
  return useQuery({
    queryKey: ['alerts', 'me', 'sessions', days, page],
    queryFn: () =>
      request<Paged<SessionItem>>({
        url: '/alerts/me/sessions',
        params: { ...lastDays(days), page, size: HISTORY_PAGE_SIZE },
      }),
    placeholderData: keepPreviousData,
  })
}
