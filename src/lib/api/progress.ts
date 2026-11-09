import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { request } from './client'
import type { Paged, AlertItem } from './alerts'
import { ApiError } from './errors'

export interface Goal { goalId: string; version: number; type: 'BAD_RATIO_MAX' | 'BREAK_COUNT_MIN'; target: number; minimumKnownSec: number | null; effectiveFrom: string; effectiveTo: string | null; status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' }
export interface BreakRecord { breakId: string; version: number; deviceId: string; state: string; startedAt?: string; endedAt?: string; occurredAt: string }
export interface Feedback { feedbackId: string; version: number; episodeRef: Pick<AlertItem, 'deviceId' | 'sessionId' | 'alertType' | 'startedAt'>; rating: string; reason: string; note: string | null; resolution: string }
export interface Marker { markerId: string; version: number; kind: string; note: string | null; occurredAt: string; deviceId: string }
export interface Summary { status: string; presenceSec: number | null; measuredKnownSec: number | null; measuredBadSec: number | null; overallBadRatio: number | null; legacyPresenceSec: number | null; legacyEstimatedBadSec: number | null; recognitionCoverage: number | null; completedBreaks: number | null }
export interface Report { summary: Summary; days: (Summary & { date: string })[]; goalProgress: { date: string; goalId: string; type: string; status: string; actual: number | null; target: number; reason: string | null }[] | null; warnings: string[]; dataAsOf: string }
export interface Comparison { before: Report; after: Report; delta: Record<string, { change: number | null; relativePercent: number | null; unit: string }>; warnings: string[] }
export function useProgressQuery<T>(key: string, url: string, params: Record<string, string | number | undefined>, enabled = true) {
  return useQuery({ queryKey: ['progress', key, params], queryFn: () => request<T>({ url, params }), enabled })
}

/** Preserve operationId after an uncertain write response, including auth refresh retries. */
export function useProgressWrite() {
  const previous = useRef<{ key: string; body: Record<string, unknown> } | null>(null)
  return async <T,>(url: string, payload: Record<string, unknown>, method: 'PUT' | 'POST' = 'PUT') => {
    const keyPayload = { ...payload }
    if (url === '/alerts/me/break-actions') delete keyPayload.occurredAt
    const key = JSON.stringify([method, url, keyPayload])
    if (previous.current?.key !== key) previous.current = { key, body: { ...payload, operationId: crypto.randomUUID() } }
    return request<T>({ url, method, data: previous.current.body })
  }
}
export type { Paged }

export function vnDate(offset = 0) {
  const now = new Date(Date.now() + offset * 86400000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export const dayStart = (date: string) => new Date(`${date}T00:00:00+07:00`).toISOString()
export const nextDate = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
export const numberText = (n: number | null | undefined, suffix = '') => n == null ? 'Chưa đủ dữ liệu' : `${n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}${suffix}`
export function progressError(error: unknown) {
  const messages: Record<string, string> = {
    RESOURCE_VERSION_CONFLICT: 'Dữ liệu đã thay đổi. Tải lại rồi chọn bản mới nhất trước khi sửa.',
    GOAL_PERIOD_CONFLICT: 'Khoảng hiệu lực trùng với một mục tiêu cùng loại.',
    BREAK_STATE_CONFLICT: 'Trạng thái nghỉ đã thay đổi hoặc thao tác sai thứ tự. Tải lại lịch sử nghỉ.',
    FEEDBACK_ALREADY_EXISTS: 'Cảnh báo này đã có phản hồi. Chọn phản hồi đó để chỉnh sửa.',
    OPERATION_CONFLICT: 'Thao tác gửi lại không khớp nội dung ban đầu. Tải lại dữ liệu trước khi thử lại.',
    VALIDATION_FAILED: 'Kiểm tra giá trị, ngày hiệu lực và khoảng thời gian đã nhập.',
    RESOURCE_NOT_FOUND: 'Không tìm thấy dữ liệu thuộc tài khoản của bạn.',
  }
  return error instanceof ApiError ? messages[error.code] ?? 'Chưa kết nối được với chức năng này. Vui lòng thử lại.' : 'Chưa hoàn tất thao tác. Kiểm tra dữ liệu hoặc thử lại kết nối.'
}
export function downloadReport(report: Report) {
  const columns = ['date', 'status', 'presenceSec', 'measuredKnownSec', 'measuredBadSec', 'overallBadRatio', 'legacyPresenceSec', 'legacyEstimatedBadSec', 'completedBreaks'] as const
  const csv = [columns.join(','), ...report.days.map((day) => columns.map((key) => `"${String(day[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'bao-cao-tu-the.csv'; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export const PROGRESS_LABEL: Record<string, string> = {
  ACTIVE: 'Đang áp dụng', PAUSED: 'Tạm dừng', ARCHIVED: 'Đã lưu trữ', ACHIEVED: 'Đạt', NOT_ACHIEVED: 'Chưa đạt', IN_PROGRESS: 'Đang diễn ra', NOT_EVALUABLE: 'Chưa đủ dữ liệu', NOT_APPLICABLE: 'Không áp dụng',
  COMPLETED: 'Đã nghỉ (tự xác nhận)', SNOOZED: 'Đã hoãn', SKIPPED: 'Đã bỏ qua', CANCELLED: 'Đã hủy', MATCHED: 'Đã khớp cảnh báo', PENDING_EPISODE: 'Chờ nhận cảnh báo', UNRESOLVED: 'Không tìm thấy cảnh báo',
  CORRECT: 'Phù hợp', NOT_APPROPRIATE: 'Chưa phù hợp', UNSURE: 'Chưa chắc', BAD_RATIO_MAX: 'Tỷ lệ ngồi sai tối đa', BREAK_COUNT_MIN: 'Số lần nghỉ tối thiểu',
  NONE: 'Không có', CAMERA_MOVED: 'Camera bị dịch chuyển', REACHING: 'Đang với lấy đồ', NO_PERSON: 'Không có người', OTHER: 'Khác', CHAIR: 'Ghế', MONITOR: 'Màn hình', BREAK_SCHEDULE: 'Lịch nghỉ',
  LEGACY_TIMING_MISSING: 'Dữ liệu cũ chỉ có ước tính thời gian ngồi sai.', SOURCE_UNAVAILABLE: 'Chưa lấy được mục tiêu hoặc lịch sử nghỉ.', OVERLAPPING_WINDOWS: 'Dữ liệu có các khoảng thời gian chồng nhau.', WINDOW_BOUNDARY_APPROXIMATION: 'Khoảng chọn cắt qua cửa sổ đo; số liệu được nhóm theo thời điểm bắt đầu.',
  MODEL_VERSION_CHANGED: 'Hai kỳ dùng phiên bản mô hình khác nhau.', MODEL_VERSION_UNKNOWN: 'Thiếu phiên bản mô hình.', CONFIG_VERSION_UNVERIFIED: 'Chưa xác minh cấu hình giữa hai kỳ.', OBSERVATIONAL_COMPARISON: 'Đây là thay đổi quan sát được, chưa chứng minh quan hệ nhân quả.',
}
