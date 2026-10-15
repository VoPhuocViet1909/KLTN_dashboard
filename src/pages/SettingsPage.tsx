import { ConfigEditor } from '@/components/ConfigEditor'
import { useConfigRealtime, useMyConfig, useSaveMyConfig } from '@/lib/api/config'
import { PRESERVED_KEYS } from '@/lib/configFields'

/** Cấu hình cá nhân: GET trả cấu hình đã gộp tổ chức + cá nhân; PUT thay toàn bộ phần cá nhân. */
export function SettingsPage() {
  useConfigRealtime()
  const query = useMyConfig()
  const save = useSaveMyConfig()
  return (
    <ConfigEditor
      title="Cấu hình"
      subtitle="Áp dụng cho Desktop App trên mọi máy của bạn."
      query={query}
      save={save}
      preserveKeys={PRESERVED_KEYS}
      savedMessage="Đã lưu cấu hình"
      clearedMessage="Đã xóa mọi tùy chỉnh"
      clearDescription="Tất cả giá trị bạn đã đặt sẽ quay về mặc định trên mọi máy. Cấu hình hiệu chỉnh camera của từng máy được giữ nguyên."
    />
  )
}
