export const DELIVERY_LABEL = {
  NO_SERVER: 'Chưa cấu hình gửi dữ liệu', NOT_SENT: 'Chưa có lần gửi thành công', OK: 'Đã nhận xác nhận gửi',
  RETRYING: 'Đang chờ thử gửi lại', AUTH_REQUIRED: 'Cần đăng nhập lại', SOURCE_MISMATCH: 'Hàng đợi khác tài khoản hoặc máy chủ',
} as const
export const FAILURE_HINT = {
  HTTP_CLIENT: 'Máy chủ từ chối yêu cầu gửi. Kiểm tra phiên đăng nhập và bản ứng dụng desktop.',
  HTTP_SERVER: 'Máy chủ tạm thời chưa nhận được lô dữ liệu. Desktop giữ hàng đợi để gửi lại.',
  THROTTLED: 'Máy chủ đang giới hạn số yêu cầu. Desktop sẽ thử lại sau.',
  AUTH_REQUIRED: 'Kiểm tra đăng nhập trên desktop. Không chuyển dữ liệu của tài khoản cũ sang tài khoản khác.',
  SOURCE_MISMATCH: 'Mở đúng tài khoản và máy chủ của hàng đợi trên desktop; không xóa dữ liệu để xử lý lỗi.',
  NETWORK_OR_RESPONSE: 'Chưa gửi được dữ liệu hoặc phản hồi chưa đầy đủ. Kiểm tra kết nối và ứng dụng desktop.',
} as const
export interface DeviceDiagnostics {
  version: 1; deliveryState: keyof typeof DELIVERY_LABEL
  queued: number; pending: number; retrying: number; dead: number; acceptedSinceStart: number
  lastAttemptAt: string | null; lastAcceptedAt: string | null; oldestPendingAt: string | null
  lastAttemptMs: number | null; configFetchApplyMs: number | null; lastFailureCode: keyof typeof FAILURE_HINT | null
}
const counts = ['queued', 'pending', 'retrying', 'dead', 'acceptedSinceStart'] as const
const timestamps = ['lastAttemptAt', 'lastAcceptedAt', 'oldestPendingAt'] as const
const durations = ['lastAttemptMs', 'configFetchApplyMs'] as const
const fields = new Set(['version', 'deliveryState', 'lastFailureCode', ...counts, ...timestamps, ...durations])

export function validDiagnostics(value: unknown, receivedAt: number): value is DeviceDiagnostics {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as DeviceDiagnostics
  return Number.isFinite(receivedAt) && Object.keys(v).length === fields.size && Object.keys(v).every(k => fields.has(k)) && v.version === 1 &&
    typeof v.deliveryState === 'string' && Object.hasOwn(DELIVERY_LABEL, v.deliveryState) &&
    counts.every(k => Number.isSafeInteger(v[k]) && v[k] >= 0) && v.retrying <= v.pending &&
    timestamps.every(k => v[k] === null || typeof v[k] === 'string' && Number.isFinite(Date.parse(v[k])) && Date.parse(v[k]) >= 0 && Date.parse(v[k]) <= receivedAt + 10_000) &&
    durations.every(k => v[k] === null || Number.isInteger(v[k]) && v[k] >= 0 && v[k] <= 300_000) &&
    (v.lastFailureCode === null || typeof v.lastFailureCode === 'string' && Object.hasOwn(FAILURE_HINT, v.lastFailureCode))
}
