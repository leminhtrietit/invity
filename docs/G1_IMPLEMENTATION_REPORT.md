# G1 — Báo cáo triển khai nền tảng và Google Auth

Ngày kiểm tra: 10/09/2026. Phạm vi: INV-101 đến INV-106.

## Kết quả

| Issue | Trạng thái | Bằng chứng |
|---|---|---|
| INV-101 | Hoàn tất | Next.js App Router, TypeScript strict, Tailwind, Zod; dependency exact và `pnpm-lock.yaml`; lint/typecheck/test/build qua |
| INV-102 | Hoàn tất trong code | `.env.example`, cấu hình Supabase local và guard chặn Vercel Preview dùng project production |
| INV-103 | Hoàn tất trong code | Google-only OAuth action, callback PKCE/session SSR, logout, kiểm tra `returnTo`; cần credential thật để nghiệm thu live |
| INV-104 | Hoàn tất trong migration | `app_users`, `auth_bindings`, `external_identities`, RLS và RPC bootstrap có khóa chống race |
| INV-105 | Hoàn tất | Landing/gallery/login public; `/dashboard` được proxy bảo vệ; loading/error/not-found có sẵn |
| INV-106 | Hoàn tất cấu hình | CI kiểm lint/type/test/build + reset migration; workflow deploy staging chạy thủ công sau khi có project/secrets |

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

Docker và Supabase CLI cài hệ thống không có trên host này, nên migration chưa chạy local. CI đã có job khởi động Supabase PostgreSQL thật và reset toàn bộ migration. Migration phải qua job này hoặc chạy trên project staging riêng trước khi coi Gate G1 đạt hoàn toàn.

## Ranh giới bảo mật đã áp dụng

- Ownership dùng UUID `app_user_id`, không dùng email.
- Chỉ danh tính Google được RPC bootstrap chấp nhận; subject lấy từ `auth.identities`.
- Request bootstrap đầu tiên cho cùng auth user được serialize bằng advisory transaction lock.
- Callback chỉ quay về `/`, `/dashboard` hoặc `/templates`; absolute URL, `//`, backslash và vùng owner chưa allowlist bị từ chối.
- Session được xác minh bằng Supabase `getClaims()` trong Proxy; service-role key không tồn tại trong cấu hình browser.
- User chỉ SELECT được profile/binding của chính mình qua RLS.
- Preview deployment dừng khởi động nếu URL Supabase khớp production project ref đã cấu hình.

## Trạng thái staging ngày 11/09/2026

Đã liên kết project Supabase riêng `invity` (`unauvoujwjomloveveij`) và áp dụng các migration G1/G2. Database này độc lập với project `leminhtriet.com`. Tài khoản Vercel `leminhtrietit` đã đăng nhập, nhưng workspace chưa có Vercel project/domain staging.

Endpoint Auth settings của Supabase xác nhận Google provider hiện đang tắt. Do chưa có Google OAuth client ID/secret, chưa thể chạy demo login live hoặc xác nhận cùng `app_user_id` sau đăng nhập lại.

Để đóng Gate G1 cần tạo Google OAuth client, tạo/cấu hình Vercel project staging và thêm secrets cho GitHub environment `staging`:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- Biến môi trường trong Vercel: `APP_ENV`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `PRODUCTION_SUPABASE_PROJECT_REF`
- Supabase/Google: Google client ID, client secret và các redirect URL staging; bật Google provider

Sau cấu hình: chạy migration trên staging, chạy workflow **Deploy staging**, trình diễn chọn mẫu → Google login → cùng `app_user_id` sau đăng nhập lại → dashboard → logout. Không được dùng project `leminhtriet.com` cho bước này; kết nối auth chung thuộc G12.
