# Kế hoạch làm mới trang chủ Invite

**Ngày lập:** 24/09/2026

**Mục tiêu:** Trong vài giây đầu, người mới hiểu Invite dùng để tạo thiệp mời, thấy một thiệp thật đẹp và muốn mở thử hoặc xem mẫu.

## Hiện trạng

- Mobile: tiêu đề, đoạn mô tả và hai nút chiếm gần toàn bộ màn đầu; hình thiệp xuất hiện sau khi cuộn.
- Desktop: hero chia đôi rõ ràng nhưng phần thiệp là một khối màu tĩnh, chưa cho thấy cảm giác mở thiệp hoặc sự đa dạng của bộ mẫu.
- Các phần bên dưới chủ yếu là chữ và thẻ tĩnh. Ảnh của các mẫu mới đã có nhưng chưa được dùng để kể câu chuyện ngay ở hero.
- Chưa có baseline đo riêng cho trang chủ. Số Lighthouse trong báo cáo G10 là gate cho trang thiệp, không được coi là số hiện tại của trang chủ.

## Hướng sáng tạo: “Một lời mời đang chờ được mở”

### 1. Màn đầu

- Rút tiêu đề thành một ý rõ sản phẩm: **“Thiệp mời khiến người ta muốn mở.”** Dòng phụ nêu ngắn gọn: chọn mẫu, kể câu chuyện, nhận RSVP.
- Đặt một phong bì giấy và mép thiệp lộ ra trong màn đầu trên cả mobile và desktop. Dùng ba lớp giấy, bóng đổ và `perspective`/`transform` CSS để tạo chiều sâu; dùng ảnh mẫu thật trên mặt thiệp.
- Khi tải trang, thiệp nhô lên một lần trong khoảng 600–800 ms. Người xem có thể nhấn **“Mở thử thiệp”** để lật nắp và kéo thiệp lên; sau đó thấy ảnh, tên, ngày và một nút dẫn đến bản xem thử đầy đủ. Tương tác bằng click, tap, Enter và Space.
- Desktop: nghiêng tối đa khoảng 4–6° theo con trỏ khi hover, chỉ trong vùng thiệp. Mobile: không theo con trỏ, chỉ mở bằng tap. Trạng thái ban đầu đã có nội dung và CTA để trang vẫn có nghĩa nếu JavaScript tải chậm.
- Giữ CTA chính **“Tạo thiệp miễn phí”** dẫn đến bộ mẫu. Nút mở thử là tương tác phụ, không chiếm chỗ CTA chính.

### 2. Đoạn kể chuyện khi cuộn

- Thay khối giới thiệu dài bằng ba khung ngắn: **Chọn phong cách → Kể câu chuyện → Nhận hồi đáp**. Mỗi khung dùng một ảnh/chụp giao diện thật và một câu lợi ích.
- Dùng hiệu ứng xuất hiện một lần khi khung vào màn hình bằng `opacity` và `transform`; không khóa cuộn, không tạo chuyển động lặp liên tục.
- Làm rõ kết quả cuối: thiệp hiển thị đẹp trên điện thoại, người nhận xác nhận tham dự, chủ tiệc xem danh sách phản hồi.

### 3. Bộ mẫu và chi tiết tương tác

- Đưa ba mẫu thuộc ba dịp khác nhau lên trang chủ; dùng ảnh mẫu hiện có thay cho bề mặt trang trí chung.
- Desktop: thẻ nhấc lên và xoay rất nhẹ khi hover/focus. Mobile: thẻ đứng yên, vuốt/cuộn bình thường và vùng nhấn đủ lớn.
- Giữ một nhịp chuyển động nổi bật ở hero; các hiệu ứng còn lại chỉ hỗ trợ việc đọc và chọn mẫu. Không thêm vòng xoay, hạt bay hoặc autoplay video.

## Triển khai kỹ thuật

1. Chụp baseline trang chủ ở 320, 390, 768 và 1280 px; đo Lighthouse mobile ba lần trên bản production hiện tại. Ghi kích thước tài nguyên và tỷ lệ nhấn CTA hiện có nếu analytics cung cấp.
2. Tách hero tương tác thành một client component nhỏ; nội dung headline, CTA, ảnh và trạng thái đóng vẫn server render trong `app/page.tsx`. Phần còn lại giữ server component.
3. Viết chiều sâu và chuyển động trong `app/launch.css`. Ưu tiên `transform` và `opacity`; chỉ chạy nghiêng khi thiết bị có hover, giới hạn cập nhật con trỏ qua `requestAnimationFrame`.
4. Tối ưu ảnh hero bằng ảnh WebP hiện có và `next/image`, khai báo kích thước để không nhảy bố cục. Chỉ ưu tiên tải ảnh trong màn đầu; ảnh phần dưới tải lười.
5. Tôn trọng `prefers-reduced-motion`: bỏ nghiêng, lật và chuyển động tự chạy; nút mở thiệp đổi trạng thái tức thì. Có focus rõ và nhãn nút mô tả đúng trạng thái.
6. Đo lại trên thiết bị thật hoặc webview Zalo/Messenger và trên desktop. Sửa trước khi phát hành nếu CTA hoặc nội dung bị che, thao tác không được bằng bàn phím, hoặc hiệu năng giảm đáng kể.

## Điều kiện nghiệm thu

- Ở màn 320–390 px, thấy hình thiệp và CTA chính trong màn đầu mà không cần cuộn; headline dễ đọc, không cắt chữ.
- Click/tap/keyboard mở và đóng thiệp được; liên kết tới mẫu hoạt động. Khi tắt JavaScript hoặc bật reduced motion, thông điệp và CTA vẫn đọc/dùng được.
- Không có cuộn ngang hoặc thay đổi bố cục khi ảnh và font tải xong. Kiểm tra Safari iOS, Chrome Android, webview Zalo/Messenger và desktop.
- Lighthouse mobile đo ba lần; mục tiêu Core Web Vitals: LCP dưới 2,5 giây, INP dưới 200 ms khi có field data, CLS dưới 0,1. So sánh thêm với baseline riêng của trang chủ trước khi phát hành.
- Theo dõi tỷ lệ từ trang chủ sang bộ mẫu, số lần mở thử thiệp và tỷ lệ tạo bản nháp. Chỉ ghi sự kiện tương tác, không gửi dữ liệu cá nhân.

## Thứ tự làm

1. Chốt bố cục mobile và storyboard mở thiệp.
2. Làm hero tương tác và bản tĩnh cho reduced motion.
3. Nâng cấp ba khung kể chuyện và thẻ mẫu.
4. Kiểm thử hiệu năng, thiết bị, bàn phím và webview; sửa rồi đưa lên production.

**Nguồn kỹ thuật:** [web.dev: hiệu năng animation](https://web.dev/articles/animations-guide), [MDN: reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion), [Google: Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals).
