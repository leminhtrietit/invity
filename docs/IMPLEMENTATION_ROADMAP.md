# INVITE — Kế hoạch triển khai theo giai đoạn

Ngày lập: 10/09/2026. Trạng thái: sẵn sàng phân công; chưa triển khai mã nguồn.

Tài liệu chuyển các quyết định sản phẩm đã chốt thành các gói việc có phụ thuộc, đầu ra và tiêu chí nghiệm thu. Mỗi mã INV bên dưới có thể chuyển trực tiếp thành một issue. Chưa tạo issue trên hệ thống bên ngoài.

## 1. Phạm vi và quy tắc không được tự thay đổi

| Hạng mục | Quyết định v1 |
|---|---|
| Ra mắt | Mở công khai; chủ tiệc đăng nhập Google riêng của Invite |
| Khách | Không cần tài khoản để xem thiệp hoặc RSVP |
| Stack | Next.js App Router, TypeScript, Supabase Auth/PostgreSQL/Storage, Vercel |
| Thiết kế | Editorial cao cấp, mobile-first, tiếng Việt |
| Mẫu | 10 mẫu thuộc 5 nhóm: cưới, đính hôn, sinh nhật/thôi nôi, tốt nghiệp, sự kiện khác |
| Quota sự kiện | 1 lần xuất bản sự kiện mới/tài khoản/tháng lịch, giờ Việt Nam |
| Quota khách | 50 suất đã cấp/sự kiện; link cá nhân và RSVP mới qua link chung dùng chung quỹ |
| Cách tính khách | Mở thiệp không tính suất; người đi kèm không tính thêm suất; sửa RSVP không tính thêm |
| Hoàn quota | Xóa sự kiện đã xuất bản không hoàn lượt; thu hồi/xóa khách không hoàn suất |
| Cập nhật thiệp | Autosave bản làm việc; chỉ công khai khi chủ tiệc bấm cập nhật |
| Gửi thiệp | Sao chép link/nội dung hoặc mở bảng chia sẻ; chưa tự gửi tin nhắn |
| Lời chúc | Mặc định riêng tư; chỉ công khai khi khách đồng ý và chủ tiệc duyệt |
| Quà mừng | QR động chuyển thẳng chủ tiệc; không đối soát và không báo đã thanh toán |
| Nâng cấp | Form chờ; chưa bán gói hoặc thu tiền |
| Xác thực chung | Giai đoạn riêng sau v1, không là điều kiện chặn ra mắt |

### 1.1. Mặc định triển khai

- Tối đa 3 nháp/tài khoản; 1 ảnh bìa và 12 ảnh album/sự kiện.
- Ảnh JPEG/PNG/WebP tối đa 15 MB/file; kiểm tra số pixel và MIME thực tế. HEIC báo chưa hỗ trợ.
- Một bài nhạc tự tải/sự kiện, MP3/M4A tối đa 10 MB và 5 phút; có thư viện nhạc đủ quyền sử dụng.
- Tối đa 3 địa điểm, 12 mục lịch trình, 2 tài khoản nhận quà/sự kiện.
- Người đi kèm mặc định tối đa 3; chủ tiệc cấu hình từ 0–10.
- Dung lượng tài khoản 500 MB, bao gồm biến thể ảnh đang giữ.
- RSVP mặc định đóng lúc bắt đầu; hạn tùy chỉnh không sau lúc kết thúc.
- Thiệp tự lưu trữ 180 ngày sau kết thúc; dữ liệu RSVP riêng tư giữ tối đa 12 tháng sau sự kiện.
- File tạm dọn sau 24 giờ; ảnh gốc đã xử lý dọn sau 7 ngày, giữ biến thể cần thiết.
- Xóa tài khoản ẩn thiệp ngay, dọn dữ liệu chính trong 30 ngày; lịch hết hạn backup được công khai riêng.

Các thay đổi về quota, quyền riêng tư, auth hoặc thanh toán phải được ghi thành quyết định sản phẩm, kèm migration và kiểm thử nếu ảnh hưởng dữ liệu. Không tự đổi để giải quyết khó khăn kỹ thuật.

## 2. Cách phân công và điều kiện hoàn thành

### 2.1. Vai trò đề xuất

| Ký hiệu | Trách nhiệm |
|---|---|
| PO | Chốt nội dung, trải nghiệm, ưu tiên và nghiệm thu sản phẩm |
| TL | Kiến trúc, hợp đồng dữ liệu/API, review thay đổi xuyên module |
| BE | Auth, database, phân quyền, quota, xử lý nền, tích hợp |
| FE | UI, editor, renderer, dashboard, trải nghiệm khách |
| UX | Design system, thiết kế 10 mẫu, trạng thái mobile và desktop |
| QA | Ma trận kiểm thử, E2E, hồi quy, nghiệm thu thiết bị thật |
| OPS | Môi trường, secrets, deploy, giám sát, backup và vận hành |

Một người có thể kiêm nhiều vai trò. Ước lượng lịch ở cuối tài liệu giả định 2 lập trình viên full-stack, 1 designer và QA bán thời gian; TL/OPS do lập trình viên kiêm nhiệm.

