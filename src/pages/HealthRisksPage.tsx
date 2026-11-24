import { useState } from 'react'
import { ExternalLink, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMyHealthRisks, type ClassBreakdown, type HealthRisk, type Indicator, type Period } from '@/lib/api/insights'
import {
  barPercent, citation, DISCLAIMER, EVIDENCE_LABEL, formatIndicator, formatThreshold, LEVEL_LABEL, markerPercent,
  noteLabel, sortRisks, sourceHref,
} from '@/lib/healthRisk'
import { CLASS_COLOR, isPostureClass } from '@/lib/postureClass'
import { formatDateTime } from '@/lib/time'

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
]

/** Câu miễn trừ luôn hiện, kể cả khi đang tải hoặc lỗi. */
function Disclaimer({ text }: { text: string }) {
  return (
    <p role="note" className="flex items-start gap-2 rounded-lg border bg-accent px-4 py-3 text-sm">
      <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>
        <strong className="font-medium">{text}</strong> Mức nguy cơ được tính bằng luật từ chỉ số tư thế đo được và bảng tri
        thức có nguồn; hệ thống không dự đoán bệnh của riêng bạn.
      </span>
    </p>
  )
}

function IndicatorRow({ indicator }: { indicator: Indicator }) {
  const percent = barPercent(indicator)
  const medium = markerPercent(indicator, indicator.mediumGte)
  const high = markerPercent(indicator, indicator.highGte)
  const measured = indicator.value !== null
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span>{indicator.label}</span>
        <span className="tabular font-medium">{formatIndicator(indicator.key, indicator.value)}</span>
      </div>
      <div
        role="meter"
        aria-label={indicator.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={measured ? formatIndicator(indicator.key, indicator.value) : 'Chưa đo'}
        className="relative h-2 rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        {medium !== null && <span aria-hidden className="absolute top-[-2px] h-3 w-px bg-foreground/50" style={{ left: `${medium}%` }} />}
        {high !== null && <span aria-hidden className="absolute top-[-2px] h-3 w-px bg-foreground" style={{ left: `${high}%` }} />}
      </div>
      <div className="text-xs text-muted-foreground">
        {[
          formatThreshold(indicator.key, indicator.mediumGte) && `Mức vừa từ ${formatThreshold(indicator.key, indicator.mediumGte)}`,
          formatThreshold(indicator.key, indicator.highGte) && `mức cao từ ${formatThreshold(indicator.key, indicator.highGte)}`,
        ].filter(Boolean).join(', ')}
      </div>
    </li>
  )
}

