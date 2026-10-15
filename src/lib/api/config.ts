import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRealtimeEvent } from '@/realtime/hooks'
import { request } from './client'

// config-service – team-sync mục 4.4; sự kiện Socket.IO `config` – mục 4.7

/** Cấu hình hiệu lực: khóa tổ chức, rồi khóa cá nhân ghi đè. Chưa có gì thì {}. Mặc định hệ thống do App tự có. */
export type ConfigValues = Record<string, number | boolean | string | null>

export const CONFIG_QUERY_KEY = ['config', 'me'] as const

export function useMyConfig() {
  return useQuery({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: () => request<ConfigValues>({ url: '/config/me' }),
  })
}

/** PUT thay TOÀN BỘ phần cá nhân: khóa không gửi = về mặc định, {} = xóa hết. Trả cấu hình hiệu lực mới. */
export function useSaveMyConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ConfigValues) => request<ConfigValues>({ method: 'PUT', url: '/config/me', data: body }),
    onSuccess: (effective) => qc.setQueryData(CONFIG_QUERY_KEY, effective),
  })
}

/** Máy khác (hoặc tổ chức) vừa đổi cấu hình: server đẩy cả cấu hình hiệu lực, ghi thẳng vào cache. */
export function useConfigRealtime() {
  const qc = useQueryClient()
  useRealtimeEvent<ConfigValues>('config', (cfg) => {
    if (cfg && typeof cfg === 'object') qc.setQueryData(CONFIG_QUERY_KEY, cfg)
  })
}
