# Invite

Nền tảng thiệp mời trực tuyến mobile-first. Ứng dụng dùng Supabase, đăng nhập qua OIDC tập trung LeMinhTriet, identity binding ổn định, app shell và CI.

## Chạy local

Yêu cầu Node.js 22 và pnpm 11.

1. Sao chép `.env.example` thành `.env.local` và điền Supabase URL/publishable key.
2. Cấu hình provider OIDC `custom:leminhtriet` trong Supabase Auth local hoặc dùng project phát triển đã được cấp client riêng.
3. Chạy `supabase start`, sau đó `supabase db reset`.
4. Chạy `pnpm install` và `pnpm dev`.

OIDC provider và Supabase Auth phải allowlist chính xác callback của từng môi trường. Production hiện dùng callback Supabase `https://unauvoujwjomloveveij.supabase.co/auth/v1/callback`.

## Kiểm tra

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Kiểm thử database chạy trong CI bằng Supabase local, pgTAP và một bài test hai connection tranh suất khách cuối. Nếu có PostgreSQL/Supabase local phù hợp:

```powershell
supabase db reset --local --no-seed
supabase test db
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
pnpm test:db:concurrency
```

CI không deploy production và không tự chạy migration production. Mỗi môi trường dùng Supabase project/secrets riêng; preview không được trỏ vào production.

## Tài liệu

- `docs/IMPLEMENTATION_ROADMAP.md`: roadmap và gate.
- `docs/G0_API_CONTRACT.md`: hợp đồng API v1.
- `docs/G0_DATA_MODEL.md`: mô hình dữ liệu và quyền.
