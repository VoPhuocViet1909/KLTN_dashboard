import type { DeviceState } from '@/realtime/socket'
import { STATE_META } from '@/lib/labels'

/**
 * "Thước dọi" – điểm nhấn duy nhất của giao diện.
 * Đường thẳng đứng = ngồi đúng; nghiêng về trước = đang ngồi sai; nét đứt = vắng mặt; xám = không kết nối.
 * Độ nghiêng là kênh mã hóa thứ hai bên cạnh màu, nên vẫn đọc được khi không phân biệt màu.
 */
const TILT: Record<DeviceState, number> = { GOOD: 0, BAD: 14, AWAY: 0, OFFLINE: 0 }

export function PlumbLine({ state, size = 120 }: { state: DeviceState | null; size?: number }) {
  const s = state ?? 'OFFLINE'
  const color = STATE_META[s].colorVar
  const dashed = s === 'AWAY' || state === null
  return (
    <svg
      width={size * 0.6}
      height={size}
      viewBox="0 0 60 100"
      role="img"
      aria-label={state ? STATE_META[s].label : 'Chưa có dữ liệu'}
    >
      {/* đường chuẩn thẳng đứng, luôn hiện để so sánh */}
      <line x1="30" y1="6" x2="30" y2="94" stroke="var(--border)" strokeWidth="2" strokeDasharray="2 4" />
      <g
        style={{
          transform: `rotate(${TILT[s]}deg)`,
          transformOrigin: '30px 92px',
          transition: 'transform 600ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <line
          x1="30"
          y1="26"
          x2="30"
          y2="92"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={dashed ? '6 6' : undefined}
        />
        <circle cx="30" cy="16" r="9" fill="none" stroke={color} strokeWidth="4" strokeDasharray={dashed ? '6 5' : undefined} />
      </g>
      <line x1="16" y1="94" x2="44" y2="94" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
