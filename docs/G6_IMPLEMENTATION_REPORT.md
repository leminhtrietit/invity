# Báo cáo triển khai G6 — Khách mời, link cá nhân và RSVP

**Ngày chốt kỹ thuật:** 11/09/2026  
**Phạm vi:** INV-601 → INV-608

## Kết quả

Gate kỹ thuật G6 đã đạt. Chủ tiệc có thể tạo tối đa 50 suất khách dùng chung giữa link cá nhân và RSVP mới từ link chung. Khách đã có quyền phản hồi vẫn sửa được RSVP khi quota đầy. Không endpoint công khai nào tra cứu hoặc sửa phản hồi bằng số điện thoại hay ID khách.

| Issue | Trạng thái | Đầu ra |
|---|---|---|
| INV-601 | Hoàn tất | Token cá nhân 256 bit, database chỉ lưu SHA-256; tạo khách và tăng counter trong một transaction idempotent |
| INV-602 | Hoàn tất | Copy tách khỏi trạng thái đã gửi; rotate thu hồi token cũ; revoke không hoàn quota |
| INV-603 | Hoàn tất | Form mobile-first cho tên, điện thoại, tham dự/từ chối, người đi cùng, lời chúc và consent; validation ở Zod và PostgreSQL |
| INV-604 | Hoàn tất | Link `/i/:token` nhận và sửa RSVP đúng guest; thao tác không cấp thêm suất |
| INV-605 | Hoàn tất | Link chung cấp suất và ghi RSVP nguyên tử; chuẩn hóa số Việt Nam nhưng không dò hoặc tiết lộ bản ghi trùng |
| INV-606 | Hoàn tất | Edit secret 256 bit, cookie HttpOnly/SameSite và route `/r/:secret` đổi sang URL thiệp sạch |
| INV-607 | Hoàn tất nền tảng | Deadline/lifecycle kiểm tra trong transaction; honeypot và rate limit 8 yêu cầu/10 phút theo fingerprint kết hợp request headers. CAPTCHA provider được nối ở G10 khi có key vận hành |
| INV-608 | Hoàn tất | Open metric tách lượt người và bot; không ảnh hưởng quota; application code không ghi token vào log/audit |

## Invariant quota và transaction

Mọi cấp suất cập nhật cùng hàng `event_quota_counters` với điều kiện `guest_slots_used < 50`. PostgreSQL khóa hàng này trong transaction, vì vậy tạo link cá nhân và RSVP link chung cạnh tranh trực tiếp. Bên thắng nhận allocation number 50; bên còn lại nhận `GUEST_QUOTA_EXCEEDED` và không để lại guest/RSVP dở dang.

- Mở thiệp không tăng quota.
- Người đi cùng không tăng quota.
- Sửa RSVP qua token cá nhân hoặc edit secret không tăng quota.
- Thu hồi khách hoặc token không giảm quota.
- Retry cùng idempotency key trả lại cùng kết quả; đổi payload với key cũ bị từ chối.

## Token và quyền sửa

Token cá nhân và edit secret đều được dẫn xuất bằng HMAC-SHA256 với secret ngẫu nhiên nằm trong schema `private`. Bảng public chỉ giữ SHA-256 để lookup. Idempotency ledger chỉ giữ ID và allocation number, không giữ token thô; function có thể dẫn xuất lại token khi replay.

Link chung trả edit secret đúng một lần, đặt cookie `HttpOnly`, `Secure` trên production và `SameSite=Lax`. Route edit secret xác minh quyền, đặt cookie rồi redirect về `/e/:publicCode#rsvp-form`, nên URL sau cùng không còn secret. Link cá nhân bị rotate hoặc revoke sẽ không resolve và không thể gửi RSVP.

## API và giao diện

- Owner: danh sách/quota tại `/events/:eventId/guests`, tạo link cá nhân, tạo link mới, đánh dấu đã gửi và thu hồi.
- Public shared: `POST /api/v1/public/events/:publicCode/rsvps`.
- Shared edit: `PATCH /api/v1/public/events/:publicCode/rsvps/me` với cookie.
- Personal: trang `/i/:invitationToken` và `PATCH /api/v1/i/:invitationToken/rsvp`.
- Open signal: `POST /api/v1/public/events/:publicCode/open`; user-agent preview/crawler được ghi vào cột bot riêng.

Form có loading, lỗi quota/deadline/rate limit, success, companion limit theo snapshot và honeypot ngoài vùng tương tác. RSVP từ chối luôn ép số người đi cùng về 0 ở cả client và database.

## Kiểm thử

- `pnpm check`: lint, TypeScript, 23 test ứng dụng và production build đạt.
- Migration `20260911180000` và hardening `20260911181000` đã áp dụng lên Supabase liên kết; `migration list` xác nhận local/remote đồng bộ.
- pgTAP G6 có 21 assertion cho privilege, token hash, replay, quota, phone, rotate, shared edit khi quota đầy và rollback khi suất 51 thất bại.
- CI chạy riêng suite G2 và G6 trên Supabase local sạch.
- Bài concurrency dùng hai connection thật: một transaction tạo link cá nhân và một transaction RSVP link chung cùng tranh suất 50; chỉ một transaction được phép thành công.

## Giới hạn vận hành

- Google OAuth vẫn chờ Client ID/Secret, nên UAT owner đăng nhập thật trên Vercel vẫn là blocker ngoài mã nguồn.
- CAPTCHA thích ứng cần site key/secret của nhà cung cấp; rate limit và honeypot đang hoạt động độc lập. Việc cấu hình CAPTCHA nằm trong hardening G10.
- Dashboard tổng hợp, lọc, duyệt lời chúc và CSV/Excel thuộc G7; trang G6 chỉ cung cấp danh sách vận hành cơ bản để tạo và quản lý link.

## Điều kiện chuyển G7

G7 đọc `guest_slots`, `rsvps` và `wishes` qua RLS owner hiện có để xây summary, tìm kiếm/lọc, duyệt lời chúc và export. Số suất đã dùng luôn lấy từ `event_quota_counters`, không suy ra từ số hàng đang hiển thị.
