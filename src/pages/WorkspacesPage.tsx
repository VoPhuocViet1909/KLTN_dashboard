import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProgressWrite, progressError } from '@/lib/api/progress'
import { WORKSPACE_KEY, useWorkspaces, useRegisteredDevices, useDevicePreferences, useDeviceHistory, type Workspace, type RegisteredDevice } from '@/lib/api/workspaces'
import { formatDateTime } from '@/lib/time'
import { useAuth } from '@/auth/context'
import { useDeviceObservations } from '@/realtime/observations'
import { OBSERVATION_LABEL } from '@/realtime/observation'

const control = 'min-h-11 rounded-md border bg-background px-3 text-sm'
const TYPES = { HOME: 'Ở nhà', OFFICE: 'Văn phòng', OTHER: 'Khác' }
export function WorkspacesPage() {
  const workspaces = useWorkspaces(), devices = useRegisteredDevices(), preferences = useDevicePreferences()
  const { user } = useAuth(), live = useDeviceObservations(user?.id)
  const [workspace, setWorkspace] = useState<Partial<Workspace> | null>(null)
  const [device, setDevice] = useState<Partial<RegisteredDevice> | null>(null)
  const [historyKey, setHistoryKey] = useState<string>()
  const validDeviceId = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(device?.deviceId ?? '')
  const history = useDeviceHistory(historyKey)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const write = useProgressWrite(), qc = useQueryClient()
  const name = (id?: string | null) => workspaces.data?.find(item => item.workspaceId === id)?.name ?? 'Chưa gán vị trí'
  async function save(path: string, body: Record<string, unknown>) {
    setBusy(true); setMessage('')
    try {
      await write(path, body)
      setWorkspace(null); setDevice(null)
      await qc.invalidateQueries({ queryKey: WORKSPACE_KEY })
      setMessage('Đã lưu trên server. Đổi vị trí cần được xác nhận và hiệu chỉnh lại trên desktop.')
    } catch (error) { setMessage(progressError(error) + ' Bản đang sửa được giữ lại. Tải lại danh sách để đối chiếu phiên bản nếu có xung đột.') }
    finally { setBusy(false) }
  }
  function submitWorkspace(event: FormEvent) {
    event.preventDefault()
    if (!workspace) return
    void save(`/config/me/workspaces/${workspace.workspaceId}`, { expectedVersion: workspace.version ?? 0, name: workspace.name?.trim(), type: workspace.type, status: workspace.status })
  }
  function submitDevice(event: FormEvent) {
    event.preventDefault()
    if (!device) return
    if (!validDeviceId) { setMessage('Mã thiết bị chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang; tối đa 128 ký tự.'); return }
    void save(`/config/me/devices/${device.deviceKey}`, { expectedVersion: device.version ?? 0, deviceId: device.deviceId, name: device.name?.trim(), workspaceId: device.workspaceId ?? null, status: device.status })
  }
  const error = workspaces.isError || devices.isError || preferences.isError
  return <div className="max-w-5xl space-y-6">
    <header className="space-y-2"><h1 className="text-2xl font-semibold">Vị trí và thiết bị</h1><p className="text-sm text-muted-foreground">Hồ sơ của tài khoản này. Camera và baseline lưu riêng tại từng máy; đổi vị trí cần hiệu chỉnh lại. Không suy vị trí quá khứ từ hồ sơ hiện tại.</p></header>
    <p role="status" aria-live="polite" className="text-sm">{message}</p>
    {error && <div role="alert" className="space-y-3"><p>Chưa tải đủ hồ sơ. Kiểm tra backend đã cập nhật rồi tải lại; không dùng danh sách thiếu để thay đổi thiết bị.</p><Button className="min-h-11" variant="outline" onClick={() => void qc.invalidateQueries({ queryKey: WORKSPACE_KEY })}>Tải lại danh sách</Button></div>}
    {(workspaces.isPending || devices.isPending || preferences.isPending) && <p role="status">Đang tải hồ sơ…</p>}
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Chỗ làm việc</h2><Button className="min-h-11" disabled={busy || error || !workspaces.data} onClick={() => { setWorkspace({ workspaceId: crypto.randomUUID(), name: '', type: 'HOME', status: 'ACTIVE', version: 0 }); setDevice(null) }}>Thêm vị trí</Button></div>
      {workspace && <form className="space-y-3 rounded-lg border p-4" onSubmit={submitWorkspace}>
        <label className="flex flex-col gap-2 text-sm">Tên vị trí<Input className="min-h-11" autoFocus required maxLength={80} value={workspace.name ?? ''} onChange={event => setWorkspace({ ...workspace, name: event.target.value })} disabled={busy} /></label>
        <label className="flex flex-col gap-2 text-sm">Loại vị trí<select className={control} value={workspace.type} onChange={event => setWorkspace({ ...workspace, type: event.target.value as Workspace['type'] })} disabled={busy}>{Object.entries(TYPES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-sm">Trạng thái<select className={control} value={workspace.status} onChange={event => setWorkspace({ ...workspace, status: event.target.value as Workspace['status'] })} disabled={busy}><option value="ACTIVE">Đang dùng</option><option value="ARCHIVED">Đã lưu trữ</option></select></label>
        <div className="flex gap-3"><Button className="min-h-11" disabled={busy || !workspace.name?.trim()}>{busy ? 'Đang lưu…' : 'Lưu vị trí'}</Button><Button className="min-h-11" type="button" variant="outline" disabled={busy} onClick={() => setWorkspace(null)}>Hủy</Button></div>
      </form>}
      <ul className="space-y-3">{workspaces.data?.map(item => <li key={item.workspaceId} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">{TYPES[item.type]} · {item.status === 'ACTIVE' ? 'Đang dùng' : 'Đã lưu trữ'} · v{item.version}</p></div><Button className="min-h-11" variant="outline" disabled={busy || error} onClick={() => { setWorkspace(item); setDevice(null) }}>Sửa vị trí {item.name}</Button></li>)}</ul>
      {workspaces.data?.length === 0 && <p className="text-sm text-muted-foreground">Chưa có vị trí. Thêm chỗ làm ở nhà hoặc văn phòng.</p>}
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Thiết bị đã đăng ký</h2><Button className="min-h-11" disabled={busy || error || !devices.data} onClick={() => { setDevice({ deviceKey: crypto.randomUUID(), deviceId: '', name: '', workspaceId: null, status: 'ACTIVE', version: 0 }); setWorkspace(null) }}>Thêm thiết bị</Button></div>
      <p className="text-sm text-muted-foreground">Mã thiết bị lấy từ ứng dụng desktop. Đăng ký là khai báo của tài khoản, không xác minh phần cứng hoặc cấp quyền xem camera người khác. Lần thấy cuối là heartbeat tự báo, không chứng minh có người trước camera.</p>
      {device && <form className="space-y-3 rounded-lg border p-4" onSubmit={submitDevice}>
        {device.deviceId && !validDeviceId && <p role="alert" className="text-sm text-destructive">Mã thiết bị chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang; tối đa 128 ký tự.</p>}
        <label className="flex flex-col gap-2 text-sm">Tên thiết bị<Input className="min-h-11" required maxLength={80} value={device.name ?? ''} onChange={event => setDevice({ ...device, name: event.target.value })} disabled={busy} /></label>
        <label className="flex flex-col gap-2 text-sm">Mã thiết bị<Input className="min-h-11" required aria-invalid={!validDeviceId} maxLength={128} value={device.deviceId ?? ''} onChange={event => setDevice({ ...device, deviceId: event.target.value })} disabled={busy || !!device.version} /><span className="text-muted-foreground">Không đổi mã sau đăng ký để giữ đúng lịch sử.</span></label>
        <label className="flex flex-col gap-2 text-sm">Vị trí<select className={control} value={device.workspaceId ?? ''} disabled={busy} onChange={event => setDevice({ ...device, workspaceId: event.target.value || null })}><option value="">Chưa gán vị trí</option>{workspaces.data?.map(item => <option key={item.workspaceId} value={item.workspaceId} disabled={item.status !== 'ACTIVE'}>{item.name}{item.status === 'ARCHIVED' ? ' (đã lưu trữ)' : ''}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-sm">Trạng thái<select className={control} value={device.status} disabled={busy} onChange={event => setDevice({ ...device, status: event.target.value as RegisteredDevice['status'] })}><option value="ACTIVE">Đang dùng</option><option value="ARCHIVED">Đã lưu trữ</option></select></label>
        <div className="flex flex-wrap gap-3"><Button className="min-h-11" disabled={busy || !device.name?.trim() || !validDeviceId}>{busy ? 'Đang lưu…' : 'Lưu thiết bị'}</Button><Button className="min-h-11" type="button" variant="outline" disabled={busy} onClick={() => setDevice(null)}>Hủy</Button></div>
      </form>}
      <ul className="space-y-4">{devices.data?.map(item => {
        const observation = live.find(value => value.deviceId === item.deviceId)
        return <li key={item.deviceKey} className="border-t pt-4 space-y-3">
          <div><p className="font-medium">{item.name}{preferences.data?.defaultDeviceKey === item.deviceKey ? ' · Mặc định' : ''}</p><p className="text-sm break-all">{item.deviceId} · {name(item.workspaceId)} · {item.status === 'ACTIVE' ? 'Đang dùng' : 'Đã lưu trữ'} · v{item.version}</p><p className="text-sm text-muted-foreground">Lần thấy cuối: {formatDateTime(item.lastSeenAt)}. Quan sát hiện tại: {observation ? OBSERVATION_LABEL[observation.state] : 'Chưa có cập nhật trực tiếp'}.</p></div>
          <div className="flex flex-wrap gap-2"><Button className="min-h-11" variant="outline" disabled={busy || error} onClick={() => { setDevice(item); setWorkspace(null) }}>Sửa thiết bị {item.name}</Button><Button className="min-h-11" variant="outline" onClick={() => setHistoryKey(item.deviceKey)}>Lịch sử gán {item.name}</Button><Button className="min-h-11" variant="outline" disabled={busy || error || item.status !== 'ACTIVE' || preferences.data?.defaultDeviceKey === item.deviceKey} onClick={() => void save('/config/me/device-preferences', { expectedVersion: preferences.data?.version, defaultDeviceKey: item.deviceKey })}>Chọn mặc định</Button><Link className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm" to={`/progress?device=${encodeURIComponent(item.deviceId)}`}>Báo cáo riêng thiết bị</Link></div>
        </li>
      })}</ul>
      {devices.data?.length === 0 && <p className="text-sm text-muted-foreground">Chưa có thiết bị. Đăng ký mã từ desktop để gán vị trí.</p>}
      <p className="text-sm text-muted-foreground">Báo cáo mở cho đúng một thiết bị; không cộng giờ nhiều máy thành tổng giờ làm việc.</p>
      {preferences.data?.defaultDeviceKey && <Button className="min-h-11" variant="outline" disabled={busy || error} onClick={() => void save('/config/me/device-preferences', { expectedVersion: preferences.data?.version, defaultDeviceKey: null })}>Bỏ thiết bị mặc định</Button>}
    </section>
    {historyKey && <section className="rounded-xl border bg-card p-5 space-y-3"><h2 className="font-semibold">Lịch sử thiết bị và vị trí</h2>{history.isPending ? <p>Đang tải lịch sử…</p> : history.isError ? <p role="alert">Chưa tải được lịch sử. Thử mở lại khi có kết nối.</p> : <ul className="space-y-3">{history.data?.map(item => <li key={item.version} className="text-sm">v{item.version} · {formatDateTime(item.updatedAt)} · {item.name} · {name(item.workspaceId)} · {item.status === 'ACTIVE' ? 'Đang dùng' : 'Đã lưu trữ'} · gán từ {formatDateTime(item.assignedAt)}</li>)}</ul>}<p className="text-sm text-muted-foreground">Tên vị trí là tên hiện tại; UUID và revision gán được giữ. Trước lần đăng ký đầu tiên chưa có lịch sử vị trí.</p><Button className="min-h-11" variant="outline" onClick={() => setHistoryKey(undefined)}>Đóng lịch sử</Button></section>}
  </div>
}
