# G0 — Wireframe v1 và trạng thái giao diện

Wireframe là cấu trúc/luồng, không thay thế visual design G3. Desktop và mobile đều phải có loading, empty, error và success cho màn hình có thao tác dữ liệu.

## Điều hướng và quyền truy cập

```text
Public: Landing → Gallery → Template detail → Chọn mẫu → Google login → Dashboard
Public: Link thiệp → Envelope → Thiệp → RSVP / Quà / Lời chúc
Owner:  Dashboard → Event → Editor → Preview → Publish → Dashboard RSVP
Admin:  /admin (role server) → Templates / Reports / Jobs
```

Landing, thư viện mẫu, chi tiết mẫu và thiệp khách không yêu cầu login. Dashboard, editor, export và admin bắt buộc login/role phía server.

## Khung desktop

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Logo        Mẫu thiệp   Cách hoạt động                     Đăng nhập     │
├─────────────────────────────────────────────────────────────────────────┤
│ HERO: lời hứa giá trị + CTA [Tạo thiệp]  [Khám phá mẫu]                 │
│ Gallery theo 5 nhóm; card mẫu có preview thật và CTA chọn mẫu            │
└─────────────────────────────────────────────────────────────────────────┘

┌ Sidebar ───┬──────────── Form editor ────────────┬── Preview ───────────┐
│ Tổng quan  │ Nội dung section đang chọn           │ device: 390 / desktop│
│ Sự kiện    │ validation inline, autosave state    │ cùng renderer public │
│ Khách/RSVP │ [Xem thử] [Cập nhật/Xuất bản]        │                      │
│ Cài đặt    │                                      │                      │
└────────────┴──────────────────────────────────────┴──────────────────────┘
```

## Khung mobile

```text
┌──────────────────────────┐
│ Logo                 Menu │
├──────────────────────────┤
│ Nội dung một cột          │
│ Form / card / danh sách   │
│                           │
├──────────────────────────┤
│ [Sửa] [Xem thử] [CTA]     │  ← sticky, chừa safe-area
└──────────────────────────┘
```

Editor mobile chỉ hiển thị một vùng tại một thời điểm (Sửa hoặc Xem thử); không cố nén ba cột. Dialog lớn dùng bottom sheet có nút đóng và focus trap.

## Các màn hình và trạng thái bắt buộc

| Màn hình | Nội dung/chức năng chính | States cần thiết |
|---|---|---|
| Landing/gallery/detail mẫu | CTA, lọc 5 nhóm, preview, chọn mẫu | Skeleton gallery; empty filter; preview load lỗi; chọn mẫu thành công. |
| Login/callback | Google-only, giữ template/returnTo hợp lệ | Redirecting; popup/consent error; session expired; in-app browser hướng dẫn mở browser hệ thống. |
| Dashboard | Danh sách event, quota tháng, tạo draft | Loading; zero-event CTA; quota full; error/retry; create success. |
| Editor | Section form, media, palette/font, autosave/revision | Saving/saved; offline unsynced; validation; media processing/failed/retry; revision conflict. |
| Preview/publish | Cùng renderer public, preflight checklist | Preview not tracking; missing requirements; candidate OG generating/failed; published success/link copy. |
| Thiệp khách | Envelope, hero, thông tin, countdown, map, album, sections | SSR readable fallback; reduced motion; image/map lazy error; audio click-to-play/blocked fallback; hidden/cancelled/not found. |
| RSVP | Name, phone, response, companions, wish/consent | Open/closed; validation; rate-limited; no remaining slot; success/edit link/session error. |
| Quà mừng | Chọn tối đa hai receiver, optional amount/content, QR/copy | No gift configured; QR loading/provider failure with copy fallback; no payment-success state. |
| Owner RSVP | Summary, filter/search, sent state, guest actions, wishes review/export | Loading; empty; filtered empty; export generating/error; revoked token confirmation. |
| Admin | Template toggle, reports, event/user action, jobs | Unauthorized; empty queues; action confirmation; audit success/error. |

## Luồng trọng yếu

### Chọn mẫu đến dashboard

1. Guest chọn mẫu; client giữ `templateId` trong state ngắn hạn, không chứa PII.
2. Nếu chưa đăng nhập, đưa qua Google với `returnTo` nội bộ allowlist.
3. Callback kiểm tra session và return URL, tạo/lookup `app_user`, rồi tạo draft hoặc trở lại dashboard.
4. Nếu OAuth bị chặn trong in-app browser, chỉ hiện hướng dẫn mở browser hệ thống và bảo toàn lựa chọn mẫu.

### Soạn và publish

1. Editor validate tại chỗ, autosave sau khoảng 1 giây; chỉ hiện “Đã lưu” sau ACK server.
2. Khi conflict, giữ nội dung local của phiên, nạp revision server để người dùng quyết định; không tự overwrite.
3. Publish hiển thị preflight theo section lỗi; sau candidate OG + transaction thành công hiển thị link công khai và version mới.

### Khách RSVP

1. Link chung hiện form nếu event published và RSVP chưa đóng.
2. Submit mới qua link chung chỉ báo thành công/thất bại chung chung; không tiết lộ liệu phone đã tồn tại.
3. Link cá nhân gắn response với đúng guest. Link sửa chung đổi bí mật thành cookie rồi loại bí mật khỏi URL.
4. Khi đủ 50 suất, khách mới bị chặn; guest đã có link/quyền sửa vẫn được trả lời hoặc sửa.

## Accessibility baseline

Nút/field có label rõ, focus visible, keyboard navigation, tab order theo thị giác, lỗi liên kết bằng `aria-describedby`, dialog trả focus về trigger. Nội dung chính/rendered text xuất hiện trước animation/JS; motion tôn trọng `prefers-reduced-motion`; màu tokens đạt kiểm tra tương phản với tiếng Việt có dấu.
