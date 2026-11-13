# CI cho Dashboard

Ngày14/11/2026. `.github/workflows/ci.yml` tự chạy khi tạo/cập nhật PR vào main, push main hoặc chạy tay trong Actions. Node24.22.3 LTS, npm ci theo package-lock.json; không đổi dependency ứng dụng.

Thứ tự: lint → npm test → build. `npm test` chạy `dev/check-device-observation.mjs`, kiểm trạng thái realtime, dữ liệu sai/thứ tự/hết hạn/ngắt kết nối và xác nhận config version/revision. Đây là kiểm logic với fixture, chưa phải browser/E2E với server thật. Build thành công có artifact `dashboard-dist`7 ngày; không tự deploy.

Chạy local: `npm ci`, `npm run lint`, `npm test`, `npm run build`. Không cần Docker hoặc backend đang mở. Node24 LTS hỗ trợ chạy trực tiếp file TypeScript dùng trong bộ assert.

Xem repo → Actions → Dashboard CI → bước đỏ để đọc lỗi. Khi sửa và push, PR sẽ có run mới. Timeout15 phút, run cũ của cùng PR tự hủy. Chưa đổi branch protection; muốn check thành bắt buộc, chủ repo chọn `Lint, test and build (Node 24)` trong ruleset.

Action ghim SHA và chỉ có contents:read, không lưu token checkout, không yêu cầu secrets. [Nguồn phiên bản và phạm vi backend/web](https://github.com/luongtan204/DoAnTotNghiep_BE/blob/main/docs/software-expansion-v1/STEP15-CI.md). Chưa bao gồm UI browser tests, native desktop, tải/soak, đóng gói hoặc deploy.

## Việt: xử lý GitHub Actions bị khóa billing

Run đầu [43472820612](https://github.com/VoPhuocViet1909/KLTN_dashboard/actions/runs/43472820612) ngày14/11/2026 chưa chạy bước nào, GitHub báo: `The job was not started because your account is locked due to a billing issue.` Đây là lỗi tài khoản sở hữu repo, chưa phải lỗi build. Local npm ci/lint/test/build đã đạt.

1. Việt đăng nhập tài khoản `VoPhuocViet1909`, bấm ảnh đại diện → Settings → Billing & licensing.
2. Kiểm Overview và Payment information: có thông báo khóa, khoản thanh toán quá hạn hoặc giao dịch bị từ chối không. Nếu có, xử lý theo thông báo GitHub; lưu thông tin thanh toán có thể kích hoạt thu lại khoản đang nợ. Không cần nâng gói/budget chỉ để thử sửa lỗi khi chưa rõ nguyên nhân.
3. Nếu không thấy khoản nợ/subscription/lỗi để sửa, [liên hệ GitHub Support](https://support.github.com/contact) yêu cầu review billing lock, kèm tài khoản, repo, link run và nguyên văn thông báo trên. Không gửi mật khẩu, token hoặc đầy đủ số thẻ.
4. Sau khi GitHub mở khóa, vào repo → Actions → Dashboard CI → run thất bại → Re-run all jobs. Xác nhận từng bước npm ci/lint/test/build và artifact dashboard-dist chạy thành công; báo Tân để kiểm PR và merge.

Căn cứ: [GitHub — Unlocking a locked account](https://docs.github.com/en/billing/how-tos/troubleshooting/locked-account) và [Managing payment information](https://docs.github.com/en/billing/how-tos/set-up-payment/manage-payment-info), kiểm14/11/2026. Nếu tài khoản vẫn khóa, giữ PR mở; không coi sửa YAML, bỏ test hoặc tăng timeout là cách gỡ billing lock.
