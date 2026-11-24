import { useState } from 'react'
import { PostureClassChart } from '@/components/charts/PostureClassChart'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMyPostureClasses } from '@/lib/api/stats'
import { CLASS_COLOR, CLASS_LABEL, classCoverage, classShares, topBadClass } from '@/lib/postureClass'
import { formatMinutes, vnDayStarts } from '@/lib/time'

const VIEWS = [
  { value: 'day', label: '7 ngày, theo ngày', days: 7 },
  { value: 'week', label: '4 tuần, theo tuần', days: 28 },
] as const

/** Phân bố thời gian theo lớp tư thế của model v4; chỉ có khi Desktop gửi `postureClassSeconds`. */
export function PostureClassSection() {
  const [view, setView] = useState<(typeof VIEWS)[number]['value']>('day')
  const cfg = VIEWS.find((v) => v.value === view)!
  const q = useMyPostureClasses(cfg.days, cfg.value)
  const d = q.data
  const shares = d ? classShares(d.totals) : []
  const top = d ? topBadClass(d.totals) : null
  const coverage = d ? classCoverage(d) : 0

  return (
    <section className="space-y-4 rounded-xl border bg-background p-6" aria-labelledby="posture-class-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 id="posture-class-title" className="font-medium">Thời gian theo lớp tư thế</h2>
          <p className="text-sm text-muted-foreground">Bạn dành bao nhiêu thời gian ở từng kiểu ngồi.</p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList aria-label="Cách xem lớp tư thế">
            {VIEWS.map((v) => <TabsTrigger key={v.value} value={v.value}>{v.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      {q.isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : q.error ? (
        <p className="text-sm text-destructive" role="alert">Chưa tải được phân bố lớp tư thế: {q.error.message}</p>
      ) : !d || d.classSec <= 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Chưa có dữ liệu lớp tư thế. Cần Desktop App bản mới (model v4) gửi kèm thời gian theo lớp; dữ liệu cũ vẫn xem được ở các biểu đồ khác.
        </p>
      ) : (
        <>
          <PostureClassChart points={d.points} bucket={d.bucket} starts={d.bucket === 'day' ? vnDayStarts(cfg.days - 1) : null} />
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Phân bố cả kỳ
              {top && (
                <span className="font-normal text-muted-foreground">
                  {' '}· tư thế xấu nhiều nhất: <strong className="font-medium text-foreground">{CLASS_LABEL[top]}</strong>
                </span>
              )}
            </h3>
            <ul className="space-y-2">
              {shares.filter((r) => r.seconds > 0).map((r) => (
                <li
                  key={r.posture}
                  className="grid grid-cols-[minmax(9rem,12rem)_1fr] items-center gap-3 text-sm"
                  title={`${CLASS_LABEL[r.posture]}: ${formatMinutes(r.seconds / 60)} (${Math.round(r.share * 100)}%)`}
                >
                  <span className="truncate text-muted-foreground">{CLASS_LABEL[r.posture]}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 rounded-r-[4px] border border-border"
                      style={{ width: `${Math.max(r.share * 85, 0.5)}%`, minWidth: 4, background: CLASS_COLOR[r.posture] }}
                    />
                    <span className="tabular shrink-0 font-medium">{Math.round(r.share * 100)}%</span>
                    <span className="tabular shrink-0 text-muted-foreground">{formatMinutes(r.seconds / 60)}</span>
                  </span>
                </li>
              ))}
            </ul>
            {coverage < 0.95 && (
              <p className="text-xs text-muted-foreground">
                Lớp tư thế có cho {Math.round(coverage * 100)}% thời gian có mặt; phần còn lại đến từ Desktop App hoặc model cũ chưa gửi lớp.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
