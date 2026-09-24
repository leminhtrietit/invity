# Báo cáo triển khai G10 — Kiểm thử tích hợp và củng cố vận hành

**Ngày chốt kỹ thuật:** 14/09/2026
**Phạm vi:** INV-1001 → INV-1007  
**Production kiểm tra:** https://invity-ten.vercel.app  
**CI:** https://github.com/leminhtrietit/invity/actions/runs/34747880140

## Kết quả theo issue

| Issue | Trạng thái | Bằng chứng và phần còn lại |
|---|---|---|
| INV-1001 | Đạt | CI chạy test ứng dụng, migration sạch, pgTAP G2/G6/G7/G8/G9/G10 và bài kiểm tra tranh quota bằng hai connection. Smoke production đạt; đăng nhập OIDC production bằng tài khoản thật đã đến `/dashboard`. |
| INV-1002 | Đạt tự động | RLS/owner isolation, token revoke, same-origin mutation guard, CSP, chống clickjacking/MIME sniffing và trung hòa công thức CSV/XLSX đã có test. Không phát hiện P0/P1 trong phạm vi tự động. |
| INV-1003 | Đạt tự động | Idempotency, optimistic revision, publish/quota concurrency và lease job giữ invariant trong CI. |
| INV-1004 | Đạt gate lab | Ba lần Lighthouse mobile production có LCP 1.894/2.389/1.861 ms, trung vị 1.894 ms; CLS bằng 0. Cần tiếp tục thu field data sau beta để theo dõi p75 thực tế. |
| INV-1005 | Đạt lab, chờ thiết bị thật | Responsive, reduced motion, OG route 1200×630 và metadata social đã kiểm tra tự động. Safari iOS, Chrome Android và webview Zalo/Messenger/Telegram cần UAT trên thiết bị thật. |
| INV-1006 | Đạt schema/worker, chờ lần chạy production | Xóa event/account khóa truy cập ngay; purge tài khoản và dọn object dùng lease; worker thường chỉ nhận job của chính owner, maintenance yêu cầu secret. Workflow retention hằng ngày và các secret đã được cấu hình; cần chạy thử sau khi project Supabase khởi động lại và đối chiếu Storage. |
| INV-1007 | Có runbook, chưa diễn tập restore | Đã có quy trình backup/restore/rollback với RPO 24 giờ, RTO 8 giờ. Cần project Supabase recovery cô lập và bản sao media để đo RPO/RTO thật. |

## Hardening đã triển khai

- Mọi mutation API đi qua kiểm tra same-origin. Request trình duyệt khác site bị trả `403`; safe method, request cùng origin và client không phải trình duyệt vẫn hoạt động.
- Các đường dẫn dashboard, event, settings và admin đều yêu cầu session. Security headers production gồm CSP, HSTS, COOP, `nosniff`, `DENY` và Permissions Policy.
- Database giới hạn analytics ở 120 request/10 phút và abuse report ở 5 request/giờ/event. Dữ liệu limit cũ và idempotency/product event hết hạn được dọn qua maintenance.
- `media-worker` mặc định xác minh JWT và chỉ claim `media.process` thuộc owner. Chế độ maintenance chỉ hoạt động khi `X-Worker-Secret` khớp secret vận hành; chế độ này xử lý cleanup và purge tài khoản.
- Yêu cầu xóa tài khoản có thời gian chờ 30 ngày. Khi purge, dữ liệu ứng dụng và `auth.users` bị xóa, payload job được redaction để không giữ PII không cần thiết.
- Preview thiệp tải khi người dùng cuộn đến vùng xem thử; ảnh dưới màn hình, countdown preview và các section dài không chiếm tài nguyên lần vẽ đầu. Header/CTA dùng điều hướng gọn, analytics gửi lúc browser rảnh và CSS quan trọng được inline.

## Kiểm thử và triển khai

- Commit release candidate kỹ thuật: `0b542a44a959673746f73aa7f15de488c6e72235`.
- GitHub Actions run `34747880140`: thành công toàn bộ verify, reset migration, pgTAP và concurrency.
- `pnpm check`: lint, TypeScript, 40 test ứng dụng và production build đạt.
- `supabase db lint --linked --level warning`: không có lỗi schema.
- Migration `20260913100000_g10_hardening.sql` đã áp dụng vào project Supabase liên kết.
- Edge Function `media-worker` đã deploy. Deployment đo hiệu năng `dpl_9gKSV33y8t7AYAquhz3m8Xvctrr8` ở trạng thái READY và alias về URL production.
- `pnpm smoke:production`: đạt 6 trang, social metadata, security headers và cross-site mutation guard.

## Đo hiệu năng production

Cấu hình: Lighthouse mobile, simulated throttling, cache lạnh, Chrome headless trên máy Windows; URL `/templates/vow-editorial`; ba lần chạy liên tiếp ngày 14/09/2026.

| Lần | Performance | FCP | LCP | TBT | CLS |
|---:|---:|---:|---:|---:|---:|
| 1 | 92 | 1.690 ms | 1.894 ms | 298 ms | 0 |
| 2 | 76 | 1.131 ms | 2.389 ms | 1.028 ms | 0 |
| 3 | 79 | 1.131 ms | 1.861 ms | 877 ms | 0 |
| Trung vị | 79 | 1.131 ms | 1.894 ms | 877 ms | 0 |

CLS và LCP trung vị đã đạt gate lab. Lần chạy chậm nhất cho thấy TBT còn dao động theo tải máy đo, vì vậy cần tiếp tục theo dõi Web Vitals thực tế và p75 sau khi có lưu lượng beta.

## Gate và việc vận hành bắt buộc

Không phát hiện P0/P1 trong bộ kiểm thử tự động. Gate kỹ thuật tự động đã đạt; trước beta bên ngoài còn hai đầu ra vận hành:

1. Hoàn tất ma trận Safari iOS, Chrome Android, Zalo/Messenger iOS/Android, Telegram và desktop.
2. Cấu hình secret/lịch maintenance, backup media, rồi diễn tập restore DB + Storage trong project recovery cô lập và ghi RPO/RTO thực tế.

**Cập nhật 24/09/2026:** Đã thêm `scripts/run-retention-maintenance.mjs` và GitHub Actions workflow chạy hằng ngày; unit test cho thứ tự RPC → worker, xử lý hàng đợi và báo lỗi job thất bại. Smoke production đạt lại trên 6 trang tĩnh. Phát hiện Supabase `invity` bị pause (`INACTIVE`), đã bấm Resume và đang chờ trạng thái `ACTIVE_HEALTHY`; vì vậy smoke tĩnh chưa xác nhận được auth/RSVP. Đã cấu hình các secret bảo trì trong Supabase và GitHub environment `Production`; còn phải chạy thử workflow sau khi project hoạt động. Dashboard hiện báo không có backup định kỳ trên gói Free. Gate G10 vẫn chờ UAT thiết bị thật, backup DB/Storage và restore drill.

Tham chiếu: `docs/operations/G10_TEST_MATRIX.md` và `docs/operations/BACKUP_RESTORE_RUNBOOK.md`.