### 2.2. Quy tắc giao việc

- Mỗi issue có một người chịu trách nhiệm chính, liên kết phụ thuộc và tiêu chí nghiệm thu lấy từ tài liệu này.
- Issue lớn hơn khoảng 2 ngày làm việc phải tách thành task nhỏ; giữ issue gốc để nghiệm thu hành vi hoàn chỉnh.
- FE dùng mock từ hợp đồng API chung khi BE chưa xong; không tự sáng tạo payload riêng.
- PR mô tả hành vi thay đổi, bằng chứng kiểm thử và ảnh/video nếu có UI.
- Không đưa secret hoặc dữ liệu khách thật vào commit, fixture, log hay preview deployment.
- Gate của giai đoạn chỉ được đánh dấu đạt khi có bằng chứng; không dùng phần trăm hoàn thành cảm tính.

### 2.3. Definition of Done cho mọi issue

1. Đáp ứng từng điều kiện nghiệm thu, được reviewer khác kiểm tra.
2. Typecheck, lint và các test liên quan chạy thành công.
3. API ghi dữ liệu kiểm tra quyền, validation và trường hợp lỗi.
4. UI có loading, empty, error, success; thao tác cảm ứng và bàn phím dùng được.
5. Thay đổi schema có migration; không chỉnh production thủ công thay migration.
6. Tài liệu API/cấu hình được cập nhật nếu thay đổi hợp đồng.
7. Không còn lỗi nghiêm trọng hoặc rủi ro dữ liệu chưa có phương án xử lý.

## 3. Bản đồ phụ thuộc

```text
G0 Chốt đặc tả và hợp đồng
 ├─ G1 Nền tảng + Auth + CI/CD
 │   └─ G2 Dữ liệu + phân quyền + giao dịch quota
 └─ G3 Design system + renderer chuẩn + thiết kế mẫu

G2 + G3 → G4 Editor + media + preview
G4       → G5 Publish + trang khách + OG
G2 + G5 → G6 Khách mời + RSVP + quota xuyên luồng
G6       → G7 Dashboard + lời chúc + export
G2 + G5 → G8 VietQR                         [song song G6/G7 nếu đủ người]
G1 + G3 → G9 Landing + đủ 10 mẫu + admin + waitlist [làm dần]
G5–G9   → G10 Kiểm thử tích hợp + hardening
G10      → G11 Beta + mở công khai
Sau v1   → G12 Xác thực chung leminhtriet.com
```

Giai đoạn có thể chồng lịch, nhưng không được bỏ gate phụ thuộc. G9 không có nghĩa đến gần cuối mới bắt đầu thiết kế các mẫu.

## 4. G0 — Chốt đặc tả và hợp đồng triển khai

**Mục tiêu:** FE, BE và QA hiểu cùng một nghiệp vụ trước khi viết các luồng chính.

**Đầu vào:** Quyết định ở mục 1; workspace chưa có mã nguồn.

| Issue | Chủ trì | Công việc và đầu ra | Nghiệm thu |
|---|---|---|---|
| INV-001 | PO + TL | Lập từ điển nghiệp vụ: sự kiện, version, suất khách, đã gửi, đã mở, RSVP | Mọi dashboard và API dùng cùng định nghĩa; có ví dụ quota giao tháng |
| INV-002 | UX + FE | Wireframe landing, mẫu, login, dashboard, editor, thiệp, RSVP, quà mừng, admin | Có mobile và desktop; đủ loading/empty/error/success |
| INV-003 | TL + BE | ERD, state machine sự kiện, ranh giới dữ liệu công khai/riêng tư | Không có đường public đọc guest list, số điện thoại hoặc bản nháp |
| INV-004 | TL + FE + BE | Hợp đồng API: payload, validation, lỗi, revision, idempotency, DTO | FE mock và BE implement theo cùng schema; chọn Route Handlers làm API web |
| INV-005 | QA | Ma trận nghiệm thu gắn mã issue | Có quota race, truy cập chéo tài khoản, token bị thu hồi, retry và in-app browser |

**Trạng thái sự kiện thống nhất:** nháp, đã xuất bản, tạm ẩn, đã hủy, lưu trữ, đã xóa. “Đã diễn ra” suy ra từ thời gian, không tạo trạng thái phát hành riêng.

**Gate G0:** PO duyệt luồng; TL duyệt schema/API; QA có kịch bản nghiệp vụ. Đầu ra lưu trong repo: từ điển nghiệp vụ, ERD, hợp đồng API và danh mục test.

**Đầu ra G0 đã soạn (chờ PO/TL/QA duyệt gate):**

- [Từ điển nghiệp vụ](G0_BUSINESS_GLOSSARY.md)
- [ERD, state machine và ranh giới dữ liệu](G0_DATA_MODEL.md)
- [Hợp đồng API Route Handlers](G0_API_CONTRACT.md)
- [Wireframe và trạng thái giao diện](G0_WIREFRAMES.md)
- [Ma trận nghiệm thu và checklist Gate G0](G0_ACCEPTANCE_MATRIX.md)

