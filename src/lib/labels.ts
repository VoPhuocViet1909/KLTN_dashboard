import { CircleCheck, CircleOff, Moon, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { Role } from '@/lib/api/types'
import type { DeviceState } from '@/realtime/socket'

/** Tên hiển thị của loại cảnh báo (alertType từ App). Loại lạ thì hiện nguyên mã. */
export const ALERT_LABEL: Record<string, string> = {
  NECK_TRUNK: 'Cúi cổ, gù lưng',
  SHOULDER_TILT: 'Lệch vai',
  TOO_CLOSE: 'Ngồi quá gần màn hình',
  SIT_TOO_LONG: 'Ngồi quá lâu',
  EYE_BREAK: 'Nghỉ mắt',
}

export const alertLabel = (type: string | null | undefined) =>
  type ? (ALERT_LABEL[type] ?? type) : '—'

/** Mức độ cảnh báo. Không dùng màu trạng thái cho mức: chỉ chữ trong Badge outline. */
export const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Vừa',
  HIGH: 'Cao',
}

export const severityLabel = (s: string | null | undefined) => (s ? (SEVERITY_LABEL[s] ?? s) : '—')

/** Lý do một lần cảnh báo kết thúc (`endReason` của cảnh báo). */
export const ALERT_END_LABEL: Record<string, string> = {
  CORRECTED: 'Đã ngồi lại đúng',
  SESSION_END: 'Phiên kết thúc',
  SESSION_TIMEOUT: 'Phiên tự đóng',
}

export const alertEndLabel = (r: string | null | undefined) => (r ? (ALERT_END_LABEL[r] ?? r) : '—')

/** Lý do một phiên làm việc kết thúc (`endReason` của phiên). */
export const SESSION_END_LABEL: Record<string, string> = {
  SESSION_END: 'Tắt ứng dụng',
  TIMEOUT: 'Tự đóng sau 3 phút không có dữ liệu',
}

export const sessionEndLabel = (r: string | null | undefined) => (r ? (SESSION_END_LABEL[r] ?? r) : '—')

/**
 * Trạng thái thiết bị. Màu KHÔNG được đứng một mình: luôn đi cùng icon + label
 * (đỏ/lục khó phân biệt với người mù màu).
 */
export const STATE_META: Record<DeviceState, { label: string; icon: LucideIcon; colorVar: string }> = {
  GOOD: { label: 'Ngồi đúng', icon: CircleCheck, colorVar: 'var(--status-good)' },
  BAD: { label: 'Đang ngồi sai', icon: TriangleAlert, colorVar: 'var(--status-bad)' },
  AWAY: { label: 'Vắng mặt', icon: Moon, colorVar: 'var(--status-away)' },
  OFFLINE: { label: 'Không kết nối', icon: CircleOff, colorVar: 'var(--status-offline)' },
}

export const ROLE_LABEL: Record<Role, string> = {
  USER: 'Nhân viên',
  ORG_ADMIN: 'Quản lý tổ chức',
  SYS_ADMIN: 'Quản trị hệ thống',
}

export const roleLabel = (r: string | null | undefined) => (r ? (ROLE_LABEL[r as Role] ?? r) : '—')

/** Vai trò mà ORG_ADMIN được gán (không gán được SYS_ADMIN). */
export const ORG_ASSIGNABLE_ROLES: Role[] = ['USER', 'ORG_ADMIN']
