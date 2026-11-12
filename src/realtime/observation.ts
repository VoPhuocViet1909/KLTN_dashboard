import type { DeviceState } from './socket'

export const OBSERVATION_LABEL = {
  GOOD: 'Ngồi đúng', BAD: 'Đang ngồi sai', AWAY: 'Vắng mặt', OFFLINE: 'Không kết nối',
  CALIBRATING: 'Đang hiệu chỉnh', UNKNOWN: 'Chưa đủ dữ liệu', CAMERA_LOST: 'Mất kết nối camera',
} as const
export type ObservationState = keyof typeof OBSERVATION_LABEL
export interface ConfigAcknowledgement { version: number; revision: string; state: 'APPLIED' | 'REJECTED'; appliedAt: string | null }
const REASON: Record<ObservationState, string> = { GOOD: 'NONE', BAD: 'NONE', AWAY: 'NONE', OFFLINE: 'SESSION_STOPPED', CALIBRATING: 'CALIBRATING', UNKNOWN: 'INSUFFICIENT_DATA', CAMERA_LOST: 'CAMERA_READ_FAILED' }
export interface DeviceObservation {
  version: 1; userId: string; deviceId: string; sessionId: string; sequence: number;
  state: ObservationState; reason: string; observedAt: string; receivedAt: string; expiresAt: string;
  config?: ConfigAcknowledgement;
}
export interface ObservedDevice { userId: string; deviceId: string; state: ObservationState; ts: string; alertType: null; note: string; config?: ConfigAcknowledgement; configFresh?: boolean }

export function validConfigAcknowledgement(value: unknown): value is ConfigAcknowledgement {
  if (!value || typeof value !== 'object') return false
  const v = value as ConfigAcknowledgement
  return Number.isSafeInteger(v.version) && v.version >= 0 && typeof v.revision === 'string' && /^[0-9a-f]{64}$/.test(v.revision)
    && (v.state === 'REJECTED' ? v.appliedAt === null : v.state === 'APPLIED' && typeof v.appliedAt === 'string' && Number.isFinite(Date.parse(v.appliedAt)))
}

export function configAcknowledgementText(device: ObservedDevice, snapshot?: { version: number; revision: string }) {
  if (!device.configFresh) return 'Chưa có xác nhận còn hiệu lực; kiểm tra kết nối desktop.'
  if (!device.config) return 'Desktop chưa gửi phiên bản cấu hình.'
  if (device.config.state === 'REJECTED') return `Desktop từ chối cấu hình v${device.config.version}; giữ cấu hình hợp lệ trước đó.`
  if (!snapshot) return `Desktop báo đã nạp v${device.config.version}; chưa đối chiếu được server.`
  return device.config.version === snapshot.version && device.config.revision === snapshot.revision
    ? `Đã nạp cấu hình hiện tại v${snapshot.version}.` : `Desktop đang dùng v${device.config.version}; chờ đồng bộ cấu hình hiện tại.`
}

export function validObservation(value: unknown): value is DeviceObservation {
  if (!value || typeof value !== 'object') return false
  const v = value as DeviceObservation
  const received = Date.parse(v.receivedAt), expires = Date.parse(v.expiresAt), observed = Date.parse(v.observedAt)
  return (v.config === undefined || validConfigAcknowledgement(v.config)) && v.version === 1 && typeof v.userId === 'string' && v.userId.length > 0 && typeof v.deviceId === 'string'
    && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v.deviceId) && typeof v.sessionId === 'string'
    && typeof v.state === 'string' && Object.hasOwn(OBSERVATION_LABEL, v.state) && v.reason === REASON[v.state]
    && Number.isSafeInteger(v.sequence) && v.sequence > 0 && Number.isFinite(received) && Number.isFinite(expires)
    && Number.isFinite(observed) && expires > received && expires - received <= 15_000 && Math.abs(received - observed) <= 10_000
}

export function newerObservation(next: DeviceObservation, old?: DeviceObservation) {
  return !old || (next.sessionId === old.sessionId ? next.sequence > old.sequence : Date.parse(next.observedAt) >= Date.parse(old.observedAt))
}

export function observedDevice(value: DeviceObservation, now: number, connected: boolean): ObservedDevice {
  const fresh = connected && now < Date.parse(value.expiresAt)
  return { userId: value.userId, deviceId: value.deviceId, state: fresh ? value.state : 'OFFLINE', ts: value.receivedAt, alertType: null,
    config: value.config, configFresh: fresh && value.state !== 'OFFLINE',
    note: !connected ? 'Mất kết nối cập nhật trực tiếp.' : !fresh ? 'Chưa nhận được quan sát mới; trạng thái cũ đã hết hạn.'
      : value.state === 'UNKNOWN' ? 'Chưa đủ mẫu nhận diện hợp lệ.' : value.state === 'CAMERA_LOST' ? 'Kiểm tra camera trên ứng dụng desktop.' : '' }
}

export function plumbState(state?: ObservationState): DeviceState | null {
  return state && ['GOOD', 'BAD', 'AWAY', 'OFFLINE'].includes(state) ? state as DeviceState : null
}