## 5. G1 — Nền tảng, môi trường và Google Auth

> Trạng thái kiểm tra lại 11/09/2026: Supabase `invity` riêng đã nhận migration; Vercel staging hoạt động tại `https://invity-ten.vercel.app`, GitHub CI xanh và callback đã allowlist. Google provider vẫn tắt vì chưa có client ID/secret, nên Gate live chỉ còn phần nghiệm thu đăng nhập Google. Không sử dụng project `leminhtriet.com`. Xem `docs/G1_IMPLEMENTATION_REPORT.md`.

**Phụ thuộc:** G0. **Chủ trì:** TL/BE; FE làm app shell.

| Issue | Công việc | Đầu ra / nghiệm thu |
|---|---|---|
| INV-101 | Khởi tạo Next.js App Router + TypeScript, Tailwind, form/validation, cấu trúc module | Cài từ lockfile; build/lint/typecheck chạy trên máy mới |
| INV-102 | Tách local, staging và production; cấu hình Vercel/Supabase | Preview không trỏ DB production; có `.env.example` không chứa secret |
| INV-103 | Google OAuth qua Supabase, callback và session SSR | Login/logout hoạt động; từ chối return URL ngoài ứng dụng; chỉ bật Google |
| INV-104 | App user ID ổn định và auth binding | Login lại không tạo user mới; event sẽ sở hữu bằng app user ID, không bằng email |
| INV-105 | App shell, protected routes và error boundaries | Dashboard yêu cầu login; thư viện mẫu và thiệp khách không yêu cầu |
| INV-106 | CI và deploy staging | Mỗi PR chạy kiểm tra; migration kiểm tra trên DB thử; không tự migrate production |

**Chi tiết auth:** chỉ lấy email, tên và avatar; không xin Gmail/Drive/Contacts. Google OAuth bị chặn trong trình duyệt nhúng thì hướng dẫn mở trình duyệt hệ thống và giữ lựa chọn mẫu. Không triển khai đăng nhập chung ở đây.

**Demo:** Chọn mẫu → Google login → dashboard → logout. Thử callback lỗi và hết session.

**Gate G1:** Luồng trên chạy staging, không lộ khóa đặc quyền trong bundle; cấu hình redirect có giới hạn rõ.

## 6. G2 — Database, phân quyền và lõi quota

> Trạng thái 11/09/2026: implementation và database gate G2 đã đạt. Ba migration đã áp dụng lên Supabase `invity`; 25/25 assertion pgTAP và kiểm thử hai connection tranh suất thứ 50 đều pass trên database remote. Demo hai tài khoản Google qua API còn phụ thuộc Gate live G1. Xem `docs/G2_IMPLEMENTATION_REPORT.md`.

**Phụ thuộc:** G1. **Chủ trì:** BE/TL.

| Issue | Công việc | Đầu ra / nghiệm thu |
|---|---|---|
| INV-201 | Migration bảng users/bindings, templates, events/drafts/versions | Reset DB từ migration dựng lại được schema; seed chỉ dùng dữ liệu giả |
| INV-202 | Migration media, guest slots, tokens, RSVP, wishes, gifts, usage/counters | Foreign key chặn tài sản/khách gắn sai sự kiện; unique RSVP theo guest |
| INV-203 | RLS và lớp authorization server | Hai tài khoản không đọc/sửa chéo nhau; anon không SELECT bảng riêng tư |
| INV-204 | Transaction cấp lượt xuất bản | Unique user + tháng Việt Nam; publish lần đầu mới tính; cập nhật không tính thêm |
| INV-205 | Transaction cấp suất khách | Cá nhân/chung dùng cùng counter; còn 1 suất chỉ 1 request thắng |
| INV-206 | Idempotency và optimistic concurrency | Retry cùng key/payload trả kết quả cũ; key với payload khác bị từ chối; revision cũ báo xung đột |
| INV-207 | Audit và hàng đợi job | Job có lease, retry hữu hạn và trạng thái lỗi; thao tác nhạy cảm ghi actor/time/action |

**Các bảng tối thiểu:** app_users, auth_bindings, external_identities, templates, events, event_drafts, event_versions, media_assets, plan_entitlements, publication_usage, event_quota_counters, guest_slots, invitation_tokens, rsvps, rsvp_edit_tokens, wishes, gift_accounts, upgrade_waitlist, idempotency_requests, jobs, audit_logs, event_metrics_daily, abuse_reports.

**Hợp đồng lỗi tối thiểu:** `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `EVENT_QUOTA_EXCEEDED`, `GUEST_QUOTA_EXCEEDED`, `REVISION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `RSVP_CLOSED`, `RATE_LIMITED`.

**Kiểm thử bắt buộc:** giao tháng/giao năm; hai publish đồng thời; hai cấp khách đồng thời; xóa không hoàn quota; user khác đổi owner; gọi thẳng RPC/API để bỏ qua UI.

**Gate G2:** Các invariant quota và RLS được chứng minh bằng integration test chạy với PostgreSQL. Mock/unit test riêng không đủ để nghiệm thu concurrency.

