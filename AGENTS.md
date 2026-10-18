# Quy tắc cho AI (Codex, Claude) trong repo Dashboard

1. **Đọc trước mọi việc:** file thỏa thuận nhóm `team-sync` ở repo backend
   (`DoAnTotNghiep_BE/.codex/skills/team-sync/SKILL.md`, trên máy thường là
   `../../BE/DoAnTotNghiep_BE/.codex/skills/team-sync/SKILL.md`). Khi clone riêng, đọc bản chia sẻ:
   https://github.com/luongtan204/DoAnTotNghiep_BE/blob/main/.codex/skills/team-sync/SKILL.md.
   File đó là nguồn duy nhất về API,
   quy tắc làm việc và tiến độ. Không tự chế endpoint, trường dữ liệu hay mã lỗi; thiếu API thì ghi vào mục
   "Cần chốt" của file đó.
2. **Xong một hạng mục:** cập nhật bảng "Dashboard" trong `team-sync` (PR ở repo backend) cùng lúc với PR ở đây.
3. **Gọi API:** chỉ qua `src/lib/api/client.ts` (`request` / `api`). Không gọi `fetch`/axios trực tiếp, không tự
   gắn token, không tự refresh. Lỗi luôn là `ApiError`; rẽ nhánh theo `code`, lỗi theo trường nằm ở `fieldErrors`.
4. **Dữ liệu server:** dùng TanStack Query (`useQuery`/`useMutation`), không lưu dữ liệu server vào state tự quản.
5. **Realtime:** dùng `useRealtimeEvent` trong `src/realtime/hooks.ts`. Không tạo socket mới.
6. **Thời gian:** gửi `from`/`to` bằng `lastDays()` hoặc `toISOString()`; hiển thị bằng `formatDateTime()`
   (giờ Việt Nam).
7. **Phân quyền:** route mới bọc trong `<RequireAuth roles={[...]} />` đúng role; thêm mục menu trong
   `src/layouts/AppLayout.tsx`. Ẩn nút trên giao diện không thay cho kiểm quyền ở backend.
8. **Giao diện:** khi đã có file design system (`.agents/skills/design-system/SKILL.md`), mọi màn hình theo file đó.
9. **Trước khi xong:** `npm run build` và `npm run lint` phải sạch. Thử bằng `mock_server.py` hoặc backend thật;
   nói rõ đã thử với cái nào.
10. **Git:** mỗi việc một nhánh, PR vào `main`, không force-push, không commit `.env` hay `node_modules`.

## Skill cài trong repo

- Thiết kế/sửa UI: đọc `.agents/skills/ui-ux-pro-max/SKILL.md` và `.agents/skills/design-system/SKILL.md`.
  `design-system` KLTN-DS-1 là ngôn ngữ chung với desktop; chốt quy tắc trước khi sửa màn hình.
  Đổi quy tắc/token/nhãn chung phải đồng bộ hai repo và chạy `design-system/scripts/check_sync.py`.
  Giữ hướng sáng, gọn, dễ dùng, tiếng Việt; kết quả tìm kiếm là gợi ý, không tự thay token hoặc thêm thư viện.
- Viết/sửa/review code: đọc `.agents/skills/ponytail/SKILL.md`; chọn thay đổi nhỏ nhất giải quyết đủ yêu cầu,
  giữ validation, bảo mật, accessibility và kiểm thử cần thiết.
- Nguồn, phiên bản và lệnh chạy: `.agents/skills/README.md`. Skill nằm trong Git để đồng đội dùng cùng bản.
