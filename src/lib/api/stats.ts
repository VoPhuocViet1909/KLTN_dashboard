import { useQuery } from '@tanstack/react-query'
import { lastDays } from '@/lib/time'
import { request } from './client'

// analytics-service – team-sync mục 4.6

export interface Summary {
  /** trung bình có trọng số theo thời gian có mặt; null khi không có dữ liệu */
  meanScore: number | null
  badMinutes: number
  presenceMinutes: number
  /** số lần cảnh báo theo loại, ví dụ {NECK_TRUNK: 3} */
  alerts: Record<string, number>
}

export interface Bucket extends Summary {
  /** đầu khung; với bucket=day là 00:00 giờ Việt Nam (vd 2026-10-13T17:00:00Z = ngày 14/10) */
  start: string
}

export const sumAlerts = (alerts: Record<string, number>) =>
  Object.values(alerts).reduce((a, b) => a + b, 0)

export function useMySummary(days: number) {
  return useQuery({
    queryKey: ['stats', 'me', 'summary', days],
    queryFn: () => request<Summary>({ url: '/stats/me/summary', params: lastDays(days) }),
  })
}

export function useMyTimeseries(days: number, bucket: 'hour' | 'day' = 'day') {
  return useQuery({
    queryKey: ['stats', 'me', 'timeseries', days, bucket],
    queryFn: () =>
      request<Bucket[]>({ url: '/stats/me/timeseries', params: { ...lastDays(days), bucket } }),
  })
}
