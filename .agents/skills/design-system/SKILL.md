---
name: design-system
description: Luật giao diện của KLTN Dashboard (giám sát tư thế ngồi) – màu, chữ, bố cục, trạng thái, biểu đồ, lời văn. Đọc trước khi tạo hoặc sửa bất kỳ màn hình, component hay biểu đồ nào.
---

# Design system – Dashboard giám sát tư thế

Người dùng là nhân viên văn phòng xem lại thói quen ngồi của mình, và quản lý tổ chức xem số liệu chung.
Giao diện phải **bình tĩnh, rõ, dễ đọc số**. Chỉ có **một** điểm nhấn: thước dọi tư thế. Mọi thứ khác giữ yên.

## 0. Phong cách (đã chốt sau khi rà soát 2026-10-15)

**"Số liệu yên tĩnh" (quiet data-first):** nền sáng trung tính hơi ấm, panel phẳng viền mảnh, một màu nhấn xanh lam,
chữ số lớn làm trọng tâm, không trang trí. Gần với phong cách *minimalism / data-dense dashboard*, không phải
glassmorphism, gradient, neumorphism hay "tech neon".

Đã đối chiếu với đề xuất tự động của `ui-ux-pro-max` (chạy `search.py --design-system`) và **không nhận** các điểm sau:

| Đề xuất của công cụ | Quyết định | Lý do |
| --- | --- | --- |
| Dark Mode OLED làm giao diện chính | Không | Người dùng xem ban ngày ở văn phòng; dark mode để sau (mục 1) |
| Fira Code / Fira Sans | Không | Be Vietnam Pro hỗ trợ dấu tiếng Việt tốt hơn; Fira là font kỹ thuật, lạnh |
| Màu CTA hổ phách `#F59E0B` | Không | Hổ phách đã gần với `status-away`; thêm một màu nhấn sẽ làm nhiễu nghĩa trạng thái |
| Mẫu "AI Personalization Landing" | Không | Đó là mẫu trang đích, đây là dashboard |
| Xanh lam làm màu dữ liệu | **Nhận** | Đã dùng (`chart-1…5`, `primary`) |
| Focus ring rõ, `prefers-reduced-motion`, không emoji làm icon, cursor-pointer, chuyển động 150–300 ms | **Nhận** | Xem mục 7 và 8 |

## 1. Màu (token trong `src/index.css`, dùng qua class Tailwind)

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `surface` | `#f4f5f3` | nền ứng dụng (sau các panel) |
| `background` / `card` | `#ffffff` | nền panel, bảng, form |
| `foreground` | `#1c2433` | chữ chính |
| `muted-foreground` | `#5b6472` | chữ phụ, nhãn, trục |
| `border` | `#e1e4df` | viền, đường lưới |
| `primary` | `#256abf` | nút chính, mục menu đang chọn, liên kết |
| `chart-1` | `#2a78d6` | dữ liệu một chuỗi (đường, thanh) |
| `chart-2…5` | cùng họ xanh lam | thang tuần tự (heatmap: nhạt = ít, đậm = nhiều) |
| `destructive` | `#d03b3b` | lỗi, hành động xóa/khóa |

**Màu trạng thái – để riêng, không dùng cho việc khác:**

| Trạng thái | Token | Icon (lucide) | Nhãn |
| --- | --- | --- | --- |
| GOOD | `status-good` `#0ca30c` | `CircleCheck` | Ngồi đúng |
| BAD | `status-bad` `#d03b3b` | `TriangleAlert` | Đang ngồi sai |
| AWAY | `status-away` `#c98500` | `Moon` | Vắng mặt |
| OFFLINE | `status-offline` `#8a8f98` | `CircleOff` | Không kết nối |

- Lấy từ `STATE_META` trong `src/lib/labels.ts`; hiển thị bằng `<StateBadge>`.
- **Không bao giờ để màu đứng một mình.** Đã kiểm bằng công cụ: đỏ/lục của GOOD/BAD gần như trùng nhau với người mù
  màu đỏ–lục. Luôn kèm icon + chữ (và với thước dọi: độ nghiêng).
- Không dùng màu trạng thái để tô chuỗi dữ liệu, nền thẻ, hay trang trí.
- Dark mode: chưa làm. Khi làm, chọn lại từng bước màu cho nền tối, không đảo màu tự động.

## 2. Chữ

- Font duy nhất: **Be Vietnam Pro** (thiết kế cho tiếng Việt, dấu không bị đè), nạp ở `index.html`; 400/500/600/700.
- Cỡ: tiêu đề trang `text-2xl font-semibold`; tiêu đề mục `font-medium` (16px); chữ thường `text-sm`;
  ghi chú `text-xs text-muted-foreground`; số lớn duy nhất của trang `text-5xl font-semibold`.
