import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '@/auth/context'
import { AlertBreakdown } from '@/components/charts/AlertBreakdown'
import { Fact } from '@/components/Fact'
import { DepartmentHistoryPanel } from '@/components/DepartmentHistoryPanel'
import { NoOrgNotice } from '@/components/NoOrgNotice'
import { PagedTable } from '@/components/PagedTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AlertItem } from '@/lib/api/alerts'
import { useDepartments, useOrgAlerts, useOrgMembers, type Department, type OrgMember } from '@/lib/api/org'
import { sumAlerts } from '@/lib/api/stats'
import { displayUser, useUserDirectory, type UserAccount } from '@/lib/api/users'
import { downloadCsv } from '@/lib/csv'
import { alertEndLabel, alertLabel } from '@/lib/labels'
import { badSharePercent, NO_DEPARTMENT, NO_DEPARTMENT_LABEL } from '@/lib/orgHealth'
import { formatDateTime, formatDuration, formatMinutes, lastDays, vnDate } from '@/lib/time'

const RANGES = [
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
]

const ALL = 'ALL'

type SortKey = 'name' | 'department' | 'score' | 'bad' | 'alerts' | 'presence'
type SortDir = 'asc' | 'desc'

interface Row {
  member: OrgMember
  name: string
  email: string | null
  departmentId: string | null
  departmentName: string
  badPercent: number | null
  alertCount: number
}

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Nhân viên' },
  { key: 'department', label: 'Phòng ban' },
  { key: 'score', label: 'Điểm trung bình', numeric: true },
  { key: 'bad', label: 'Ngồi sai', numeric: true },
  { key: 'alerts', label: 'Cảnh báo', numeric: true },
  { key: 'presence', label: 'Có mặt', numeric: true },
]

/** Hướng sắp xếp mặc định khi bấm một cột lần đầu: chữ tăng dần, số giảm dần (người đáng chú ý trước). */
const firstDir = (key: SortKey): SortDir => (key === 'name' || key === 'department' ? 'asc' : 'desc')

function sortValue(r: Row, key: SortKey): string | number | null {
  switch (key) {
    case 'name':
      return r.name
    case 'department':
      return r.departmentName
    case 'score':
      return r.member.meanScore
    case 'bad':
      return r.badPercent
    case 'alerts':
      return r.alertCount
    case 'presence':
      return r.member.presenceMinutes
  }
}

function compare(a: Row, b: Row, key: SortKey, dir: SortDir) {
  const x = sortValue(a, key)
  const y = sortValue(b, key)
  // Chưa đo (null) luôn xếp cuối, bất kể chiều sắp xếp.
  if (x === null || y === null) return Number(x === null) - Number(y === null)
  const c = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y, 'vi') : Number(x) - Number(y)
  return dir === 'asc' ? c : -c
}

export function OrgMembersPage() {
  const { user } = useAuth()
  if (!user?.orgId) return <NoOrgNotice title="Sức khỏe nhân viên" />
  return <OrgMembers orgId={user.orgId} />
}

