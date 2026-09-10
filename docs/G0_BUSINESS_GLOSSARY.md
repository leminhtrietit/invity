# G0 — Từ điển nghiệp vụ

Trạng thái: bản hợp đồng triển khai v1. Mọi API, dashboard và kiểm thử phải dùng các định nghĩa dưới đây.

## Định danh và vai trò

| Thuật ngữ | Định nghĩa chuẩn | Không phải |
|---|---|---|
| `app_user` | Người dùng nội bộ của Invite, định danh bằng UUID ổn định (`app_user_id`). Là chủ sở hữu dữ liệu. | Email Google, subject OAuth hay tên hiển thị. |
| `auth_binding` | Liên kết giữa `app_user` và tài khoản Supabase Auth hiện hành. | Bản ghi ownership của sự kiện. |
| Chủ tiệc (`owner`) | `app_user` tạo sự kiện; có toàn quyền trong phạm vi sự kiện đó. | Khách có đường link cá nhân. |
| Khách (`guest`) | Người được cấp một suất khách, qua link cá nhân hoặc lần RSVP mới bằng link chung. | Mỗi người đi kèm. |
| Người đi kèm | Số người đến cùng một khách RSVP “Có”. | Suất khách độc lập. |
| Link chung | URL công khai của một phiên bản đã xuất bản; chỉ xem thiệp và tạo RSVP mới. | Link quản trị hoặc link sửa RSVP. |
| Link cá nhân | URL có token bí mật cấp cho một `guest`; xem thiệp và phản hồi/sửa RSVP của chính khách đó. | Một API có thể dò theo ID khách. |

## Sự kiện và phiên bản

| Thuật ngữ | Định nghĩa chuẩn |
|---|---|
| Sự kiện (`event`) | Thực thể sở hữu bởi một `app_user`, có lifecycle, link chung ổn định và cấu hình quota/RSVP. |
| Bản nháp (`draft`) | Nội dung làm việc có `revision`; autosave không hiển thị cho khách và không thay phiên bản công khai. Mỗi owner tối đa 3 event ở trạng thái nháp. |
| Phiên bản (`event_version`) | Snapshot bất biến của nội dung đã đủ điều kiện công khai. Mỗi lần publish/update thành công kích hoạt một phiên bản mới. |
| Lần xuất bản đầu (`first_publication`) | Lần đầu một event chuyển từ chưa từng public sang public. Chỉ lần này tiêu thụ quota sự kiện tháng. Các lần cập nhật version không tiêu thụ thêm. |
| Mẫu (`template`) | Cấu trúc renderer và theme được version hóa. Event cũ tiếp tục render theo template/version đã snapshot dù mẫu ngừng cho tạo mới. |

## Lifecycle sự kiện

| Trạng thái | Ý nghĩa | Truy cập công khai |
|---|---|---|
| `draft` | Chưa xuất bản. | Không có. |
| `published` | Có một phiên bản công khai hoạt động. | Cho phép theo public code/token hợp lệ. |
| `hidden` | Chủ tiệc tạm ẩn. | Từ chối trước khi trả nội dung cache. |
| `cancelled` | Chủ tiệc hủy. | Từ chối; dữ liệu còn theo chính sách lưu giữ. |
| `archived` | Hết thời hạn public 180 ngày sau kết thúc hoặc được lưu trữ theo job. | Từ chối. |
| `deleted` | Đã yêu cầu xóa; ẩn ngay, dọn dữ liệu chính trong 30 ngày. | Từ chối. |

`Đã diễn ra` là thuộc tính suy ra: `now >= event.ends_at` theo múi giờ dữ liệu sự kiện, không là trạng thái lifecycle. Chuyển trạng thái hợp lệ: `draft → published`; `published ↔ hidden`; `published|hidden → cancelled|archived|deleted`; `cancelled|archived → deleted`. Không khôi phục bằng cách đổi trực tiếp trạng thái trong client.

## Quota và số liệu dashboard

| Thuật ngữ | Định nghĩa chuẩn |
|---|---|
| Quota sự kiện tháng | Mỗi `app_user` được tối đa một `first_publication` trong mỗi tháng lịch ở `Asia/Ho_Chi_Minh`. Month key là năm-tháng Việt Nam, kể cả giao năm. Xóa event không hoàn lượt. |
| Suất khách đã cấp (`guest_slots_used`) | Số guest duy nhất từng được cấp suất cho event. Link cá nhân tạo thành công cấp 1; một RSVP lần đầu qua link chung cấp 1. Tối đa 50. Thu hồi/xóa guest không hoàn suất. |
| Khách đang quản lý | Các guest chưa bị thu hồi/xóa; chỉ số này có thể nhỏ hơn `guest_slots_used`. |
| RSVP | Trạng thái phản hồi của guest: `pending`, `attending`, `declined`. Chỉ một RSVP hiện hành trên mỗi guest. Sửa RSVP không cấp thêm suất. |
| Tổng dự kiến | `count(attending) + sum(companion_count của attending)`. Với `declined`, `companion_count` luôn bằng 0. |
| Đã gửi | Tín hiệu do chủ tiệc chủ động đánh dấu sau hành vi gửi bên ngoài. Copy/share không tự đánh dấu đã gửi. |
| Đã mở | Tín hiệu tham khảo đã được lọc/rate-limit; không dùng làm quota, không lưu token thô và bot không tiêu thụ quota. |

Người đi kèm mặc định tối đa 3; owner chỉ có thể cấu hình giới hạn từ 0 đến 10. RSVP mặc định đóng lúc `starts_at`; hạn tùy chỉnh không được muộn hơn `ends_at`.

## Quyền riêng tư và nội dung

| Loại dữ liệu | Được public | Chỉ owner/server |
|---|---|---|
| Published snapshot, ảnh/section đã publish, public code | Có, khi event `published` | — |
| Danh sách khách, RSVP, điện thoại, ghi chú, token, link sửa | Không | Có |
| Bản nháp, revision, media đang xử lý | Không | Có |
| Lời chúc | Chỉ khi khách đồng ý **và** owner duyệt | Bản gốc, trạng thái đồng ý/duyệt |
| Tài khoản quà mừng | Không nằm trong public event DTO/OG | Server trả tối thiểu cho dialog quà sau khi xác thực event public |

Mở thiệp không tạo guest. Preview không ghi lượt mở, không gửi RSVP thật và không dùng QR thật. Không lưu PII, dữ liệu ngân hàng hay token trong `localStorage`.

## Ví dụ quota giao tháng

Owner A publish Event 1 lúc `2026-12-31T16:59:59Z` (23:59:59 Việt Nam): tiêu thụ bucket `2026-12`. Publish Event 2 lúc `2026-12-31T17:00:00Z` (00:00:00 ngày 01/01 Việt Nam): tiêu thụ bucket `2027-01` và được phép. Retry Event 1 với cùng idempotency key không tiêu thụ thêm; cập nhật Event 1 sau đó cũng không tiêu thụ thêm.

## Quy tắc bất biến cần bảo vệ ở server

1. Ownership luôn dựa vào `app_user_id`, không dựa email.
2. Không có đường public đọc danh sách khách, số điện thoại, bản nháp, token hay audit log.
3. `guest_slots_used <= 50`; khi còn một suất, chính xác một transaction cấp mới thắng.
4. Một event chỉ có tối đa một phiên bản public active; bản cũ vẫn nguyên vẹn khi tạo bản mới thất bại.
5. Mọi write có revision phải từ chối revision cũ; mọi write có idempotency key phải phát hiện payload khác.
