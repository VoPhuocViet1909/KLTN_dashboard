import { useEffect, useState } from 'react'
import { useRealtimeConnected, useRealtimeEvent } from './hooks'
import type { StatusEvent } from './socket'
import { newerObservation, observedDevice, validObservation, type DeviceObservation, type ObservedDevice } from './observation'

export function useDeviceObservations(userId?: string, orgId?: string) {
  const identity = `${userId ?? ''}/${orgId ?? ''}`
  const [records, setRecords] = useState<{ identity: string; live: Record<string, DeviceObservation>; legacy: Record<string, StatusEvent> }>({ identity, live: {}, legacy: {} })
  const connected = useRealtimeConnected()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useRealtimeEvent<unknown>('device-state', (event) => {
    if (!userId || !validObservation(event) || (!orgId && event.userId !== userId)) return
    setRecords((old) => {
      const data = old.identity === identity ? old : { identity, live: {}, legacy: {} }
      const key = `${event.userId}/${event.deviceId}`
      return newerObservation(event, data.live[key]) ? { ...data, live: { ...data.live, [key]: event } } : data
    })
  })
  useRealtimeEvent<StatusEvent>('status', (event) => {
    if (!userId || !event || typeof event.deviceId !== 'string' || (!orgId && event.userId !== userId)) return
    setRecords((old) => {
      const data = old.identity === identity ? old : { identity, live: {}, legacy: {} }
      const key = `${event.userId}/${event.deviceId}`
      const prior = data.legacy[key]
      return !prior || Date.parse(event.ts) > Date.parse(prior.ts) ? { ...data, legacy: { ...data.legacy, [key]: event } } : data
    })
  })
  if (records.identity !== identity) return []
  const result: Record<string, ObservedDevice> = {}
  for (const [key, value] of Object.entries(records.legacy)) {
    result[key] = { userId: value.userId, deviceId: value.deviceId, state: connected && value.state !== 'OFFLINE' ? 'UNKNOWN' : 'OFFLINE',
      ts: value.ts, alertType: null, note: 'Ứng dụng chưa gửi trạng thái quan sát; chưa thể kết luận tư thế hiện tại.' }
  }
  for (const [key, value] of Object.entries(records.live)) result[key] = observedDevice(value, now, connected)
  return Object.values(result).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
}
