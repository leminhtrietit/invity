# Báo cáo triển khai G7 — Dashboard RSVP, lời chúc và xuất dữ liệu

**Ngày chốt kỹ thuật:** 12/09/2026  
**Phạm vi:** INV-701 → INV-705

## Kết quả

Gate kỹ thuật G7 đã đạt. Trang quản lý khách hiện là dashboard RSVP đầy đủ, dùng cùng một tập dữ liệu đã chuẩn hóa cho card tổng hợp, danh sách lọc và file export. Số suất đã cấp lấy từ counter bất biến; số khách đang quản lý loại khách đã thu hồi, nên hai số liệu không bị nhập nhằng.

| Issue | Trạng thái | Đầu ra |
|---|---|---|
| INV-701 | Hoàn tất | Tìm theo tên/nhóm/số điện thoại; lọc nhóm, RSVP, trạng thái gửi/thu hồi; card responsive chứa ghi chú riêng trong vùng owner |
| INV-702 | Hoàn tất | Card suất đã cấp, đang quản lý, đồng ý, chưa phản hồi, người đi cùng, tổng dự kiến và lượt mở |
| INV-703 | Hoàn tất | Owner duyệt/ẩn lời chúc; public resolver chỉ trả lời còn consent và trạng thái approved; khách sửa/rút consent làm lời chúc ẩn ngay |
| INV-704 | Hoàn tất | CSV có UTF-8 BOM, CRLF, quoted field, thời gian Việt Nam, theo bộ lọc và chống formula injection |
| INV-705 | Hoàn tất | XLSX có header màu, autofilter, freeze hàng đầu, wrap text, độ rộng cột và cột điện thoại định dạng text |

## Nguồn dữ liệu thống nhất

`loadEventDashboard` đọc event, quota counter, guest/RSVP/wish và open metrics dưới session owner. Hàm chuyển dữ liệu database thành `DashboardGuest`, sau đó:

- `summarizeDashboard` tính card tổng hợp;
- `filterDashboardGuests` áp dụng bộ lọc giao diện và export;
- `dashboardExportRows` tạo cùng thứ tự cột cho CSV và XLSX.

Fixture nghiệm thu 40 suất cho kết quả 25 đồng ý, 5 từ chối, 10 chưa phản hồi, 18 người đi cùng và tổng dự kiến 43. Khi một khách bị thu hồi, số suất vẫn là 40 còn số khách đang quản lý là 39.

## Quyền riêng tư lời chúc

RPC `moderate_wish` chỉ cho owner của event thực hiện và ghi audit không chứa nội dung lời chúc. Owner không thể duyệt khi khách chưa đồng ý công khai. `get_public_wishes` chỉ trả `author` và `message` của tối đa 30 lời đã duyệt trên event đang published; không trả phone, owner note, guest ID hoặc trạng thái RSVP.

Public invitation đọc danh sách đã duyệt hiện tại thay cho samples trong snapshot. Vì vậy việc khách chỉnh lời chúc sẽ đưa nội dung về pending, còn rút consent sẽ ẩn ngay mà không cần owner xuất bản lại thiệp.

## Export

Hai endpoint yêu cầu session owner và trả `Cache-Control: private, no-store`:

- `/api/v1/events/:eventId/exports/rsvps.csv`
- `/api/v1/events/:eventId/exports/rsvps.xlsx`

File gồm tên, cách xưng hô, nhóm, số điện thoại, nguồn link, trạng thái gửi/quản lý, RSVP, người đi cùng, tổng dự kiến, lời chúc, consent, moderation, thời gian cập nhật và ghi chú owner. Token và edit secret không nằm trong dataset.

Giá trị chuỗi bắt đầu bằng `=`, `+`, `-` hoặc `@` được thêm dấu nháy đơn trước khi ghi để vô hiệu công thức. XLSX đặt cột số điện thoại ở định dạng text nhằm giữ số 0 đầu. Thời gian RSVP được render theo `Asia/Ho_Chi_Minh`.

## Kiểm thử

- `pnpm check`: lint, TypeScript, 28 test ứng dụng và production build đạt tại máy phát triển.
- Test workbook nạp lại chính buffer XLSX vừa tạo và xác nhận sheet, freeze, autofilter, phone text, tiếng Việt và formula escaping.
- pgTAP G7 có 12 assertion cho privilege, cách ly owner, consent, approve và ẩn tức thời khi rút consent.
- Supabase migration `20260911190000_g7_dashboard_wishes.sql` đã áp dụng lên project liên kết và database lint không phát hiện lỗi.
- GitHub CI chạy nối tiếp G2, G6, G7 và bài quota concurrency trên database sạch.

## Giới hạn vận hành

Google OAuth vẫn chờ Client ID/Secret, nên UAT dashboard bằng owner thật trên production chưa thể thực hiện. API, RLS, database và workbook được kiểm tra độc lập trong CI.

## Điều kiện chuyển G8

G8 có thể dùng trang owner hiện tại để thêm cấu hình tài khoản nhận quà và dùng public invitation renderer cho bottom sheet VietQR. Thông tin tài khoản không được đưa vào `PublicEventDTO`, Open Graph, export RSVP hoặc source HTML trước khi khách chủ động mở phần quà mừng.
