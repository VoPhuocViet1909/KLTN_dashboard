import { useState } from 'react'
import { PagedTable } from '@/components/PagedTable'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { displayUser, useAccountAudit, useUserDirectory } from '@/lib/api/users'
import { formatDateTime } from '@/lib/time'

const labels = {
  CREATE: 'Tạo tài khoản',
  SET_ROLE: 'Đặt vai trò',
  SET_DEPARTMENT: 'Đặt phòng ban',
  SET_STATUS: 'Đặt trạng thái hoạt động',
}

export function AccountAuditPanel({ viewerId }: { viewerId: string }) {
  const [page, setPage] = useState(0)
  const [action, setAction] = useState('ALL')
  const history = useAccountAudit(viewerId, page, action === 'ALL' ? undefined : action)
  const directory = useUserDirectory()
  return (
    <section aria-label="Nhật ký quản trị tài khoản" className="space-y-3">
      <h2 className="text-lg font-semibold">Nhật ký quản trị tài khoản</h2>
      <Select value={action} onValueChange={value => { setAction(value); setPage(0) }}>
        <SelectTrigger aria-label="Lọc theo thao tác" className="w-64"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tất cả thao tác</SelectItem>
          {Object.entries(labels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <PagedTable query={history} page={page} onPage={setPage} emptyText="Chưa có thao tác phù hợp."
        errorLabel="Không tải được nhật ký"
        header={<TableRow><TableHead>Thời điểm</TableHead><TableHead>Người thực hiện</TableHead>
          <TableHead>Thao tác</TableHead><TableHead>Tài khoản liên quan</TableHead></TableRow>}
        row={item => <TableRow key={item.id}><TableCell>{formatDateTime(item.occurredAt)}</TableCell>
          <TableCell title={item.actorId}>{displayUser(directory.data, item.actorId)}</TableCell>
          <TableCell>{labels[item.action]}{item.resultValue && <span className="block text-sm text-muted-foreground">{item.action === 'SET_STATUS' ? (item.resultValue === 'true' ? 'Đang hoạt động' : 'Đã khóa') : item.resultValue}</span>}</TableCell>
          <TableCell title={item.targetId}>{displayUser(directory.data, item.targetId)}</TableCell></TableRow>} />
    </section>
  )
}
