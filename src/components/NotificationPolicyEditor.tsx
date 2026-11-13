import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/time'
import { minuteText, parseMinute, policyErrors, useNotificationPolicy, useSaveNotificationPolicy, type NotificationPolicy } from '@/lib/api/notificationPolicy'

export function NotificationPolicyEditor() {
  const query = useNotificationPolicy(), save = useSaveNotificationPolicy()
  const [draft, setDraft] = useState<NotificationPolicy | null>(null)
  const [message, setMessage] = useState('')
  const operation = useRef<{ body: string; id: string } | null>(null)
  const errorBox = useRef<HTMLDivElement>(null)
  const value = draft ?? query.data
  const errors = value ? policyErrors(value) : {}
  const stale = draft && query.data && draft.version !== query.data.version
  function change(values: Partial<NotificationPolicy>) {
    if (value) setDraft({ ...value, ...values })
    setMessage('')
    operation.current = null
  }
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!value || stale || Object.keys(errors).length) { errorBox.current?.focus(); return }
    const { version, updatedAt: _updatedAt, ...settings } = value
    const body = JSON.stringify({ ...settings, expectedVersion: version })
    if (operation.current?.body !== body) operation.current = { body, id: crypto.randomUUID() }
    save.mutate({ ...settings, expectedVersion: version, operationId: operation.current.id }, {
      onSuccess: () => { setDraft(null); operation.current = null; setMessage('Đã lưu trên server. Desktop đang kết nối kiểm tra tối đa mỗi 30 giây; xem phiên bản chính sách đã nạp trên ứng dụng desktop.') },
      onError: error => {
        setMessage(error instanceof ApiError && error.status === 409 ? 'Cấu hình đã thay đổi hoặc thao tác bị xung đột. Tải bản server rồi chỉnh lại.' : 'Chưa lưu được. Bản đang sửa được giữ lại; kiểm tra kết nối rồi thử lại.')
        if (error instanceof ApiError && error.status === 409) void query.refetch()
        setTimeout(() => errorBox.current?.focus(), 0)
      },
    })
  }
  return <section aria-labelledby="notification-policy-title" className="max-w-3xl space-y-4 rounded-xl border bg-card p-5">
    <div className="space-y-2">
      <h2 id="notification-policy-title" className="text-lg font-semibold">Giờ yên lặng và tập trung</h2>
      <p className="text-sm text-muted-foreground">Điều chỉnh thông báo trên máy tính. Banner, sự kiện và số liệu vẫn được ghi nhận; thông báo bị chặn không phát lại khi hết hạn. Thiết bị IoT có cấu hình riêng.</p>
    </div>
    {query.isPending ? <p role="status">Đang tải chính sách nhắc…</p> : query.isError ? <div role="alert" className="space-y-3"><p>Chưa tải được chính sách nhắc. Kiểm tra backend đã cập nhật và thử lại.</p><Button className="min-h-11" variant="outline" onClick={() => void query.refetch()}>Thử tải lại</Button></div> : value && <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Server lưu v{query.data?.version}. Tất cả giờ bên dưới theo giờ Việt Nam (UTC+7).</p>
      <div ref={errorBox} tabIndex={-1} role="status" aria-live="polite" className="text-sm space-y-2">
        {message && <p>{message}</p>}
        {stale && <p>Bản server đã thay đổi. Bản đang sửa của bạn vẫn được giữ; tải bản mới trước khi lưu.</p>}
        {Object.entries(errors).map(([key, text]) => <p key={key}><a href={`#policy-${key}`} className="underline">{text}</a></p>)}
      </div>
      <div className="flex items-center justify-between gap-4"><Label className="flex min-h-11 flex-1 items-center" htmlFor="policy-quietEnabled">Bật giờ yên lặng mỗi ngày</Label><Switch id="policy-quietEnabled" checked={value.quietEnabled} onCheckedChange={checked => change({ quietEnabled: checked })} disabled={save.isPending} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['quietStartMinute', 'quietEndMinute'] as const).map((key, index) => <div className="space-y-2" key={key}>
          <Label htmlFor={`policy-${key}`}>{index ? 'Kết thúc yên lặng' : 'Bắt đầu yên lặng'}</Label>
          <Input className="min-h-11" id={`policy-${key}`} type="time" value={Number.isFinite(value[key]) ? minuteText(value[key]) : ''} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `policy-error-${key}` : undefined} onChange={event => change({ [key]: parseMinute(event.target.value) })} disabled={save.isPending} />
          {errors[key] && <p id={`policy-error-${key}`} className="text-sm text-destructive">{errors[key]}</p>}
        </div>)}
      </div>
      <div className="space-y-2"><Label htmlFor="policy-minimumGapSec">Giãn cách giữa các thông báo (giây)</Label>
        <Input className="min-h-11" id="policy-minimumGapSec" type="number" min={0} max={900} step={1} value={Number.isFinite(value.minimumGapSec) ? value.minimumGapSec : ''} onChange={event => change({ minimumGapSec: event.target.value === '' ? NaN : Number(event.target.value) })} disabled={save.isPending} aria-invalid={!!errors.minimumGapSec} />
        <p className="text-sm text-muted-foreground">0 = không giãn cách thêm. Tối đa 900 giây; không thay ngưỡng nhận diện.</p>
        {errors.minimumGapSec && <p className="text-sm text-destructive">{errors.minimumGapSec}</p>}
      </div>
      <fieldset className="space-y-3"><legend className="mb-3 text-sm font-medium">Kênh được phép dùng</legend>
        {([['toast', 'Thông báo hệ thống'], ['sound', 'Âm thanh'], ['popup', 'Cửa sổ nổi']] as const).map(([key, label]) => <div className="flex items-center justify-between gap-4" key={key}><Label className="flex min-h-11 flex-1 items-center" htmlFor={`policy-${key}`}>{label}</Label><Switch id={`policy-${key}`} checked={value[key]} onCheckedChange={checked => change({ [key]: checked })} disabled={save.isPending} /></div>)}
        <p className="text-sm text-muted-foreground">Các công tắc thông báo chung bên trên vẫn phải được bật. Chính sách này không tự bật lại kênh đã tắt.</p>
      </fieldset>
      <div className="space-y-3">
        <p className="text-sm">Tập trung {value.focusUntil ? `đến ${formatDateTime(value.focusUntil)} (sau mốc này tự hết hiệu lực)` : 'đang tắt'}. Chọn thời hạn rồi lưu để áp dụng.</p>
        <div className="flex flex-wrap gap-2">{[15, 30, 60, 120].map(minutes => <Button className="min-h-11" type="button" variant="outline" key={minutes} disabled={save.isPending} onClick={() => change({ focusUntil: new Date(Date.now() + minutes * 60_000).toISOString() })}>{minutes} phút</Button>)}<Button className="min-h-11" type="button" variant="outline" disabled={save.isPending} onClick={() => change({ focusUntil: null })}>Tắt tập trung</Button></div>
      </div>
      <div className="flex flex-wrap gap-3"><Button className="min-h-11" type="submit" disabled={save.isPending || !!stale || Object.keys(errors).length > 0}>{save.isPending ? 'Đang lưu…' : 'Lưu chính sách nhắc'}</Button><Button className="min-h-11" type="button" variant="outline" disabled={save.isPending} onClick={() => { setDraft(null); operation.current = null; setMessage(''); void query.refetch() }}>Tải bản server</Button></div>
    </form>}
  </section>
}
