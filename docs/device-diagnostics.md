# Trang Chẩn đoán

Mục Cá nhân → Chẩn đoán (`/diagnostics`) dùng tài khoản đang đăng nhập, chỉ hiện thiết bị của chính bạn, kể cả khi là quản trị tổ chức. Dùng kênh Socket.IO và API hiện có, không mở luồng video hoặc camera mới.

API health phản hồi, kết nối realtime, trạng thái camera và gửi dữ liệu là các phép kiểm riêng. Kiểm API quá30 giây không có mẫu mới sẽ ghi chưa kiểm tra gần đây. Số liệu thiết bị hết hạn15 giây, ngừng theo dõi hoặc realtime gián đoạn thì không hiện counters cũ như số liệu hiện tại. Không có diagnostics từ desktop/backend cũ là chưa có dữ liệu, không phải0.

Hàng đợi phân biệt chờ ghi, đã lưu chờ gửi, đã thử gửi lại và bị từ chối. Xác nhận nhận lô không đồng nghĩa Analytics đã xử lý. Phiên bản server được đối chiếu version/revision ACK desktop; thời gian tải/nạp đo tại desktop, chưa gồm chờ polling/push. Không suy độ trễ toàn tuyến từ hai đồng hồ.

Nút Kiểm tra lại kết nối chỉ đọc health/config snapshot; không xóa hoặc gửi lại dữ liệu thay desktop. Khi có dữ liệu bị từ chối, mở lịch sử gửi trên desktop. Source mismatch giữ dữ liệu trên máy và không xuất metadata sang chủ khác.

Contract/schema optional, compatibility và giới hạn trong [tài liệu backend](https://github.com/luongtan204/DoAnTotNghiep_BE/blob/main/docs/software-expansion-v1/STEP15-DEVICE-DIAGNOSTICS.md). Build/lint/Node assertions và browser mock được kiểm; không thay cho nghiệm thu full stack/webcam/Windows exe hoặc tải. Billing GitHub của chủ repo vẫn có thể chặn hosted CI như docs/ci.md; kiểm local không được gọi là hosted CI đạt.
