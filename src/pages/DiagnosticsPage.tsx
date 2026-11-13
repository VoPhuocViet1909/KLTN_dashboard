import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/button'
import { Fact } from '@/components/Fact'
import { request } from '@/lib/api/client'
import { useMyConfigSnapshot } from '@/lib/api/config'
import { formatDateTime, formatDuration } from '@/lib/time'
import { useRealtimeConnected } from '@/realtime/hooks'
import { useDeviceObservations } from '@/realtime/observations'
import { configAcknowledgementText, OBSERVATION_LABEL } from '@/realtime/observation'
import { DELIVERY_LABEL, FAILURE_HINT } from '@/realtime/diagnostics'

export function DiagnosticsPage() {
  const { user } = useAuth()
  const connected = useRealtimeConnected()
  const devices = useDeviceObservations(user?.id)
  const snapshot = useMyConfigSnapshot()
  const health = useQuery({ queryKey: ['diagnostics', 'api-health'], queryFn: () => request({ url: '/health', timeout: 5000 }), refetchInterval: 15_000, retry: false })
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const checkedAt = Math.max(health.dataUpdatedAt, health.errorUpdatedAt)
  const healthFresh = checkedAt > 0 && now - checkedAt <= 30_000
  const elapsed = (value?: string | null) => value ? formatDuration(Math.max(0, (now - Date.parse(value)) / 1000)) + ' trước' : 'Chưa có dữ liệu'
  const milliseconds = (value?: number | null) => value == null ? 'Chưa đo' : `${value.toLocaleString('vi-VN')} ms`

  return <div className="max-w-5xl space-y-6">
    <div className="space-y-1"><h1 className="text-2xl font-semibold">Chẩn đoán kết nối và đồng bộ</h1><p className="text-sm text-muted-foreground">Theo dõi các thiết bị của chính bạn. Kết nối realtime, camera và gửi dữ liệu là các trạng thái riêng.</p></div>
    <section aria-label="Kết nối web" className="rounded-xl border bg-background p-4 sm:p-6 space-y-4">
      <h2 className="font-medium">Kết nối web</h2>
      <dl className="grid gap-4 sm:grid-cols-3 text-sm">
        <Fact label="Đường API" value={health.isPending ? 'Đang kiểm tra…' : !healthFresh ? 'Chưa kiểm tra gần đây' : health.isError ? 'Kiểm tra thất bại' : 'API phản hồi'} hint={checkedAt ? `Kiểm tra lúc ${formatDateTime(new Date(checkedAt).toISOString())}` : undefined} />
        <Fact label="Cập nhật trực tiếp" value={connected ? 'Đang kết nối' : 'Đang gián đoạn'} hint="Kết nối web với kênh trạng thái thiết bị." />
        <Fact label="Cấu hình trên server" value={snapshot.isError ? 'Chưa lấy được' : snapshot.data ? `v${snapshot.data.version}` : 'Đang tải…'} hint="Phiên bản server khác với xác nhận đã nạp trên desktop." />
      </dl>
      <p className="text-xs text-muted-foreground">API phản hồi chưa xác nhận mọi dịch vụ hoặc cơ sở dữ liệu hoạt động. Số liệu hàng đợi do desktop tự báo; ACK nhận lô chưa xác nhận báo cáo Analytics đã cập nhật.</p>
      <Button variant="outline" className="min-h-11" disabled={health.isFetching || snapshot.isFetching} onClick={() => { void health.refetch(); void snapshot.refetch() }}>Kiểm tra lại kết nối</Button>
    </section>
    {!devices.length && <section className="rounded-xl border bg-background p-6 text-sm"><p>Chưa có thiết bị gửi trạng thái gần đây. Mở ứng dụng desktop, đăng nhập cùng tài khoản và bắt đầu theo dõi.</p><p className="mt-2 text-muted-foreground">Thiết bị đã ngừng gửi lâu sẽ không còn trong ảnh chụp trạng thái mới.</p></section>}
    {devices.map(device => {
      const data = device.diagnosticsFresh ? device.diagnostics : undefined
      const config = device.configFresh ? device.config : undefined
      const camera = device.state === 'CAMERA_LOST' ? 'Mất kết nối camera' : device.state === 'OFFLINE' ? 'Chưa xác nhận hiện tại' : device.sessionId ? 'Có quan sát mới' : 'Chưa có quan sát mới'
      return <section key={device.deviceId} aria-label={`Chẩn đoán ${device.deviceId}`} className="rounded-xl border bg-background p-4 sm:p-6 space-y-4">
        <div className="space-y-1"><h2 className="font-medium break-all">{device.deviceId}</h2><p className="text-xs text-muted-foreground">Nhận trạng thái {elapsed(device.ts)} · {formatDateTime(device.ts)}</p></div>
        <dl className="grid gap-4 sm:grid-cols-3 text-sm">
          <Fact label="Camera" value={camera} hint={OBSERVATION_LABEL[device.state]} />
          <Fact label="Gửi dữ liệu" value={data ? DELIVERY_LABEL[data.deliveryState] : 'Chưa có dữ liệu hiện tại'} />
          <Fact label="Xác nhận cấu hình" value={config ? `v${config.version} · ${config.state === 'APPLIED' ? 'Đã nạp' : 'Từ chối'}` : 'Chưa xác nhận hiện tại'} />
        </dl>
        <p className="text-sm">{configAcknowledgementText(device, snapshot.isError ? undefined : snapshot.data)}</p>
        {!data ? <p role="status" className="text-sm text-muted-foreground">{device.diagnostics ? 'Chẩn đoán đã hết hiệu lực hoặc realtime gián đoạn; không dùng số liệu cũ làm trạng thái hiện tại.' : 'Desktop chưa gửi chẩn đoán. Cần desktop và backend hỗ trợ tính năng này; trạng thái tư thế vẫn hoạt động với bản cũ.'}</p> : <>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5 text-sm">
            <Fact label="Chờ ghi vào hàng đợi" value={String(data.queued)} />
            <Fact label="Đã lưu, chờ gửi" value={String(data.pending)} />
            <Fact label="Đã thử, chờ gửi lại" value={String(data.retrying)} />
            <Fact label="Bị từ chối, không gửi lại" value={String(data.dead)} />
            <Fact label="Được nhận trong phiên" value={String(data.acceptedSinceStart)} />
          </dl>
          {data.lastFailureCode && <p role="status" className="rounded-md border p-3 text-sm">{FAILURE_HINT[data.lastFailureCode]}</p>}
          {data.dead > 0 && <p className="text-sm">Có dữ liệu bị từ chối. Mở lịch sử gửi dữ liệu trên desktop để kiểm tra; không xóa hàng đợi khi chưa xác định nguyên nhân.</p>}
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <Fact label="Lần thử gửi gần nhất" value={formatDateTime(data.lastAttemptAt)} hint={milliseconds(data.lastAttemptMs)} />
            <Fact label="Lần được nhận gần nhất" value={formatDateTime(data.lastAcceptedAt)} hint={elapsed(data.lastAcceptedAt)} />
            <Fact label="Mục chờ gửi lâu nhất" value={formatDateTime(data.oldestPendingAt)} hint={data.pending ? elapsed(data.oldestPendingAt) : 'Không có mục đang chờ trong SQLite.'} />
            <Fact label="Lần tải và nạp cấu hình gần nhất" value={milliseconds(data.configFetchApplyMs)} />
          </dl>
          <p className="text-xs text-muted-foreground">Thời gian tải và nạp được đo tại desktop từ lúc lấy đến nạp xong; chưa gồm thời gian chờ đồng bộ.</p>
        </>}
        {device.sessionId && <p className="text-xs text-muted-foreground break-all">Mã phiên theo dõi: {device.sessionId}</p>}
      </section>
    })}
  </div>
}
