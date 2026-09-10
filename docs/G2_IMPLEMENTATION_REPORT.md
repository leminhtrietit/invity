# G2 — Báo cáo database, phân quyền và lõi quota

Ngày kiểm tra: 11/09/2026. Phạm vi: INV-201 đến INV-207.

## Kết luận

Implementation và database gate G2 đã hoàn tất. Ba migration đã được áp dụng vào project Supabase `invity` riêng; bộ pgTAP và kiểm thử concurrency đều chạy thành công trực tiếp trên database remote.

G1 còn Gate live: Vercel staging đã hoạt động nhưng Google provider hiện tắt. Vì vậy kiểm tra owner isolation bằng hai phiên Google qua HTTP vẫn chờ credential OAuth, dù RLS/RPC đã được kiểm tra bằng hai identity database độc lập.

## Kết quả theo issue

| Issue | Trạng thái | Bằng chứng |
|---|---|---|
| INV-201 | Hoàn tất trong migration | `templates`, `events`, `event_drafts`, `event_versions`; published pointer thuộc đúng event; snapshot chặn update |
| INV-202 | Hoàn tất trong migration | Media, quota, guest/token, RSVP, wish, gift, idempotency, job, audit, metrics và abuse report |
| INV-203 | Hoàn tất remote | RLS owner cho toàn bộ bảng con; owner B không thấy/sửa event A; ACL worker được kiểm tra trên Supabase |
| INV-204 | Hoàn tất remote | `activate_event_version` khóa event, tính tháng Việt Nam và chỉ ghi một `publication_usage` cho lần đầu |
| INV-205 | Hoàn tất remote | Hai connection tranh suất cuối chỉ một bên thắng; counter và guest row cùng bằng 50 |
| INV-206 | Hoàn tất remote | RPC tự tạo SHA-256 từ tham số chuẩn hóa; replay cùng key/nội dung; payload khác và revision cũ bị từ chối |
| INV-207 | Hoàn tất remote | Job dùng `FOR UPDATE SKIP LOCKED`, lease, retry hữu hạn và terminal failure; worker RPC chỉ cấp cho service role |

## Các thành phần đã thêm

- Migration G2 tạo 19 bảng nghiệp vụ và các index/ràng buộc liên quan.
- Các RPC owner: `create_event_draft`, `save_event_draft`, `allocate_personal_guest_slot`, `activate_event_version`.
- Các RPC worker: `claim_jobs`, `finish_job`; chỉ `service_role` được execute.
- `vietnam_month_key` chốt kỳ tháng theo `Asia/Ho_Chi_Minh`, gồm giao năm.
- Trigger bảo vệ media thuộc đúng owner/event, wish thuộc đúng guest/event, companion không vượt cấu hình và event version không bị update.
- Tài khoản không còn trạng thái `active` không lấy được `current_app_user_id` và không bootstrap lại profile.
- `pgcrypto` được đặt trong schema `extensions` và gọi bằng tên đầy đủ trong security-definer function.

## Kiểm tra đã chạy

```text
pnpm lint                         PASS
pnpm typecheck                    PASS
pnpm test                         PASS — 10 test G1
PostgreSQL 18 clean migrations    PASS — bootstrap + G1 + G2
g2_core_smoke.sql                 PASS
pnpm test:db:concurrency          PASS
Supabase remote migrations        PASS — 3/3 local/remote khớp
Supabase remote pgTAP             PASS — 25/25
Supabase remote concurrency       PASS
```

Smoke test thực thi transaction thật, không dùng mock, bao phủ:

- Tạo draft và replay idempotency.
- Dùng lại key với payload khác.
- Autosave tăng revision và từ chối revision cũ.
- Cấp suất 50 và từ chối suất 51.
- Publish lần đầu, update event đã publish và chặn event thứ hai cùng tháng.
- RLS giữa hai owner.
- Job lease và terminal failure.
- Biên tháng Việt Nam `31/12 23:59:59` và `01/01 00:00:00`.

Kiểm thử concurrency mở hai kết nối database đồng thời khi counter bằng 49. Kết quả: một transaction thành công, một transaction nhận `GUEST_QUOTA_EXCEEDED`, counter cuối bằng 50 và tổng guest row bằng 50.

## Kiểm thử trong CI

Workflow CI đã được mở rộng theo thứ tự:

1. Khởi động Supabase local.
2. Reset toàn bộ migration trên database sạch.
3. Chạy 25 assertion pgTAP trong `supabase/tests/g2_core.test.sql`.
4. Chạy kiểm thử concurrency hai connection bằng `scripts/test-g2-concurrency.mjs`.

Bộ 25 assertion đã được chạy bằng SQL transaction trực tiếp trên project Supabase remote và rollback toàn bộ fixture. GitHub Actions cũng dựng Supabase local từ database sạch rồi chạy lại cùng bộ pgTAP và kiểm thử concurrency thành công trong run `34516090777`.

Lần chạy đầu phát hiện Supabase tự cấp `EXECUTE` cho API roles khi tạo public function. Migration `20260911120000_g2_function_privileges.sql` đã thu hồi quyền cụ thể khỏi `anon/authenticated` và chỉ cấp worker RPC cho `service_role`; chạy lại đạt 25/25.

## Các ranh giới cần giữ ở giai đoạn sau

- Route Handler phải gọi RPC cho write quan trọng; không tự viết lại quota bằng chuỗi `SELECT` rồi `INSERT`.
- `Idempotency-Key` ở HTTP được truyền thành UUID cho RPC. Payload hash do RPC tạo, không nhận hash do browser khai báo.
- `activate_event_version` chỉ kích hoạt candidate version đã được service tạo sau preflight/OG; client không có quyền INSERT version trực tiếp.
- `service_role` chỉ tồn tại trong server/worker; không đưa vào biến `NEXT_PUBLIC_*`.
- Public event/RSVP chưa được mở bằng RLS trực tiếp. G5/G6 phải trả DTO allowlist qua server hoặc RPC được review riêng.
- Migration đã tạo không được sửa sau khi áp dụng staging/production; từ thời điểm đó mọi thay đổi phải nằm trong migration mới.

## Trạng thái Gate G2

- Database gate đã đóng: migration remote, pgTAP, RLS/ACL và concurrency đều đạt.
- Workflow GitHub CI đã xác nhận lại từ database sạch trong run `34516090777`.
- Kiểm tra bằng hai tài khoản Google staging qua API thật được theo dõi trong Gate G1/G4 vì Google provider chưa cấu hình và owner event API chưa được triển khai.
