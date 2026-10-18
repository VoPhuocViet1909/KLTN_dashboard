import { ConfigEditor } from '@/components/ConfigEditor'
import { useConfigRealtime, useMyConfigDetails, useSaveMyConfig } from '@/lib/api/config'
import { PRESERVED_KEYS } from '@/lib/configFields'

/** Chỉ sửa khóa cá nhân; khóa không gửi tiếp tục kế thừa tổ chức. */
export function SettingsPage() {
  useConfigRealtime()
  const query = useMyConfigDetails()
  const save = useSaveMyConfig()
  return (
    <ConfigEditor
      title="Cấu hình"
      subtitle="Áp dụng cho Desktop App trên mọi máy của bạn."
      query={{ ...query, data: query.data?.personal }}
      inherited={query.data?.organization}
      save={save}
      preserveKeys={PRESERVED_KEYS}
      savedMessage="Đã lưu cấu hình"
      clearedMessage="Đã xóa mọi tùy chỉnh"
      clearDescription="Các tùy chỉnh sẽ quay về cấu hình tổ chức hoặc mặc định của ứng dụng. Cấu hình hiệu chỉnh camera được giữ nguyên."
    />
  )
}
