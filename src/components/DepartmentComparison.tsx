import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Department, OrgMember } from '@/lib/api/org'
import type { UserAccount } from '@/lib/api/users'
import { badSharePercent, groupByDepartment } from '@/lib/orgHealth'
import { formatMinutes } from '@/lib/time'

/**
 * So sánh phòng ban: ghép số liệu từng nhân viên với phòng ban hiện tại của họ. Điểm phòng ban là trung bình điểm
 * các nhân viên có trọng số theo thời gian có mặt; "—" nghĩa là chưa có số liệu, khác với 0.
 */
export function DepartmentComparison({
  members,
  directory,
  departments,
  pending,
  error,
}: {
  members: OrgMember[] | undefined
  directory: Record<string, UserAccount> | undefined
  departments: Department[] | undefined
  pending: boolean
  error?: string
}) {
  if (pending) return <Skeleton className="h-40 w-full" />
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Không tải được số liệu phòng ban: {error}
      </p>
    )
  }
  const rows = groupByDepartment(members ?? [], directory, departments ?? [])
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Chưa có phòng ban hoặc số liệu nhân viên nào.</p>
  }

  return (
    <div className="space-y-3">
      <Table className="[&_tr>*:first-child]:pl-0 [&_tr>*:last-child]:pr-0">
        <TableHeader>
          <TableRow>
            <TableHead>Phòng ban</TableHead>
            <TableHead className="text-right">Nhân viên có số liệu</TableHead>
            <TableHead className="text-right">Điểm trung bình</TableHead>
            <TableHead className="text-right">Ngồi sai</TableHead>
            <TableHead className="text-right">Cảnh báo</TableHead>
            <TableHead className="text-right">Có mặt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const share = badSharePercent(r.badMinutes, r.presenceMinutes)
            const empty = r.employees === 0
            return (
              <TableRow key={r.key} className={empty ? 'text-muted-foreground' : undefined}>
                <TableCell className="whitespace-normal font-medium [overflow-wrap:anywhere]">
                  {r.name}
                  {r.inactive && (
                    <Badge variant="outline" className="ml-2 align-middle">
                      Ngừng dùng
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="tabular text-right">{r.employees}</TableCell>
                <TableCell className="tabular text-right">{r.meanScore === null ? '—' : Math.round(r.meanScore)}</TableCell>
                <TableCell className="tabular text-right">{share === null ? '—' : `${Math.round(share)}%`}</TableCell>
                <TableCell className="tabular text-right">{empty ? '—' : r.alerts}</TableCell>
                <TableCell className="tabular text-right">{empty ? '—' : formatMinutes(r.presenceMinutes)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">
        Tính theo phòng ban hiện tại của từng nhân viên: người đã chuyển phòng ban thì số liệu cũ của họ cũng chuyển
        theo. Phòng ban thấp điểm nhất xếp trước.
      </p>
    </div>
  )
}
