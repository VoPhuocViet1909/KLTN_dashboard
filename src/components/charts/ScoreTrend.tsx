import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Bucket } from '@/lib/api/stats'
import { sumAlerts } from '@/lib/api/stats'
import { VN_TZ, vnDayStarts } from '@/lib/time'

const dayFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TZ, day: '2-digit', month: '2-digit' })
const weekdayFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TZ, weekday: 'long', day: '2-digit', month: '2-digit' })

interface Point {
  start: string
  score: number | null
  badMinutes: number
  presenceMinutes: number
  alerts: number
}

/** Điểm tư thế theo ngày, thang 0–100. Một chuỗi nên không có chú giải; tiêu đề nằm ở trang. */
export function ScoreTrend({ data, days }: { data: Bucket[]; days: number }) {
  // Backend chỉ trả ngày có dữ liệu; điền đủ mọi ngày để ngày trống hiện thành khoảng hở, không bị nối liền.
  const byDay = new Map(data.map((b) => [new Date(b.start).toISOString(), b]))
  const points: Point[] = vnDayStarts(days).map((start) => {
    const b = byDay.get(start)
    return {
      start,
      score: b?.meanScore == null ? null : Math.round(b.meanScore),
      badMinutes: Math.round(b?.badMinutes ?? 0),
      presenceMinutes: Math.round(b?.presenceMinutes ?? 0),
      alerts: b ? sumAlerts(b.alerts) : 0,
    }
  })

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="start"
            tickFormatter={(v: string) => dayFmt.format(new Date(v))}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const p = active && payload?.[0] ? (payload[0].payload as Point) : null
              if (!p) return null
              return (
                <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                  <div className="font-medium">{weekdayFmt.format(new Date(p.start))}</div>
                  {p.score === null && <div className="mt-1 text-muted-foreground">Không có dữ liệu</div>}
                  {p.score !== null && <div className="tabular mt-1 grid grid-cols-[auto_auto] gap-x-4 text-muted-foreground">
                    <span>Điểm tư thế</span>
                    <span className="text-right text-foreground">{p.score ?? '—'}</span>
                    <span>Phút ngồi sai</span>
                    <span className="text-right text-foreground">{p.badMinutes}</span>
                    <span>Phút có mặt</span>
                    <span className="text-right text-foreground">{p.presenceMinutes}</span>
                    <span>Cảnh báo</span>
                    <span className="text-right text-foreground">{p.alerts}</span>
                  </div>}
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--chart-1)', stroke: 'var(--background)', strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: 'var(--background)', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