## 7. G3 — Design system và renderer thiệp chuẩn

> Trạng thái 11/09/2026: Gate kỹ thuật đã đạt. Design system, schema renderer, Vow Editorial hoàn chỉnh, catalog/preview 10 mẫu và migration template đã có; kiểm tra responsive 360–1280 px, tên dài và reduced motion đều đạt. Xem `docs/G3_IMPLEMENTATION_REPORT.md`.

**Phụ thuộc:** G0; triển khai song song G1/G2. **Chủ trì:** UX/FE.

| Issue | Công việc | Đầu ra / nghiệm thu |
|---|---|---|
| INV-301 | Tokens ivory/burgundy/sage, typography, spacing, radius, motion | Có ví dụ thực tế và kiểm tra tương phản; font tiếng Việt không lỗi dấu |
| INV-302 | Component UI: button, input, dialog, sheet, toast, tabs, card, table, upload | Loading/error/disabled/focus đầy đủ; keyboard và touch dùng được |
| INV-303 | Schema nội dung sự kiện và giao diện renderer | Renderer không phụ thuộc editor; nhận nội dung, theme và mode preview/public |
| INV-304 | Các section: envelope, hero, thông tin, countdown, địa điểm, lịch trình, album, RSVP, quà, lời chúc | Có thể ẩn section tùy chọn; thiếu ảnh/nội dung vẫn có layout hợp lệ |
| INV-305 | Một mẫu chuẩn Vow Editorial | Hoàn chỉnh ở 360/390/430/768/1280 px, tên dài, ảnh ngang và reduced motion |
| INV-306 | Thiết kế 9 mẫu còn lại | UX bàn giao từng mẫu dần; mỗi mẫu có cấu trúc và sắc thái riêng |

**Nguyên tắc:** Preview và trang public dùng cùng renderer; preview không ghi lượt mở, không gửi RSVP thật hoặc dùng QR thật. Tối đa hai font/thiệp. Nội dung chính đọc được trước khi animation/JS hoàn thành.

**Gate G3:** Một mẫu đạt chất lượng mục tiêu với dữ liệu fixture biên; PO duyệt hướng thị giác trước khi nhân rộng thành 10 mẫu.

## 8. G4 — Editor, media và quản lý bản nháp

**Phụ thuộc:** G2 + G3. **Chủ trì:** FE; BE phụ trách media và lưu dữ liệu.

> Trạng thái 11/09/2026: Gate kỹ thuật đã đạt. Editor, autosave revision, quản lý ba draft, private signed upload, media worker WASM và preview responsive đã triển khai; pgTAP đạt 37/37. UAT qua hai tài khoản thật chờ bật Google OAuth. Xem `docs/G4_IMPLEMENTATION_REPORT.md`.

| Issue | Công việc | Đầu ra / nghiệm thu |
|---|---|---|
| INV-401 | Tạo/list/xóa nháp với hạn 3 nháp | Tạo nháp không dùng lượt tháng; vượt hạn bị chặn ở server |
| INV-402 | Form nội dung theo nhóm và danh mục sự kiện | Tên, giờ, địa điểm, lịch trình, RSVP settings được validate server/client |
| INV-403 | Autosave khoảng 1 giây + revision | Chỉ báo đã lưu sau server ACK; lỗi giữ nội dung trong phiên; hai tab không ghi đè âm thầm |
| INV-404 | Upload vùng tạm và worker ảnh | Kiểm tra file thực, bỏ EXIF/GPS, resize, tạo biến thể, trừ dung lượng đúng |
| INV-405 | Crop/focal point, album và thứ tự ảnh | Preview đúng crop mobile/desktop; ảnh chưa xử lý không được publish |
| INV-406 | Nhạc thư viện/upload, font và palette | Chỉ nhận kiểu cho phép; không dùng URL media tùy ý; nghe thử/tắt được |
| INV-407 | Preview mobile/desktop và đổi template | Đổi mẫu giữ dữ liệu, báo section bị ẩn; không xóa asset hoặc khách |

**Editor desktop:** danh mục bên trái, form ở giữa, preview bên phải; màn hình hẹp giảm số vùng. **Editor mobile:** một cột, chuyển sửa/xem thử, CTA có safe-area.

**Trạng thái media:** uploaded → processing → ready hoặc failed. File failed cho retry/xóa; không chặn sửa phần nội dung khác. Không lưu PII, thông tin ngân hàng hoặc token vào localStorage.

**Demo:** Soạn thiệp từ trống, tải ảnh điện thoại, crop, đổi mẫu, làm mất mạng, kết nối lại và mở ở tab thứ hai.

**Gate G4:** Tạo được bản nháp hoàn chỉnh bằng một mẫu thật, không mất nội dung khi autosave lỗi và không lẫn bản nháp giữa tài khoản.

## 9. G5 — Xuất bản, trang khách và Open Graph

**Phụ thuộc:** G4. **Chủ trì:** FE/BE.

