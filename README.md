# KLTN Dashboard

Web Dashboard của hệ thống giám sát tư thế ngồi: thống kê cá nhân, lịch sử cảnh báo, trạng thái realtime,
quản lý tổ chức. API và quy tắc nhóm: xem `team-sync` ở repo backend (`AGENTS.md` có đường dẫn).

React 19 + Vite + TypeScript · Tailwind CSS 4 · React Router · TanStack Query · axios · socket.io-client

## Chạy

Cần Node 20 trở lên.

```powershell
npm install
copy .env.example .env      # sửa VITE_PROXY_TARGET nếu backend không ở localhost:8080
npm run dev                 # http://localhost:5173
```

Vite chuyển tiếp `/api` và `/socket.io` tới `VITE_PROXY_TARGET`, nên lúc dev không cần CORS.

**Không cần backend** – dùng server giả trong repo `KLTN_modelPosture`:

```powershell
cd ..\GIT_KLTN\api_handover
python mock_server.py --require-login
python replay.py seed --base http://127.0.0.1:8080 --email demo@kltn.local --password 123456 --devices 2 --days 14
```

Đặt `VITE_PROXY_TARGET=http://127.0.0.1:8080` rồi đăng nhập `demo@kltn.local` / `123456`
(ORG_ADMIN: `admin@kltn.local` / `123456`). Mock chưa có `/auth/me`, `/users`, `/organizations` và Socket.IO,
nên console có vài lỗi 404 và góc trên hiện "Mất kết nối realtime" – bình thường.

**Với backend thật:** `docker compose up` trong repo backend (Gateway ở `localhost:8080`), bật
`AUTH_SEED_DEMO=true` để có tài khoản thử.

## Cấu trúc

| Đường dẫn | Việc |
| --- | --- |
| `src/lib/api/client.ts` | axios dùng chung: gắn token, gặp 401 thì refresh **một lần cho cả app** rồi gửi lại |
| `src/lib/api/errors.ts` | `ApiError {status, code, message, fieldErrors}` từ body lỗi chuẩn |
| `src/lib/api/tokenStore.ts` | access token trong bộ nhớ, refresh token + user trong localStorage |
| `src/auth/` | `AuthProvider` (đăng nhập, tự đăng nhập lại khi mở trang, đăng xuất), `RequireAuth` (chặn theo role) |
| `src/realtime/` | một kết nối Socket.IO; tự refresh và kết nối lại khi token hết hạn; hook `useRealtimeEvent` |
| `src/layouts/AppLayout.tsx` | khung trang, menu theo role |
| `src/routes.tsx` | danh sách trang; trang chưa làm là `Placeholder` ghi API sẽ dùng |
| `src/pages/` | các trang |
| `src/components/` | `PlumbLine` (thước dọi), `StateBadge`, `charts/`, `ui/` (shadcn – không sửa tay) |
| `src/lib/labels.ts` | tên loại cảnh báo, nhãn/icon/màu trạng thái |
| `.agents/skills/design-system/SKILL.md` | **luật giao diện** – đọc trước khi làm màn hình |

## Kế hoạch

| Giai đoạn | Nội dung | Trạng thái |
| --- | --- | --- |
| 1. Nền | khung, proxy, đăng nhập/refresh, lỗi, menu theo role, Socket.IO | ✅ |
| 0. Thiết kế | shadcn/ui (Radix, Nova), font Be Vietnam Pro, file `.agents/skills/design-system/SKILL.md` | ✅ |
| 2. Cá nhân | ✅ Tổng quan (thước dọi realtime, điểm, biểu đồ theo ngày, cảnh báo theo loại) · ✅ Thói quen (heatmap thứ × giờ, khung giờ kém/tốt nhất) · ⬜ Lịch sử, Cấu hình | 🟡 |
| 3. Tổ chức | thống kê tổ chức, nhân viên, phòng ban, cấu hình tổ chức | ⬜ |
| 4. Quản trị | tổ chức, người dùng | ⬜ |
| 5. Hoàn thiện | Playwright, Docker + nginx, CORS/domain chung khi deploy | ⬜ |

## Lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | chạy dev |
| `npm run build` | kiểm kiểu + build ra `dist/` |
| `npm run lint` | oxlint |
| `npm run preview` | xem bản build |
