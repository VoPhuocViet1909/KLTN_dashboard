import { useState } from 'react'
import { PagedTable } from './PagedTable'
import { Button } from './ui/button'
import { TableCell, TableHead, TableRow } from './ui/table'
import { useDepartmentHistory } from '@/lib/api/departmentHistory'
import type { Department } from '@/lib/api/org'
import { formatDateTime } from '@/lib/time'

export function DepartmentHistoryPanel({ userId, departments }: { userId: string; departments?: Department[] }) {
  const [page, setPage] = useState(0)
  const query = useDepartmentHistory(userId, page)
  const names = new Map(departments?.map(d => [d.id, d.name]))
  return <section className="space-y-3" aria-label="Lịch sử phòng ban">
    <h3 className="font-medium">Lịch sử phòng ban</h3>
    <p className="text-xs text-muted-foreground">Chỉ ghi từ lúc hệ thống bắt đầu lưu lịch sử. Trước khoảng đầu tiên là chưa có lịch sử; không suy từ phòng ban hiện tại. Mốc kết thúc không thuộc khoảng cũ.</p>
    <PagedTable query={query} page={page} onPage={setPage} emptyText="Chưa có lịch sử phòng ban." errorLabel="Không tải được lịch sử phòng ban"
      header={<TableRow><TableHead>Phòng ban</TableHead><TableHead>Từ</TableHead><TableHead>Đến</TableHead></TableRow>}
      row={r => <TableRow key={r.id}><TableCell className="whitespace-normal">{r.departmentId ? names.get(r.departmentId) ?? `Phòng ban ${r.departmentId.slice(0, 8)}` : 'Chưa gán phòng ban'}</TableCell><TableCell>{formatDateTime(r.validFrom)}</TableCell><TableCell>{r.validTo ? formatDateTime(r.validTo) : 'Hiện tại'}</TableCell></TableRow>} />
    {query.isError && <Button variant="outline" className="min-h-11" onClick={() => void query.refetch()}>Thử tải lại lịch sử</Button>}
  </section>
}
