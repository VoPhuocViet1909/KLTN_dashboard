import { isAxiosError } from 'axios'
import type { ApiErrorBody } from './types'

/** Lỗi đã chuẩn hóa. Rẽ nhánh theo `code`, không theo `message`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly traceId: string | null
  /** Lỗi theo trường (VALIDATION_FAILED): field -> message, để gắn vào đúng ô nhập */
  readonly fieldErrors: Record<string, string>

  constructor(status: number, body: Partial<ApiErrorBody>) {
    super(body.message || 'Đã có lỗi xảy ra')
    this.name = 'ApiError'
    this.status = status
    this.code = body.code || (status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR')
    this.traceId = body.traceId ?? null
    this.fieldErrors = Object.fromEntries((body.errors ?? []).map((e) => [e.field, e.message]))
  }
}

/** Đổi mọi lỗi (axios, mạng, code) thành ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (isAxiosError(err)) {
    if (!err.response) {
      return new ApiError(0, { message: 'Không kết nối được máy chủ' })
    }
    const data = err.response.data as Partial<ApiErrorBody> | undefined
    // mock_server.py cũ trả {error}; vẫn đọc được
    const legacy = (err.response.data as { error?: string } | undefined)?.error
    return new ApiError(err.response.status, {
      ...(typeof data === 'object' ? data : {}),
      message: data?.message || legacy || err.message,
    })
  }
  return new ApiError(-1, { message: err instanceof Error ? err.message : String(err) })
}