> Trạng thái 11/09/2026: Gate kỹ thuật đã đạt. Publish snapshot/version, quota tháng, public code, SSR envelope/audio/map, public media policy, lifecycle và OG 1200×630 đã triển khai; pgTAP đạt 60/60 và public E2E đạt. UAT owner trên Vercel chờ bật Google OAuth. Xem `docs/G5_IMPLEMENTATION_REPORT.md`.

| Issue | Công việc | Đầu ra / nghiệm thu |
|---|---|---|
| INV-501 | Preflight và publish workflow | Kiểm tra trường bắt buộc, media, RSVP, quota; lỗi nêu đúng mục cần sửa |
| INV-502 | Published snapshot và candidate version | Làm OG trước, rồi transaction kiểm tra quota và kích hoạt version; lỗi giữ bản cũ |
| INV-503 | Link chung có public code ngẫu nhiên | Đổi tên/đổi template không đổi link; draft không truy cập public được |
| INV-504 | Thiệp public SSR, envelope và nhạc | Thông tin đọc được nhanh; click mới phát nhạc; chặn audio vẫn xem được |
| INV-505 | Google Maps Embed và chỉ đường | Không nhận iframe HTML; lazy load, key giới hạn domain, có link chỉ đường |
| INV-506 | Metadata/OG 1200×630 theo version | HTML cho crawler có title/image; không chứa tên khách, điện thoại hoặc ngân hàng |
| INV-507 | Tạm ẩn/hủy/lưu trữ và cache | Route kiểm tra trạng thái trước nội dung cache; không tiếp tục trả thiệp đang bị ẩn |

**Publish không giữ transaction database trong lúc render OG.** Job retry không được tiêu thụ thêm lượt. Cập nhật bản nháp không đổi phiên bản khách đang xem cho đến khi bấm cập nhật.

**SEO:** landing/mẫu được index; thiệp người dùng, preview và vùng quản lý không index. `noindex` không được xem là bảo mật.

**Demo:** Xuất bản → gửi link thật → đổi ảnh ở bản nháp → xác nhận link vẫn là bản cũ → cập nhật → tạm ẩn. Kiểm tra preview Zalo/Messenger/Telegram, ghi nhận ảnh cache bên ngoài có thể chưa cập nhật ngay.

**Gate G5:** Một sự kiện thật trên staging có link khách và OG; quota publish đúng; các thao tác version/lifecycle không làm mất dữ liệu.

## 10. G6 — Khách mời, link cá nhân và RSVP

**Phụ thuộc:** G2 + G5. **Chủ trì:** BE/FE; QA tham gia từ đầu.

| Issue | Công việc | Đầu ra / nghiệm thu |
|---|---|---|
| INV-601 | Tạo khách cá nhân và cấp token | Tạo thành công dùng 1 suất; token ngẫu nhiên ≥128 bit, hash tra cứu, mã hóa nếu cần khôi phục |
| INV-602 | Sao chép lời mời, đánh dấu gửi, xoay/thu hồi link | Không coi copy/share là đã gửi; token cũ vô hiệu sau xoay; không hoàn suất |
| INV-603 | Form RSVP: tên, điện thoại, Có/Không, người đi kèm, lời chúc | Validate, chuẩn hóa điện thoại; Không thì số đi kèm bằng 0; không tuyên bố đã xác minh điện thoại |
| INV-604 | RSVP link cá nhân | Ghi đúng guest; phản hồi hoặc sửa không tạo thêm suất; token thu hồi bị từ chối |
| INV-605 | RSVP link chung | Lần mới cấp suất trong transaction; số điện thoại trùng không tiết lộ dữ liệu đã có |
| INV-606 | Quyền sửa RSVP link chung | Cookie bảo mật + link sửa bí mật; đổi token thành session và chuyển URL sạch; không cho sửa chỉ bằng điện thoại |
| INV-607 | Hạn RSVP và chống spam | Kiểm tra trạng thái/hạn trong giao dịch; rate limit bền vững, honeypot, CAPTCHA thích ứng |
| INV-608 | Ghi nhận mở thiệp có giới hạn | Chỉ là tín hiệu tham khảo; bot không tiêu thụ quota; log không chứa token |

**Quy tắc lúc đủ 50 suất:** người mới không RSVP mới được; người có link cá nhân hoặc quyền sửa vẫn phản hồi/cập nhật được; trang thiệp và quà mừng không bị khóa.

**Quy tắc đồng thời:** test còn 1 suất, host tạo link cùng lúc khách mới RSVP; chỉ một thao tác cấp mới thành công. Double click/retry chỉ có một kết quả.

**Demo:** 49 suất → hai khách đồng thời → kiểm tra DB đúng 50 → khách cũ sửa phản hồi → thu hồi link → kiểm tra token cũ.

**Gate G6:** Cả hai nguồn khách hoạt động, quota xuyên luồng đúng và không có cách đọc/sửa RSVP người khác bằng đoán ID hoặc nhập số điện thoại.

## 11. G7 — Dashboard RSVP, lời chúc và xuất dữ liệu

**Phụ thuộc:** G6. **Chủ trì:** FE/BE.