- Mọi con số trong bảng, thống kê, tooltip dùng class `tabular` (chữ số đều nhau, cột thẳng).
- Viết hoa kiểu câu ("Lịch sử cảnh báo"), không VIẾT HOA TOÀN BỘ nhãn, không tô một chữ trong tiêu đề.

## 3. Bố cục

```
┌ sidebar 240px ┐┌ nội dung, tối đa 1024px (max-w-5xl), căn trái trong vùng chính ──────────┐
│ thước dọi+tên ││ Tiêu đề trang                                   [bộ lọc thời gian]   │
│ Cá nhân       ││ ┌ panel đầu: thứ quan trọng nhất của trang ──────────────────────────┐ │
│ Tổ chức*      ││ └─────────────────────────────────────────────────────────────────────┘ │
│ Quản trị*     ││ Tiêu đề mục                                                            │
│ …             ││ ┌ panel biểu đồ / bảng ──────────────────────────────────────────────┐ │
│ user · đăng xuất│ └─────────────────────────────────────────────────────────────────────┘ │
└───────────────┘└──────────────────────────────────────────────────────────────────────────┘
```

- Panel: `rounded-xl border bg-background`, **không đổ bóng**. Không bọc mọi thứ vào thẻ: chỉ số nhỏ đặt cạnh nhau
  trong một panel (danh sách `dl`), không làm mỗi số một thẻ riêng.
- Bộ lọc (khoảng thời gian, loại cảnh báo) nằm **một hàng, phía trên** nội dung nó lọc, căn phải ngang tiêu đề trang.
- Khoảng cách giữa các mục `space-y-8`; trong panel `p-6` (biểu đồ `p-4`).
- Bảng dài dùng `Table` của shadcn, phân trang ở dưới, số căn phải.

## 4. Thước dọi (`<PlumbLine>`) – điểm nhấn duy nhất

Thẳng đứng = ngồi đúng; nghiêng 14° về trước = đang sai; nét đứt = vắng mặt / chưa có dữ liệu; xám = mất kết nối.
Chỉ chuyển động khi trạng thái đổi (xoay 600 ms), tôn trọng `prefers-reduced-motion`.
Chỉ dùng ở: logo sidebar, trang đăng nhập, ô "Tư thế lúc này". Không rải thêm chỗ khác.

## 5. Biểu đồ

- Chọn dạng theo việc: xu hướng theo ngày/giờ → đường (Recharts); so sánh loại → thanh ngang xếp giảm dần;
  giờ × thứ → heatmap một màu xanh (ECharts); một con số → chữ số lớn, không vẽ biểu đồ.
- Một chuỗi: màu `chart-1`, không chú giải (tiêu đề mục đã nói nó là gì). Từ 2 chuỗi: có chú giải + nhãn trực tiếp.
- Đường 2px, điểm ≥ 8px có viền trắng 2px; thanh dày 12px, đầu bo 4px; lưới ngang mảnh màu `border`, không lưới dọc.
- Điểm tư thế luôn trên thang **0–100** cố định, không tự co trục.
- Ngày không có dữ liệu phải hiện là **khoảng trống**, không nối liền (xem `vnDayStarts` trong `src/lib/time.ts`).
- Mọi biểu đồ có tooltip khi rê chuột; chữ trong tooltip dùng màu chữ, không dùng màu chuỗi.
- Không biểu đồ hai trục, không biểu đồ tròn cho > 3 phần, không hiệu ứng vẽ dần.

## 6. Lời văn

- Viết theo người dùng, tiếng Việt thường ngày: "Thời gian ngồi sai", không "badMinutes ratio".
- Tên loại cảnh báo lấy từ `ALERT_LABEL` (`src/lib/labels.ts`); loại mới thì thêm vào đó, không viết tay ở trang.
- Nút nói đúng việc sẽ xảy ra: "Lưu cấu hình", "Khóa tài khoản"; thông báo sau đó dùng cùng động từ ("Đã lưu cấu hình").
- Lỗi nói chuyện gì xảy ra và làm gì tiếp: "Không tải được số liệu: …", không "Đã có lỗi".
- Màn hình trống chỉ cách có dữ liệu: "Mở Desktop App để xem tư thế của bạn tại đây."

## 7. Trước khi xong một màn hình

- Chạy với `mock_server.py` + `replay.py seed`, chụp màn hình và tự xem: chữ không chồng nhau, số thẳng cột,
  trạng thái có icon + chữ.
- Bấm Tab đi hết trang: mọi nút/liên kết thấy được viền focus.
- Thu cửa sổ còn ~1024px: không tràn ngang.

