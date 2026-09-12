# G0 — Hợp đồng API web (Route Handlers)

Phạm vi là hợp đồng v1 trước khi có implementation. API nằm dưới `/api/v1`; mọi response dùng JSON UTF-8. Route public chỉ trả DTO allowlist, không phản chiếu row database.

## Envelope, lỗi và write safety

Success: `{ "data": T, "requestId": "uuid" }`. Error: `{ "error": { "code": "CODE", "message": "human-safe message", "fields": [{ "path": "...", "code": "..." }] }, "requestId": "uuid" }`.

| HTTP | `error.code` | Khi nào |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Thiếu/hết hạn session owner. |
| 403 | `FORBIDDEN` | Không sở hữu resource hoặc token/session không đủ quyền. |
| 404 | `NOT_FOUND` | Resource không tồn tại hoặc không được tiết lộ. |
| 409 | `EVENT_QUOTA_EXCEEDED`, `GUEST_QUOTA_EXCEEDED`, `REVISION_CONFLICT`, `IDEMPOTENCY_CONFLICT` | Invariant hoặc write safety bị vi phạm. |
| 422 | `VALIDATION_ERROR`, `RSVP_CLOSED` | Payload/hạn RSVP không hợp lệ. |
| 429 | `RATE_LIMITED` | Chống spam/rate limit. |

Mọi write có side effect nhận `Idempotency-Key` UUID trong header; server lưu route, actor/scope, hash canonical payload, HTTP status và response. Cùng key + cùng payload trả lại response đã lưu; cùng key + payload khác trả `409 IDEMPOTENCY_CONFLICT`. Write draft và lifecycle còn yêu cầu `If-Match: "revision:<n>"`; revision cũ trả `409 REVISION_CONFLICT` cùng revision hiện hành, không ghi đè.

`returnTo` login/callback chỉ nhận path nội bộ bắt đầu bằng đúng một `/`; từ chối absolute URL, `//`, backslash và path không nằm allowlist.

## Endpoint owner (yêu cầu session)

| Method & route | Request chính | Response/chú ý |
|---|---|---|
| `GET /auth/me` | — | `AppUserDTO`; không trả provider token. |
| `POST /auth/logout` | — | Xóa session server/client phù hợp. |
| `GET /events` | cursor, lifecycle optional | Danh sách event owner, không gồm token/PII. |
| `POST /events` | `{templateId, eventCategory}` | Tạo draft; server chặn vượt 3 draft. |
| `GET /events/:eventId` | — | OwnerEventDTO. |
| `PATCH /events/:eventId/draft` | `DraftContentDTO` + `If-Match` | Trả draft/revision mới; validates server. |
| `POST /events/:eventId/media/uploads` | MIME, size, kind | Signed temporary upload scope riêng event; không tin MIME client. |
| `POST /events/:eventId/publish` | `{draftRevision}` + headers safety | Preflight → candidate OG job → transaction activate version/quota. |
| `POST /events/:eventId/lifecycle` | `{target: hidden|published|cancelled|archived|deleted}` | Chỉ các transition ở G0 data model. |
| `GET /events/:eventId/guests` | filter/cursor | Owner-only; phone never returned outside owner scope. |
| `POST /events/:eventId/guests` | guest info minimal | Cấp guest + token bằng transaction quota. |
| `POST /events/:eventId/guests/:guestId/rotate` | — | Thu hồi token cũ, cấp token mới; không hoàn quota. |
| `PATCH /events/:eventId/guests/:guestId` | note/sent/revoke | `sent` chỉ theo hành động owner; no quota refund. |
| `PATCH /events/:eventId/wishes/:guestId` | `{target: approved|hidden}` | Chỉ owner; approved yêu cầu consent công khai còn hiệu lực. |
| `GET /events/:eventId/exports/rsvps.csv` | filters | CSV UTF-8 BOM, owner-only, no-store, không gồm token. |
| `GET /events/:eventId/exports/rsvps.xlsx` | filters | XLSX có filter/freeze/text phone, owner-only, no-store. |

`DraftContentDTO` validates limits của roadmap: 1 cover + 12 album, tối đa 3 locations, 12 schedule items, 2 gift accounts, companion limit 0–10, RSVP deadline không sau `endsAt`.

