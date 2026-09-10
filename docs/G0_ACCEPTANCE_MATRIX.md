# G0 — Ma trận nghiệm thu và kiểm thử nghiệp vụ

Mỗi test có fixture dữ liệu giả, request ID và bằng chứng (log đã redaction/screenshot/video khi phù hợp). Test integration quota/RLS phải chạy với PostgreSQL thực; unit/mock không thay thế gate này.

| ID | Liên kết issue | Kịch bản | Kết quả mong đợi |
|---|---|---|---|
| G0-QA-01 | INV-001 | Publish đầu lúc 23:59:59 Việt Nam, publish khác event lúc 00:00:00 tháng mới | Hai bucket tháng khác nhau; mỗi bucket chỉ có một `first_publication`. |
| G0-QA-02 | INV-001, 204 | Xóa event đã publish rồi tạo/publish event khác cùng tháng | Bị `EVENT_QUOTA_EXCEEDED`; không hoàn quota. |
| G0-QA-03 | INV-003, 203 | User B thử đọc/sửa event, draft, media, guest, RSVP của User A qua API/RPC trực tiếp | `FORBIDDEN`/no row; không có PII lộ qua error. |
| G0-QA-04 | INV-003, 203 | Anon query các base table private | Không có `SELECT`; public DTO không chứa phone/token/draft/gift account. |
| G0-QA-05 | INV-004, 206 | PATCH draft hai tab cùng revision | Một request thành công tăng revision; request cũ trả `REVISION_CONFLICT`, không mất dữ liệu. |
| G0-QA-06 | INV-004, 206 | Retry POST cùng idempotency key/payload sau timeout | Trả response cũ; chỉ một side effect/audit allocation. |
| G0-QA-07 | INV-004, 206 | Dùng lại key nhưng đổi payload | `IDEMPOTENCY_CONFLICT`; không ghi payload mới. |
| G0-QA-08 | INV-005, 205 | Counter là 49; host tạo guest link và public RSVP mới đồng thời | Chỉ một thao tác thành công, counter cuối là 50. |
| G0-QA-09 | INV-005, 205 | Counter 50; guest có link cá nhân sửa RSVP | Sửa thành công, counter vẫn 50. |
| G0-QA-10 | INV-005, 205 | Thu hồi/xóa guest từng dùng suất | Guest không truy cập được; `guest_slots_used` không giảm. |
| G0-QA-11 | INV-005 | Token cá nhân bị xoay/thu hồi rồi dùng link cũ | Link cũ bị từ chối không tiết lộ trạng thái token; link mới hoạt động. |
| G0-QA-12 | INV-005 | Link chung submit phone đã tồn tại | Không trả identity/trạng thái RSVP của phone đó. |
| G0-QA-13 | INV-005 | Deadline RSVP = start; gửi trước/sau deadline, event hidden/cancelled | Trước hạn được xử lý; sau hạn hoặc lifecycle không hợp lệ trả `RSVP_CLOSED`/an toàn. |
| G0-QA-14 | INV-002, 105 | Mở dashboard không session; mở gallery/thiệp public không session | Dashboard redirect login; gallery/thiệp published vẫn đọc được. |
| G0-QA-15 | INV-002, 103 | Callback `returnTo=https://evil.test`, `//evil`, backslash | Đều bị từ chối/fallback path nội bộ; không open redirect. |
| G0-QA-16 | INV-002, 103 | OAuth trong in-app browser bị chặn | Có hướng dẫn mở browser hệ thống; template selection còn nguyên. |
| G0-QA-17 | INV-002, 303 | Preview event chứa tên dài, ảnh ngang/dọc, section tùy chọn thiếu dữ liệu | Layout hợp lệ tại 360/390/430/768/1280; preview không tạo open/RSVP/QR thật. |
| G0-QA-18 | INV-005, 207 | Worker job crash sau lease, retry vượt giới hạn | Lease được thu hồi theo rule; retry hữu hạn; job chuyển failed và có audit. |

## Dữ liệu fixture chuẩn

- Owner A và Owner B, tài khoản auth khác email/sub OAuth; event của A không được B thấy.
- Event `E-49` có `guest_slots_used = 49`, Event `E-50` có 50; một guest cá nhân revoked và một guest có RSVP edit session.
- Event public, hidden, cancelled, archived, draft; mỗi event có template/version giả hợp lệ.
- Bộ dashboard: 40 suất đã cấp, 25 attending, 5 declined, 10 pending, tổng 18 companion. Kết quả summary bắt buộc là 43; sau thu hồi một guest, guest đang quản lý giảm nhưng 40 suất đã cấp không đổi.

## Gate G0 checklist

- [ ] PO duyệt glossary, luồng/wireframe và các quyết định v1 không bị thay đổi.
- [ ] TL duyệt ERD, state machine, ranh giới public/private và API contract.
- [ ] QA chuyển các hàng G0-QA thành test cases có evidence location.
- [ ] Không còn endpoint/DTO nào yêu cầu client biết token, PII hay quyền owner của resource khác.
- [ ] Các điểm cần implementation G1/G2 được trace tới INV-101…106 và INV-201…207.

Khi checklist có đủ ba approver, Gate G0 mới đạt và G1/G2 được mở theo roadmap.
