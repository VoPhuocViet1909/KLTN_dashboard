import { useState } from 'react'
import type { HeatmapCell } from '@/lib/api/stats'
import { hourRange, SCORE_STEPS, stepFor, WEEKDAY_LABEL, WEEKDAY_SHORT } from './heatmapScale'

/**
 * Lưới thứ × giờ. Hiện giờ 6–22, mở rộng nếu có dữ liệu ngoài khoảng đó.
 * Ô trống (không có dữ liệu) chỉ có viền, không tô.
 */
export function HabitHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const [hover, setHover] = useState<HeatmapCell | null>(null)

  const withData = cells.filter((c) => c.meanScore !== null)
  const firstHour = Math.min(6, ...withData.map((c) => c.hour))
  const lastHour = Math.max(22, ...withData.map((c) => c.hour))
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i)
  const byKey = new Map(cells.map((c) => [`${c.weekday}-${c.hour}`, c]))

  return (
    <div className="space-y-4">
      {/* Dòng đọc giá trị: thay tooltip, luôn cùng một chỗ nên không che lưới */}
      <p className="tabular h-5 text-sm" aria-live="polite">
        {hover ? (
          <>
            <span className="font-medium">
              {WEEKDAY_LABEL[hover.weekday]}, {hourRange(hover.hour)}
            </span>
            <span className="text-muted-foreground">
              {' '}
              – {hover.meanScore === null ? 'không có dữ liệu' : `điểm tư thế ${Math.round(hover.meanScore)}`}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Rê chuột lên một ô để xem điểm.</span>
        )}
      </p>

      <div className="overflow-x-auto">
        <div
          className="grid w-fit gap-[3px]"
          style={{ gridTemplateColumns: `2.25rem repeat(${hours.length}, minmax(1.25rem, 2rem))` }}
          role="img"
          aria-label="Điểm tư thế trung bình theo thứ và giờ"
          onMouseLeave={() => setHover(null)}
        >
          <span />
          {hours.map((h) => (
            <span key={h} className="tabular text-center text-[11px] text-muted-foreground">
              {h % 2 === 0 ? h : ''}
            </span>
          ))}
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <Row key={d} day={d} hours={hours} byKey={byKey} onHover={setHover} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>Điểm tư thế:</span>
        {SCORE_STEPS.map((s) => (
          <span key={s.min} className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[3px]" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] border border-border bg-background" aria-hidden />
          không có dữ liệu
        </span>
      </div>
    </div>
  )
}

function Row({
  day,
  hours,
  byKey,
  onHover,
}: {
  day: number
  hours: number[]
  byKey: Map<string, HeatmapCell>
  onHover: (c: HeatmapCell) => void
}) {
  return (
    <>
      <span className="self-center text-xs text-muted-foreground">{WEEKDAY_SHORT[day]}</span>
      {hours.map((h) => {
        const cell = byKey.get(`${day}-${h}`) ?? { weekday: day, hour: h, meanScore: null }
        const score = cell.meanScore
        return (
          <span
            key={h}
            onMouseEnter={() => onHover(cell)}
            title={`${WEEKDAY_LABEL[day]}, ${hourRange(h)}: ${score === null ? 'không có dữ liệu' : Math.round(score)}`}
            className={`aspect-square rounded-[3px] hover:outline-2 hover:outline-offset-1 hover:outline-foreground ${score === null ? 'border border-border bg-background' : ''}`}
            style={score === null ? undefined : { background: stepFor(score).color }}
          />
        )
      })}
    </>
  )
}
