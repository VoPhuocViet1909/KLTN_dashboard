import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from './client'

export interface NotificationPolicy {
  version: number; updatedAt: string | null;
  quietEnabled: boolean; quietStartMinute: number; quietEndMinute: number;
  focusUntil: string | null; minimumGapSec: number; toast: boolean; sound: boolean; popup: boolean;
}
export type PolicySettings = Omit<NotificationPolicy, 'version' | 'updatedAt'>
const KEY = ['notification-policy', 'me'] as const
export function useNotificationPolicy() {
  return useQuery({ queryKey: KEY, queryFn: () => request<NotificationPolicy>({ url: '/config/me/notification-policy' }), refetchInterval: 30_000 })
}
export function useSaveNotificationPolicy() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: PolicySettings & { operationId: string; expectedVersion: number }) =>
    request<NotificationPolicy>({ method: 'PUT', url: '/config/me/notification-policy', data: body }),
    onSuccess: (value) => qc.setQueryData(KEY, value) })
}

export function minuteText(value: number) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
export function parseMinute(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  return match && Number(match[1]) < 24 && Number(match[2]) < 60 ? Number(match[1]) * 60 + Number(match[2]) : NaN
}
export function policyErrors(value: PolicySettings) {
  const errors: Record<string, string> = {}
  for (const key of ['quietStartMinute', 'quietEndMinute'] as const) {
    if (!Number.isInteger(value[key]) || value[key] < 0 || value[key] > 1439) errors[key] = 'Chọn giờ từ 00:00 đến 23:59.'
  }
  if (value.quietEnabled && value.quietStartMinute === value.quietEndMinute) errors.quietEndMinute = 'Giờ kết thúc phải khác giờ bắt đầu.'
  if (!Number.isInteger(value.minimumGapSec) || value.minimumGapSec < 0 || value.minimumGapSec > 900) errors.minimumGapSec = 'Nhập số nguyên từ 0 đến 900 giây.'
  return errors
}
