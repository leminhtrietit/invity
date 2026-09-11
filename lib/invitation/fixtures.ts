import { invitationContentSchema, type InvitationContent } from "./schema.ts";

export const vowEditorialFixture: InvitationContent = invitationContentSchema.parse({
  title: "Lễ thành hôn của Minh Khôi & An Nhiên",
  prelude: "Cùng gia đình, chúng mình trân trọng mời bạn đến chung vui trong ngày bắt đầu một hành trình mới.",
  hosts: [
    { name: "Minh Khôi", role: "Chú rể" },
    { name: "An Nhiên", role: "Cô dâu" },
  ],
  startsAt: "2026-12-20T11:00:00+07:00",
  endsAt: "2026-12-20T14:00:00+07:00",
  timezone: "Asia/Ho_Chi_Minh",
  venue: {
    name: "The Ivory Garden",
    address: "18 Nguyễn Bỉnh Khiêm, Quận 1, TP. Hồ Chí Minh",
    mapUrl: "https://maps.google.com/?q=18+Nguyen+Binh+Khiem+Quan+1+Ho+Chi+Minh",
  },
  cover: {
    src: "/images/templates/vow-editorial-cover.webp",
    alt: "Cô dâu mặc áo dài trắng và chú rể đi bên nhau trong khu vườn cổ",
  },
  story: {
    eyebrow: "Chuyện của chúng mình",
    heading: "Có những cuộc gặp gỡ khiến thời gian dịu lại.",
    body: "Từ một chiều mưa rất đỗi bình thường, chúng mình đã đi cùng nhau qua nhiều mùa nắng. Ngày hôm nay là lời hẹn cho những năm tháng tiếp theo — vẫn là hai người, nhưng cùng chung một mái nhà.",
  },
  schedule: [
    { time: "10:30", title: "Đón khách", note: "Gặp gỡ và lưu lại những khung hình đầu tiên" },
    { time: "11:00", title: "Lễ thành hôn", note: "Nghi thức và lời hẹn ước" },
    { time: "11:45", title: "Tiệc mừng", note: "Dùng tiệc cùng gia đình và bạn bè" },
  ],
  album: [{ src: "/images/templates/vow-editorial-cover.webp", alt: "Minh Khôi và An Nhiên trong khu vườn" }],
  rsvp: { enabled: true, closesAt: "2026-12-12T23:59:59+07:00", maxCompanions: 2 },
  gift: { enabled: true, message: "Sự hiện diện của bạn là món quà quý nhất. Nếu ở xa, bạn có thể gửi lời chúc tại đây." },
  wishes: {
    enabled: true,
    samples: [
      { author: "Thanh & Vy", message: "Chúc hai bạn luôn nhìn nhau bằng ánh mắt dịu dàng như ngày hôm nay." },
      { author: "Gia đình cô Mai", message: "Mừng hai con về chung một nhà, trăm năm hạnh phúc." },
    ],
  },
  sections: { story: true, countdown: true, schedule: true, album: true, rsvp: true, gift: true, wishes: true },
});
