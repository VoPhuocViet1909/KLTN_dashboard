import { useState } from 'react'
import { useAuth } from '@/auth/context'
import { AlertBreakdown } from '@/components/charts/AlertBreakdown'
import { Fact } from '@/components/Fact'
import { NoOrgNotice } from '@/components/NoOrgNotice'
import { PagedTable } from '@/components/PagedTable'
import { StateBadge } from '@/components/StateBadge'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AlertItem } from '@/lib/api/alerts'
import { useOrgAlerts, useOrgSummary } from '@/lib/api/org'
import { sumAlerts } from '@/lib/api/stats'
import { displayUser, useUserDirectory } from '@/lib/api/users'
import { alertEndLabel, alertLabel } from '@/lib/labels'
import { formatDateTime, formatDuration } from '@/lib/time'
import { useRealtimeEvent } from '@/realtime/hooks'
import type { DeviceState, StatusEvent } from '@/realtime/socket'

const RANGES = [
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
]

const STATES: DeviceState[] = ['GOOD', 'BAD', 'AWAY', 'OFFLINE']

export function OrgOverviewPage() {
  const { user } = useAuth()
  if (!user?.orgId) return <NoOrgNotice title="Tổng quan tổ chức" />
  return <OrgOverview />
}

function OrgOverview() {
  const [days, setDays] = useState(7)
  const [page, setPage] = useState(0)
  const summary = useOrgSummary(days)
  const alerts = useOrgAlerts(days, page)
  // Tra tên: lỗi (vd. máy chủ chưa có /users) thì bảng rơi về mã rút gọn, không báo lỗi riêng.
  const directory = useUserDirectory()
  const nameOf = (userId: string) => displayUser(directory.data, userId)

  // ORG_ADMIN tự ở room org:{orgId}; giữ trạng thái mới nhất theo máy từ lúc mở trang.
  const [devices, setDevices] = useState<Record<string, StatusEvent>>({})
  useRealtimeEvent<StatusEvent>('status', (e) => setDevices((d) => ({ ...d, [`${e.userId}/${e.deviceId}`]: e })))
  const deviceList = Object.values(devices)
  const bad = deviceList.filter((d) => d.state === 'BAD').sort((a, b) => b.ts.localeCompare(a.ts))
  const countOf = (state: DeviceState) => deviceList.filter((d) => d.state === state).length

  const s = summary.data
  const badShare = s && s.presenceMinutes > 0 ? Math.round((s.badMinutes / s.presenceMinutes) * 100) : null
  const topAlert = s ? Object.entries(s.alerts).sort((a, b) => b[1] - a[1])[0] : undefined

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Tổng quan tổ chức</h1>
        <Tabs
          value={String(days)}
          onValueChange={(v) => {
            setDays(Number(v))
            setPage(0)
          }}
        >
          <TabsList aria-label="Khoảng thời gian">
            {RANGES.map((r) => (
              <TabsTrigger key={r.days} value={String(r.days)}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <section className="rounded-xl border bg-background p-6">
        {summary.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : summary.error ? (
          <p className="text-sm text-destructive">Không tải được số liệu: {summary.error.message}</p>
        ) : s ? (
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <h2 className="text-sm text-muted-foreground">Điểm tư thế trung bình cả tổ chức</h2>
              <p className="tabular mt-1 text-5xl font-semibold leading-none">
                {s.meanScore === null ? '—' : Math.round(s.meanScore)}
                <span className="ml-1 text-lg font-normal text-muted-foreground">/100</span>
              </p>
            </div>
            <dl className="grid flex-1 grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <Fact
                label="Thời gian ngồi sai"
                value={badShare === null ? '—' : `${badShare}%`}
                hint={`${Math.round(s.badMinutes)} / ${Math.round(s.presenceMinutes)} phút`}
              />
              <Fact
                label="Cảnh báo"
                value={String(sumAlerts(s.alerts))}
                hint={topAlert ? `nhiều nhất: ${alertLabel(topAlert[0])}` : undefined}
              />
              <Fact label="Thời gian có mặt" value={`${Math.round(s.presenceMinutes / 60)} giờ`} />
            </dl>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Ai đang ngồi sai lúc này</h2>
        <div className="rounded-xl border bg-background p-6">
          {deviceList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có máy nào đang gửi dữ liệu.</p>
          ) : (
            <div className="space-y-5">
              <ul className="flex flex-wrap gap-x-8 gap-y-3">
                {STATES.map((st) => (
                  <li key={st} className="flex items-center gap-2">
                    <StateBadge state={st} />
                    <span className="tabular text-sm text-muted-foreground">{countOf(st)} máy</span>
                  </li>
                ))}
              </ul>
              {bad.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không ai đang ngồi sai.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {bad.map((d) => (
                    <li key={`${d.userId}/${d.deviceId}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                      <span className="font-medium">{nameOf(d.userId)}</span>
                      <span>{alertLabel(d.alertType)}</span>
                      <span className="tabular text-xs text-muted-foreground">{formatDateTime(d.ts)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">Tính từ lúc bạn mở trang này.</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Cảnh báo theo loại</h2>
        <div className="rounded-xl border bg-background p-6">
          {s ? <AlertBreakdown alerts={s.alerts} /> : <Skeleton className="h-20 w-full" />}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Cảnh báo gần đây</h2>
        <PagedTable
          query={alerts}
          page={page}
          onPage={setPage}
          emptyText="Không có cảnh báo nào trong khoảng này."
          errorLabel="Không tải được cảnh báo"
          header={
            <TableRow>
              <TableHead>Thời điểm</TableHead>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead className="text-right">Thời lượng</TableHead>
              <TableHead>Kết thúc</TableHead>
            </TableRow>
          }
          row={(a: AlertItem) => (
            <TableRow key={`${a.userId}|${a.sessionId}|${a.deviceId}|${a.alertType}|${a.startedAt}`}>
              <TableCell className="tabular">{formatDateTime(a.startedAt)}</TableCell>
              <TableCell>{nameOf(a.userId)}</TableCell>
              <TableCell>{alertLabel(a.alertType)}</TableCell>
              <TableCell className="tabular text-right">{formatDuration(a.durationSec)}</TableCell>
              <TableCell>
                {a.open ? <Badge variant="secondary">Đang diễn ra</Badge> : alertEndLabel(a.endReason)}
              </TableCell>
            </TableRow>
          )}
        />
      </section>
    </div>
  )
}
