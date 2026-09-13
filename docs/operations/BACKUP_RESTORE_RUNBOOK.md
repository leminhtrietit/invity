# Runbook backup, restore và rollback

## Mục tiêu

- RPO mục tiêu: 24 giờ.
- RTO mục tiêu: 8 giờ.
- Database và bucket `event-media` phải thuộc cùng một recovery point được ghi trong manifest.
- Không phục hồi đè trực tiếp production. Luôn phục hồi vào project Supabase cô lập, kiểm tra, rồi mới chuyển traffic.

## Backup hằng ngày

1. OPS xác nhận backup database của gói Supabase đang dùng còn hiệu lực và tải được. Nếu gói không có backup hằng ngày, chạy `pg_dump` mã hóa từ máy runner riêng; secret chỉ nằm trong secret store.
2. Xuất manifest Storage gồm bucket, object key, size, ETag và thời điểm; sao chép object sang kho backup khác project và bật lifecycle phù hợp.
3. Lưu commit ứng dụng, migration cuối, Supabase project ref, database backup ID và storage manifest ID trong một recovery manifest. Không ghi token, số điện thoại hoặc số tài khoản vào log.
4. Kiểm tra tổng object/byte giữa nguồn và bản sao. Cảnh báo nếu quá 26 giờ không có recovery manifest thành công.

## Diễn tập restore

1. Tạo project Supabase cô lập cùng major PostgreSQL và cấu hình extension như production.
2. Khôi phục database backup. Chạy migration còn thiếu theo thứ tự; không sửa migration đã phát hành.
3. Khôi phục bucket từ manifest và đối chiếu key, byte, checksum mẫu.
4. Dùng tài khoản kiểm thử xác nhận owner chỉ đọc event của mình; thiệp published mở được; token revoked bị từ chối; RSVP và VietQR trỏ đúng event/recipient.
5. Chạy `pnpm check`, toàn bộ pgTAP G2–G10, concurrency test và `SITE_URL=<restore-url> pnpm smoke:production`.
6. Ghi thời gian bắt đầu/kết thúc, recovery point, sai lệch và người duyệt vào báo cáo diễn tập. Xóa project diễn tập và bản dữ liệu tạm theo chính sách.

## Rollback code

1. Chọn deployment xanh gần nhất và chuyển alias về deployment đó.
2. Giữ schema mới tương thích ngược. Không chạy SQL phá dữ liệu để quay lui.
3. Nếu lỗi nằm ở tính năng, tắt template hoặc ẩn event bằng admin trong lúc sửa.
4. Chạy smoke production và kiểm tra tỷ lệ lỗi RSVP sau khi chuyển alias.

## Lịch vận hành

- Backup/manifest: hằng ngày, OPS phụ trách.
- Restore drill: trước beta và mỗi quý.
- Retention maintenance: hằng ngày bằng service role; worker cleanup cần `MEDIA_WORKER_SECRET` trong Supabase secret store.
- Mọi thất bại backup/restore là P1; xác nhận mất hoặc lộ dữ liệu là P0.
