import { CircleCheck, CircleOff, Moon, TriangleAlert, type LucideIcon } from 'lucide-react'
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
