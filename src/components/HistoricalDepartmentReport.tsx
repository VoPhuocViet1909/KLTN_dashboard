import { useState } from 'react'
import { useDepartmentReport } from '@/lib/api/departmentHistory'
import type { Department } from '@/lib/api/org'
import { formatDateTime, formatDuration, vnDate } from '@/lib/time'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

function shiftWeek(week: string, count: number) {
  const date = new Date(`${week}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count * 7)
  return date.toISOString().slice(0, 10)
}

export function HistoricalDepartmentReport({ departments }: { departments?: Department[] }) {
  const [week, setWeek] = useState<string>()
  const query = useDepartmentReport(week)
  const data = query.data
  const names = new Map(departments?.map(d => [d.id, d.name]))
  const [currentWeek] = useState(() => {
    const today = new Date(`${vnDate(new Date())}T00:00:00Z`)
    today.setUTCDate(today.getUTCDate() - (today.getUTCDay() + 6) % 7)
    return today.toISOString().slice(0, 10)
  })
  const hidden = data?.status === 'SUPPRESSED' || data?.status === 'OVERLAPPING_WINDOWS'
  return <section className="rounded-xl border bg-background p-4 sm:p-6 space-y-4" aria-label="Báo cáo phòng ban theo thời điểm">
    <h2 className="font-medium">Báo cáo phòng ban theo thời điểm</h2>
    <p className="text-sm text-muted-foreground">Tuần đã kết thúc theo giờ Việt Nam, độc lập với bộ lọc 7/30 ngày ở trên. Dữ liệu được gán theo lịch sử tại lúc phát sinh; chuyển phòng hôm nay không chuyển dữ liệu cũ sang phòng mới.</p>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" className="min-h-11" disabled={!data || query.isFetching || data.week <= shiftWeek(currentWeek, -13)} onClick={() => data && setWeek(shiftWeek(data.week, -1))}>Tuần trước</Button>
      <span className="text-sm tabular" aria-live="polite">{data ? `Tuần bắt đầu ${data.week}` : 'Đang chọn tuần…'}</span>
      <Button variant="outline" className="min-h-11" disabled={!data || query.isFetching || shiftWeek(data.week, 1) >= currentWeek} onClick={() => data && setWeek(shiftWeek(data.week, 1))}>Tuần sau</Button>
    </div>
    {query.isPending ? <Skeleton className="h-40 w-full" /> : query.isError ? <div role="alert" className="space-y-2"><p>Không tải được báo cáo phòng ban. Lịch sử có thể tạm thời chưa sẵn sàng; chưa có báo cáo đầy đủ.</p><Button variant="outline" className="min-h-11" onClick={() => void query.refetch()}>Thử tải lại báo cáo</Button></div> : data && <>
      {hidden ? <p role="status" className="rounded-md border p-3 text-sm">{data.status === 'SUPPRESSED' ? `Có nhóm dưới ${data.minimumGroupSize} người có dữ liệu. Toàn bộ số liệu của báo cáo tuần này được ẩn, kể cả tổng và nhóm chưa có lịch sử.` : 'Có các cửa sổ theo dõi của cùng người chồng thời gian. Chưa hiển thị số liệu để tránh cộng đôi nhiều thiết bị.'}</p> : data.status === 'NO_DATA' ? <p>Chưa có dữ liệu hiện diện trong tuần này.</p> :
        <div tabIndex={0} role="region" aria-label="Số liệu phòng ban, cuộn ngang để xem thêm" className="rounded-md focus-visible:outline-2 focus-visible:outline-ring"><Table><TableHeader><TableRow><TableHead>Phòng ban</TableHead><TableHead>Người có dữ liệu</TableHead><TableHead>Có mặt</TableHead><TableHead>Đã nhận diện</TableHead><TableHead>Tỷ lệ sai</TableHead><TableHead>Cảnh báo</TableHead></TableRow></TableHeader><TableBody>
          {data.rows.map(r => <TableRow key={`${r.group}/${r.departmentId}`}><TableCell className="whitespace-normal min-w-36">{r.group === 'UNKNOWN' ? 'Chưa có lịch sử / cắt mốc chuyển' : r.group === 'UNASSIGNED' ? 'Chưa gán phòng ban' : names.get(r.departmentId ?? '') ?? `Phòng ban ${r.departmentId?.slice(0, 8)}`}</TableCell><TableCell>{r.contributors ?? '—'}</TableCell><TableCell>{formatDuration(r.presenceSec)}</TableCell><TableCell>{formatDuration(r.knownSec)}</TableCell><TableCell>{r.badRatio == null ? 'Chưa đủ timing' : `${(r.badRatio * 100).toFixed(1)}%`}</TableCell><TableCell>{r.alertCount ?? '—'}</TableCell></TableRow>)}
        </TableBody></Table></div>}
      <p className="text-xs text-muted-foreground">Tỷ lệ sai = giây sai / giây đã nhận diện từ timing thực; dữ liệu cũ chỉ đóng góp thời gian có mặt. Số người giữa các phòng có thể trùng khi chuyển phòng; không cộng thành tổng nhân viên. Cảnh báo là số đếm trong metric. Không dùng để xếp hạng năng suất.</p>
      <p className="text-xs text-muted-foreground">Chưa có lịch sử và cửa sổ cắt mốc chuyển được tách riêng; cửa sổ cắt ranh giới tuần không tính. Dữ liệu đến muộn có thể bổ sung tuần cũ. Cập nhật {formatDateTime(data.dataAsOf)}.</p>
    </>}
  </section>
}
