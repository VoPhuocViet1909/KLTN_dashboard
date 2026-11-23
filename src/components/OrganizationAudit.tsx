import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PagedTable } from '@/components/PagedTable'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { request } from '@/lib/api/client'
import type { Paged } from '@/lib/api/alerts'
import { ORG_CONFIG_QUERY_KEY, type ConfigValues } from '@/lib/api/config'
import { displayUser, useUserDirectory } from '@/lib/api/users'
import { FIELD_BY_KEY } from '@/lib/configFields'
import { formatDateTime } from '@/lib/time'

const actions = {
  CREATE_ORGANIZATION: 'Tạo tổ chức', SET_ORGANIZATION_STATUS: 'Đặt trạng thái tổ chức',
  CREATE_DEPARTMENT: 'Tạo phòng ban', SET_DEPARTMENT_STATUS: 'Đặt trạng thái phòng ban',
}
interface CatalogEntry {
  id: number; occurredAt: string; actorId: string; targetId: string; action: keyof typeof actions; active: boolean
}

export function CatalogAudit({ viewer }: { viewer: string }) {
  const [page, setPage] = useState(0)
  const directory = useUserDirectory()
  const query = useQuery({
    queryKey: ['organization', 'audit', viewer, page],
    queryFn: () => request<Paged<CatalogEntry>>({ url: '/organizations/audit', params: { page, size: 20 } }),
  })
  return <section aria-label="Nhật ký tổ chức và phòng ban" className="space-y-3">
    <h2 className="text-lg font-semibold">Nhật ký tổ chức và phòng ban</h2>
    <PagedTable query={query} page={page} onPage={setPage} emptyText="Chưa có thao tác tổ chức hoặc phòng ban."
      header={<TableRow><TableHead>Thời điểm</TableHead><TableHead>Người thực hiện</TableHead>
        <TableHead>Thao tác</TableHead><TableHead>Mã đối tượng</TableHead><TableHead>Trạng thái đã đặt</TableHead></TableRow>}
      row={item => <TableRow key={item.id}><TableCell>{formatDateTime(item.occurredAt)}</TableCell>
        <TableCell>{displayUser(directory.data, item.actorId)}</TableCell><TableCell>{actions[item.action]}</TableCell>
        <TableCell className="break-all">{item.targetId}</TableCell>
        <TableCell>{item.active ? 'Đang hoạt động' : 'Đã ngưng'}</TableCell></TableRow>} />
  </section>
}

interface Revision { version: number; actorId: string; occurredAt: string; settings: ConfigValues }

export function ConfigAudit({ org }: { org: string }) {
  const [page, setPage] = useState(0)
  const directory = useUserDirectory()
  const query = useQuery({
    queryKey: [...ORG_CONFIG_QUERY_KEY, 'audit', org, page],
    queryFn: () => request<Paged<Revision>>({ url: '/config/org/audit', params: { page, size: 20 } }),
  })
  return <section aria-label="Lịch sử cấu hình tổ chức" className="space-y-3">
    <h2 className="text-lg font-semibold">Lịch sử cấu hình tổ chức</h2>
    <PagedTable query={query} page={page} onPage={setPage} emptyText="Chưa có phiên bản cấu hình được ghi nhận."
      header={<TableRow><TableHead>Phiên bản</TableHead><TableHead>Thời điểm</TableHead>
        <TableHead>Người thực hiện</TableHead><TableHead>Cấu hình đã lưu</TableHead></TableRow>}
      row={item => <TableRow key={item.version}><TableCell>v{item.version}</TableCell><TableCell>{formatDateTime(item.occurredAt)}</TableCell>
        <TableCell>{displayUser(directory.data, item.actorId)}</TableCell>
        <TableCell>{Object.entries(item.settings).map(([key, value]) => <div key={key}>{FIELD_BY_KEY[key]?.label ?? key}: {typeof value === 'boolean' ? (value ? 'Bật' : 'Tắt') : String(value ?? 'Mặc định')} {FIELD_BY_KEY[key]?.unit}</div>)}
          {!Object.keys(item.settings).length && 'Đã bỏ mọi tùy chỉnh'}</TableCell></TableRow>} />
  </section>
}
