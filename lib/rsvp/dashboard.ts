import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardFilters = { query: string; group: string; response: "all" | "attending" | "declined" | "pending"; delivery: "all" | "sent" | "unsent" | "revoked" };
export type DashboardGuest = {
  id: string; allocationNumber: number; source: string; displayName: string; salutation: string; phone: string;
  group: string; ownerNote: string; sentAt: string | null; revokedAt: string | null; createdAt: string;
  response: "attending" | "declined" | "pending"; companionCount: number; rsvpUpdatedAt: string | null;
  wish: string; consentPublicWish: boolean; moderationStatus: string;
};

export function parseDashboardFilters(params: URLSearchParams | Record<string, string | undefined>): DashboardFilters {
  const get = (key: string) => params instanceof URLSearchParams ? params.get(key) ?? "" : params[key] ?? "";
  const response = get("response"); const delivery = get("delivery");
  return { query: get("q").trim().slice(0,100), group: get("group").trim().slice(0,80), response: ["attending","declined","pending"].includes(response) ? response as DashboardFilters["response"] : "all", delivery: ["sent","unsent","revoked"].includes(delivery) ? delivery as DashboardFilters["delivery"] : "all" };
}

export function filterDashboardGuests(guests: DashboardGuest[], filters: DashboardFilters) {
  const needle = filters.query.toLocaleLowerCase("vi");
  return guests.filter((guest) => {
    if (needle && !`${guest.displayName} ${guest.phone} ${guest.group}`.toLocaleLowerCase("vi").includes(needle)) return false;
    if (filters.group && guest.group !== filters.group) return false;
    if (filters.response !== "all" && guest.response !== filters.response) return false;
    if (filters.delivery === "sent" && !guest.sentAt) return false;
    if (filters.delivery === "unsent" && (guest.sentAt || guest.revokedAt)) return false;
    if (filters.delivery === "revoked" && !guest.revokedAt) return false;
    return true;
  });
}

export function summarizeDashboard(guests: DashboardGuest[], allocated: number) {
  const active = guests.filter((guest) => !guest.revokedAt);
  const attending = active.filter((guest) => guest.response === "attending");
  const companions = attending.reduce((sum, guest) => sum + guest.companionCount, 0);
  return { allocated, managed: active.length, attending: attending.length, declined: active.filter((guest) => guest.response === "declined").length, pending: active.filter((guest) => guest.response === "pending").length, companions, expected: attending.length + companions };
}

export async function loadEventDashboard(supabase: SupabaseClient, eventId: string) {
  const [{ data: event }, { data: counter }, { data: rawGuests }, { data: metrics }] = await Promise.all([
    supabase.from("events").select("id,public_code,lifecycle,event_drafts(content)").eq("id",eventId).maybeSingle(),
    supabase.from("event_quota_counters").select("guest_slots_used").eq("event_id",eventId).maybeSingle(),
    supabase.from("guest_slots").select("id,allocation_number,allocation_source,display_name,salutation,phone_canonical,guest_group,owner_note,sent_at,revoked_at,created_at,rsvps(response,companion_count,updated_at),wishes(content,consent_public,moderation_status)").eq("event_id",eventId).is("deleted_at",null).order("allocation_number"),
    supabase.from("event_metrics_daily").select("invitation_opens,filtered_bot_opens").eq("event_id",eventId),
  ]);
  if (!event) return null;
  const guests: DashboardGuest[] = (rawGuests ?? []).map((raw: Record<string, unknown>) => {
    const rsvpRaw = Array.isArray(raw.rsvps) ? raw.rsvps[0] : raw.rsvps; const rsvp = rsvpRaw as Record<string, unknown> | undefined;
    const wishRaw = Array.isArray(raw.wishes) ? raw.wishes[0] : raw.wishes; const wish = wishRaw as Record<string, unknown> | undefined;
    return { id: String(raw.id), allocationNumber: Number(raw.allocation_number), source: String(raw.allocation_source), displayName: String(raw.display_name), salutation: String(raw.salutation ?? ""), phone: String(raw.phone_canonical ?? ""), group: String(raw.guest_group ?? ""), ownerNote: String(raw.owner_note ?? ""), sentAt: raw.sent_at ? String(raw.sent_at) : null, revokedAt: raw.revoked_at ? String(raw.revoked_at) : null, createdAt: String(raw.created_at), response: (rsvp?.response as DashboardGuest["response"]) ?? "pending", companionCount: Number(rsvp?.companion_count ?? 0), rsvpUpdatedAt: rsvp?.updated_at ? String(rsvp.updated_at) : null, wish: String(wish?.content ?? ""), consentPublicWish: Boolean(wish?.consent_public), moderationStatus: String(wish?.moderation_status ?? "") };
  });
  const draftRaw = Array.isArray(event.event_drafts) ? event.event_drafts[0] : event.event_drafts;
  const title = (draftRaw as { content?: { title?: string } } | null)?.content?.title ?? "Sự kiện";
  return { event: { id: event.id, publicCode: event.public_code, lifecycle: event.lifecycle, title }, guests, summary: summarizeDashboard(guests,counter?.guest_slots_used ?? 0), opens: (metrics ?? []).reduce((sum,row) => sum + row.invitation_opens,0) };
}

export function spreadsheetSafe(value: string) { return /^[=+\-@]/.test(value) ? `'${value}` : value; }
export function csvCell(value: string | number) { const safe = spreadsheetSafe(String(value)).replaceAll('"','""'); return `"${safe}"`; }
export function dashboardExportRows(guests: DashboardGuest[]) {
  return guests.map((guest) => [guest.allocationNumber, guest.displayName, guest.salutation, guest.group, guest.phone, guest.source === "personalized" ? "Link cá nhân" : "Link chung", guest.sentAt ? "Đã gửi" : "Chưa gửi", guest.revokedAt ? "Đã thu hồi" : "Đang quản lý", guest.response === "attending" ? "Tham dự" : guest.response === "declined" ? "Từ chối" : "Chưa phản hồi", guest.companionCount, guest.response === "attending" ? 1 + guest.companionCount : 0, guest.wish, guest.consentPublicWish ? "Có" : "Không", guest.moderationStatus, formatVietnamTime(guest.rsvpUpdatedAt), guest.ownerNote]);
}
export const exportHeaders = ["STT","Tên khách","Xưng hô","Nhóm","Số điện thoại","Nguồn","Gửi thiệp","Trạng thái quản lý","RSVP","Người đi cùng","Tổng dự kiến","Lời chúc","Đồng ý công khai","Duyệt lời chúc","Cập nhật RSVP","Ghi chú riêng"];
export function formatVietnamTime(value: string | null) { return value ? new Intl.DateTimeFormat("vi-VN",{ dateStyle:"short",timeStyle:"short",timeZone:"Asia/Ho_Chi_Minh" }).format(new Date(value)) : ""; }
