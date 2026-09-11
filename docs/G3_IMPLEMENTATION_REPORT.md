# G3 — Báo cáo design system và renderer thiệp chuẩn

Ngày kiểm tra: 11/09/2026. Phạm vi: INV-301 đến INV-306.

## Kết luận

Gate kỹ thuật G3 đã hoàn tất. `Vow Editorial` là mẫu chuẩn đã có renderer dùng chung, fixture biên, ảnh thật tối ưu, chế độ preview và toàn bộ section của thiệp. Chín hướng thị giác còn lại đã có catalog, palette, typography, motif và route xem thử để tiếp tục khác biệt hóa cấu trúc ở G4/G9.

## Kết quả theo issue

| Issue | Trạng thái | Bằng chứng |
|---|---|---|
| INV-301 | Hoàn tất | Tokens ivory/burgundy/sage và semantic states trong `app/globals.css`; 10 palette qua kiểm tra WCAG AA cho body text; chuỗi fixture tiếng Việt đầy đủ dấu |
| INV-302 | Hoàn tất nền tảng | Button, field, textarea, card, dialog, bottom sheet, toast, tabs, table và upload; có focus, error, disabled và ví dụ tại `/design-system` |
| INV-303 | Hoàn tất | Zod schema độc lập editor; `InvitationRenderer` chỉ nhận `content`, `theme`, `mode` |
| INV-304 | Hoàn tất | Hero/envelope cue, thông tin, countdown, địa điểm, lịch trình, album, RSVP, quà và lời chúc; section tùy chọn dựa trên cờ schema |
| INV-305 | Hoàn tất kỹ thuật | Vow Editorial kiểm tra 360/390/430/768/1280 px, tên dài, reduced motion, ảnh 4:5 và không tràn ngang |
| INV-306 | Hoàn tất concept catalog | 9 mẫu bổ sung có category, motif, palette và route preview; migration đồng bộ 10 mẫu vào database |

## Quy tắc renderer

- Preview và public dùng chung component; khác nhau qua `mode`.
- Preview gắn nhãn rõ, vô hiệu hóa RSVP/VietQR và không gọi API tracking.
- Nội dung được render thành HTML ngay từ server; countdown chỉ là progressive enhancement.
- Một theme chỉ chọn một display family và một body family, không vượt quá hai font.
- Ảnh có `alt`, `sizes` và crop `object-fit`; ảnh bìa ưu tiên tải, album để tải theo nhu cầu.
- Section optional chỉ render khi cả cờ hiển thị và dữ liệu tương ứng hợp lệ.

## Kiểm tra tự động và trình duyệt

```text
pnpm lint       PASS
pnpm typecheck  PASS
pnpm test       PASS — 14 tests
pnpm build      PASS — 20 static/dynamic routes
```

Playwright Chromium kiểm tra production build:

- Viewport 360, 390, 430, 768 và 1280 px đều có `scrollWidth === clientWidth`.
- Fixture tên dài không gây tràn ngang.
- Preview có đúng hai action nghiệp vụ bị disabled.
- 10 card xuất hiện trong gallery; bộ lọc category thay đổi danh sách bằng client state.
- Dialog mở/đóng bằng phím Escape; tabs cập nhật `aria-selected`.
- Không có lỗi console trong các viewport đã chạy.

## Asset Vow Editorial

Ảnh bìa được tạo bằng built-in ImageGen, sau đó resize và nén WebP còn khoảng 193 KB tại `public/images/templates/vow-editorial-cover.webp`.

Prompt cuối: ảnh cưới editorial của một cặp đôi Việt Nam trong khu vườn biệt thự cổ, bố cục dọc có khoảng thở cho typography, ánh sáng chiều khuếch tán, bảng màu ivory/burgundy/sage, không chữ, logo hoặc watermark.

## Việc chuyển sang G4

- Editor phải lưu payload đúng `invitationContentSchema` và hiển thị lỗi theo section.
- Preview trong editor import trực tiếp renderer này, không tạo bản sao markup.
- Template ID/category phải lấy từ catalog/database đã seed.
- Upload thật thay URL fixture bằng media variant trạng thái `ready`.
- G4 tiếp tục làm khác biệt cấu trúc cho chín mẫu concept; Vow Editorial giữ vai trò mẫu chuẩn nghiệm thu.
