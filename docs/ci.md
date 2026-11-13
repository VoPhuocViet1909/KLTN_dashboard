# CI cho Dashboard

Ngày14/11/2026. `.github/workflows/ci.yml` tự chạy khi tạo/cập nhật PR vào main, push main hoặc chạy tay trong Actions. Node24.22.3 LTS, npm ci theo package-lock.json; không đổi dependency ứng dụng.

Thứ tự: lint → npm test → build. `npm test` chạy `dev/check-device-observation.mjs`, kiểm trạng thái realtime, dữ liệu sai/thứ tự/hết hạn/ngắt kết nối và xác nhận config version/revision. Đây là kiểm logic với fixture, chưa phải browser/E2E với server thật. Build thành công có artifact `dashboard-dist`7 ngày; không tự deploy.

Chạy local: `npm ci`, `npm run lint`, `npm test`, `npm run build`. Không cần Docker hoặc backend đang mở. Node24 LTS hỗ trợ chạy trực tiếp file TypeScript dùng trong bộ assert.

Xem repo → Actions → Dashboard CI → bước đỏ để đọc lỗi. Khi sửa và push, PR sẽ có run mới. Timeout15 phút, run cũ của cùng PR tự hủy. Chưa đổi branch protection; muốn check thành bắt buộc, chủ repo chọn `Lint, test and build (Node 24)` trong ruleset.

Action ghim SHA và chỉ có contents:read, không lưu token checkout, không yêu cầu secrets. [Nguồn phiên bản và phạm vi backend/web](https://github.com/luongtan204/DoAnTotNghiep_BE/blob/main/docs/software-expansion-v1/STEP15-CI.md). Chưa bao gồm UI browser tests, native desktop, tải/soak, đóng gói hoặc deploy.