/** Lớp tư thế nào đóng góp nhiều nhất vào thời gian ngồi sai; chỉ hiện khi Desktop gửi lớp. */
function ClassContribution({ breakdown }: { breakdown: ClassBreakdown }) {
  if (!breakdown.available || breakdown.classes.length === 0) {
    return (
      <section aria-label="Lớp tư thế đóng góp">
        <h3 className="mb-1 text-sm font-medium">Lớp tư thế đóng góp</h3>
        <p className="text-xs text-muted-foreground">
          Chưa đủ dữ liệu lớp tư thế trong kỳ này (cần Desktop App bản mới); mức nguy cơ được tính từ các chỉ số khác.
        </p>
      </section>
    )
  }
  const top = breakdown.top
  return (
    <section aria-label="Lớp tư thế đóng góp">
      <h3 className="mb-1 text-sm font-medium">Lớp tư thế đóng góp</h3>
      <p className="mb-2 text-sm">
        {top ? <>Nhiều nhất: <strong className="font-medium">{top.label}</strong> ({Math.round(top.share * 100)}% thời gian có mặt).</> : 'Không có thời gian ngồi sai theo lớp trong kỳ này.'}
      </p>
      <ul className="space-y-1.5 text-sm">
        {breakdown.classes.map((c) => (
          <li key={c.posture} className="grid grid-cols-[minmax(9rem,12rem)_1fr] items-center gap-3">
            <span className="truncate text-muted-foreground">{c.label}</span>
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 rounded-r-[4px] border border-border"
                style={{ width: `${Math.max(c.share * 85, 0.5)}%`, minWidth: 4, background: isPostureClass(c.posture) ? CLASS_COLOR[c.posture] : 'var(--chart-1)' }}
              />
              <span className="tabular shrink-0 font-medium">{Math.round(c.share * 100)}%</span>
              <span className="shrink-0 text-xs text-muted-foreground">{c.usedInRules ? 'có nguồn, dùng để tính mức' : 'chỉ hiển thị'}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Chỉ lớp có nguồn nghiên cứu riêng mới được dùng để tính mức nguy cơ; các lớp còn lại chỉ cho biết bạn ngồi sai theo kiểu nào.
      </p>
    </section>
  )
}

function RiskCard({ risk }: { risk: HealthRisk }) {
  const insufficient = risk.level === 'INSUFFICIENT_DATA'
  return (
    <article className="space-y-4 rounded-xl border bg-background p-6" aria-labelledby={`risk-${risk.kbId}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 id={`risk-${risk.kbId}`} className="font-medium">{risk.risk.vi}</h2>
          <p className="text-xs text-muted-foreground">{risk.risk.en} · {risk.factorLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={risk.level === 'HIGH' ? 'destructive' : 'outline'}>Mức: {LEVEL_LABEL[risk.level]}</Badge>
          <Badge variant="outline">Bằng chứng: {EVIDENCE_LABEL[risk.evidence]}</Badge>
        </div>
      </header>

      {risk.explanation && <p className="text-sm leading-relaxed">{risk.explanation}</p>}

      {!insufficient && risk.indicators.length > 0 && (
        <section aria-label="Chỉ số đóng góp">
          <h3 className="mb-2 text-sm font-medium">Chỉ số đóng góp</h3>
          <ul className="space-y-3">{risk.indicators.map((i) => <IndicatorRow key={i.key} indicator={i} />)}</ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Ngưỡng do hệ thống đặt để phân mức (không phải ngưỡng lâm sàng).
            {risk.cappedByEvidence && ' Mức tối đa bị giới hạn vì bằng chứng yếu.'}
          </p>
        </section>
      )}

      {!insufficient && risk.postureClasses && <ClassContribution breakdown={risk.postureClasses} />}

      {!insufficient && risk.advice.length > 0 && (
        <section aria-label="Lời khuyên">
          <h3 className="mb-1 text-sm font-medium">Lời khuyên</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">{risk.advice.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
      )}

      <section aria-label="Nguồn">
        <h3 className="mb-1 text-sm font-medium">Nguồn</h3>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {risk.sources.map((s) => {
            const href = sourceHref(s)
            return (
              <li key={s.doi ?? s.url ?? s.title}>
                {href ? (
                  <a className="inline-flex items-baseline gap-1 text-primary underline-offset-4 hover:underline"
                    href={href} target="_blank" rel="noopener noreferrer">
                    {citation(s)}
                    <ExternalLink aria-hidden className="size-3 self-center" />
                    <span className="sr-only">(mở tab mới)</span>
                  </a>
                ) : citation(s)}
                <span className="block">{s.claim}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </article>
  )
}

export function HealthRisksPage() {
  const [period, setPeriod] = useState<Period>('7d')
  const query = useMyHealthRisks(period)
  const data = query.data
  const note = noteLabel(data?.explanationNote ?? null)

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Nguy cơ sức khỏe</h1>
          <p className="text-sm text-muted-foreground">
            Cảnh báo sớm từ thói quen ngồi của bạn, dựa trên các nghiên cứu có nguồn.
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList aria-label="Khoảng thời gian">
            {PERIODS.map((p) => <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      <Disclaimer text={data?.disclaimer ?? DISCLAIMER} />

      {query.isPending ? (
        <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : query.error ? (
        <section className="space-y-3 rounded-xl border bg-background p-6" role="alert">
          <p className="text-sm text-destructive">Chưa tải được cảnh báo nguy cơ: {query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>Thử lại</Button>
        </section>
      ) : data && (
        <>
          <section className="space-y-2 rounded-xl border bg-background p-6" aria-label="Tóm tắt">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">Tóm tắt {period === '7d' ? '7 ngày' : '30 ngày'} gần đây</h2>
              <Badge variant="outline" title={note ?? undefined}>
                {data.explanationSource === 'gemini' ? 'Lời giải thích do AI viết' : 'Câu mẫu soạn sẵn'}
              </Badge>
            </div>
            <p className="text-sm">{data.summary}</p>
            {note && data.status === 'OK' && <p className="text-xs text-muted-foreground">{note}</p>}
            <p className="text-xs text-muted-foreground">
              Bảng tri thức {data.kbVersion} · cập nhật {formatDateTime(data.generatedAt)}
              {data.inputs.presenceMinutes !== null && ` · có mặt ${Math.round(data.inputs.presenceMinutes)} phút`}
            </p>
          </section>

          {data.status === 'INSUFFICIENT_DATA' ? (
            <section className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
              Chưa đủ dữ liệu để đánh giá. Hãy mở Desktop App khi làm việc; khi có đủ thời gian có mặt trong kỳ, các nguy cơ sẽ
              hiện ở đây.
            </section>
          ) : (
            <div className="space-y-4">{sortRisks(data.risks).map((r) => <RiskCard key={r.kbId} risk={r} />)}</div>
          )}
        </>
      )}
    </div>
  )
}
