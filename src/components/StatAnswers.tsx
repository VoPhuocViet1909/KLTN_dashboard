import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { hourRange, WEEKDAY_LABEL } from '@/components/charts/heatmapScale'
import { Button } from '@/components/ui/button'
import { request } from '@/lib/api/client'
import type { HeatmapCell, Summary } from '@/lib/api/stats'
import { alertLabel } from '@/lib/labels'
import { compareBadShare, lowestScoredHours, mostFrequentAlerts } from '@/lib/statAnswers'
import { formatDateTime } from '@/lib/time'

const QUESTIONS = {
  comparison: 'Tỷ lệ ngồi sai 7 ngày qua thay đổi thế nào?',
  presence: 'Tôi có mặt bao lâu trong 7 ngày qua?',
  alerts: 'Loại cảnh báo nào xuất hiện nhiều nhất?',
  hours: 'Khung giờ nào có điểm tư thế thấp nhất?',
}
type Question = keyof typeof QUESTIONS
const WEEK = 7 * 24 * 60 * 60 * 1000
const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

export function StatAnswers({ cells, weeks, heatmapPending, heatmapError }: {
  cells: HeatmapCell[]
  weeks: number
  heatmapPending: boolean
  heatmapError: Error | null
}) {
  const questionId = useId()
  const [selection, setSelection] = useState<{ question: Question; end: number }>()
  const question = selection?.question
  const summary = useQuery({
    queryKey: ['stats', 'me', 'answers', selection?.end, question === 'comparison'],
    enabled: !!selection && question !== 'hours',
    queryFn: async ({ signal }) => {
      const end = selection!.end
      const from = new Date(end - WEEK).toISOString()
      const to = new Date(end).toISOString()
      const read = (start: string, finish: string) =>
        request<Summary>({ url: '/stats/me/summary', params: { from: start, to: finish }, signal })
      const [current, previous] = await Promise.all([
        read(from, to),
        question === 'comparison' ? read(new Date(end - 2 * WEEK).toISOString(), from) : null,
      ])
      return { current, previous, from, to }
    },
  })
  function answer() {
    if (question === 'hours') {
      if (heatmapPending) return <p>Đang tải điểm tư thế…</p>
      if (heatmapError) return <p role="alert">Chưa tải được điểm tư thế.</p>
      const result = lowestScoredHours(cells)
      return <>
        <p>{result.scored ? <>
          Mức thấp nhất là <strong>{number.format(result.lowest)}/100</strong> tại {result.hours.slice(0, 3).map(cell =>
            WEEKDAY_LABEL[cell.weekday] + ' ' + hourRange(cell.hour)).join(', ')}.
          {result.hours.length > 3 && ' Xem biểu đồ bên dưới để đối chiếu các khung giờ đồng điểm.'}
        </> : 'Chưa có khung giờ nào có điểm tư thế.'}</p>
        <p className="text-muted-foreground">Nguồn biểu đồ Thói quen, {weeks} tuần đang chọn, giờ Việt Nam.</p>
      </>
    }
    if (summary.isPending) return <p>Đang tải thống kê…</p>
    if (summary.isError) return <><p role="alert">Chưa tải được thống kê cá nhân.</p>
      <Button size="sm" variant="outline" onClick={() => void summary.refetch()}>Thử lại</Button></>
    const { current, previous, from, to } = summary.data
    let result: string
    if (question === 'comparison' && previous) {
      const shares = compareBadShare(current, previous)
      const change = shares ? Number(shares.difference.toFixed(1)) : 0
      result = shares
        ? `${number.format(shares.currentShare)}% so với ${number.format(shares.previousShare)}% ở 7 ngày liền trước. ${change ? (change > 0 ? 'Tăng ' : 'Giảm ') + number.format(Math.abs(change)) + ' điểm phần trăm.' : 'Chênh lệch dưới 0,1 điểm phần trăm sau làm tròn.'} Tỷ lệ tính trên số phút có mặt ghi nhận.`
        : 'Cần có thời gian hiện diện ghi nhận ở cả hai khoảng mới so sánh được.'
    } else if (question === 'presence') {
      result = current.presenceMinutes > 0 ? `Desktop ghi nhận ${number.format(current.presenceMinutes)} phút có mặt.` : 'Chưa ghi nhận thời gian có mặt trong khoảng này.'
    } else {
      const alerts = mostFrequentAlerts(current)
      result = alerts.count ? `${alerts.types.map(alertLabel).join(', ')}, mỗi loại ${number.format(alerts.count)} lượt.` : 'Không có lượt cảnh báo nào được ghi nhận trong khoảng này.'
    }
    return <>
      <p>{result}</p>
      <p className="text-muted-foreground">{formatDateTime(from)} đến {formatDateTime(to)} theo giờ Việt Nam.
        {question === 'comparison' && ` Kỳ so sánh bắt đầu ${formatDateTime(new Date(selection!.end - 2 * WEEK).toISOString())}.`}
        {' '}Nguồn <Link className="underline underline-offset-2" to="/">Tổng quan cá nhân</Link>.</p>
    </>
  }

  return <section aria-labelledby={questionId} className="space-y-3 rounded-xl border bg-background p-4 sm:p-6">
    <h2 id={questionId} className="font-semibold">Hỏi về số liệu của tôi</h2>
    <div className="flex flex-wrap gap-2">
      {(Object.keys(QUESTIONS) as Question[]).map(key => <Button key={key}
        variant={question === key ? 'default' : 'outline'}
        aria-pressed={question === key}
        className="min-h-11 h-auto max-w-full whitespace-normal text-left"
        onClick={() => setSelection({ question: key, end: Date.now() })}>{QUESTIONS[key]}</Button>)}
    </div>
    {selection && <div aria-live="polite" className="space-y-2 text-sm">{answer()}</div>}
  </section>
}
