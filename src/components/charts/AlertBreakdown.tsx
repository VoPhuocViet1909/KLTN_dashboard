import { alertLabel } from '@/lib/labels'

/**
 * Số lần cảnh báo theo loại: thanh ngang một màu, xếp giảm dần, số ghi ngay cuối thanh.
 * Làm bằng HTML thường (không cần thư viện) – mỗi hàng có title làm tooltip.
 */
export function AlertBreakdown({ alerts }: { alerts: Record<string, number> }) {
  const rows = Object.entries(alerts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...rows.map(([, n]) => n))
  const total = rows.reduce((a, [, n]) => a + n, 0)

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Không có cảnh báo nào trong khoảng này.</p>
  }

  return (
    <ul className="space-y-3">
      {rows.map(([type, n]) => (
        <li
          key={type}
          className="grid grid-cols-[minmax(9rem,12rem)_1fr] items-center gap-3 text-sm"
          title={`${alertLabel(type)}: ${n} lần (${Math.round((n / total) * 100)}%)`}
        >
          <span className="truncate text-muted-foreground">{alertLabel(type)}</span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 rounded-r-[4px] bg-chart-1"
              style={{ width: `${(n / max) * 85}%`, minWidth: 4 }}
            />
            <span className="tabular shrink-0 font-medium">{n}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
