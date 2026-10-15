import { STATE_META } from '@/lib/labels'
import type { DeviceState } from '@/realtime/socket'

/** Nhãn trạng thái: icon + chữ, màu chỉ là kênh phụ. */
export function StateBadge({ state }: { state: DeviceState }) {
  const meta = STATE_META[state]
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: meta.colorVar }}>
      <Icon className="size-4" aria-hidden />
      <span className="text-foreground">{meta.label}</span>
    </span>
  )
}