function OrgMembers({ orgId }: { orgId: string }) {
  const [days, setDays] = useState(7)
  const [department, setDepartment] = useState(ALL)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'bad', dir: 'desc' })
  const [selected, setSelected] = useState<string | null>(null)

  const members = useOrgMembers(days)
  const directory = useUserDirectory()
  const departments = useDepartments(orgId)

  const departmentNames = useMemo(() => new Map((departments.data ?? []).map((d) => [d.id, d.name])), [departments.data])

  const rows = useMemo<Row[]>(
    () =>
      (members.data ?? []).map((m) => {
        const account: UserAccount | undefined = directory.data?.[m.userId]
        const departmentId = account?.departmentId ?? null
        return {
          member: m,
          name: displayUser(directory.data, m.userId),
          email: account?.email ?? null,
          departmentId,
          departmentName: departmentId ? (departmentNames.get(departmentId) ?? 'Phòng ban không rõ') : NO_DEPARTMENT_LABEL,
          badPercent: badSharePercent(m.badMinutes, m.presenceMinutes),
          alertCount: sumAlerts(m.alerts),
        }
      }),
    [members.data, directory.data, departmentNames],
  )

  const shown = useMemo(() => {
    const filtered = rows.filter((r) =>
      department === ALL ? true : department === NO_DEPARTMENT ? r.departmentId === null : r.departmentId === department,
    )
    return [...filtered].sort((a, b) => compare(a, b, sort.key, sort.dir))
  }, [rows, department, sort])

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: firstDir(key) }))
  }

  function exportCsv() {
    const range = lastDays(days)
    const from = vnDate(new Date(range.from))
    const to = vnDate(new Date(range.to))
    downloadCsv(`suc-khoe-nhan-vien_${from}_${to}.csv`, [
      ['Nhân viên', 'Email', 'Phòng ban', 'Điểm tư thế trung bình', '% thời gian ngồi sai', 'Phút ngồi sai', 'Phút có mặt', 'Số cảnh báo'],
      ...shown.map((r) => [
        r.name,
        r.email,
        r.departmentName,
        r.member.meanScore === null ? null : Math.round(r.member.meanScore),
        r.badPercent === null ? null : Math.round(r.badPercent),
        Math.round(r.member.badMinutes),
        Math.round(r.member.presenceMinutes),
        r.alertCount,
      ]),
    ])
  }

  const selectedRow = rows.find((r) => r.member.userId === selected) ?? null
  const filterOptions: Department[] = [...(departments.data ?? [])].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'vi'),
  )

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Sức khỏe nhân viên</h1>
          <p className="text-sm text-muted-foreground">Tư thế ngồi của từng nhân viên trong khoảng đã chọn.</p>
        </div>
        <Tabs
          value={String(days)}
          onValueChange={(v) => {
            setDays(Number(v))
            setSelected(null)
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="department-filter" className="text-sm text-muted-foreground">
            Phòng ban
          </label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger id="department-filter" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả phòng ban</SelectItem>
              <SelectItem value={NO_DEPARTMENT}>{NO_DEPARTMENT_LABEL}</SelectItem>
              {filterOptions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                  {d.active ? '' : ' (ngừng dùng)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={shown.length === 0}
          title="Xuất các dòng đang hiển thị (theo bộ lọc và thứ tự hiện tại)"
        >
          <Download className="size-4" aria-hidden />
          Xuất CSV
        </Button>
      </div>

      <section className="rounded-xl border bg-background">
        {members.isPending ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : members.error ? (
          <p role="alert" className="p-6 text-sm text-destructive">
            Không tải được số liệu nhân viên: {members.error.message}
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 py-10 text-center text-sm text-muted-foreground">
            Chưa có nhân viên nào có số liệu trong {days} ngày qua. Số liệu xuất hiện khi nhân viên mở ứng dụng desktop
            và đăng nhập.
          </p>
        ) : shown.length === 0 ? (
          <p className="p-6 py-10 text-center text-sm text-muted-foreground">
            Không có nhân viên nào của phòng ban này có số liệu trong {days} ngày qua.
          </p>
        ) : (
          <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
            <TableHeader>
              <TableRow>
                {COLUMNS.map((c) => {
                  const active = sort.key === c.key
                  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
                  return (
                    <TableHead
                      key={c.key}
                      className={c.numeric ? 'text-right' : undefined}
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={`inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'text-foreground' : ''}`}
                      >
                        {c.label}
                        <Icon className="size-3.5" aria-hidden />
                      </button>
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.member.userId}>
                  <TableCell className="whitespace-normal [overflow-wrap:anywhere]">
                    <button
                      type="button"
                      onClick={() => setSelected(r.member.userId)}
                      className="cursor-pointer rounded-md text-left font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Xem chi tiết ${r.name}`}
                    >
                      {r.name}
                    </button>
                  </TableCell>
                  <TableCell className={`whitespace-normal ${r.departmentId ? '' : 'text-muted-foreground'}`}>
                    {r.departmentName}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {r.member.meanScore === null ? '—' : Math.round(r.member.meanScore)}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {r.badPercent === null ? '—' : `${Math.round(r.badPercent)}%`}
                  </TableCell>
                  <TableCell className="tabular text-right">{r.alertCount}</TableCell>
                  <TableCell className="tabular text-right">{formatMinutes(r.member.presenceMinutes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {shown.length > 0 && (
          <p className="tabular border-t px-4 py-3 text-sm text-muted-foreground" aria-live="polite">
            {shown.length} nhân viên có số liệu
          </p>
        )}
      </section>

      {directory.error && (
        <p role="alert" className="text-sm text-destructive">
          Không tra được tên và phòng ban nhân viên ({directory.error.message}); bảng đang hiện mã rút gọn.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Quyền riêng tư: hệ thống chỉ lưu số liệu tư thế (điểm, thời gian ngồi sai, cảnh báo), không lưu hình ảnh hay
        video từ camera. Phòng ban tính theo phòng ban hiện tại của từng nhân viên.
      </p>

      <MemberDetail
        row={selectedRow}
        days={days}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

function MemberDetail({ row, days, onClose }: { row: Row | null; days: number; onClose: () => void }) {
  return (
    <Dialog open={row !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {row && <MemberDetailBody row={row} days={days} />}
      </DialogContent>
    </Dialog>
  )
}

function MemberDetailBody({ row, days }: { row: Row; days: number }) {
  const { user } = useAuth()
  const departments = useDepartments(user?.orgId ?? '')
  const [page, setPage] = useState(0)
  const alerts = useOrgAlerts(days, page, true, row.member.userId)
  const m = row.member

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>{row.name}</DialogTitle>
        <DialogDescription>
          {row.email ? `${row.email} · ` : ''}
          {row.departmentName} · {days} ngày qua
        </DialogDescription>
      </DialogHeader>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Fact label="Điểm trung bình" value={m.meanScore === null ? '—' : String(Math.round(m.meanScore))} hint="trên thang 100" />
        <Fact
          label="Thời gian ngồi sai"
          value={row.badPercent === null ? '—' : `${Math.round(row.badPercent)}%`}
          hint={`${Math.round(m.badMinutes)} / ${Math.round(m.presenceMinutes)} phút`}
        />
        <Fact label="Cảnh báo" value={String(row.alertCount)} />
        <Fact label="Thời gian có mặt" value={formatMinutes(m.presenceMinutes)} />
      </dl>

      <DepartmentHistoryPanel key={m.userId} userId={m.userId} departments={departments.data} />

      <section className="space-y-3">
        <h3 className="font-medium">Cảnh báo theo loại</h3>
        <AlertBreakdown alerts={m.alerts} />
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">Cảnh báo của nhân viên này</h3>
        <PagedTable
          query={alerts}
          page={page}
          onPage={setPage}
          emptyText="Không có cảnh báo nào trong khoảng này."
          errorLabel="Không tải được cảnh báo"
          header={
            <TableRow>
              <TableHead>Thời điểm</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead className="text-right">Thời lượng</TableHead>
              <TableHead>Kết thúc</TableHead>
            </TableRow>
          }
          row={(a: AlertItem) => (
            <TableRow key={`${a.sessionId}|${a.deviceId}|${a.alertType}|${a.startedAt}`}>
              <TableCell className="tabular">{formatDateTime(a.startedAt)}</TableCell>
              <TableCell>{alertLabel(a.alertType)}</TableCell>
              <TableCell className="tabular text-right">{formatDuration(a.durationSec)}</TableCell>
              <TableCell>{a.open ? <Badge variant="secondary">Đang diễn ra</Badge> : alertEndLabel(a.endReason)}</TableCell>
            </TableRow>
          )}
        />
      </section>
    </div>
  )
}