## 8. Quy tắc tương tác (bổ sung)

- Mọi phần tử bấm được có `cursor-pointer` (nút, tab, hàng bảng có thể bấm, `NavLink`).
- Hover đổi **màu** (`transition-colors duration-150`), không đổi kích thước, không làm xô bố cục.
- Màu trạng thái chỉ đạt độ tương phản ≥ 3:1 trên nền trắng (đủ cho icon/hình, **không đủ cho chữ** ≥ 4.5:1):
  `status-good` ≈ 3.3:1, `status-offline` ≈ 3.3:1, `status-away` ≈ 3.1:1. Vì vậy **chữ luôn là `text-foreground`**,
  màu chỉ tô icon / thước dọi / chấm (đúng như `StateBadge` đang làm). Không viết `text-status-*`.
- Icon-only button có `aria-label`; biểu đồ có tooltip và, khi cần, bảng số liệu thay thế.
- Bảng rộng bọc `overflow-x-auto`, không để vỡ bố cục.
- Thứ tự lớp: nội dung < sidebar sticky (10) < dropdown/tooltip (20) < dialog (50) < toast (60). Không dùng `z-[9999]`.

## 9. Kết quả rà soát giao diện hiện tại (2026-10-15)

Đã xem: `OverviewPage`, `LoginPage`, `AppLayout`, `PlumbLine`, `StateBadge`, `index.css`.

**Đạt:** màu trạng thái luôn kèm icon + chữ; thước dọi mã hóa thêm bằng độ nghiêng/nét đứt; `tabular` cho số;
thang 0–100 cố định; có skeleton và thông báo lỗi/trống đúng giọng; `prefers-reduced-motion` được tôn trọng;
nav có focus ring; form có `Label` + `aria-invalid` + `role="alert"`.

**Lệch đã phát hiện** – mục 1–6 đã sửa trên nhánh `feat/design-system` (bỏ khối `.dark`, bỏ `mx-auto`, `dl` co theo màn hình, `cursor-pointer` + transition chung, icon `LayoutDashboard`, chấm kết nối dùng `--primary`); mục 7 để lại:

1. **`.dark` trong `index.css` là mặc định xám của shadcn**, không cùng họ với token sáng (primary gần trắng, chart
   toàn xám). Không có chỗ nào bật class `dark`, nên chưa lộ ra. Hoặc xóa khối này cho tới khi làm dark mode,
   hoặc thiết kế lại từng bước màu. Đừng để ai bật `dark` khi chưa làm.
2. **Bố cục lệch mô tả:** mục 3 nói nội dung căn trái, nhưng `OverviewPage` dùng `mx-auto max-w-5xl` (căn giữa).
   Thống nhất theo mục 3: bỏ `mx-auto` ở các trang, hoặc cập nhật mục 3 nếu muốn căn giữa. Làm cho **mọi** trang giống nhau.
3. **`dl` 3 cột không co:** `grid-cols-3` trong `OverviewPage` không có điểm gãy; thu cửa sổ thì nhãn dài
   ("Thời gian ngồi sai") bị cắt/xuống dòng xấu. Dùng `grid-cols-1 sm:grid-cols-3`.
4. **Thiếu `cursor-pointer` và transition** ở `NavLink` trong `AppLayout` (chỉ có `hover:bg-muted`). Thêm
   `cursor-pointer transition-colors duration-150`. Nên đặt một quy tắc chung trong `@layer base`:
   `button, [role="button"], a[href] { cursor: pointer }`.
5. **Icon menu chưa khớp nghĩa:** "Tổng quan tổ chức" dùng `CalendarClock` (đồng hồ lịch) trong khi "Tổng quan" cá
   nhân dùng `Gauge`. Đổi sang `LayoutDashboard` hoặc `Gauge` cho cả hai, phân biệt bằng nhóm menu.
6. **Chỉ báo kết nối dùng chấm xanh lục** (`--status-good`) cho "đang nhận dữ liệu": dễ nhầm với trạng thái GOOD
   của tư thế. Dùng `--primary` cho chấm "đang kết nối" (chữ đã kèm sẵn), giữ xanh lục cho tư thế.
7. **Mục tiêu bấm của nav ~36px** (`py-2 text-sm`). Chấp nhận được cho desktop; nếu sau này làm responsive/tablet
   thì nâng lên ≥ 44px và thu sidebar thành menu.

**Chưa kiểm:** các trang `habits`, `history`, `settings`, `org`, `admin` (hiện là placeholder trong `misc.tsx`);
`ScoreTrend` / `AlertBreakdown` về tooltip và khoảng trống ngày. Rà lại khi các trang đó có nội dung.
