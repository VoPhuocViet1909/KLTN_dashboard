import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableHeader } from '@/components/ui/table'
import { HISTORY_PAGE_SIZE, type Paged } from '@/lib/api/alerts'

// Bảng phân trang dùng chung (Lịch sử cảnh báo, Tổng quan tổ chức, Nhân viên):
// skeleton khi tải, lỗi, trống, "Trang x / y · tổng N", nút Trước/Sau.

export interface QueryLike<T> {
  data: Paged<T> | undefined
  error: Error | null
  isPending: boolean
  isPlaceholderData: boolean
}

export function PagedTable<T>({
  query,
  page,
  onPage,
  header,
  row,
  emptyText,
  errorLabel = 'Không tải được dữ liệu',
}: {
  query: QueryLike<T>
  page: number
  onPage: (page: number) => void
  header: ReactNode
  row: (item: T) => ReactNode
  emptyText: string
  /** đầu câu báo lỗi, ví dụ "Không tải được lịch sử" -> "Không tải được lịch sử: <message>" */
  errorLabel?: string
}) {
  const { data, error, isPending, isPlaceholderData } = query

  if (isPending) {
    return (
      <div className="space-y-2 rounded-xl border bg-background p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-xl border bg-background p-6">
        <p role="alert" className="text-sm text-destructive">
          {errorLabel}: {error.message}
        </p>
      </div>
    )
  }
  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-xl border bg-background p-6">
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
      </div>
    )
  }

  const pages = Math.max(1, Math.ceil(data.total / (data.size || HISTORY_PAGE_SIZE)))
  return (
    <div className="rounded-xl border bg-background">
      <div className={`transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
        <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
          <TableHeader>{header}</TableHeader>
          <TableBody>{data.items.map(row)}</TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
        <p className="tabular text-sm text-muted-foreground" aria-live="polite">
          Trang {page + 1} / {pages} · tổng {data.total.toLocaleString('vi-VN')}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 0 || isPlaceholderData} onClick={() => onPage(page - 1)}>
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= pages || isPlaceholderData}
            onClick={() => onPage(page + 1)}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  )
}
