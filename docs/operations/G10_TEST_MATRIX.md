# Ma trận kiểm thử tích hợp G10

| Nhóm | Bằng chứng tự động | Trạng thái |
|---|---|---|
| Host/guest và quota | pgTAP G2, G6–G10; test hai connection tranh suất cuối | Đạt trên CI |
| RLS/IDOR/token | pgTAP quyền anon/authenticated, owner isolation, token revoke | Đạt trên CI |
| CSRF/clickjacking/MIME | Same-origin test, production smoke, CSP `frame-ancestors`, DENY, nosniff | Đạt tự động |
| XSS/export | React escaping; CSV/XLSX formula neutralization tests | Đạt tự động |
| Retry/race | Idempotency, optimistic revision, publish/quota concurrency | Đạt trên CI |
| Storage/deletion | Cleanup job sau 7/30 ngày; xóa tài khoản khóa ngay, purge có lease | Đạt schema/pgTAP; backup media cần OPS drill |
| Mobile/social | Layout 360/390/430/768/1280, reduced motion; OG route 1200×630 | Đạt lab; thiết bị/app thật cần UAT |
| Performance | Lighthouse mobile 4G trên deployment production | Ghi vào báo cáo G10 sau deploy |

Thiết bị UAT bắt buộc trước beta: Safari iOS; Chrome Android; Zalo và Messenger trên iOS/Android; Telegram; Safari/Chrome/Edge desktop. Với mỗi lần chạy ghi model thiết bị, OS, app/browser version, mạng, cache lạnh/ấm, public code giả và ảnh/video lỗi.
