# G12 — Báo cáo tích hợp xác thực LeMinhTriet OIDC

**Ngày nghiệm thu:** 14/09/2026  
**Ứng dụng:** Invity production tại `https://invity-ten.vercel.app`  
**Invity Supabase:** `unauvoujwjomloveveij`

## Kết quả

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| OIDC provider | Đạt | Discovery và JWKS native Supabase trả cấu hình/khóa ký hợp lệ |
| Authorization flow | Đạt | Authorization Code Flow với PKCE S256; consent và Google login tại hệ thống LeMinhTriet |
| Client production | Đạt | Client confidential đăng ký thủ công; callback exact match tới Supabase Auth của Invity |
| Invity callback/session | Đạt | Code được đổi thành session, `returnTo` nội bộ được giữ và user đến `/dashboard` |
| Identity binding | Đạt | Provider `custom:leminhtriet` ánh xạ thành `leminhtriet_oidc`; ownership dùng `app_user_id`, binding dùng issuer + subject |
| UserInfo protection | Đạt | Request không có bearer token bị từ chối `401` |
| Secret handling | Đạt | Secret chỉ nằm trong cấu hình dịch vụ, không in ra console hoặc commit |

## Cấu hình production

- Issuer: `https://jebsmjfrbdxdtdeikkus.supabase.co/auth/v1`.
- Callback: `https://unauvoujwjomloveveij.supabase.co/auth/v1/callback`.
- Client ID: `4c8b72e4-5f8e-48e6-898a-b3d17bb10739`.
- Token endpoint authentication: `client_secret_post`, theo khả năng native Supabase hiện tại.
- Dynamic OAuth App Registration: tắt. Client production được tạo và xoay credential theo quy trình quản trị.
- Custom domain `auth.leminhtriet.com`: hoãn đến khi nâng Supabase Pro; không chặn đăng nhập production bằng domain Supabase.

## Thay đổi phía Invity

- Login dùng provider `custom:leminhtriet` và hiển thị rõ tài khoản LeMinhTriet.
- Callback đổi code lấy session, ghi lỗi đã làm sạch và gọi `ensure_current_app_user`.
- Migration `20260914100000_g12_central_oidc.sql` thêm provider/binding OIDC.
- Migration `20260914110000_g12_oidc_binding_fix.sql` xử lý đúng identity subject từ `auth.identities`, yêu cầu email đã xác minh và duy trì uniqueness theo `(issuer, subject)`.
- Luồng legacy Google vẫn được migration hiểu để không phá dữ liệu cũ; giao diện production cung cấp email/password và biểu tượng đăng nhập LeMinhTriet.

## Kiểm thử đã đạt

1. Discovery trả `200` và khai báo issuer/endpoints.
2. JWKS trả `200` với khóa ký bất đối xứng hợp lệ.
3. Authorization request bắt buộc PKCE S256.
4. UserInfo từ chối request thiếu bearer token bằng `401`.
5. Người dùng chưa có session được chuyển qua login/consent và quay về callback đúng.
6. Callback tạo session Invity và bootstrap binding thành công; `/dashboard` mở được.
7. `returnTo` ngoài allowlist tiếp tục bị từ chối.

## Việc vận hành còn lại

- Khi nâng Supabase Pro, cấu hình CNAME và custom domain `auth.leminhtriet.com`, sau đó chạy lại conformance và login E2E trước khi đổi issuer production.
- Bổ sung back-channel logout/webhook khóa hoặc xóa tài khoản nếu hệ thống Auth triển khai các endpoint này.
- Diễn tập xoay client secret không downtime và ghi lại owner/ngày hết hạn trong secret manager.
- Hoàn tất UAT Safari iOS, Chrome Android và webview Zalo/Messenger/Telegram trong G10/G11.
