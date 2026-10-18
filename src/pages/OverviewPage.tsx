import { useState } from 'react'
import { AlertBreakdown } from '@/components/charts/AlertBreakdown'
import { ScoreTrend } from '@/components/charts/ScoreTrend'
import { Fact } from '@/components/Fact'
import { PlumbLine } from '@/components/PlumbLine'
import { StateBadge } from '@/components/StateBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sumAlerts, useMySummary, useMyTimeseries } from '@/lib/api/stats'
import { alertLabel } from '@/lib/labels'
import { formatDateTime } from '@/lib/time'
import { useRealtimeEvent } from '@/realtime/hooks'
import type { StatusEvent } from '@/realtime/socket'

const RANGES = [
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
]

export function OverviewPage() {
  const [days, setDays] = useState(7)
  const summary = useMySummary(days)
  const series = useMyTimeseries(days, 'day')

  const [devices, setDevices] = useState<Record<string, StatusEvent>>({})
  useRealtimeEvent<StatusEvent>('status', (e) => setDevices((d) => ({ ...d, [e.deviceId]: e })))
  const deviceList = Object.values(devices).sort((a, b) => b.ts.localeCompare(a.ts))
  const current = deviceList[0] ?? null

  const s = summary.data
  const badShare = s && s.presenceMinutes > 0 ? Math.round((s.badMinutes / s.presenceMinutes) * 100) : null
  const topAlert = s ? Object.entries(s.alerts).sort((a, b) => b[1] - a[1])[0] : undefined

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold">Tổng quan</h1>
          <p className="text-sm text-muted-foreground">Tư thế hiện tại và thói quen ngồi của bạn.</p>
        </div>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <TabsList aria-label="Khoảng thời gian">
            {RANGES.map((r) => (
              <TabsTrigger key={r.days} value={String(r.days)}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Hàng đầu: tư thế lúc này (điểm nhấn) + kết quả của khoảng đã chọn */}
      <section className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-[18rem_1fr]">
        <div className="flex items-center gap-5 bg-background p-6">
          <PlumbLine state={current?.state ?? null} />
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-sm text-muted-foreground">Tư thế lúc này</h2>
            {current ? (
              <>
                <StateBadge state={current.state} />
                {current.alertType && <p className="text-sm">{alertLabel(current.alertType)}</p>}
                <p className="text-xs text-muted-foreground">Cập nhật {formatDateTime(current.ts)}</p>
                {deviceList.length > 1 && (
                  <p className="text-xs text-muted-foreground">{deviceList.length} máy đang gửi dữ liệu</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Mở ứng dụng desktop, đăng nhập cùng tài khoản và hiệu chỉnh camera để xem tư thế tại đây.</p>
            )}
          </div>
        </div>

        <div className="bg-background p-6">
          {summary.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : summary.error ? (
            <p className="text-sm text-destructive">Không tải được số liệu: {summary.error.message}</p>
          ) : s ? (
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:gap-10">
              <div>
                <h2 className="text-sm text-muted-foreground">Điểm tư thế trung bình</h2>
                <p className="tabular mt-1 text-5xl font-semibold leading-none">
                  {s.meanScore === null ? '—' : Math.round(s.meanScore)}
                  <span className="ml-1 text-lg font-normal text-muted-foreground">/100</span>
                </p>
              </div>
              <dl className="grid flex-1 grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <Fact label="Thời gian ngồi sai" value={badShare === null ? '—' : `${badShare}%`} hint={`${Math.round(s.badMinutes)} / ${Math.round(s.presenceMinutes)} phút`} />
                <Fact label="Cảnh báo" value={String(sumAlerts(s.alerts))} hint={topAlert ? `nhiều nhất: ${alertLabel(topAlert[0])}` : undefined} />
                <Fact label="Thời gian có mặt" value={`${Math.round(s.presenceMinutes / 60)} giờ`} />
              </dl>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Điểm tư thế theo ngày</h2>
        <div className="rounded-xl border bg-background p-4">
          {series.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : series.error ? (
            <p className="text-sm text-destructive">Không tải được biểu đồ: {series.error.message}</p>
          ) : series.data && series.data.length > 0 ? (
            <ScoreTrend data={series.data} days={days} />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Chưa có dữ liệu trong khoảng này.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Cảnh báo theo loại</h2>
        <div className="rounded-xl border bg-background p-6">
          {s ? <AlertBreakdown alerts={s.alerts} /> : <Skeleton className="h-20 w-full" />}
        </div>
      </section>
    </div>
  )
}
