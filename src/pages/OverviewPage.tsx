import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { request } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import { formatDateTime, lastDays } from '@/lib/time'
import { useRealtimeEvent } from '@/realtime/hooks'
import type { StatusEvent } from '@/realtime/socket'

interface Summary {
  meanScore: number | null
  badMinutes: number
  presenceMinutes: number
  /** số lần cảnh báo theo loại, ví dụ {FORWARD_HEAD: 3} */
  alerts: Record<string, number>
}

// Trang mẫu: chứng minh đường đi API + realtime chạy được. Giao diện thật làm ở giai đoạn 2.
export function OverviewPage() {
  const summary = useQuery({
    queryKey: ['stats', 'me', 'summary', 7],
    queryFn: () => request<Summary>({ url: '/stats/me/summary', params: lastDays(7) }),
  })

  const [devices, setDevices] = useState<Record<string, StatusEvent>>({})
  useRealtimeEvent<StatusEvent>('status', (e) => setDevices((d) => ({ ...d, [e.deviceId]: e })))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tổng quan 7 ngày</h1>

      {summary.isPending && <p className="text-sm text-gray-500">Đang tải…</p>}
      {summary.error && (
        <p className="text-sm text-red-600">
          {summary.error.message}
          {summary.error instanceof ApiError && ` (${summary.error.code})`}
        </p>
      )}
      {summary.data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Điểm tư thế TB" value={summary.data.meanScore?.toFixed(0) ?? '—'} />
          <Stat label="Phút ngồi sai" value={summary.data.badMinutes.toFixed(0)} />
          <Stat label="Phút có mặt" value={summary.data.presenceMinutes.toFixed(0)} />
          <Stat label="Số cảnh báo" value={String(Object.values(summary.data.alerts).reduce((a, b) => a + b, 0))} />
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-medium">Thiết bị đang chạy (realtime)</h2>
        {Object.values(devices).length === 0 ? (
          <p className="text-sm text-gray-500">Chưa nhận sự kiện `status` nào.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {Object.values(devices).map((d) => (
              <li key={d.deviceId}>
                {d.deviceId}: <b>{d.state}</b>
                {d.alertType && ` (${d.alertType})`} · {formatDateTime(d.ts)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