## Endpoint công khai và RSVP

| Method & route | Request chính | Response/chú ý |
|---|---|---|
| `GET /public/events/:publicCode` | — | `PublicEventDTO` chỉ khi lifecycle `published`; SSR route dùng cùng contract. |
| `GET /public/events/:publicCode/rsvp-config` | — | Cấu hình form không PII; evaluates lifecycle/deadline. |
| `POST /public/events/:publicCode/gifts` | `recipientId`, `amount?`, `addInfo?` | Chỉ khi event published, bật quà và account đã xác nhận; account phải thuộc event. Trả recipient sau thao tác chủ động và URL ảnh proxy, không đưa số tài khoản vào `PublicEventDTO` hay OG. |
| `GET /public/events/:publicCode/gifts/image` | `recipientId`, `amount?`, `addInfo?`, `download?` | Server tự lấy account theo event, tạo Quick Link VietQR qua origin allowlist và stream ảnh `no-store`; lỗi provider trả 502 để UI giữ fallback sao chép. |
| `GET/POST /events/:eventId/gifts` | cấu hình account đã xác nhận | Owner đọc/lưu tối đa 2 account; số tài khoản mã hóa ở database. Sửa sau publish yêu cầu JWT có `iat` trong 15 phút. |
| `DELETE /events/:eventId/gifts/:giftId` | — | Owner xóa account, kiểm tra recent auth sau publish và ghi audit. |
| `POST /public/events/:publicCode/rsvps` | `{name, phone, response, companionCount, wish, consentPublicWish, honeypot}` + idempotency | Link chung: transaction cấp guest slot nếu mới rồi tạo RSVP. Không tiết lộ phone trùng. |
| `GET /i/:invitationToken` | Token path only | Resolve token hash, không log raw token; token thu hồi trả 404/403 an toàn. |
| `PATCH /i/:invitationToken/rsvp` | RSVP payload + idempotency | Sửa RSVP của guest gắn token, không cấp slot. |
| `GET /r/:editSecret` | edit secret | Chuyển secret thành Secure/HttpOnly/SameSite cookie rồi redirect URL sạch. |
| `PATCH /public/events/:publicCode/rsvps/me` | RSVP payload + cookie + idempotency | Chỉ sửa RSVP đã tạo ra secret/session tương ứng. |

`response` chỉ là `attending|declined`; `companionCount` phải là integer `0..event.companionLimit` và bắt buộc 0 với `declined`. Phone được canonicalize server; đó không là xác minh số điện thoại. Endpoint public có rate limit bền vững, honeypot và CAPTCHA thích ứng.

## DTO versioning và observability

- DTO dùng `camelCase`, time ISO-8601 có offset, tiền là integer VND, số tài khoản/điện thoại là string.
- Không đổi nghĩa/xóa field public của version đang hỗ trợ; thêm field optional trước. `eventVersion` có trong response public/preview để trace cache.
- `requestId` xuất hiện trong response/log; log tuyệt đối không có authorization header, raw token, phone, email hoặc account number.
  - Route mutations ghi `audit_logs` gồm actor type, actor ID đã redacted khi cần, action, event ID, request ID và thời điểm.

## Endpoint hoàn thiện sản phẩm

| Method & route | Request chính | Response/chú ý |
|---|---|---|
| `POST /waitlist` | `planInterest`, `consent: true` | Authenticated; một record/user, lần sau cập nhật lựa chọn; chưa tạo giao dịch hay giá bán. |
| `POST /analytics` | `eventName`, `eventId?`, `templateId?` | Allowlist funnel; anonymous cookie HttpOnly được băm tại database; không nhận properties tự do hoặc PII. |
| `POST /public/events/:publicCode/reports` | `reason` | Chỉ event published; không yêu cầu contact và không public report data. |
| `POST /account/deletion` | `confirmation` | Ẩn event, thu hồi invitation token, khóa app user, tạo deletion job và global sign-out. |
| `POST /admin` | `action`, `targetId`, `value` | Role admin kiểm tra trong database; template/report/event/user/job action có audit. |
