import { vowEditorialFixture } from "../invitation/fixtures.ts";
import { invitationContentSchema, type InvitationContent } from "../invitation/schema.ts";
import { templateArt } from "./catalog.ts";

const baseSections = vowEditorialFixture.sections;
const noGift = { enabled: false, message: "" };
const noWishes = { enabled: false, samples: [] };
const venue = (name: string, address: string) => ({
  name,
  address,
  mapUrl: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
});

const previews: Record<string, Partial<InvitationContent>> = {
  "vow-editorial": {},
  "silk-promise": {
    startsAt: "2026-12-20T10:30:00+07:00", endsAt: "2026-12-20T13:00:00+07:00",
    title: "Lễ đính hôn của Gia Hân & Đức Minh",
    hosts: [{ name: "Gia Hân", role: "Cô dâu" }, { name: "Đức Minh", role: "Chú rể" }],
    prelude: "Hai gia đình trân trọng mời bạn đến chung vui trong ngày trầu cau kết duyên.",
    venue: venue("Tư gia họ Nguyễn", "26 Nguyễn Du, Quận 1, TP. Hồ Chí Minh"),
    story: { eyebrow: "Lời thưa cùng gia đình", heading: "Từ hai mái nhà, cùng về một hướng.", body: "Ngày hôm nay đánh dấu một lời hứa trang trọng trước những người chúng mình yêu thương." },
    schedule: [{ time: "10:00", title: "Đón khách" }, { time: "10:30", title: "Lễ đính hôn" }, { time: "11:30", title: "Tiệc thân mật" }],
  },
  "garden-vow": {
    startsAt: "2026-12-20T16:00:00+07:00", endsAt: "2026-12-20T20:00:00+07:00",
    title: "Mai & Nam · A garden wedding",
    hosts: [{ name: "Mai", role: "Cô dâu" }, { name: "Nam", role: "Chú rể" }],
    prelude: "Giữa màu xanh và nắng sớm, chúng mình mong bạn cùng chứng kiến lời hẹn trăm năm.",
    venue: venue("Vườn Thảo Điền", "32 đường số 10, Thảo Điền, TP. Hồ Chí Minh"),
    story: { eyebrow: "Bloom together", heading: "Tình yêu lớn lên trong những ngày rất đỗi bình thường.", body: "Từng chuyến đi, từng bữa cơm và từng mùa hoa đưa chúng mình đến ngày hôm nay." },
    schedule: [{ time: "16:00", title: "Đón khách giữa vườn" }, { time: "16:30", title: "Lễ cưới" }, { time: "18:00", title: "Tiệc tối dưới ánh đèn" }],
  },
  "midnight-toast": {
    startsAt: "2026-12-20T18:30:00+07:00", endsAt: "2026-12-20T23:00:00+07:00",
    title: "An evening to remember",
    hosts: [{ name: "Minh", role: "Chủ tiệc" }],
    prelude: "Cocktail, âm nhạc và những cuộc trò chuyện dưới ánh đèn thành phố.",
    venue: venue("The Observatory", "85 Cách Mạng Tháng Tám, Quận 3, TP. Hồ Chí Minh"),
    schedule: [{ time: "18:30", title: "Welcome drinks" }, { time: "19:00", title: "Dinner & stories" }, { time: "21:00", title: "Music after dark" }],
    sections: { ...baseSections, story: false, countdown: false, gift: false, wishes: false },
    story: undefined, gift: noGift, wishes: noWishes,
  },
  "little-orbit": {
    startsAt: "2026-12-20T10:00:00+07:00", endsAt: "2026-12-20T13:00:00+07:00",
    title: "Bé Bông tròn một tuổi",
    hosts: [{ name: "Bông", role: "Nhân vật chính" }],
    prelude: "Mời cô chú đến chung vui trong chuyến du hành đầu tiên quanh mặt trời của bé.",
    venue: venue("Sunny Playhouse", "12 Hoa Sữa, Phú Nhuận, TP. Hồ Chí Minh"),
    schedule: [{ time: "10:00", title: "Chào cô chú" }, { time: "10:30", title: "Thổi nến" }, { time: "11:00", title: "Tiệc và trò chơi" }],
    sections: { ...baseSections, story: false, gift: false, wishes: false },
    story: undefined, gift: noGift, wishes: noWishes,
  },
  "confetti-club": {
    startsAt: "2026-12-20T18:00:00+07:00", endsAt: "2026-12-20T23:00:00+07:00",
    title: "Linh turns twenty two!",
    hosts: [{ name: "Linh", role: "Birthday girl" }],
    prelude: "Mặc màu rực rỡ nhất, mang theo điệu nhảy hay nhất và cùng vui hết đêm.",
    venue: venue("Studio 22", "22 Tôn Thất Thiệp, Quận 1, TP. Hồ Chí Minh"),
    schedule: [{ time: "18:00", title: "Warm up" }, { time: "19:00", title: "Birthday dinner" }, { time: "20:30", title: "Dance floor" }],
    sections: { ...baseSections, story: false, gift: false, wishes: false },
    story: undefined, gift: noGift, wishes: noWishes,
  },
  "new-chapter": {
    startsAt: "2026-12-20T08:00:00+07:00", endsAt: "2026-12-20T12:00:00+07:00",
    title: "Lễ tốt nghiệp của Hoàng Long",
    hosts: [{ name: "Hoàng Long", role: "Class of 2026" }],
    prelude: "Một chương khép lại. Một hành trình mới bắt đầu. Mong bạn cùng chia sẻ cột mốc này.",
    venue: venue("Đại học Quốc gia", "Khu đô thị Đại học Quốc gia, TP. Thủ Đức"),
    story: { eyebrow: "Nhìn lại", heading: "Mỗi trang đã viết đều có bóng dáng những người thương.", body: "Những năm tháng học tập đã cho mình kiến thức, tình bạn và lòng can đảm bước sang chương tiếp theo." },
    schedule: [{ time: "08:00", title: "Gặp gỡ" }, { time: "09:00", title: "Lễ tốt nghiệp" }, { time: "11:30", title: "Chụp ảnh kỷ niệm" }],
    sections: { ...baseSections, gift: false, wishes: false },
    gift: noGift, wishes: noWishes,
  },
  "linen-table": {
    startsAt: "2026-12-20T17:00:00+07:00", endsAt: "2026-12-20T21:00:00+07:00",
    title: "Mừng ngôi nhà mới của gia đình An",
    hosts: [{ name: "Nhà An", role: "Gia chủ" }],
    prelude: "Một bữa cơm ấm, vài câu chuyện vui và những người chúng tôi thương quý.",
    venue: venue("Nhà An", "18 đường số 4, Thảo Điền, TP. Hồ Chí Minh"),
    schedule: [{ time: "17:00", title: "Đón bạn" }, { time: "18:00", title: "Cùng dùng bữa" }, { time: "20:00", title: "Trà và chuyện nhà" }],
    sections: { ...baseSections, countdown: false, story: false, gift: false, wishes: false },
    story: undefined, gift: noGift, wishes: noWishes,
  },
  "afterglow": {
    startsAt: "2026-12-20T16:30:00+07:00", endsAt: "2026-12-20T20:00:00+07:00",
    title: "The Promise · Thu & Khang",
    hosts: [{ name: "Thu", role: "Cô dâu tương lai" }, { name: "Khang", role: "Chú rể tương lai" }],
    prelude: "Giữa ánh hoàng hôn, chúng mình chọn nói lời đồng ý.",
    venue: venue("Sunset Terrace", "24 Trần Não, TP. Thủ Đức, TP. Hồ Chí Minh"),
    story: { eyebrow: "Lời hẹn", heading: "Có những phút giây ánh sáng ở lại thật lâu.", body: "Chúng mình muốn lưu giữ khoảnh khắc này cùng gia đình và những người bạn thân yêu." },
    schedule: [{ time: "16:30", title: "Đón khách" }, { time: "17:15", title: "Lễ đính hôn" }, { time: "18:00", title: "Sunset dinner" }],
  },
  "reunion-notes": {
    startsAt: "2026-12-20T17:30:00+07:00", endsAt: "2026-12-20T21:00:00+07:00",
    title: "Họp lớp 12A1 · Mười năm gặp lại",
    hosts: [{ name: "12A1", role: "Niên khóa 2013–2016" }],
    prelude: "Trở lại một buổi tối để kể tiếp những câu chuyện còn dang dở.",
    venue: venue("Sân trường xưa", "Trường THPT Nguyễn Thị Minh Khai, Quận 3, TP. Hồ Chí Minh"),
    schedule: [{ time: "17:30", title: "Điểm danh" }, { time: "18:00", title: "Xem lại kỷ niệm" }, { time: "19:00", title: "Tiệc hội ngộ" }],
    sections: { ...baseSections, story: false, gift: false, wishes: false },
    story: undefined, gift: noGift, wishes: noWishes,
  },
};

export function getTemplateFixture(templateId: string) {
  const art = templateArt[templateId] ?? templateArt["vow-editorial"];
  return invitationContentSchema.parse({
    ...structuredClone(vowEditorialFixture),
    ...previews[templateId],
    cover: { src: art.src, alt: art.alt },
    album: [{ src: art.src, alt: art.alt }],
  });
}
