# G1 — Báo cáo triển khai nền tảng và Google Auth

Ngày kiểm tra: 11/09/2026. Phạm vi: INV-101 đến INV-106.

## Kết quả

| Issue | Trạng thái | Bằng chứng |
|---|---|---|
| INV-101 | Hoàn tất | Next.js App Router, TypeScript strict, Tailwind, Zod; dependency exact và `pnpm-lock.yaml`; lint/typecheck/test/build qua |
| INV-102 | Hoàn tất staging | `.env.example`, guard cách ly môi trường, Vercel `invity` và Supabase `invity` riêng |
| INV-103 | Hoàn tất trong code | Google-only OAuth action, callback PKCE/session SSR, logout, kiểm tra `returnTo`; cần credential thật để nghiệm thu live |
| INV-104 | Hoàn tất trong migration | `app_users`, `auth_bindings`, `external_identities`, RLS và RPC bootstrap có khóa chống race |
| INV-105 | Hoàn tất | Landing/gallery/login public; `/dashboard` được proxy bảo vệ; loading/error/not-found có sẵn |
| INV-106 | Hoàn tất staging | GitHub CI kiểm lint/type/test/build + reset migration/pgTAP/concurrency; GitHub đã nối Vercel và deployment staging hoạt động |

## Kiểm tra đã chạy

```text
pnpm lint       PASS
pnpm typecheck  PASS
pnpm test       PASS — 10 tests
pnpm build      PASS — 8 app routes + Proxy
```

Smoke test production build trên cổng local riêng:

| URL | Kết quả |
|---|---|
| `/` | 200 |
| `/templates` | 200 |
| `/login` | 200 |
| `/dashboard` không session | 307 → `/login?returnTo=%2Fdashboard` |
| `/auth/callback?returnTo=https://evil.test` không code | 307 → login, fallback `/dashboard` |

GitHub Actions run `34516090777` đã chạy thành công cả job ứng dụng và database trên môi trường sạch. Ba migration cũng đã áp dụng vào Supabase staging và kiểm tra trực tiếp trên database remote.

## Ranh giới bảo mật đã áp dụng

- Ownership dùng UUID `app_user_id`, không dùng email.
- Chỉ danh tính Google được RPC bootstrap chấp nhận; subject lấy từ `auth.identities`.
- Request bootstrap đầu tiên cho cùng auth user được serialize bằng advisory transaction lock.
- Callback chỉ quay về `/`, `/dashboard` hoặc `/templates`; absolute URL, `//`, backslash và vùng owner chưa allowlist bị từ chối.
- Session được xác minh bằng Supabase `getClaims()` trong Proxy; service-role key không tồn tại trong cấu hình browser.
- User chỉ SELECT được profile/binding của chính mình qua RLS.
- Preview deployment dừng khởi động nếu URL Supabase khớp production project ref đã cấu hình.

## Trạng thái staging ngày 11/09/2026

Đã liên kết project Supabase riêng `invity` (`unauvoujwjomloveveij`) và áp dụng các migration G1/G2. Database này độc lập với project `leminhtriet.com`. Vercel project `invity` đã nối GitHub và deployment staging đang phục vụ tại `https://invity-ten.vercel.app`.

Biến môi trường Production/Preview trên Vercel đã cấu hình bằng publishable key; không đưa service-role key lên Vercel. Supabase Auth `site_url` và allowlist callback đã giới hạn cho domain staging cùng callback local. Email/password signup đã tắt ở cấu hình Auth.

Endpoint Auth settings của Supabase xác nhận Google provider hiện đang tắt. Do chưa có Google OAuth client ID/secret, chưa thể chạy demo login live hoặc xác nhận cùng `app_user_id` sau đăng nhập lại.

Để đóng Gate G1 chỉ còn tạo Google OAuth Web client, khai báo Supabase callback trong Google Cloud, điền client ID/secret vào Supabase và bật Google provider. `supabase/config.toml` cố ý giữ provider ở trạng thái tắt cho đến khi có credential thật.

Sau cấu hình: redeploy và trình diễn chọn mẫu → Google login → cùng `app_user_id` sau đăng nhập lại → dashboard → logout. Không được dùng project `leminhtriet.com` cho bước này; kết nối auth chung thuộc G12.