| Issue | Công việc | Đầu ra / nghiệm thu |
|---|---|---|
| INV-701 | Danh sách khách, tìm kiếm, lọc, card mobile | Lọc tên/nhóm/phản hồi/trạng thái gửi; ghi chú riêng không public |
| INV-702 | Summary thống kê từ nguồn dữ liệu thống nhất | Suất đã dùng tách khỏi khách đang quản lý; tổng dự kiến = khách Có + người đi kèm |
| INV-703 | Luồng duyệt lời chúc | Chỉ khách đồng ý + host duyệt mới public; sửa lời đã duyệt quay về chờ; rút đồng ý ẩn ngay |
| INV-704 | Xuất CSV | UTF-8 BOM, điện thoại dạng chuỗi, giờ Việt Nam, chống formula injection, theo filter |
| INV-705 | Xuất XLSX | Header/filter/freeze, cột hợp lý, bảo toàn dấu tiếng Việt và số 0 đầu |

**Bộ dữ liệu nghiệm thu:** 40 suất, 25 đồng ý, 5 từ chối, 10 chưa phản hồi, 18 người đi kèm → tổng dự kiến 43. Thử thu hồi một khách để chứng minh suất đã dùng và khách đang quản lý là hai chỉ số khác nhau.

**Riêng tư export:** API yêu cầu owner, không xuất token, không để file xuất ở URL công khai lâu dài. Bằng chứng nghiệm thu gồm file mở thử trên phần mềm bảng tính.

**Gate G7:** Số liệu khớp database, lời chúc đúng quyền hiển thị, CSV/XLSX dùng được với dữ liệu tiếng Việt.

## 12. G8 — VietQR động

**Phụ thuộc:** G2 + G5; chạy song song G6/G7 nếu đủ người. **Chủ trì:** BE/FE.

| Issue | Công việc | Đầu ra / nghiệm thu |
|---|---|---|
| INV-801 | Cấu hình tối đa 2 tài khoản nhận | Ngân hàng, số tài khoản chuỗi, tên, nhãn; mã hóa dữ liệu; không thuộc public event DTO |
| INV-802 | Preview/xác nhận tài khoản; bảo vệ thay đổi | Host xác nhận đã kiểm tra; sửa sau publish cần session mới trong 15 phút, audit và vô hiệu cache ứng dụng |
| INV-803 | Provider adapter VietQR phía server | Tài khoản lấy từ event; client không thay được người nhận; allowlist domain gọi ra |
| INV-804 | Bottom sheet/dialog quà mừng | Chọn người nhận, tiền tùy ý không chọn sẵn, nội dung; hiện chính xác dữ liệu mã hóa |
| INV-805 | Tải QR, copy thông tin và fallback | QR lỗi vẫn có ngân hàng/tài khoản để copy; không có trạng thái đã thanh toán |

**Tiền nhập:** tùy chọn; nếu có là số nguyên VND 1.000–500.000.000 theo giới hạn UI của ứng dụng, không phải hạn mức ngân hàng. Nội dung chuyển khoản không tự thêm điện thoại.

**Tích hợp production:** tạo template VietQR riêng theo tài liệu nhà cung cấp, xác nhận giới hạn/điều khoản khi cấu hình. Dùng dữ liệu kiểm thử trong preview; không dùng QR thật cho demo mẫu.

**Demo/nghiệm thu:** Quét QR bằng ứng dụng ngân hàng, kiểm tra người nhận/số tiền/nội dung, không cần thực hiện chuyển tiền; giả lập nhà cung cấp lỗi; thử gửi account ID của sự kiện khác.

**Gate G8:** QR đúng cấu hình và đầu vào; không lộ/sửa chéo tài khoản; giao diện không khiến người dùng hiểu ứng dụng đã xác nhận nhận tiền.

## 13. G9 — Hoàn thiện sản phẩm ra mắt

**Phụ thuộc:** công việc thiết kế bắt đầu sau G3; tích hợp sau G5/G7/G8. **Chủ trì:** UX/FE; BE làm admin/waitlist.

| Issue | Công việc | Đầu ra / nghiệm thu |
|---|---|---|
| INV-901 | Landing, gallery, chi tiết mẫu | Có CTA rõ, lọc danh mục, preview thật; không dùng số liệu/review giả |
| INV-902 | Hoàn thiện 9 template còn lại | Đủ 10 mẫu, mỗi mẫu có mobile/desktop, OG, reduced motion và 2 palette đã kiểm tra |
| INV-903 | Trang gói Free và waitlist | Hiển thị đúng quota; consent riêng; idempotent theo user; không có giá/thanh toán giả |
| INV-904 | Admin tối thiểu | Bật/tắt mẫu mới, xử lý báo cáo, khóa event/user, xem/retry job; role server và audit |
| INV-905 | Cài đặt/xóa tài khoản, chính sách và liên hệ | Thu hồi truy cập ngay khi xóa; thông tin lưu trữ và cách yêu cầu hỗ trợ rõ ràng |
| INV-906 | Analytics funnel và dashboard vận hành | Từ chọn mẫu đến RSVP đầu tiên; không gửi PII/token; QR generated không là payment success |

