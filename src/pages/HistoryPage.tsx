import { useSearchParams } from 'react-router'
import { PagedTable } from '@/components/PagedTable'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMyAlerts, useMySessions, type AlertItem, type SessionItem } from '@/lib/api/alerts'
import { ALERT_LABEL, alertEndLabel, alertLabel, severityLabel, sessionEndLabel } from '@/lib/labels'
import { formatDateTime, formatDuration } from '@/lib/time'

const TABS = ['alerts', 'sessions'] as const
type TabKey = (typeof TABS)[number]

const RANGES = [7, 30, 90]
const ALL = 'ALL'

export function HistoryPage() {
  const [params, setParams] = useSearchParams()

  // Bộ lọc nằm trong URL để tải lại trang không mất. Giá trị lạ trong URL rơi về mặc định.
  const rawTab = params.get('tab')
  const tab: TabKey = TABS.find((t) => t === rawTab) ?? 'alerts'
  const rawDays = Number(params.get('days'))
  const days = RANGES.includes(rawDays) ? rawDays : 7
  const rawType = params.get('type')
  const alertType = rawType && rawType in ALERT_LABEL ? rawType : undefined
  const rawPage = Math.floor(Number(params.get('page')))
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage - 1 : 0

  /** Cập nhật URL; giá trị mặc định thì bỏ khỏi query cho gọn. */
  function update(patch: { tab?: TabKey; days?: number; type?: string | undefined; page?: number }, resetPage = true) {
    const next = new URLSearchParams(params)
    const set = (key: string, value: string | undefined, fallback: string | undefined) => {
      if (value === undefined || value === fallback) next.delete(key)
      else next.set(key, value)
    }
    if ('tab' in patch) set('tab', patch.tab, 'alerts')
    if ('days' in patch) set('days', patch.days === undefined ? undefined : String(patch.days), '7')
    if ('type' in patch) set('type', patch.type, undefined)
    if ('page' in patch) set('page', patch.page === undefined ? undefined : String(patch.page + 1), '1')
    else if (resetPage) next.delete('page')
    setParams(next)
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Lịch sử cảnh báo</h1>
        <div className="flex flex-wrap items-center gap-3">
          {tab === 'alerts' && (
            <Select value={alertType ?? ALL} onValueChange={(v) => update({ type: v === ALL ? undefined : v })}>
              <SelectTrigger aria-label="Loại cảnh báo" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả loại</SelectItem>
                {Object.entries(ALERT_LABEL).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Tabs value={String(days)} onValueChange={(v) => update({ days: Number(v) })}>
            <TabsList aria-label="Khoảng thời gian">
              {RANGES.map((d) => (
                <TabsTrigger key={d} value={String(d)}>
                  {d} ngày
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="space-y-4">
        <Tabs value={tab} onValueChange={(v) => update({ tab: v as TabKey })}>
          <TabsList variant="line" aria-label="Loại lịch sử">
            <TabsTrigger value="alerts">Các lần cảnh báo</TabsTrigger>
            <TabsTrigger value="sessions">Phiên làm việc</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'alerts' ? (
          <AlertsPanel days={days} alertType={alertType} page={page} onPage={(p) => update({ page: p }, false)} />
        ) : (
          <SessionsPanel days={days} page={page} onPage={(p) => update({ page: p }, false)} />
        )}
      </div>
    </div>
  )
}

// ---------- Các lần cảnh báo ----------

function AlertsPanel({
  days,
  alertType,
  page,
  onPage,
}: {
  days: number
  alertType: string | undefined
  page: number
  onPage: (page: number) => void
}) {
  const q = useMyAlerts(days, alertType, page)
  return (
    <PagedTable
      query={q}
      page={page}
      onPage={onPage}
      emptyText="Không có cảnh báo nào trong khoảng này."
      errorLabel="Không tải được lịch sử"
      header={
        <TableRow>
          <TableHead>Bắt đầu</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Mức</TableHead>
          <TableHead className="text-right">Thời lượng</TableHead>
          <TableHead className="text-right">Nhắc lại</TableHead>
          <TableHead>Kết thúc</TableHead>
        </TableRow>
      }
      row={(a: AlertItem) => (
        <TableRow key={`${a.sessionId}|${a.deviceId}|${a.alertType}|${a.startedAt}`}>
          <TableCell className="tabular">{formatDateTime(a.startedAt)}</TableCell>
          <TableCell>{alertLabel(a.alertType)}</TableCell>
          <TableCell>
            <Badge variant="outline">{severityLabel(a.severity)}</Badge>
          </TableCell>
          <TableCell className="tabular text-right">{formatDuration(a.durationSec)}</TableCell>
          <TableCell className="tabular text-right">{a.repeatCount}</TableCell>
          <TableCell>{a.open ? <Badge variant="secondary">Đang diễn ra</Badge> : alertEndLabel(a.endReason)}</TableCell>
        </TableRow>
      )}
    />
  )
}

// ---------- Phiên làm việc ----------

/** Thời lượng phiên: từ lúc bắt đầu tới lúc kết thúc, hoặc tới lần cuối thấy dữ liệu nếu còn mở. */
function sessionSeconds(s: SessionItem) {
  const end = s.endedAt ?? s.lastSeenAt
  if (!s.startedAt || !end) return null
  return (new Date(end).getTime() - new Date(s.startedAt).getTime()) / 1000
}

function SessionsPanel({ days, page, onPage }: { days: number; page: number; onPage: (page: number) => void }) {
  const q = useMySessions(days, page)
  return (
    <PagedTable
      query={q}
      page={page}
      onPage={onPage}
      emptyText="Không có phiên làm việc nào trong khoảng này."
      errorLabel="Không tải được lịch sử"
      header={
        <TableRow>
          <TableHead>Thiết bị</TableHead>
          <TableHead>Bắt đầu</TableHead>
          <TableHead>Kết thúc</TableHead>
          <TableHead className="text-right">Thời lượng</TableHead>
          <TableHead className="w-20 text-right whitespace-normal">Số cảnh báo</TableHead>
          <TableHead>Lý do</TableHead>
        </TableRow>
      }
      row={(s: SessionItem) => (
        <TableRow key={`${s.sessionId}|${s.deviceId}`}>
          <TableCell className="tabular">{s.deviceId}</TableCell>
          <TableCell className="tabular">{formatDateTime(s.startedAt)}</TableCell>
          <TableCell className="tabular">{s.open ? '—' : formatDateTime(s.endedAt)}</TableCell>
          <TableCell className="tabular text-right">{formatDuration(sessionSeconds(s))}</TableCell>
          <TableCell className="tabular text-right">{s.alertCount}</TableCell>
          <TableCell className="min-w-32 whitespace-normal">
            {s.open ? <Badge variant="secondary">Đang mở</Badge> : sessionEndLabel(s.endReason)}
          </TableCell>
        </TableRow>
      )}
    />
  )
}
