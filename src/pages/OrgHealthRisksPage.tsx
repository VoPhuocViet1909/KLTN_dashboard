import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { NoOrgNotice } from '@/components/NoOrgNotice'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/auth/context'
import { useOrgHealthRisks, type OrgHealthRisks, type Period } from '@/lib/api/insights'
import { useDepartments } from '@/lib/api/org'
import { DISCLAIMER, EVIDENCE_LABEL } from '@/lib/healthRisk'

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
]

export function OrgHealthRisksPage() {
  const { user } = useAuth()
  if (!user?.orgId) return <NoOrgNotice title="Nguy cơ sức khỏe của tổ chức" />
  return <OrgHealthRisks orgId={user.orgId} />
}

function OrgHealthRisks({ orgId }: { orgId: string }) {
  const [period, setPeriod] = useState<Period>('7d')
  const departments = useDepartments(orgId)
  const active = (departments.data ?? []).filter((d) => d.active)
  const results = useOrgHealthRisks(period, active.map((d) => d.id))
  const groups = [{ id: 'all', name: 'Toàn tổ chức' }, ...active.map((d) => ({ id: d.id, name: d.name }))]
  const rows = results[0]?.data?.risks ?? results.find((r) => r.data?.status === 'OK')?.data?.risks ?? []

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Nguy cơ sức khỏe của tổ chức</h1>
          <p className="text-sm text-muted-foreground">
            Số người ở từng mức nguy cơ, tổng hợp ẩn danh. Nhóm dưới 3 người đủ dữ liệu không được hiển thị.
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList aria-label="Khoảng thời gian">
            {PERIODS.map((p) => <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      <p role="note" className="flex items-start gap-2 rounded-lg border bg-accent px-4 py-3 text-sm">
        <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <span><strong className="font-medium">{DISCLAIMER}</strong> Đây là thống kê nhóm, không đánh giá hay nhận diện từng người.</span>
      </p>

      {departments.isPending || results.some((r) => r.isPending) ? (
        <Skeleton className="h-64 w-full" />
      ) : results[0].error ? (
        <p className="text-sm text-destructive" role="alert">Chưa tải được dữ liệu: {results[0].error.message}</p>
      ) : (
        <section className="overflow-x-auto rounded-xl border bg-background" aria-label="Bảng nguy cơ theo nhóm">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Số người ở mức cao, vừa, thấp theo nguy cơ và theo nhóm</caption>
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="p-4 font-medium">Nguy cơ</th>
                {groups.map((g, i) => <GroupHead key={g.id} name={g.name} data={results[i].data} failed={!!results[i].error} />)}
              </tr>
            </thead>
            <tbody>
              {rows.map((risk) => (
                <tr key={risk.kbId} className="border-b last:border-0 align-top">
                  <th scope="row" className="p-4 text-left font-normal">
                    <div className="font-medium">{risk.risk.vi}</div>
                    <div className="text-xs text-muted-foreground">Bằng chứng: {EVIDENCE_LABEL[risk.evidence]}</div>
                  </th>
                  {groups.map((g, i) => <Cell key={g.id} data={results[i].data} kbId={risk.kbId} />)}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={groups.length + 1} className="p-8 text-center text-muted-foreground">
                  Chưa có nhóm nào đủ 3 người có dữ liệu trong kỳ này.
                </td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

function GroupHead({ name, data, failed }: { name: string; data?: OrgHealthRisks; failed: boolean }) {
  return (
    <th scope="col" className="p-4 font-medium">
      <div>{name}</div>
      <div className="text-xs font-normal text-muted-foreground">
        {failed ? 'Lỗi tải' : data?.status === 'OK' ? `${data.groupSize} người đủ dữ liệu` : 'Dưới 3 người: ẩn'}
      </div>
    </th>
  )
}

function Cell({ data, kbId }: { data?: OrgHealthRisks; kbId: string }) {
  if (!data || data.status !== 'OK') return <td className="p-4 text-muted-foreground">—</td>
  const r = data.risks.find((x) => x.kbId === kbId)
  if (!r) return <td className="p-4 text-muted-foreground">—</td>
  return (
    <td className="tabular p-4">
      <div><strong className="font-medium">{r.high}</strong> cao</div>
      <div><strong className="font-medium">{r.medium}</strong> vừa</div>
      <div className="text-muted-foreground">{r.low} thấp</div>
    </td>
  )
}
