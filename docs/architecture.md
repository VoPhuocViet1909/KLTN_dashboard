# Bản đồ frontend cho AI

Đối chiếu mã ngày 18/10/2026 tại `279cffc94d64df2532fac03c4c48574a15d6b904` (main, PR #9).
Repo: https://github.com/VoPhuocViet1909/KLTN_dashboard.
Sơ đồ chỉnh sửa được: [frontend-architecture.drawio](frontend-architecture.drawio).

## Nguồn dùng chung trên GitHub

Bạn và AI chỉ cần clone repo frontend để đọc tài liệu này và sơ đồ đi kèm.
Không phụ thuộc file skill nằm ngoài Git trên máy người tạo.

- [Backend](https://github.com/luongtan204/DoAnTotNghiep_BE): đọc [team-sync](https://github.com/luongtan204/DoAnTotNghiep_BE/blob/main/.codex/skills/team-sync/SKILL.md) để biết API, quy tắc nhóm và tiến độ Dashboard.
- [Tiến độ toàn dự án](https://github.com/luongtan204/DoAnTotNghiep_BE/blob/main/.codex/skills/kltn-project/SKILL.md): bản skill đã được Git theo dõi trong backend; đây là nguồn chung về bằng chứng backend/edge, không cần chép file từ ổ G:.
- [Desktop/edge](https://github.com/VoPhuocViet1909/KLTN_modelPosture): camera, mô hình ONNX, telemetry và tài liệu bàn giao.
- [Sơ đồ backend](https://github.com/luongtan204/DoAnTotNghiep_BE/blob/main/.codex/skills/posture-microservices/posture-microservices.drawio).

Link `main` luôn theo bản mới nhất; mốc frontend ở đầu trang là bằng chứng cho nội dung bản đồ này.
Nếu repo riêng tư, người đọc cần được cấp quyền GitHub. Khi không truy cập được nguồn API, không tự suy ra hợp đồng mới từ bản đồ này.

## Vị trí local tham khảo

| Thành phần | Đường dẫn từ `G:/KhoaLuanTotNghiep` | Vai trò |
| --- | --- | --- |
| Frontend | `FE/KLTN_dashboard` | Dashboard React chạy trong trình duyệt |
| Backend | `BE/DoAnTotNghiep_BE` | Gateway, xác thực, thống kê, cảnh báo, cấu hình, tổ chức, realtime |
| Desktop/edge | `KLTN_modelPosture` | Camera, suy luận mô hình, gửi telemetry và video |
| Tổng quan và bằng chứng | `.codex/skills/kltn-project/SKILL.md` | Tiến độ toàn dự án; có bản mirror trong backend |
| Hợp đồng API hiện hành | `BE/DoAnTotNghiep_BE/.codex/skills/team-sync/SKILL.md` | Đọc mục 4 trước khi tích hợp API |

Git ở gốc workspace là backend cũ; thao tác Git frontend phải chạy trong `FE/KLTN_dashboard`.
Không dùng `api_handover/openapi.yaml` v1.5 để suy ra API mới: tài liệu đó đã đóng băng.

## Luồng mã

```text
index.html → src/main.tsx
  QueryClientProvider → RouterProvider → AuthProvider → AppRoutes
    /login
    RequireAuth → AppLayout → pages/ (theo role)
      ├─ lib/api/*.ts → client.ts → /api/v1 → Gateway → service sở hữu API
      └─ realtime/hooks.ts → socket.ts → /socket.io → Gateway → Notification

Desktop camera → Ingestion → Kafka → Analytics / Alert / Notification
                                         └→ dữ liệu REST và status cho Dashboard
Dashboard → Config API → config.updates → Notification → config cho client
```

Luồng service phía sau Gateway là ngữ cảnh từ skill dự án; cần kiểm mã backend khi sửa backend.
Frontend hiện chưa có route xem video/camera; viewer backend `/camera.html` là giao diện riêng.

## Route và điểm sửa

| Quyền | Route | Trang |
| --- | --- | --- |
| Công khai | `/login` | `LoginPage.tsx` |
| Mọi role đã đăng nhập | `/`, `/habits`, `/history`, `/settings` | `OverviewPage`, `HabitsPage`, `HistoryPage`, `SettingsPage` |
| ORG_ADMIN | `/org`, `/org/users`, `/org/departments`, `/org/settings` | `OrgOverviewPage`, `OrgUsersPage`, `OrgDepartmentsPage`, `OrgSettingsPage` |
| SYS_ADMIN | `/admin/organizations`, `/admin/users` | `AdminOrganizationsPage`, `AdminUsersPage` |
| Đã đăng nhập | `/403`, đường dẫn không khớp | `misc.tsx` |

Route khai báo trong `src/routes.tsx`; menu trong `src/layouts/AppLayout.tsx`.
Các nhóm ORG_ADMIN và SYS_ADMIN được chặn riêng, không tự suy ra SYS_ADMIN được vào route ORG_ADMIN.

| Phần | File/thư mục cần đọc |
| --- | --- |
| Phiên đăng nhập | `src/auth/AuthProvider.tsx`, `RequireAuth.tsx`, `src/lib/api/auth.ts` |
| HTTP, token, lỗi | `src/lib/api/client.ts`, `tokenStore.ts`, `errors.ts` |
| Query/mutation | `src/lib/api/stats.ts`, `alerts.ts`, `config.ts`, `org.ts`, `users.ts` |
| Realtime | `src/realtime/socket.ts`, `hooks.ts`; trang tổng quan nghe `status` |
| Form dùng chung | `src/components/ConfigEditor.tsx`, `UsersManager.tsx` |
| Biểu đồ và giao diện | `src/components/charts/`, `ui/`, `src/index.css` |
| Quy tắc thiết kế | `.agents/skills/design-system/SKILL.md` |

## Xác thực và dữ liệu

- Access token giữ trong RAM; refresh token và user giữ trong localStorage (`kltn.refreshToken`, `kltn.user`). Khi mở lại trang, AuthProvider refresh rồi gọi `/auth/me`.
- `client.ts` dùng axios chung với base `/api/v1`, gắn Bearer và refresh dùng chung một Promise. Request gặp 401 được gửi lại tối đa một lần; Socket.IO cũng dùng hàm refresh này.
- `403 ORGANIZATION_INACTIVE` kết thúc phiên; lỗi mạng/5xx khi refresh giữ token cho lần thử sau. Đọc `errors.ts` để xử lý theo code.
- REST server state dùng TanStack Query. Realtime dùng một socket chung, token nằm trong `auth` khi kết nối; dùng hook có sẵn, không mở socket riêng.
- Config cá nhân/tổ chức dùng chung ConfigEditor. Thời gian gửi bằng ISO-8601, hiển thị theo giờ Việt Nam qua `src/lib/time.ts`.

## Chạy và giới hạn kiểm chứng

Tại repo frontend: `npm ci`, `npm run dev` (cổng 5173); `npm run build` kiểm TypeScript và tạo `dist`, `npm run lint` chạy oxlint.
`vite.config.ts` chuyển tiếp `/api` và `/socket.io` tới `VITE_PROXY_TARGET`, mặc định `http://127.0.0.1:8080`; không cần tạo `.env` nếu dùng mặc định.
Proxy này phục vụ dev. Triển khai production cần cấu hình phục vụ SPA và proxy API/Socket.IO riêng.

Đã thấy mã cho các trang cá nhân, ORG_ADMIN và SYS_ADMIN; điều này không xác nhận runtime.
Ngày 18/10/2026: `npm ci --no-audit --no-fund`, `npm run build`, `npm run lint` đều thoát 0;
build có cảnh báo chunk JavaScript lớn hơn 500 kB. XML sơ đồ parse thành công.
Lượt kéo mã này chưa kiểm đăng nhập, realtime, phân quyền hoặc dữ liệu với mock/backend thật; chưa nghiệm thu E2E, Docker/nginx hay triển khai domain.
