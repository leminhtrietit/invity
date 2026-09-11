# Báo cáo triển khai G8 — VietQR động

**Ngày chốt kỹ thuật:** 12/09/2026  
**Phạm vi:** INV-801 → INV-805

## Kết quả

G8 đã triển khai đủ luồng cấu hình của chủ tiệc và luồng tạo mã của khách mời. Người nhận luôn được tải từ event ở server; request phía khách chỉ chọn một UUID đã xuất hiện trong danh sách masked của chính thiệp đó.

| Issue | Trạng thái | Đầu ra |
|---|---|---|
| INV-801 | Hoàn tất | Trang owner lưu tối đa hai người nhận, gồm nhãn, mã ngân hàng, số tài khoản và tên; ciphertext pgcrypto AES-256, key trong schema `private` |
| INV-802 | Hoàn tất | Preview người nhận và checkbox xác nhận bắt buộc; account chưa xác nhận không public; sửa/xóa sau publish yêu cầu JWT `iat` trong 15 phút; mọi lưu/xóa có audit |
| INV-803 | Hoàn tất | Adapter server tạo VietQR Quick Link, cố định origin `https://img.vietqr.io`, validate lại account/amount/nội dung và proxy ảnh với timeout 7 giây, `no-store` |
| INV-804 | Hoàn tất | Dialog/bottom sheet mobile cho phép chọn người nhận, để trống số tiền, nhập nội dung tối đa 25 ký tự và tạo QR theo thao tác chủ động |
| INV-805 | Hoàn tất | Tải QR, sao chép số tài khoản/nội dung, và vẫn hiển thị đủ thông tin người nhận nếu ảnh lỗi; không có trạng thái thanh toán thành công |

## Ranh giới dữ liệu

`gift_accounts.account_number_ciphertext` chứa kết quả `pgp_sym_encrypt` với AES-256. Key `gift-account-pgcrypto-v1` được sinh ngẫu nhiên trong `private.runtime_secrets`; role `anon` và `authenticated` không có quyền gọi hàm lấy key.

Owner đọc số tài khoản qua `list_gift_accounts`, hàm kiểm tra quyền sở hữu event trước khi giải mã. Public event snapshot, API event, Open Graph và HTML ban đầu không chứa số tài khoản đầy đủ. `get_public_gift_options` chỉ trả id, nhãn, bank id, tên chủ tài khoản và bốn số cuối của account đã bật và xác nhận.

Khi khách bấm tạo QR, `resolve_public_gift_recipient(publicCode, accountId)` yêu cầu đồng thời event đang published, snapshot bật quà, account thuộc đúng event, account enabled và đã xác nhận. Vì vậy UUID của event khác không thể đổi người nhận.

## Bảo vệ thay đổi

Lưu và xóa account của event đã từng publish gọi `private.assert_recent_auth_for_published_event`. Hàm đọc `iat` từ JWT và từ chối khi phiên cũ hơn 15 phút với mã `RECENT_AUTH_REQUIRED`. UI hướng người dùng đăng nhập lại. Event chưa publish vẫn cấu hình được trong phiên hiện tại.

Audit chỉ ghi event, actor, action, account UUID, vị trí và trạng thái xác nhận; không ghi số tài khoản. Dữ liệu public được đọc động và response QR dùng `no-store`, nên thay đổi hoặc xóa có hiệu lực mà không cần sửa snapshot đã publish.

## Provider và lỗi dự phòng

Adapter tuân theo Quick Link của VietQR: mã ngân hàng, số tài khoản và template nằm trong path; số tiền, nội dung và tên tài khoản được URL encode trong query. Giá trị `VIETQR_TEMPLATE_ID` chỉ được nhận nếu khớp allowlist ký tự; mặc định local/preview là `compact2`.

Route ảnh chỉ gọi origin cố định `img.vietqr.io`, kiểm tra HTTP success và MIME `image/*`, rồi stream về cùng origin của Invite. Khi timeout hoặc provider lỗi, route trả `VIETQR_UNAVAILABLE`; phần thông tin ngân hàng, chủ tài khoản và số tài khoản vẫn cho phép sao chép.

Ứng dụng chỉ hỗ trợ tạo lệnh chuyển khoản. Dialog nhắc khách kiểm tra người nhận trong app ngân hàng và ghi rõ Invite không xác nhận giao dịch hay trạng thái đã nhận tiền.

## Kiểm thử

- `pnpm lint`, `pnpm typecheck`, 31 test ứng dụng và production build đạt tại máy phát triển.
- Unit test kiểm tra amount tùy chọn, biên 1.000–500.000.000 VND, nội dung 25 ký tự, chuẩn hóa bank id và origin VietQR cố định.
- pgTAP G8 có 17 assertion cho privilege, ciphertext, tối đa hai vị trí, recent auth, cách ly owner, DTO masked và account UUID từ event khác.
- Migration `20260912100000_g8_vietqr.sql` đã áp dụng lên Supabase project liên kết. pgTAP được đưa vào CI vì Supabase CLI trên máy Windows yêu cầu Docker ngay cả khi dùng database linked.

## Việc cấu hình khi phát hành production

Tạo template riêng trong My VietQR, xác nhận template ID và đặt `VIETQR_TEMPLATE_ID` trong Vercel production. UAT cần quét QR bằng ứng dụng ngân hàng để đối chiếu người nhận, số tiền và nội dung; không cần thực hiện giao dịch.

Google OAuth vẫn cần Client ID/Secret để UAT trang owner bằng tài khoản thật. Đây là blocker cấu hình đã biết từ các giai đoạn trước, không ảnh hưởng migration hoặc build.
