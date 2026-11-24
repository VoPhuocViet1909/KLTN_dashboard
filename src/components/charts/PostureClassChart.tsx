import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  CLASS_COLOR, CLASS_LABEL, chartRows, STACK_ORDER, type ClassPoint, type PostureClass,
} from '@/lib/postureClass'
import { formatMinutes, VN_TZ } from '@/lib/time'

const dayFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TZ, day: '2-digit', month: '2-digit' })
const weekdayFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TZ, weekday: 'long', day: '2-digit', month: '2-digit' })

/**
 * Thời gian theo lớp tư thế, cột chồng theo ngày hoặc tuần (phút). Hai kiểu đọc: chú giải + tooltip, và bảng
 * "Phân bố cả kỳ" bên dưới (PostureClassSection) làm dữ liệu thay thế. `starts` điền đủ ngày để ngày trống là khoảng trống.
 */
export function PostureClassChart({ points, starts, bucket }: { points: ClassPoint[]; starts: string[] | null; bucket: 'day' | 'week' }) {
  const rows = chartRows(points, starts).map((r) => ({ start: r.start, presence: r.presenceMinutes, ...r.minutes }))
  const label = (start: string) => (bucket === 'week' ? `Tuần ${dayFmt.format(new Date(start))}` : dayFmt.format(new Date(start)))

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Chú giải các lớp tư thế">
        {STACK_ORDER.map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[2px] border border-border" style={{ background: CLASS_COLOR[c] }} />
            {CLASS_LABEL[c]}
          </li>
        ))}
      </ul>
      <div className="h-64 w-full" role="img" aria-label={`Biểu đồ cột chồng thời gian theo lớp tư thế, theo ${bucket === 'week' ? 'tuần' : 'ngày'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="start" tickFormatter={label} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              axisLine={false} tickLine={false} minTickGap={12}
            />
            <YAxis
              tickFormatter={(v: number) => (v >= 90 ? `${(v / 60).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giờ` : `${Math.round(v)} phút`)}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent)' }}
              content={({ active, payload }) => {
                const p = active && payload?.[0] ? (payload[0].payload as Record<string, number | string>) : null
                if (!p) return null
                const total = STACK_ORDER.reduce((a, c) => a + (p[c] as number), 0)
                const when = weekdayFmt.format(new Date(p.start as string))
                return (
                  <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                    <div className="font-medium">{bucket === 'week' ? `Tuần bắt đầu ${when}` : when}</div>
                    {total === 0 ? (
                      <div className="mt-1 text-muted-foreground">Không có dữ liệu lớp tư thế</div>
                    ) : (
                      <div className="tabular mt-1 grid grid-cols-[auto_auto_auto] gap-x-3 text-muted-foreground">
                        {[...STACK_ORDER].reverse().filter((c) => (p[c] as number) > 0).map((c: PostureClass) => (
                          <div key={c} className="contents">
                            <span>{CLASS_LABEL[c]}</span>
                            <span className="text-right text-foreground">{formatMinutes(p[c] as number)}</span>
                            <span className="text-right">{Math.round(((p[c] as number) / total) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }}
            />
            {STACK_ORDER.map((c) => (
              <Bar key={c} dataKey={c} stackId="classes" fill={CLASS_COLOR[c]} stroke="var(--background)" strokeWidth={1} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
