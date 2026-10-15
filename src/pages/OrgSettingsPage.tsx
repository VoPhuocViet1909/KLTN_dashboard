import { useAuth } from '@/auth/context'
import { ConfigEditor } from '@/components/ConfigEditor'
import { NoOrgNotice } from '@/components/NoOrgNotice'
import { useOrgConfig, useSaveOrgConfig } from '@/lib/api/config'

export function OrgSettingsPage() {
  const { user } = useAuth()
  if (!user?.orgId) return <NoOrgNotice title="Cấu hình tổ chức" />
  return <OrgSettings />
}

/**
 * Cấu hình tổ chức. Khác trang cá nhân: GET trả đúng khóa tổ chức (không gộp) nên "Tùy chỉnh" chính xác,
 * không có khóa hiệu chỉnh riêng máy (backend từ chối ở cấp tổ chức), "Xóa mọi tùy chỉnh" gửi {} thật.
 */
function OrgSettings() {
  const query = useOrgConfig()
  const save = useSaveOrgConfig()
  return (
    <ConfigEditor
      title="Cấu hình tổ chức"
      subtitle="Áp dụng cho mọi nhân viên trong tổ chức. Nhân viên vẫn có thể tự đổi trong Cấu hình cá nhân."
      query={query}
      save={save}
      preserveKeys={[]}
      savedMessage="Đã lưu cấu hình tổ chức. Nhân viên đang mở Desktop App sẽ nhận trong vài giây."
      clearedMessage="Đã xóa mọi tùy chỉnh của tổ chức."
      clearDescription="Mọi giá trị tổ chức đã đặt sẽ quay về mặc định của App. Tùy chỉnh riêng của từng nhân viên vẫn được giữ."
      validationHint="cấu hình này xung đột với tùy chỉnh của ít nhất một nhân viên."
    />
  )
}
