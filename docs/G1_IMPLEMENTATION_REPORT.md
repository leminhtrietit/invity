# G1 — Báo cáo triển khai nền tảng và xác thực

Ngày kiểm tra cuối: 14/09/2026. Phạm vi: INV-101 đến INV-106.

## Kết quả

| Issue | Trạng thái | Bằng chứng |
|---|---|---|
| INV-101 | Hoàn tất | Next.js App Router, TypeScript strict, Tailwind, Zod; dependency exact và `pnpm-lock.yaml`; lint/typecheck/test/build qua |
| INV-102 | Hoàn tất staging | `.env.example`, guard cách ly môi trường, Vercel `invity` và Supabase `invity` riêng |
| INV-103 | Hoàn tất production | OIDC LeMinhTriet qua Supabase Auth, Authorization Code + PKCE, callback/session SSR, logout và kiểm tra `returnTo`; đăng nhập live đã đến `/dashboard` |
| INV-104 | Hoàn tất production | `app_users`, `auth_bindings`, `external_identities`, RLS và RPC bootstrap có khóa chống race; OIDC bind bằng `(iss, sub)` |
| INV-105 | Hoàn tất | Landing/gallery/login public; `/dashboard` được proxy bảo vệ; loading/error/not-found có sẵn |
| INV-106 | Hoàn tất staging | GitHub CI kiểm lint/type/test/build + reset migration/pgTAP/concurrency; GitHub đã nối Vercel và deployment staging hoạt động |

## Kiểm tra đã chạy

```text
pnpm lint       PASS
pnpm typecheck  PASS
pnpm test       PASS — 40 tests
pnpm build      PASS — 30 static pages và toàn bộ API/app routes + Proxy
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
- Chỉ danh tính Google legacy hoặc `custom:leminhtriet` được RPC bootstrap chấp nhận; OIDC yêu cầu email đã xác minh và subject lấy từ `auth.identities`.
- Request bootstrap đầu tiên cho cùng auth user được serialize bằng advisory transaction lock.
- Callback chỉ quay về `/`, `/dashboard` hoặc `/templates`; absolute URL, `//`, backslash và vùng owner chưa allowlist bị từ chối.
- Session được xác minh bằng Supabase `getClaims()` trong Proxy; service-role key không tồn tại trong cấu hình browser.
- User chỉ SELECT được profile/binding của chính mình qua RLS.
- Preview deployment dừng khởi động nếu URL Supabase khớp production project ref đã cấu hình.

## Trạng thái production ngày 14/09/2026

Đã liên kết project Supabase riêng `invity` (`unauvoujwjomloveveij`) và áp dụng toàn bộ migration, gồm migration OIDC G12. Database Invity vẫn độc lập với hệ thống Auth tập trung. Vercel project `invity` đã nối GitHub và phục vụ tại `https://invity-ten.vercel.app`.

Biến môi trường Vercel đã cấu hình bằng publishable key; không đưa service-role key lên browser. Supabase Auth `site_url` và allowlist callback được giới hạn theo môi trường. Email/password signup không phải phương thức đăng nhập của Invity.

Invity dùng provider `custom:leminhtriet`. Issuer hiện tại là `https://jebsmjfrbdxdtdeikkus.supabase.co/auth/v1`; callback client là `https://unauvoujwjomloveveij.supabase.co/auth/v1/callback`. Custom domain `auth.leminhtriet.com` được hoãn vì yêu cầu Supabase Pro. Dynamic OAuth app registration được giữ tắt và client production được quản lý thủ công.

Luồng production chọn mẫu → LeMinhTriet OIDC → callback Invity → bootstrap binding → `/dashboard` đã được kiểm thử thành công. Gate G1 được đóng; UAT đa thiết bị và diễn tập vận hành tiếp tục ở G10/G11.
