import { ConfigEditor } from '@/components/ConfigEditor'
import { useConfigRealtime, useMyConfigDetails, useMyConfigSnapshot, useSaveMyConfig } from '@/lib/api/config'
import { PRESERVED_KEYS } from '@/lib/configFields'
import { useAuth } from '@/auth/context'
import { useDeviceObservations } from '@/realtime/observations'
import { configAcknowledgementText } from '@/realtime/observation'
import { NotificationPolicyEditor } from '@/components/NotificationPolicyEditor'

/** Chỉ sửa khóa cá nhân; khóa không gửi tiếp tục kế thừa tổ chức. */
export function SettingsPage() {
  useConfigRealtime()
  const query = useMyConfigDetails()
  const save = useSaveMyConfig()
  const snapshot = useMyConfigSnapshot()
  const { user } = useAuth()
  const devices = useDeviceObservations(user?.id)
  return (
    <div className="space-y-6">
    <section aria-label="Đồng bộ cấu hình" className="max-w-3xl rounded-xl border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Đồng bộ cấu hình</h2>
      <p className="text-sm text-muted-foreground">{snapshot.isError ? 'Chưa lấy được phiên bản trên server.' : snapshot.data ? `Server đang lưu v${snapshot.data.version}.` : 'Đang lấy phiên bản cấu hình…'} Lưu trên server và nạp trên desktop là hai bước riêng.</p>
      {devices.length ? <ul className="space-y-2 text-sm">{devices.map(device => <li key={device.deviceId}><span className="font-medium break-all">{device.deviceId}</span>: {configAcknowledgementText(device, snapshot.isError ? undefined : snapshot.data)}</li>)}</ul> : <p className="text-sm text-muted-foreground">Chưa nhận được xác nhận từ thiết bị. Mở phiên theo dõi trên desktop để kiểm tra.</p>}
    </section>
    <ConfigEditor
      title="Cấu hình"
      subtitle="Áp dụng cho Desktop App trên mọi máy của bạn."
      query={{ ...query, data: query.data?.personal }}
      inherited={query.data?.organization}
      save={save}
      preserveKeys={PRESERVED_KEYS}
      savedMessage="Đã lưu trên server; xem xác nhận desktop ở phần đồng bộ"
      clearedMessage="Đã xóa mọi tùy chỉnh"
      clearDescription="Các tùy chỉnh sẽ quay về cấu hình tổ chức hoặc mặc định của ứng dụng. Cấu hình hiệu chỉnh camera được giữ nguyên."
    />
    <NotificationPolicyEditor />
    </div>
  )
}