**Danh mục mẫu:** Vow Editorial, Modern Romance; Trầu Cau, The Promise; Birthday Studio, Little Cloud; Next Chapter, Class of Us; Warm Gathering, Evening Toast.

**Nghiệm thu template:** tên dài, dấu Việt, không album/đủ album, ảnh ngang/dọc, địa chỉ dài, 1/3 địa điểm, section bật/tắt. Hai mẫu cùng nhóm không chỉ khác màu. Mẫu bị ngừng cho tạo mới vẫn render được event cũ theo version.

**Gate G9:** Không còn màn placeholder trong luồng đã cam kết; đủ 10 mẫu đạt visual QA; admin không mở dữ liệu cho người dùng thường.

## 14. G10 — Kiểm thử tích hợp và củng cố vận hành

**Phụ thuộc:** G5–G9 hoàn thành; test từng module phải chạy trước đó. **Chủ trì:** QA/TL/OPS.

| Issue | Công việc | Bằng chứng nghiệm thu |
|---|---|---|
| INV-1001 | E2E toàn luồng host/guest | Báo cáo test và video lỗi đã sửa; dữ liệu DB đối chiếu |
| INV-1002 | RLS/IDOR/token/CSRF/XSS/export security | Không đọc/sửa chéo, không token/PII trong log, không công thức thực thi từ nội dung xuất |
| INV-1003 | Race/retry/load | Publish trùng, suất cuối, đóng RSVP đồng thời, timeout sau commit đều không phá invariant |
| INV-1004 | Hiệu năng trang thiệp | Mục tiêu LCP p75 <2s trên cấu hình 4G nghiệm thu, CLS <0,1; ghi thiết bị, mạng, cache và số lần chạy |
| INV-1005 | Thiết bị thật và social preview | Safari iOS, Chrome Android, Zalo/Messenger iOS/Android, Telegram, desktop; lưu phiên bản và kết quả |
| INV-1006 | Storage lifecycle và deletion | Dọn file mồ côi, quota dung lượng đúng; event/account xóa không truy cập lại được |
| INV-1007 | Giám sát, backup, restore, rollback | Diễn tập phục hồi DB + media; RPO mục tiêu 24h, RTO 8h; rollback code không phá schema |

**Hiệu năng:** không tính tải xong toàn bộ nhạc/album/map trong mục tiêu hai giây. Chỉ preload hero/font cần thiết; media còn lại lazy load. Đo INP thực tế mục tiêu <200ms khi đủ dữ liệu; lab chỉ là bằng chứng ban đầu, không gắn nhãn đã đạt thực địa.

**Mức lỗi:** P0 = mất/lộ dữ liệu, sai tài khoản nhận quà, hỏng quota hoặc ngừng dịch vụ; P1 = luồng chính không hoàn thành và không có cách thay thế hợp lý. Cả P0/P1 phải bằng 0 trước beta bên ngoài.

**Gate G10:** Báo cáo nghiệm thu có link bằng chứng; lỗi P2 còn lại phải có owner, tác động và lịch sửa được PO chấp nhận. Không còn vấn đề dữ liệu/quyền truy cập chưa xử lý.

## 15. G11 — Beta và mở công khai

**Phụ thuộc:** G10. **Chủ trì:** PO/OPS, cả đội hỗ trợ.

| Issue | Công việc | Điều kiện hoàn thành |
|---|---|---|
| INV-1101 | Provision production, domain, OAuth audience, secrets, ngân sách | Chính sách công khai, redirect đúng, Maps key giới hạn, VietQR production; không dùng dữ liệu staging |
| INV-1102 | Beta có giới hạn khoảng 10–20 chủ tiệc | Thu phản hồi editor/thiệp/RSVP; rà dữ liệu quota và log hàng ngày |
| INV-1103 | Sửa beta và hồi quy có mục tiêu | Sửa lỗi đã ghi nhận; test lại phần ảnh hưởng; không mở thêm scope lớn |
| INV-1104 | Launch checklist và mở công khai | PO/QA/TL ký gate; deploy có rollback; monitoring và kênh hỗ trợ hoạt động |
| INV-1105 | Theo dõi sau ra mắt | Báo cáo 24h/72h/7 ngày: lỗi, funnel, hiệu năng, quota, chi phí; phân công xử lý |

**Tiêu chí qua beta:** không P0/P1; không vượt quota; chủ tiệc thực hiện được tạo → publish → chia sẻ → nhận RSVP; kiểm thử đủ 5 nhóm dù lượng beta thực tế phân bố không đều. Không đặt tỷ lệ chuyển đổi thương mại làm gate kỹ thuật khi mẫu còn nhỏ.

**Ngưỡng xử lý vận hành mặc định:** lỗi RSVP server trên 1% trong 15 phút với ít nhất 100 request thì cảnh báo; mọi xác nhận lộ dữ liệu/sai người nhận QR xử lý ngay bất kể lưu lượng. Cảnh báo chi phí ở 70% và 90% ngân sách đã cấu hình.

