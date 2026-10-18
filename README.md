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
| `src/components/UsersManager.tsx` | bảng người dùng + thêm/đổi vai trò/khóa, dùng chung cho Nhân viên (ORG_ADMIN) và Người dùng (SYS_ADMIN) |
| `src/components/ConfigEditor.tsx` | form cấu hình dùng chung cho Cấu hình cá nhân và Cấu hình tổ chức |
| `src/lib/configFields.ts` | các khóa cấu hình người dùng được sửa: nhãn, đơn vị, min/max (theo `config.schema.json`), mặc định (theo `app_config.py`) |
| `.agents/skills/design-system/SKILL.md` | **luật giao diện** – đọc trước khi làm màn hình |

## Kế hoạch

| Giai đoạn | Nội dung | Trạng thái |
| --- | --- | --- |
| 1. Nền | khung, proxy, đăng nhập/refresh, lỗi, menu theo role, Socket.IO | ✅ |
| 0. Thiết kế | shadcn/ui (Radix, Nova), font Be Vietnam Pro, file `.agents/skills/design-system/SKILL.md` | ✅ |
| 2. Cá nhân | ✅ Tổng quan (thước dọi realtime, điểm, biểu đồ theo ngày, cảnh báo theo loại) · ✅ Thói quen (heatmap thứ × giờ, khung giờ kém/tốt nhất) · ✅ Lịch sử cảnh báo (bảng cảnh báo + bảng phiên, lọc khoảng/loại, phân trang, giữ bộ lọc trong URL) · ✅ Cấu hình (mỗi ô Mặc định/Tùy chỉnh, kiểm cặp ngưỡng, nhận sự kiện `config`, cảnh báo khi rời trang chưa lưu) | ✅ |
| 3. Tổ chức | ✅ Tổng quan tổ chức (điểm, ai đang ngồi sai realtime, cảnh báo gần đây) · ✅ Nhân viên (thêm, đổi vai trò, khóa/mở khóa) · ✅ Phòng ban (thêm, ngừng/dùng lại) · ✅ Cấu hình tổ chức (cùng form với Cấu hình cá nhân) | ✅ 4/4 |
| 4. Quản trị | ✅ Tổ chức (thêm, ngừng/kích hoạt, số phòng ban) · ✅ Người dùng (cùng bảng với Nhân viên, thêm cột Tổ chức, gán mọi vai trò) | ✅ 2/2 |
| 5. Hoàn thiện | Playwright, Docker + nginx, CORS/domain chung khi deploy | ⬜ |

## Lệnh

Camera trực tiếp đã nằm trong Tổng quan cá nhân: ứng dụng desktop phải đăng nhập cùng tài khoản và chủ động chia sẻ camera, sau đó chọn thiết bị/góc và bấm **Xem camera**. Dừng hoặc rời trang sẽ đóng luồng; quyền xem tự gia hạn. Quản trị viên chỉ xem camera của chính mình. Không ghi hình hoặc bật camera từ xa.

Trên desktop bản nguồn `feat/desktop-camera-sharing`: đăng nhập → hiệu chỉnh → mục **Chia sẻ camera lên web** → chọn góc → **Bật chia sẻ**. Lần đầu có thể cần chọn `ffmpeg.exe`. **Dừng chia sẻ** chỉ ngừng truyền hình, vẫn theo dõi tư thế; đăng xuất/thoát dừng cả publisher. Mỗi phiên mặc định tắt chia sẻ. Khi mất luồng, web xóa hình cũ và thử kết nối lại hữu hạn. Bản portable cũ chưa có nút này.

`VITE_MEDIA_BASE_URL` là origin MediaMTX (mặc định cùng hostname, cổng 8889); HTTPS phải dùng media HTTPS. Khi chạy Vite :5173, thêm `http://localhost:5173,http://127.0.0.1:5173` vào `MEDIA_WEB_ORIGINS` trong `.env` backend rồi `docker compose up -d --no-deps media`. Giữ các origin đang dùng; không mở wildcard. `.env` cũ ghi đè mặc định Compose mới.

Form cá nhân cần backend có `GET /api/v1/config/me/details` trả `{personal, organization, effective}`. Chỉ khóa `personal` được gửi lại; các ô không tùy chỉnh theo tổ chức rồi mặc định ứng dụng. Khi có cập nhật trong lúc sửa, dùng **Dùng giá trị mới** trước khi lưu để tránh ghi đè cấu hình mới. Hiệu chỉnh camera và tùy chỉnh `null` theo mô hình được giữ lại.

Kiểm ngày 18/10/2026: native WebRTC side decode 640×360, gia hạn sau hơn 100 giây và Dừng đạt với BE thật; tổ chức nhận BAD/GOOD từ desktop với video/landmark giả. Chưa nghiệm thu webcam thật, front hoặc LAN/TLS/NAT.

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | chạy dev |
| `npm run build` | kiểm kiểu + build ra `dist/` |
| `npm run lint` | oxlint |
| `npm run preview` | xem bản build |
