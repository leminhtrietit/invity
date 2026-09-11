# Báo cáo triển khai G4 — Editor, media và bản nháp

**Ngày chốt kỹ thuật:** 11/09/2026  
**Phạm vi:** INV-401 → INV-407

## Kết quả

Gate kỹ thuật G4 đã đạt ở mức mã nguồn, database và hạ tầng staging. Chủ tiệc có thể tạo, xem danh sách, sửa và xóa mềm tối đa ba bản nháp; editor autosave theo revision; đổi template không làm mất nội dung; media được tải vào bucket riêng rồi xử lý bằng Edge Function. Việc nghiệm thu qua phiên Google thật vẫn chờ cấu hình Google OAuth của dự án Supabase.

| Issue | Trạng thái | Đầu ra |
|---|---|---|
| INV-401 | Hoàn tất | API tạo/list/xóa mềm bản nháp, dashboard, giới hạn 3 draft ở RPC |
| INV-402 | Hoàn tất | Form tên, chủ tiệc, giờ, địa điểm, câu chuyện, lịch trình, RSVP và quà; Zod validate cả client payload và server |
| INV-403 | Hoàn tất | Autosave sau 1 giây, chỉ báo `Đã lưu` sau ACK, giữ state khi offline/lỗi, chặn ghi đè bằng revision conflict |
| INV-404 | Hoàn tất kỹ thuật | Signed upload riêng owner/event; xác nhận object tồn tại; hàng đợi `media.process`; Edge Function ImageMagick WASM resize 640/1280/1920 WebP và strip metadata |
| INV-405 | Hoàn tất | Focal point ảnh bìa/album, thêm và đổi thứ tự album, chỉ gắn media vào draft sau trạng thái `ready` |
| INV-406 | Hoàn tất mức MVP | Upload MP3/M4A, kiểm tra magic bytes, nghe thử; chọn font và màu nhấn. Thư viện nhạc có bản quyền để sang G9 |
| INV-407 | Hoàn tất | Preview đồng thời trên desktop, chuyển Sửa/Xem thử trên mobile, đổi template giữ nguyên payload |

## Luồng dữ liệu editor

1. `POST /api/v1/events` gọi `create_event_draft` với idempotency key.
2. Editor lấy `event_drafts.revision` và payload theo `invitationContentSchema`.
3. Sau một giây không có thay đổi mới, editor gọi `PATCH /api/v1/events/:id/draft`.
4. RPC chỉ ghi khi revision client trùng revision database, sau đó tăng revision. Trường hợp hai tab cùng sửa trả `REVISION_CONFLICT`.
5. Đổi mẫu gọi RPC riêng; dữ liệu nội dung, media và khách mời không bị xóa.
6. Xóa draft đổi lifecycle sang `deleted` và ghi audit log.

Editor không lưu draft, token, PII hoặc thông tin ngân hàng trong localStorage. Nội dung chưa ACK chỉ tồn tại trong state của tab hiện tại.

## Pipeline media

1. Ảnh được decode bằng trình duyệt, giảm cạnh dài về tối đa 2.500 px và encode WebP để giảm thời gian upload trên 4G.
2. Server cấp signed upload URL với path `{appUserId}/{eventId}/{uuid}.{ext}` trong bucket private `event-media`.
3. Client upload trực tiếp vào Storage, sau đó mới gọi endpoint `complete`.
4. `register_media_upload` kiểm tra owner, path, loại, dung lượng, tổng quota và sự tồn tại thực của object trước khi tạo asset/job.
5. Edge Function có JWT verification và xác minh user, dùng service role để claim riêng job `media.process`.
6. Ảnh được đọc lại từ Storage, kiểm tra kích thước tối đa 50 MP, auto-orient, strip metadata, encode ba WebP variant và cập nhật asset thành `ready`. MP3/M4A được kiểm tra signature trước khi thành `ready`.
7. Editor poll trạng thái; khi `ready` mới gắn media asset vào payload và autosave. Endpoint content tạo signed read URL ngắn hạn nên bucket vẫn private.

Chọn WASM worker vì Supabase Edge Functions không hỗ trợ Sharp/native image libraries. Image Transformations tích hợp sẵn chỉ có từ gói Pro, trong khi giai đoạn hiện tại dùng Free. Tham khảo [Supabase Image Manipulation](https://supabase.com/docs/guides/functions/examples/image-manipulation) và [Storage Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations).

## Bảo mật và quota

- RLS chỉ cho owner đọc event, draft và media của mình.
- Ba RPC editor thu hồi quyền `anon`; chỉ `authenticated` được execute.
- `claim_media_jobs`, `claim_jobs` và `finish_job` chỉ dành cho `service_role`.
- Signed upload không đủ để tạo bản ghi media; object phải tồn tại đúng bucket/path.
- Ảnh tối đa 10 MB, audio tối đa 15 MB, tổng storage Free 500 MB theo entitlement hiện tại.
- Worker không trả đường dẫn hoặc lỗi chi tiết của media người khác cho caller.

## Kiểm thử đã chạy

- `pnpm check`: lint, TypeScript, 19 test ứng dụng và production build đều đạt.
- pgTAP trên Supabase staging: 37/37 assertion đạt, gồm RLS, quota, revision, quyền RPC, media object/job và worker claim privilege.
- Edge Function `media-worker` đã deploy; request thiếu JWT bị trả 401.
- Migration `20260911160000` đến `20260911164000` đã áp dụng trên project staging.

## Giới hạn nghiệm thu còn lại

Google provider đang tắt vì chưa có Client ID/Client Secret. Vì vậy chưa thể chạy demo người dùng thật từ dashboard qua editor và upload ảnh trên staging. Ngay khi OAuth được cấu hình, cần chạy một vòng UAT bằng hai tài khoản Google để xác nhận không lẫn draft/media và thử ảnh chụp thật trên Safari iOS cùng trình duyệt trong Zalo/Messenger.

## Điều kiện chuyển G5

G5 có thể bắt đầu từ schema và API hiện tại. Publish preflight phải từ chối mọi `mediaAssetId` chưa `ready`, tạo immutable event version, thay endpoint media owner bằng URL public chỉ chứa variant đã xuất bản và sinh Open Graph theo version đang active.
