# Báo cáo triển khai G5 — Publish, trang khách và Open Graph

**Ngày chốt kỹ thuật:** 11/09/2026  
**Phạm vi:** INV-501 → INV-507

## Kết quả

Gate kỹ thuật G5 đã đạt. Một bản nháp hợp lệ có thể được xuất bản thành snapshot bất biến, đọc qua public code ổn định, hiển thị bằng SSR và tạo Open Graph 1200×630 theo version đang active. Tạm ẩn sự kiện làm cả trang, DTO và media public mất khả năng truy cập ngay.

| Issue | Trạng thái | Đầu ra |
|---|---|---|
| INV-501 | Hoàn tất | Preflight Zod tại API và invariant trong RPC; trả lỗi theo field hoặc mã quota/media/revision |
| INV-502 | Hoàn tất | Transaction tạo candidate version, kiểm tra quota và atomically kích hoạt snapshot; retry idempotent |
| INV-503 | Hoàn tất | Public code ngẫu nhiên 144 bit, không thay đổi khi sửa nội dung hoặc template |
| INV-504 | Hoàn tất | Trang `/e/:publicCode` SSR, màn mở phong bì, audio chỉ chạy sau click, điều khiển bật/tắt |
| INV-505 | Hoàn tất MVP | Google Maps embed lazy load được tạo từ địa chỉ đã encode và link chỉ đường riêng |
| INV-506 | Hoàn tất | Metadata title/description/noindex và PNG 1200×630 có URL gắn `eventVersion` để tách cache |
| INV-507 | Hoàn tất | State machine published/hidden/cancelled/archived; public resolver kiểm tra lifecycle trước khi trả snapshot/media |

## Publish workflow

1. Owner bấm Xuất bản khi autosave đang ở trạng thái `Đã lưu`.
2. API parse toàn bộ draft bằng `invitationContentSchema`; lỗi trả `PREFLIGHT_FAILED` cùng đường dẫn field.
3. RPC khóa event, kiểm tra owner, lifecycle và revision.
4. Mọi `mediaAssetId` trong payload phải thuộc event, đúng owner và có trạng thái `ready`.
5. RPC ghi một hàng `event_versions` mới với content/template/renderer/schema version.
6. Lần xuất bản đầu tiên ghi `publication_usage` theo tháng Việt Nam; unique constraint chặn sự kiện thứ hai. Các lần cập nhật cùng event không trừ thêm lượt.
7. `published_version_id` được đổi trong cùng transaction. Nếu bất kỳ bước nào lỗi, phiên bản khách đang xem vẫn giữ nguyên.
8. Cùng idempotency key và payload trả kết quả cũ, không sinh thêm version hay quota usage.

Thay đổi draft sau khi publish không ảnh hưởng trang khách. Chỉ thao tác Cập nhật thiệp mới tạo version kế tiếp và đưa snapshot đó ra public.

## Public DTO và media

`get_public_event(publicCode)` chỉ trả bốn nhóm dữ liệu: public code, event version, template ID và content snapshot. Function chỉ có kết quả khi lifecycle là `published`; không trả owner ID, email, phone, account number, token, draft hay audit data.

Media vẫn nằm trong bucket private. Public route chỉ ký URL ngắn hạn khi:

- event đang published;
- asset ở trạng thái ready và thuộc event;
- asset ID thực sự xuất hiện trong published snapshot hiện hành.

Policy này ngăn việc đoán UUID để đọc media của draft, version cũ hoặc sự kiện đang ẩn.

## SSR, envelope, nhạc và bản đồ

- Nội dung thiệp đã nằm trong HTML SSR để tải nhanh và crawler đọc được metadata.
- Màn phong bì là lớp tương tác phía trên; nội dung SSR không phụ thuộc JavaScript để tồn tại trong HTML.
- Audio dùng `preload="none"` và chỉ gọi `play()` từ thao tác Mở thiệp. Nếu trình duyệt chặn audio, thiệp vẫn mở bình thường.
- Bản đồ dùng URL Google Maps do hệ thống tạo từ địa chỉ encode; không nhận iframe HTML từ owner và tải lazy.
- Thiệp public, editor và dashboard đều `noindex`; landing và catalog template vẫn có thể index.

## Open Graph

Route OG dùng `ImageResponse` tạo PNG 1200×630 từ snapshot hiện hành. URL metadata có query `?v={eventVersion}`, nên mỗi lần cập nhật thiệp có URL ảnh mới. Nội dung OG chỉ gồm tên sự kiện/chủ tiệc, ngày và địa điểm; không dùng tên khách, số điện thoại, email, token hoặc thông tin quà mừng.

Cache của Zalo/Messenger/Telegram nằm ngoài hệ thống và có thể giữ preview cũ dù version URL đã đổi; đây là hành vi cần ghi rõ khi hỗ trợ người dùng.

## Kiểm thử

- `pnpm check`: lint, TypeScript, 19 test ứng dụng và production build đạt.
- pgTAP remote: **60/60** assertion đạt, gồm quyền đọc media qua policy helper khi published và thu hồi ngay khi hidden.
- Kiểm thử xuyên suốt bằng fixture staging tạm thời:
  - trang SSR: 200;
  - public API: 200;
  - OG: PNG 43 KB, 200;
  - HTML có title, OG version và noindex;
  - HTML không chứa email owner;
  - chuyển hidden làm cùng URL trả 404;
  - fixture và publication usage đã được xóa sau test.
- Visual QA mobile 390×844 phát hiện và sửa overflow tên dài trên phong bì.

## Giới hạn còn lại

- Google OAuth vẫn chưa có Client ID/Secret nên chưa chạy được thao tác publish từ một phiên owner thật trên Vercel. Database, API và public surface đã được kiểm tra độc lập.
- Quà mừng VietQR và RSVP thực sự thuộc G6/G7; G5 chỉ render CTA theo snapshot.
- Thao tác cancel/archive đã có API và state machine nhưng dashboard MVP hiện chỉ đặt nút Tạm ẩn để tránh thao tác khó hoàn tác ngoài ý muốn.

## Điều kiện chuyển G6

G6 dùng `publicCode` và published lifecycle hiện có để xây guest slot, invitation token, RSVP shared/personalized, edit session và giới hạn 50 suất. Mọi endpoint RSVP phải kiểm tra lifecycle và deadline trong cùng transaction cấp slot.
