import { useState } from 'react'
import { HabitHeatmap } from '@/components/charts/HabitHeatmap'
import { hourRange, WEEKDAY_LABEL } from '@/components/charts/heatmapScale'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMyHeatmap, type HeatmapCell } from '@/lib/api/stats'

const RANGES = [
  { weeks: 1, label: '1 tuần' },
  { weeks: 4, label: '4 tuần' },
  { weeks: 12, label: '12 tuần' },
]

export function HabitsPage() {
  const [weeks, setWeeks] = useState(4)
  const heatmap = useMyHeatmap(weeks)
  const cells = heatmap.data ?? []
  const scored = cells.filter((c): c is HeatmapCell & { meanScore: number } => c.meanScore !== null)
  const worst = [...scored].sort((a, b) => a.meanScore - b.meanScore).slice(0, 3)
  const best = [...scored].sort((a, b) => b.meanScore - a.meanScore)[0]

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Thói quen</h1>
          <p className="text-sm text-muted-foreground">Bạn thường ngồi đúng hay sai vào giờ nào trong tuần.</p>
        </div>
        <Tabs value={String(weeks)} onValueChange={(v) => setWeeks(Number(v))}>
          <TabsList aria-label="Khoảng thời gian">
            {RANGES.map((r) => (
              <TabsTrigger key={r.weeks} value={String(r.weeks)}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <section className="rounded-xl border bg-background p-6">
        {heatmap.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : heatmap.error ? (
          <p className="text-sm text-destructive">Không tải được bản đồ thói quen: {heatmap.error.message}</p>
        ) : scored.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu trong {weeks} tuần qua. Mở Desktop App khi làm việc để bắt đầu ghi lại.
          </p>
        ) : (
          <HabitHeatmap cells={cells} />
        )}
      </section>

      {scored.length > 0 && (
        <section className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2">
          <div className="space-y-3 bg-background p-6">
            <h2 className="font-medium">Khung giờ ngồi kém nhất</h2>
            <ol className="space-y-2 text-sm">
              {worst.map((c) => (
                <li key={`${c.weekday}-${c.hour}`} className="flex items-baseline justify-between gap-4">
                  <span>
                    {WEEKDAY_LABEL[c.weekday]}, {hourRange(c.hour)}
                  </span>
                  <span className="tabular font-medium">{Math.round(c.meanScore)}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">
              Thử đứng dậy vận động hoặc chỉnh lại ghế trước những khung giờ này.
            </p>
          </div>
          {best && (
            <div className="space-y-3 bg-background p-6">
              <h2 className="font-medium">Khung giờ ngồi tốt nhất</h2>
              <p className="flex items-baseline justify-between gap-4 text-sm">
                <span>
                  {WEEKDAY_LABEL[best.weekday]}, {hourRange(best.hour)}
                </span>
                <span className="tabular font-medium">{Math.round(best.meanScore)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Dựa trên {scored.length} khung giờ có dữ liệu trong {weeks} tuần qua.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