**Rollback:** tắt tính năng bị lỗi bằng flag nếu có thể, rollback code về bản tốt; migration production dùng hướng mở rộng trước rồi thu gọn sau, không tự rollback phá dữ liệu đã nhận.

**Gate G11:** Production mở được cho người dùng công khai và có người chịu trách nhiệm vận hành. Mốc này mới được ghi “v1 đã ra mắt”.

## 16. G12 — Xác thực chung leminhtriet.com, sau v1

Giai đoạn này là backlog sau ra mắt. Chưa chốt giao thức kết nối khi chưa khảo sát hệ thống hiện có; lập trình viên v1 chỉ chuẩn bị identity boundary, không tự triển khai SSO theo suy đoán.

| Issue | Công việc | Điều kiện nghiệm thu |
|---|---|---|
| INV-1201 | Khảo sát auth provider, user ID, issuer/subject, token, session/logout, domain | Có tài liệu thực tế từ cấu hình/code; không suy từ trang công khai |
| INV-1202 | Thiết kế identity mapping và quy trình liên kết | Giữ app_user_id, event, link, RSVP, quota; không gộp chỉ vì email giống |
| INV-1203 | Adapter và migration thử staging | Tài khoản cũ/mới/trùng email/mất liên kết đều có test; không mất ownership |
| INV-1204 | Rollout nội bộ → nhóm nhỏ → mở rộng | Có flag và fallback login Google trong chuyển tiếp; theo dõi lỗi liên kết và session |

**Gate đầu vào G12:** TL/PO duyệt hợp đồng danh tính dựa trên kết quả khảo sát. G12 không có hạn hoàn thành giả định trong lịch v1.

## 17. Lịch dự kiến và mốc demo

Đây là lịch có điều kiện về nhân sự, nội dung mẫu, tài khoản dịch vụ và tốc độ duyệt; không phải cam kết thời gian cho một lập trình viên đơn lẻ.

| Tuần | BE / hạ tầng | FE / UX | Mốc demo |
|---|---|---|---|
| 1 | G0, bắt đầu G1 | G0, G3 tokens/wireframe | Luồng và hợp đồng thống nhất |
| 2 | G1, G2 | G3 renderer/mẫu chuẩn, app shell | Login và mẫu chuẩn |
| 3 | G2 hoàn tất, G4 media/API | G4 editor, thiết kế tiếp mẫu | Soạn nháp thực tế |
| 4 | G5 publish/version/OG | G4 hoàn tất, G5 trang khách | Xuất bản và chia sẻ link |
| 5 | G6 token/quota/RSVP | G6 guest/form | Host nhận RSVP thật |
| 6 | G7 export, G8 provider | G7 dashboard, G8 UI | RSVP dashboard + QR |
| 7 | G9 admin/waitlist/lifecycle | G9 landing và đủ 10 mẫu | Feature complete |
| 8 | G10 tích hợp/security/restore | G10 mobile/visual/performance | Release candidate |
| 9 | G11 beta và sửa lỗi | G11 beta và sửa UX | Beta đạt gate |
| 10 | G11 public rollout/vận hành | Hoàn thiện lỗi launch | V1 mở công khai |

Nếu thiếu người hoặc chậm hạ tầng, cập nhật lịch thay vì bỏ test quota, RLS hoặc giảm số mẫu đã cam kết. Có thể giảm hiệu ứng phụ; thay đổi phạm vi 10 mẫu cần PO chốt lại.

## 18. Cách bắt đầu ngay

1. Giao INV-001/003/004 cho TL cùng BE và PO để chốt nghiệp vụ/schema/API.
2. Giao INV-002 và INV-301 cho UX/FE để dựng wireframe và hướng thị giác.
3. Giao INV-005 cho QA để viết kịch bản biên trước khi có code.
4. Sau Gate G0, mở INV-101 đến INV-106 và các việc G3 không phụ thuộc database.
5. Không bắt đầu thanh toán gói, SSO, gửi tin nhắn tự động hoặc editor kéo thả tự do trong sprint v1.

### Mẫu issue để lập trình viên nhận việc

```markdown
## [INV-xxx] Tên hành vi cần triển khai

Owner:
Reviewer:
Phụ thuộc:

### Mục tiêu
Người dùng nào thực hiện được điều gì sau thay đổi này?

### Công việc
- API/schema/UI cần làm theo hợp đồng đã chốt.
- Trường hợp lỗi và quyền truy cập liên quan.

### Nghiệm thu
- [ ] Hành vi chính.
- [ ] Trường hợp biên của issue.
- [ ] Test và bằng chứng staging.
- [ ] Tài liệu/cấu hình liên quan cập nhật.

### Không thuộc issue
Các phần việc đã được giao ở issue khác.
```

## 19. Tài liệu kỹ thuật tham chiếu

Kiểm tra lại phiên bản và điều khoản tại thời điểm triển khai, đặc biệt OAuth production, Maps và nhà cung cấp VietQR.

- [Supabase Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Google OAuth Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [Next.js Metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Google Maps Embed](https://developers.google.com/maps/documentation/embed/embedding-map)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [VietQR Quick Link](https://vietqr.io/intro/)
