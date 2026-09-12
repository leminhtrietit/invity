import type { InvitationTheme } from "../invitation/schema.ts";

export type TemplateCategory = "wedding" | "engagement" | "birthday_baby" | "graduation" | "other";

export type TemplateDefinition = {
  id: string;
  name: string;
  category: TemplateCategory;
  categoryLabel: string;
  description: string;
  motif: string;
  theme: InvitationTheme;
  featured?: boolean;
};

const base = { surface: "#fffdf8", displayFont: "editorial", bodyFont: "humanist" } as const;

export const templateCatalog: TemplateDefinition[] = [
  { id: "vow-editorial", name: "Vow Editorial", category: "wedding", categoryLabel: "Thiệp cưới", description: "Biên tập tối giản, ảnh lớn và khoảng thở sang trọng.", motif: "20 · 12", featured: true, theme: { ...base, background: "#f3eee5", ink: "#241b1b", muted: "#726561", accent: "#713f49", accentSoft: "#e7d8d7" } },
  { id: "silk-promise", name: "Trầu Cau", category: "engagement", categoryLabel: "Lễ đính hôn", description: "Sắc son, đường nét Á Đông và nhịp kể trang trọng cho ngày hai họ gặp nhau.", motif: "囍", theme: { ...base, background: "#f6eee7", ink: "#2b1717", muted: "#765e58", accent: "#8d2f35", accentSoft: "#ead1cb", displayFont: "romantic" } },
  { id: "garden-vow", name: "Modern Romance", category: "wedding", categoryLabel: "Thiệp cưới", description: "Ảnh toàn khung, nhịp chữ mềm và không khí khu vườn đương đại.", motif: "M & A", theme: { ...base, background: "#edf0e8", ink: "#1f2b22", muted: "#647067", accent: "#4f6957", accentSoft: "#d8e0d4" } },
  { id: "midnight-toast", name: "Evening Toast", category: "other", categoryLabel: "Tiệc mừng", description: "Tương phản sâu và ánh vàng cho buổi tiệc tối.", motif: "CHEERS", theme: { ...base, background: "#17191c", surface: "#23262b", ink: "#f8f0dd", muted: "#b9b09f", accent: "#c7a56a", accentSoft: "#39352e", displayFont: "modern" } },
  { id: "little-orbit", name: "Little Cloud", category: "birthday_baby", categoryLabel: "Sinh nhật / Thôi nôi", description: "Những đám mây và quỹ đạo vui tươi cho ngày đầu đời đáng nhớ.", motif: "01", theme: { ...base, background: "#edf4f1", ink: "#253233", muted: "#697778", accent: "#367d78", accentSoft: "#cfe5df", displayFont: "modern" } },
  { id: "confetti-club", name: "Birthday Studio", category: "birthday_baby", categoryLabel: "Sinh nhật", description: "Hình học táo bạo, tươi sáng và giàu năng lượng.", motif: "YAY!", theme: { ...base, background: "#fff3df", ink: "#2d2441", muted: "#71677e", accent: "#e4543f", accentSoft: "#ffd6c6", displayFont: "modern" } },
  { id: "new-chapter", name: "New Chapter", category: "graduation", categoryLabel: "Tốt nghiệp", description: "Tinh thần tạp chí trẻ cho cột mốc trưởng thành.", motif: "2026", theme: { ...base, background: "#eff1f7", ink: "#18213b", muted: "#687087", accent: "#394f8a", accentSoft: "#d9e0f2", displayFont: "modern" } },
  { id: "linen-table", name: "Warm Gathering", category: "other", categoryLabel: "Tân gia / Họp mặt", description: "Ấm áp, mộc mạc như một bàn tiệc trong ngôi nhà mới.", motif: "HOME", theme: { ...base, background: "#f2ede3", ink: "#302b23", muted: "#756f65", accent: "#8b684e", accentSoft: "#e5d7c5" } },
  { id: "afterglow", name: "The Promise", category: "engagement", categoryLabel: "Lễ đính hôn", description: "Ánh hoàng hôn mềm và sắc hồng trầm lãng mạn.", motif: "YES", theme: { ...base, background: "#f7eceb", ink: "#392326", muted: "#80686b", accent: "#a15562", accentSoft: "#ecd1d5", displayFont: "romantic" } },
  { id: "reunion-notes", name: "Class of Us", category: "graduation", categoryLabel: "Tốt nghiệp", description: "Những mẩu ghi chú và kỷ niệm thân mật cho ngày khép lại thời áo trắng.", motif: "HELLO", theme: { ...base, background: "#eeeae2", ink: "#292824", muted: "#747169", accent: "#5e6652", accentSoft: "#dce0d4", displayFont: "modern" } },
];

export function getTemplate(id: string) {
  return templateCatalog.find((template) => template.id === id);
}
