import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRealtimeEvent } from '@/realtime/hooks'
import { request } from './client'

// config-service – team-sync mục 4.4; sự kiện Socket.IO `config` – mục 4.7

/** Cấu hình hiệu lực: khóa tổ chức, rồi khóa cá nhân ghi đè. Chưa có gì thì {}. Mặc định hệ thống do App tự có. */
export type ConfigValues = Record<string, number | boolean | string | null>

export const CONFIG_QUERY_KEY = ['config', 'me'] as const
const DETAILS_QUERY_KEY = [...CONFIG_QUERY_KEY, 'details'] as const
export type ConfigDetails = { personal: ConfigValues; organization: ConfigValues; effective: ConfigValues }

export function useMyConfigDetails() {
  return useQuery({
    queryKey: DETAILS_QUERY_KEY,
    queryFn: () => request<ConfigDetails>({ url: '/config/me/details' }),
  })
}

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
    onSuccess: async (effective) => {
      qc.setQueryData(CONFIG_QUERY_KEY, effective)
      await qc.invalidateQueries({ queryKey: DETAILS_QUERY_KEY })
    },
  })
}

/** Máy khác (hoặc tổ chức) vừa đổi cấu hình: server đẩy cả cấu hình hiệu lực, ghi thẳng vào cache. */
export function useConfigRealtime() {
  const qc = useQueryClient()
  useRealtimeEvent<ConfigValues>('config', (cfg) => {
    if (cfg && typeof cfg === 'object') {
      qc.setQueryData(CONFIG_QUERY_KEY, cfg)
      void qc.invalidateQueries({ queryKey: DETAILS_QUERY_KEY })
    }
  })
}

// ---------- Cấu hình tổ chức (ORG_ADMIN có orgId) – team-sync mục 4.4 ----------

export const ORG_CONFIG_QUERY_KEY = ['config', 'org'] as const

/** Chỉ các khóa tổ chức đã lưu, KHÔNG gộp với cá nhân. Chưa có gì thì {}. */
export function useOrgConfig(enabled = true) {
  return useQuery({
    queryKey: ORG_CONFIG_QUERY_KEY,
    queryFn: () => request<ConfigValues>({ url: '/config/org' }),
    enabled,
  })
}

/** PUT thay TOÀN BỘ khóa tổ chức ({} = xóa hết). Cấu hình hiệu lực của chính mình cũng đổi nên làm mới cache cá nhân. */
export function useSaveOrgConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ConfigValues) => request<ConfigValues>({ method: 'PUT', url: '/config/org', data: body }),
    onSuccess: (saved) => {
      qc.setQueryData(ORG_CONFIG_QUERY_KEY, saved)
      void qc.invalidateQueries({ queryKey: CONFIG_QUERY_KEY })
    },
  })
}
