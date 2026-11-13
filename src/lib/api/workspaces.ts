import { useQuery } from '@tanstack/react-query'
import { request } from './client'

export interface Workspace { workspaceId: string; name: string; type: 'HOME' | 'OFFICE' | 'OTHER'; status: 'ACTIVE' | 'ARCHIVED'; version: number; updatedAt: string }
export interface RegisteredDevice { deviceKey: string; deviceId: string; name: string; workspaceId: string | null; status: 'ACTIVE' | 'ARCHIVED'; version: number; updatedAt: string; assignedAt: string; lastSeenAt?: string | null }
export interface DevicePreferences { version: number; updatedAt: string | null; defaultDeviceKey: string | null }
export interface Page<T> { items: T[]; total: number; page: number; size: number }
export const WORKSPACE_KEY = ['workspace-profiles'] as const
async function all<T>(resource: string): Promise<T[]> {
  const result: T[] = []
  for (let page = 0; page < 100; page++) {
    const data = await request<Page<T>>({ url: `/config/me/${resource}`, params: { page, size: 100 } })
    if (!Array.isArray(data.items)) throw new Error('Invalid workspace response')
    result.push(...data.items)
    if (result.length >= data.total) return result
  }
  throw new Error('Too many workspace resources')
}
export function useWorkspaces() { return useQuery({ queryKey: [...WORKSPACE_KEY, 'workspaces'], queryFn: () => all<Workspace>('workspaces') }) }
export function useRegisteredDevices() { return useQuery({ queryKey: [...WORKSPACE_KEY, 'devices'], queryFn: () => all<RegisteredDevice>('devices'), refetchInterval: 30_000 }) }
export function useDevicePreferences() { return useQuery({ queryKey: [...WORKSPACE_KEY, 'preferences'], queryFn: () => request<DevicePreferences>({ url: '/config/me/device-preferences' }) }) }
export function useDeviceHistory(key?: string) {
  return useQuery({ queryKey: [...WORKSPACE_KEY, 'history', key], queryFn: () => all<RegisteredDevice>(`devices/${key}/history`), enabled: !!key })
}
