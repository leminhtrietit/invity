# Báo cáo triển khai G9 — Hoàn thiện sản phẩm ra mắt

**Ngày chốt kỹ thuật:** 12/09/2026
**Phạm vi:** INV-901 → INV-906

## Kết quả

| Issue | Trạng thái | Đầu ra |
|---|---|---|
| INV-901 | Hoàn tất | Landing có value proposition, preview, quy trình, tính năng, quota và CTA; gallery lọc 5 nhóm; detail preview mobile/tablet/desktop |
| INV-902 | Hoàn tất | 10 mẫu đúng tên roadmap, fixture và bố cục riêng, theme đạt contrast, OG 1200×630 |
| INV-903 | Hoàn tất | Free ghi đúng quota; Pro/Premium chưa có giá và chỉ nhận waitlist với consent riêng |
| INV-904 | Hoàn tất | Admin role database; quản lý template, report, event, user, failed job và funnel; action có audit |
| INV-905 | Hoàn tất | Settings, privacy, contact và xóa tài khoản; event ẩn, token thu hồi, user khóa và global sign-out ngay |
| INV-906 | Hoàn tất | Funnel từ template đến QR; payload đóng, anonymous ID băm SHA-256, không có PII/token |

## Landing và bộ mẫu

Landing không dùng lượt tạo, review hay logo khách hàng giả. Mọi con số hiển thị đều là quota Free đã được enforce trong database. Mobile dùng CTA dọc và typography riêng; desktop dùng hero chia đôi giữa nội dung và mockup thiệp.

Catalog gồm Vow Editorial, Modern Romance, Trầu Cau, The Promise, Birthday Studio, Little Cloud, New Chapter, Class of Us, Warm Gathering và Evening Toast. ID kỹ thuật cũ được giữ để không phá event/version đã tạo. Renderer nhận `templateId` và đổi hình khối hero, căn lề, tỷ lệ ảnh, card lịch trình, khung viền hoặc nhịp typography. Mỗi detail page có fixture theo đúng loại sự kiện và ảnh OG riêng.

Template bị admin tắt sẽ bị transaction hiện có chặn khi tạo event mới. Event cũ vẫn render bằng template ID và version đã lưu.

## Waitlist và admin

`upgrade_waitlist` unique theo user. Lần đăng ký sau cập nhật gói quan tâm và consent timestamp, không sinh bản ghi trùng. Checkbox consent không chọn sẵn. Trang ghi rõ Pro/Premium chưa mở bán và chưa thu tiền.

`app_user_roles` không cấp quyền đọc cho API roles. `private.is_admin()` bảo vệ cả dashboard lẫn mutation trong database. Admin có thể bật/tắt template, xử lý report, ẩn/hủy event, khóa/mở user và retry failed job. Audit không ghi token hoặc nội dung bí mật.

Hệ thống không tự phong admin. Sau khi tài khoản quản trị đăng nhập Google lần đầu, operator cấp role qua runbook:

```sql
insert into public.app_user_roles(app_user_id, role)
select id, 'admin' from public.app_users where lower(email)=lower('<admin-email>')
on conflict do nothing;
```

## Xóa tài khoản

RPC yêu cầu chuỗi `XOA TAI KHOAN`. Trong một transaction, event chuyển `deleted`, invitation token bị revoke, job `account.delete` được tạo và user chuyển `deletion_requested`. `current_app_user_id()` chỉ trả user active nên mọi API owner bị từ chối ngay cả khi access token cũ còn hạn. Route sau đó gọi global sign-out.

Trang privacy mô tả dữ liệu tài khoản, thiệp, RSVP, lời chúc, VietQR và analytics. Trang contact nhắc không gửi password, invitation token hoặc số tài khoản đầy đủ.

## Analytics và kiểm thử

Funnel chỉ nhận bảy event name allowlist. Payload không có properties tự do. Anonymous cookie là HttpOnly và giá trị lưu database là SHA-256; event ID và template ID chỉ được giữ khi hợp lệ. `qr_generated` không được diễn giải thành thanh toán thành công.

- `pnpm check`: lint, TypeScript, 33 test ứng dụng và production build đạt.
- Test ứng dụng xác nhận 10 fixture hợp lệ, đủ đúng 10 tên và contrast body đạt WCAG AA.
- pgTAP G9 có 24 assertion cho privilege, consent, uniqueness, admin isolation/action, account deletion và analytics hash.
- Migration `20260912130000_g9_launch.sql` đã áp dụng lên Supabase project liên kết; database lint không có lỗi.
