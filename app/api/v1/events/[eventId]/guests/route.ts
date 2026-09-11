import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { personalGuestSchema, rsvpDatabaseError } from "@/lib/rsvp/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { filterDashboardGuests, loadEventDashboard, parseDashboardFilters } from "@/lib/rsvp/dashboard";

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!(await getCurrentAppUser())) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const { eventId } = await params;
  const dashboard = await loadEventDashboard(await createSupabaseServerClient(),eventId);
  if (!dashboard) return apiError(404, "NOT_FOUND", "Không tìm thấy sự kiện.");
  const filters=parseDashboardFilters(new URL(request.url).searchParams);
  return apiSuccess({ event:dashboard.event, summary:dashboard.summary, opens:dashboard.opens, filters, guests:filterDashboardGuests(dashboard.guests,filters) });
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!(await getCurrentAppUser())) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const id = request.headers.get("Idempotency-Key") ?? requestId();
  const parsed = personalGuestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(422, "VALIDATION_ERROR", "Thông tin khách chưa hợp lệ.", id);
  const { eventId } = await params;
  const { data, error } = await (await createSupabaseServerClient()).rpc("create_personal_invitation", { p_event_id: eventId, p_display_name: parsed.data.displayName, p_salutation: parsed.data.salutation, p_guest_group: parsed.data.guestGroup, p_owner_note: parsed.data.ownerNote, p_idempotency_key: id });
  if (error) {
    const code = rsvpDatabaseError(error.message);
    const status = code === "GUEST_QUOTA_EXCEEDED" ? 409 : code === "NOT_FOUND" ? 404 : 422;
    return apiError(status, code ?? "VALIDATION_ERROR", code === "GUEST_QUOTA_EXCEEDED" ? "Sự kiện đã dùng hết 50 suất khách." : "Không thể tạo link khách.", id);
  }
  const result = Array.isArray(data) ? data[0] : data;
  return apiSuccess({ guestSlotId: result.guest_slot_id, allocationNumber: result.allocation_number, invitationToken: result.invitation_token, invitationPath: `/i/${result.invitation_token}`, replayed: result.replayed }, id, { status: result.replayed ? 200 : 201 });
}
