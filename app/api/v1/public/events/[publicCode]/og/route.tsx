import { ImageResponse } from "next/og";
import { loadPublicEvent } from "@/lib/events/public-event";
import { getTemplate } from "@/lib/templates/catalog";

export async function GET(_request: Request, { params }: { params: Promise<{ publicCode: string }> }) {
  const { publicCode } = await params;
  const event = await loadPublicEvent(publicCode);
  if (!event) return new Response("Not found", { status: 404 });
  const theme = getTemplate(event.templateId)?.theme;
  if (!theme) return new Response("Not found", { status: 404 });
  const names = event.content.hosts.map((host) => host.name).join("  &  ");
  const date = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(event.content.startsAt));
  return new ImageResponse(<div style={{ background: theme.background, color: theme.ink, display: "flex", height: "100%", width: "100%", padding: "70px", position: "relative", flexDirection: "column", justifyContent: "space-between" }}>
    <div style={{ color: theme.accent, display: "flex", fontSize: 20, letterSpacing: 6, textTransform: "uppercase" }}>Trân trọng báo tin vui</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}><div style={{ display: "flex", fontFamily: "serif", fontSize: 92, letterSpacing: -5, lineHeight: 1 }}>{names}</div><div style={{ color: theme.muted, display: "flex", fontSize: 28 }}>{event.content.venue.name}</div></div>
    <div style={{ alignItems: "center", borderTop: `2px solid ${theme.accentSoft}`, display: "flex", fontSize: 24, justifyContent: "space-between", paddingTop: 28 }}><span>{date}</span><span style={{ color: theme.accent }}>Mở thiệp mời →</span></div>
    <div style={{ background: theme.accent, borderRadius: 999, display: "flex", height: 180, opacity: .12, position: "absolute", right: -40, top: -40, width: 180 }} />
  </div>, { width: 1200, height: 630 });
}
