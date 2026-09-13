# Báo cáo triển khai G10 — Kiểm thử tích hợp và củng cố vận hành

**Ngày chốt kỹ thuật:** 13/09/2026  
**Phạm vi:** INV-1001 → INV-1007  
**Production kiểm tra:** https://invity-ten.vercel.app  
**CI:** https://github.com/leminhtrietit/invity/actions/runs/34747880140

## Kết quả theo issue

| Issue | Trạng thái | Bằng chứng và phần còn lại |
|---|---|---|
| INV-1001 | Đạt tự động, chờ UAT đăng nhập thật | CI chạy test ứng dụng, migration sạch, pgTAP G2/G6/G7/G8/G9/G10 và bài kiểm tra tranh quota bằng hai connection. Smoke production đạt 6 trang. Google OAuth production chưa bật nên chưa thể nghiệm thu E2E host bằng tài khoản thật. |
| INV-1002 | Đạt tự động | RLS/owner isolation, token revoke, same-origin mutation guard, CSP, chống clickjacking/MIME sniffing và trung hòa công thức CSV/XLSX đã có test. Không phát hiện P0/P1 trong phạm vi tự động. |
| INV-1003 | Đạt tự động | Idempotency, optimistic revision, publish/quota concurrency và lease job giữ invariant trong CI. |
| INV-1004 | Chưa đạt gate | CLS bằng 0 trong cả ba lần Lighthouse mobile. LCP lab trung vị 4.228 ms, chưa đạt mục tiêu 2.000 ms; chưa có dữ liệu người dùng thật để kết luận p75. |
| INV-1005 | Đạt lab, chờ thiết bị thật | Responsive, reduced motion, OG route 1200×630 và metadata social đã kiểm tra tự động. Safari iOS, Chrome Android và webview Zalo/Messenger/Telegram cần UAT trên thiết bị thật. |
| INV-1006 | Đạt schema/worker, chờ lịch OPS | Xóa event/account khóa truy cập ngay; purge tài khoản và dọn object dùng lease; worker thường chỉ nhận job của chính owner, maintenance yêu cầu secret. Cần cấu hình lịch retention và chạy đối chiếu Storage trên production. |
| INV-1007 | Có runbook, chưa diễn tập restore | Đã có quy trình backup/restore/rollback với RPO 24 giờ, RTO 8 giờ. Cần project Supabase recovery cô lập và bản sao media để đo RPO/RTO thật. |

## Hardening đã triển khai

- Mọi mutation API đi qua kiểm tra same-origin. Request trình duyệt khác site bị trả `403`; safe method, request cùng origin và client không phải trình duyệt vẫn hoạt động.
- Các đường dẫn dashboard, event, settings và admin đều yêu cầu session. Security headers production gồm CSP, HSTS, COOP, `nosniff`, `DENY` và Permissions Policy.
- Database giới hạn analytics ở 120 request/10 phút và abuse report ở 5 request/giờ/event. Dữ liệu limit cũ và idempotency/product event hết hạn được dọn qua maintenance.
- `media-worker` mặc định xác minh JWT và chỉ claim `media.process` thuộc owner. Chế độ maintenance chỉ hoạt động khi `X-Worker-Secret` khớp secret vận hành; chế độ này xử lý cleanup và purge tài khoản.
- Yêu cầu xóa tài khoản có thời gian chờ 30 ngày. Khi purge, dữ liệu ứng dụng và `auth.users` bị xóa, payload job được redaction để không giữ PII không cần thiết.
- Renderer trang chi tiết template được giữ ở server; chỉ khung chọn kích thước hydrate ở client. Các link header/CTA không tự prefetch, giảm request nền ngoài ý muốn.

## Kiểm thử và triển khai

- Commit release candidate kỹ thuật: `0b542a44a959673746f73aa7f15de488c6e72235`.
- GitHub Actions run `34747880140`: thành công toàn bộ verify, reset migration, pgTAP và concurrency.
- `pnpm check`: lint, TypeScript, 40 test ứng dụng và production build đạt.
- `supabase db lint --linked --level warning`: không có lỗi schema.
- Migration `20260913100000_g10_hardening.sql` đã áp dụng vào project Supabase liên kết.
- Edge Function `media-worker` đã deploy. Deployment production `dpl_7rYiTBg9ijPuinZMvinqUKvK6KiD` ở trạng thái READY và alias về URL production.
- `pnpm smoke:production`: đạt 6 trang, social metadata, security headers và cross-site mutation guard.

## Đo hiệu năng production

Cấu hình: Lighthouse 12.8.2, mobile, simulated throttling, cache lạnh, Chrome headless trên máy Windows; URL `/templates/vow-editorial`; ba lần chạy liên tiếp ngày 13/09/2026.

| Lần | Performance | FCP | LCP | TBT | CLS |
|---:|---:|---:|---:|---:|---:|
| 1 | 35 | 3.379 ms | 6.076 ms | 3.673 ms | 0 |
| 2 | 51 | 2.661 ms | 4.228 ms | 2.175 ms | 0 |
| 3 | 72 | 1.726 ms | 2.908 ms | 996 ms | 0 |
| Trung vị | 51 | 2.661 ms | 4.228 ms | 2.175 ms | 0 |

Kết quả dao động lớn theo tải máy đo. CLS đã đạt mục tiêu `<0,1`; LCP lab chưa đạt `<2 giây`. Đây là bằng chứng lab ban đầu, không thay thế dữ liệu field p75 trên 4G. Trước beta cần đo lại trên runner ổn định, bổ sung Web Vitals thực tế và tiếp tục giảm JavaScript/TBT của route công khai.

## Gate và việc vận hành bắt buộc

Không phát hiện P0/P1 trong bộ kiểm thử tự động. Gate G10 **chưa đóng** vì còn bốn đầu ra cần môi trường hoặc thiết bị bên ngoài:

1. Bật Google OAuth production và chạy E2E host/guest bằng tài khoản thật.
2. Hoàn tất ma trận Safari iOS, Chrome Android, Zalo/Messenger iOS/Android, Telegram và desktop.
3. Đạt LCP p75 `<2 giây` trên cấu hình nghiệm thu, có dữ liệu field hoặc bộ đo ổn định.
4. Cấu hình secret/lịch maintenance, backup media, rồi diễn tập restore DB + Storage trong project recovery cô lập và ghi RPO/RTO thực tế.

Tham chiếu: `docs/operations/G10_TEST_MATRIX.md` và `docs/operations/BACKUP_RESTORE_RUNBOOK.md`.
